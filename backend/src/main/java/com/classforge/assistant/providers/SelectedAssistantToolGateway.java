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
    public SelectedAssistantToolGateway(AssistantProviderRegistry registry, ObjectProvider<LlamaNativeToolCallingGateway> llama,
        ObjectProvider<BedrockToolCallingGateway> bedrock) { this.registry=registry; this.llama=llama; this.bedrock=bedrock; }
    private AssistantToolCallingGateway gateway(String provider) {
        var selected = registry.resolve(provider);
        AssistantToolCallingGateway gateway = "bedrock".equals(selected) ? bedrock.getIfAvailable() : llama.getIfAvailable();
        if (gateway == null) throw new com.classforge.assistant.AssistantPlanningException("El proveedor no está disponible en este servidor.");
        return gateway;
    }
    @Override public List<AssistantToolInvocation> call(String text, ProjectDocument document, AssistantToolCatalog catalog,
        List<AssistantToolConversationTurn> history) { return gateway(null).call(text, document, catalog, history); }
    @Override public List<AssistantToolInvocation> callWithProvider(String text, ProjectDocument document,
        AssistantToolCatalog catalog, String provider) { return gateway(provider).call(text, document, catalog); }
}
