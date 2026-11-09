package com.classforge.assistant.context;

import com.classforge.assistant.AssistantPlanningException;
import com.classforge.assistant.tools.GeminiAssistantGateway;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.*;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class ConfiguredAssistantQuestionGateway implements AssistantQuestionGateway {
    private final JsonMapper json;
    private final ObjectProvider<BedrockRuntimeClient> bedrock;
    private final GeminiAssistantGateway gemini;
    private final String provider, url, model, bedrockModel;
    private final com.classforge.assistant.providers.AssistantProviderRegistry registry;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    public ConfiguredAssistantQuestionGateway(JsonMapper json, ObjectProvider<BedrockRuntimeClient> bedrock,
            @Value("${classforge.assistant.text.provider:llama-cpp}") String provider,
            @Value("${classforge.assistant.llama-url:http://127.0.0.1:8092}") String url,
            @Value("${classforge.assistant.llama-model:local-model}") String model,
            @Value("${classforge.assistant.bedrock.text-model:us.amazon.nova-2-lite-v1:0}") String bedrockModel,
            com.classforge.assistant.providers.AssistantProviderRegistry registry, GeminiAssistantGateway gemini) {
        this.json = json; this.bedrock = bedrock; this.provider = provider;
        this.url = url.replaceAll("/+$", ""); this.model = model; this.bedrockModel = bedrockModel;
        this.registry = registry;
        this.gemini = gemini;
    }
    @Override public String answer(String system, String prompt) {
        return answer(system, prompt, provider);
    }
    @Override public String answer(String system, String prompt, String selected) {
        String provider = registry.resolve(selected);
        try {
            String answer;
            if ("gemini".equals(provider)) {
                answer = gemini.answer(system, prompt);
            } else if ("bedrock".equals(provider)) {
                var client = bedrock.getIfAvailable();
                if (client == null) throw new AssistantPlanningException("Amazon Bedrock no está habilitado.");
                var result = client.converse(ConverseRequest.builder().modelId(bedrockModel)
                    .system(SystemContentBlock.builder().text(system).build())
                    .messages(Message.builder().role(ConversationRole.USER)
                        .content(ContentBlock.builder().text(prompt).build()).build())
                    .inferenceConfig(InferenceConfiguration.builder().temperature(0.0f).maxTokens(1600).build()).build());
                if (result.output() == null || result.output().message() == null)
                    throw new AssistantPlanningException("El proveedor no devolvió una respuesta.");
                answer = result.output().message().content().stream().filter(block -> block.text() != null)
                    .map(ContentBlock::text).collect(java.util.stream.Collectors.joining("\n"));
            } else if ("llama-cpp".equals(provider)) {
                var body = Map.of("model", model, "temperature", 0.0, "max_tokens", 1600, "stream", false,
                    "messages", List.of(Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", prompt)));
                var request = HttpRequest.newBuilder(URI.create(url + "/v1/chat/completions"))
                    .timeout(Duration.ofSeconds(120)).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
                var result = http.send(request, HttpResponse.BodyHandlers.ofString());
                if (result.statusCode() < 200 || result.statusCode() >= 300)
                    throw new AssistantPlanningException("El proveedor de texto no pudo responder. Revisa su disponibilidad y configuración.");
                var content = json.readTree(result.body()).at("/choices/0/message/content");
                answer = content.isString() ? content.asString() : "";
            } else {
                throw new AssistantPlanningException("El proveedor de texto configurado no admite consultas.");
            }
            if (answer == null || answer.isBlank() || answer.length() > 16000)
                throw new AssistantPlanningException("El proveedor devolvió una respuesta vacía o demasiado extensa.");
            return answer.strip();
        } catch (AssistantPlanningException exception) { throw exception; }
        catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssistantPlanningException("La consulta fue interrumpida.", exception);
        } catch (Exception exception) {
            throw new AssistantPlanningException("No se pudo consultar al proveedor de IA. Revisa su conexión y configuración.", exception);
        }
    }
}
