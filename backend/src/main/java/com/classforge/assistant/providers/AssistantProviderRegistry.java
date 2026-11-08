package com.classforge.assistant.providers;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
public class AssistantProviderRegistry {
    private final String defaultProvider, llamaModel, bedrockModel;
    private final boolean bedrockEnabled;
    public AssistantProviderRegistry(@Value("${classforge.assistant.text.provider:llama-cpp}") String defaultProvider,
        @Value("${classforge.assistant.llama-model:local-model}") String llamaModel,
        @Value("${classforge.assistant.bedrock.text-model:us.amazon.nova-2-lite-v1:0}") String bedrockModel,
        @Value("${classforge.assistant.bedrock.enabled:false}") boolean bedrockEnabled) {
        this.defaultProvider=defaultProvider; this.llamaModel=llamaModel; this.bedrockModel=bedrockModel; this.bedrockEnabled=bedrockEnabled;
    }
    public record Option(String id, String name, String model, boolean enabled, String note) {}
    public record Configuration(String defaultProvider, List<Option> providers) {}
    public Configuration configuration() {
        return new Configuration(defaultProvider, List.of(
            new Option("llama-cpp","llama.cpp",llamaModel,true,"Requiere un servidor de modelos accesible. Las propuestas requieren soporte de herramientas."),
            new Option("bedrock","Amazon Bedrock",bedrockEnabled ? bedrockModel : "",bedrockEnabled,
                bedrockEnabled ? "Configurado. Las credenciales y el acceso al modelo se validan al enviar una solicitud." : "No habilitado en este servidor.")
        ));
    }
    public String resolve(String requested) {
        String selected = requested == null || requested.isBlank() ? defaultProvider : requested;
        if (!"llama-cpp".equals(selected) && !("bedrock".equals(selected) && bedrockEnabled))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El proveedor seleccionado no está habilitado.");
        return selected;
    }
}
