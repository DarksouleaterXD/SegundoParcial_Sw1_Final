package com.classforge.assistant.tools;

import com.classforge.assistant.AssistantPlanningException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class GeminiAssistantGatewayTests {
    private final JsonMapper json = new JsonMapper();
    private final AtomicReference<JsonNode> request = new AtomicReference<>();
    private final AtomicReference<String> header = new AtomicReference<>();
    private HttpServer server;
    private GeminiAssistantGateway gateway;
    private volatile String response;
    private volatile int status = 200;

    @BeforeEach
    void startServer() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1beta/models/gemini-test:generateContent", exchange -> {
            header.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            request.set(json.readTree(exchange.getRequestBody()));
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, bytes.length);
            try (var output = exchange.getResponseBody()) {
                output.write(bytes);
            }
        });
        server.start();
        gateway = new GeminiAssistantGateway(json, "test-key", "gemini-test", HttpClient.newHttpClient(),
                URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta/models/"));
    }

    @AfterEach
    void stopServer() {
        if (server != null) server.stop(0);
    }

    @Test
    void sendsReadOnlyQuestionsWithoutToolsAndExcludesThoughtParts() {
        response = """
                {"candidates":[{"content":{"parts":[
                  {"text":"Razonamiento","thought":true},
                  {"text":"La clase se llama Pedido."}
                ]}}]}
                """;
        assertEquals("La clase se llama Pedido.", gateway.answer("Solo consulta", "¿Qué clases hay?"));
        assertEquals("test-key", header.get());
        assertEquals("Solo consulta", request.get().at("/systemInstruction/parts/0/text").asString());
        assertTrue(request.get().path("tools").isMissingNode());
    }

    @Test
    void convertsOnlyTheExposedToolWithItsArguments() {
        response = """
                {"candidates":[{"content":{"parts":[{"functionCall":{
                  "name":"create_class","args":{"name":"Pedido"},"id":"tool-1"
                }}]}}]}
                """;
        AssistantToolCatalog catalog = new AssistantToolCatalog(
                List.of(new AssistantToolDefinition(AssistantToolName.CREATE_CLASS, "Crea una clase",
                        Map.of("type", "object"))), Map.of(), Map.of(), Map.of());
        AssistantToolInvocation invocation = gateway.call("Crea Pedido", null, catalog, List.of()).getFirst();
        assertEquals(AssistantToolName.CREATE_CLASS, invocation.name());
        assertEquals("Pedido", invocation.arguments().path("name").asString());
        assertEquals("tool-1", invocation.id());
        assertEquals("ANY", request.get().at("/toolConfig/functionCallingConfig/mode").asString());
        assertEquals("object", request.get().at("/tools/0/functionDeclarations/0/parametersJsonSchema/type").asString());

        response = response.replace("create_class", "delete_class");
        assertThrows(AssistantPlanningException.class, () -> gateway.call("Crea Pedido", null, catalog, List.of()));
    }

    @Test
    void sendsWavAudioInlineAndReturnsTheTranscript() {
        response = """
                {"candidates":[{"content":{"parts":[{"text":"Crea la clase Cliente."}]}}]}
                """;

        assertEquals("Crea la clase Cliente.", gateway.transcribe(new byte[] {1, 2, 3}));
        assertEquals("audio/wav", request.get().at("/contents/0/parts/0/inlineData/mimeType").asString());
        assertEquals("AQID", request.get().at("/contents/0/parts/0/inlineData/data").asString());
        assertTrue(request.get().path("tools").isMissingNode());
    }

    @Test
    void reportsQuotaErrorsWithoutReturningTheProviderBody() {
        status = 429;
        response = "{\"error\":\"internal details\"}";
        var failure = assertThrows(AssistantPlanningException.class, () -> gateway.answer("Consulta", "Modelo"));
        assertTrue(failure.getMessage().contains("cuota"));
        assertFalse(failure.getMessage().contains("internal details"));
    }
}
