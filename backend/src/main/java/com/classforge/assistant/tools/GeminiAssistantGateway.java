package com.classforge.assistant.tools;

import com.classforge.assistant.AssistantPlanningException;
import com.classforge.project.domain.document.ProjectDocument;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class GeminiAssistantGateway implements AssistantToolCallingGateway {
    private final JsonMapper json;
    private final String apiKey;
    private final String model;
    private final HttpClient http;
    private final URI endpoint;

    @Autowired
    public GeminiAssistantGateway(
            JsonMapper json,
            @Value("${classforge.assistant.gemini.api-key:}") String apiKey,
            @Value("${classforge.assistant.gemini.model:gemini-3.5-flash}") String model
    ) {
        this(json, apiKey, model, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
                URI.create("https://generativelanguage.googleapis.com/v1beta/models/"));
    }

    GeminiAssistantGateway(JsonMapper json, String apiKey, String model, HttpClient http, URI modelsEndpoint) {
        this.json = json;
        this.apiKey = apiKey.strip();
        this.model = model.strip();
        this.http = http;
        if (!this.model.matches("[A-Za-z0-9][A-Za-z0-9._-]*")) {
            throw new IllegalArgumentException("El identificador del modelo Gemini no es válido.");
        }
        this.endpoint = modelsEndpoint.resolve("./" + this.model + ":generateContent");
    }

    public boolean configured() {
        return !apiKey.isBlank();
    }

    public String model() {
        return model;
    }

    public String answer(String system, String prompt) {
        JsonNode parts = generate(system, prompt, Map.of());
        List<String> text = new ArrayList<>();
        for (JsonNode part : parts) {
            if (!part.path("thought").asBoolean(false) && part.path("text").isString()) {
                text.add(part.path("text").asString());
            }
        }
        return String.join("\n", text);
    }

    @Override
    public List<AssistantToolInvocation> call(
            String userText,
            ProjectDocument document,
            AssistantToolCatalog catalog,
            List<AssistantToolConversationTurn> history
    ) {
        if (catalog.definitions().isEmpty()) {
            throw new AssistantPlanningException("No hay herramientas UML disponibles para esta petición.");
        }
        var declarations = catalog.definitions().stream()
                .map(definition -> Map.of("name", definition.name().wireName(),
                        "description", definition.description(),
                        "parametersJsonSchema", definition.parameters()))
                .toList();
        String prompt = userText;
        if (history != null && !history.isEmpty()) {
            List<String> results = history.stream().flatMap(turn -> turn.results().stream()).toList();
            prompt += "\n\nResultados de pasos previos del plan:\n" + json.writeValueAsString(results);
        }
        JsonNode parts = generate(AssistantToolPrompts.systemPrompt(catalog), prompt, Map.of(
                "tools", List.of(Map.of("functionDeclarations", declarations)),
                "toolConfig", Map.of("functionCallingConfig", Map.of("mode", "ANY"))
        ));
        List<AssistantToolInvocation> invocations = new ArrayList<>();
        for (JsonNode part : parts) {
            if (!part.has("functionCall")) continue;
            JsonNode call = part.path("functionCall");
            String name = call.path("name").asString("");
            AssistantToolDefinition tool = catalog.definitions().stream()
                    .filter(definition -> definition.name().wireName().equals(name))
                    .findFirst().orElseThrow(() -> new AssistantPlanningException(
                            "Gemini devolvió una herramienta UML que no estaba disponible para este paso."));
            JsonNode arguments = call.path("args");
            if (!arguments.isObject()) {
                throw new AssistantPlanningException("Gemini devolvió argumentos UML inválidos.");
            }
            invocations.add(new AssistantToolInvocation(call.path("id").asString("gemini-tool-1"),
                    tool.name(), arguments));
        }
        if (invocations.size() != 1) {
            throw new AssistantPlanningException("Gemini debe devolver una herramienta UML por paso.");
        }
        return List.copyOf(invocations);
    }

    private JsonNode generate(String system, String prompt, Map<String, Object> tools) {
        if (!configured()) {
            throw new AssistantPlanningException("Gemini requiere una clave de API configurada en el servidor.");
        }
        var body = new LinkedHashMap<String, Object>();
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", system))));
        body.put("contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))));
        body.put("generationConfig", Map.of("maxOutputTokens", 4096));
        body.putAll(tools);
        try {
            var request = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(90))
                    .header("x-goog-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                    .build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new AssistantPlanningException(switch (response.statusCode()) {
                    case 400 -> "Gemini rechazó la solicitud. Revisa la clave y la configuración del modelo.";
                    case 401, 403 -> "Gemini rechazó el acceso. Revisa la clave y los permisos del modelo.";
                    case 404 -> "El modelo Gemini configurado no está disponible.";
                    case 429 -> "Gemini alcanzó el límite de solicitudes o de cuota. Vuelve a intentarlo más tarde.";
                    default -> "Gemini no pudo procesar la solicitud (HTTP " + response.statusCode() + ").";
                });
            }
            JsonNode parts = json.readTree(response.body()).at("/candidates/0/content/parts");
            if (!parts.isArray() || parts.isEmpty()) {
                throw new AssistantPlanningException("Gemini no devolvió contenido para esta solicitud.");
            }
            return parts;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssistantPlanningException("La solicitud a Gemini fue interrumpida.", exception);
        } catch (IOException exception) {
            throw new AssistantPlanningException("No se pudo conectar con Gemini.", exception);
        }
    }
}
