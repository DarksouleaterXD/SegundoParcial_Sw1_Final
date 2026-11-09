package com.classforge.assistant.providers;
import com.classforge.assistant.tools.*;
import com.classforge.project.domain.document.ProjectDocument;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import java.util.List;
@Component @Primary
public class SelectedAssistantToolGateway implements AssistantToolCallingGateway {
    private final AssistantProviderRegistry registry;
    private final ObjectProvider<LlamaNativeToolCallingGateway> llama;
    private final ObjectProvider<BedrockToolCallingGateway> bedrock;
    private final GeminiAssistantGateway gemini;
    public SelectedAssistantToolGateway(AssistantProviderRegistry registry, ObjectProvider<LlamaNativeToolCallingGateway> llama,
        ObjectProvider<BedrockToolCallingGateway> bedrock, GeminiAssistantGateway gemini) {
        this.registry = registry;
        this.llama = llama;
        this.bedrock = bedrock;
        this.gemini = gemini;
    }
    private AssistantToolCallingGateway gateway(String provider) {
        var selected = registry.resolve(provider);
        AssistantToolCallingGateway gateway = switch (selected) {
            case "gemini" -> gemini;
            case "bedrock" -> bedrock.getIfAvailable();
            default -> llama.getIfAvailable();
        };
        if (gateway == null) throw new com.classforge.assistant.AssistantPlanningException("El proveedor no está disponible en este servidor.");
        return gateway;
    }
    @Override public List<AssistantToolInvocation> call(String text, ProjectDocument document, AssistantToolCatalog catalog,
        List<AssistantToolConversationTurn> history) { return gateway(null).call(text, document, catalog, history); }
    @Override public List<AssistantToolInvocation> callWithProvider(String text, ProjectDocument document,
        AssistantToolCatalog catalog, String provider) { return gateway(provider).call(text, document, catalog); }
}
