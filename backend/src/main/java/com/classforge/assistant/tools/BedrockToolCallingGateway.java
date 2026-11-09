package com.classforge.assistant.tools;

import com.classforge.assistant.AssistantPlanningException;
import com.classforge.assistant.bedrock.BedrockConverseSupport;
import com.classforge.project.domain.document.ProjectDocument;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.bedrockruntime.model.Message;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

@Component
@ConditionalOnProperty(name = "classforge.assistant.bedrock.enabled", havingValue = "true")
public class BedrockToolCallingGateway implements AssistantToolCallingGateway {

    private final BedrockConverseSupport bedrock;
    private final String modelId;
    private final int maxTokens;

    public BedrockToolCallingGateway(
            BedrockConverseSupport bedrock,
            @Value("${classforge.assistant.bedrock.text-model:us.amazon.nova-2-lite-v1:0}") String modelId,
            @Value("${classforge.assistant.bedrock.text-max-completion-tokens:1024}") int maxTokens
    ) {
        this.bedrock = bedrock;
        this.modelId = required(modelId, "Bedrock text model");
        this.maxTokens = Math.max(128, maxTokens);
    }

    @Override
    public List<AssistantToolInvocation> call(
            String userText,
            ProjectDocument document,
            AssistantToolCatalog catalog,
            List<AssistantToolConversationTurn> history
    ) {
        if (catalog.definitions().isEmpty()) {
            throw new AssistantPlanningException("No hay herramientas UML disponibles para esta peticion.");
        }

        try {
            List<Message> messages = new ArrayList<>();
            // Preserve the same message ordering used by the llama.cpp adapter: the
            // active user request is followed by any prior tool-use/result context.
            messages.add(bedrock.userText(userText));
            if (history != null) {
                for (AssistantToolConversationTurn turn : history) {
                    for (int i = 0; i < turn.invocations().size(); i++) {
                        AssistantToolInvocation invocation = turn.invocations().get(i);
                        messages.add(bedrock.assistantToolUse(
                                invocation.id(),
                                invocation.name().wireName(),
                                invocation.arguments()
                        ));
                        messages.add(bedrock.userToolResult(invocation.id(), turn.results().get(i)));
                    }
                }
            }

            List<BedrockConverseSupport.ToolSpec> tools = catalog.definitions().stream()
                    .map(definition -> bedrock.toolSpec(
                            definition.name().wireName(),
                            definition.description(),
                            definition.parameters()
                    ))
                    .toList();
            String requiredTool = catalog.definitions().size() == 1
                    ? catalog.definitions().getFirst().name().wireName()
                    : null;

            BedrockConverseSupport.ToolUseResult result = bedrock.invokeToolChoice(
                    modelId,
                    AssistantToolPrompts.systemPrompt(catalog),
                    messages,
                    tools,
                    requiredTool,
                    maxTokens
            );

            AssistantToolName name = AssistantToolName.fromWireName(result.name());
            boolean exposed = catalog.definitions().stream().anyMatch(definition -> definition.name() == name);
            if (!exposed) {
                throw new AssistantPlanningException(
                        "Bedrock devolvio una tool no expuesta por ClassForge: " + result.name()
                );
            }
            JsonNode arguments = result.input();
            if (arguments == null || !arguments.isObject()) {
                throw new AssistantPlanningException(
                        "Bedrock devolvio argumentos invalidos para " + result.name() + "."
                );
            }
            return List.of(new AssistantToolInvocation(
                    result.id() == null || result.id().isBlank() ? "bedrock-tool-1" : result.id(),
                    name,
                    arguments
            ));
        } catch (AssistantPlanningException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new AssistantPlanningException(
                    "No pudimos ejecutar tool calling contra Amazon Bedrock con " + modelId + ".",
                    exception
            );
        }
    }

    private String required(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " is required");
        }
        return value.trim();
    }
}
