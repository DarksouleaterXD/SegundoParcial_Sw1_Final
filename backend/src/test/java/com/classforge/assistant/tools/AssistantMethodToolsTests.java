package com.classforge.assistant.tools;

import com.classforge.assistant.*;
import com.classforge.assistant.vision.VisionCodeIdentifierCanonicalizer;
import com.classforge.collaboration.application.ProjectCommandExecutor;
import com.classforge.project.domain.document.*;
import com.classforge.project.validation.ProjectDocumentValidator;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class AssistantMethodToolsTests {
    final JsonMapper json = JsonMapper.builder().build();
    final AssistantEntityReferenceResolver entities = new AssistantEntityReferenceResolver();
    final DynamicUmlToolCatalog catalogs = new DynamicUmlToolCatalog(new AssistantIntentHintResolver());
    final UmlToolCallResolver tools = new UmlToolCallResolver(entities, new AssistantLiteralArgumentBinder(),
            new VisionCodeIdentifierCanonicalizer());
    final UmlAssistantCommandResolver commands = new UmlAssistantCommandResolver(new ProjectCommandExecutor(), new AssistantPlanNormalizer());
    ProjectDocument fixture(List<UmlMethod> methods) {
        var id = UUID.randomUUID();
        return new ProjectDocument("1.0", new UmlModel(List.of(new UmlClass(id, "Pedido", List.of(), methods)), List.of()),
            new DiagramLayout(Map.of(id, new DiagramNodeLayout(0,0,300,200))));
    }
    UmlMethod method(String name, String parameterType) {
        return new UmlMethod(UUID.randomUUID(), name, UmlVisibility.PUBLIC, "boolean",
            parameterType == null ? List.of() : List.of(new UmlMethod.Parameter("id", parameterType)));
    }
    ProjectDocument apply(String text, AssistantToolName tool, Map<String, Object> args, ProjectDocument document) {
        var catalog = catalogs.buildForTools(document, List.of(tool));
        var plan = tools.resolve(text, List.of(new AssistantToolInvocation("method", tool, json.valueToTree(args))), catalog, document).plan();
        plan = new AssistantSemanticCompiler(entities).compile(text, plan, document);
        plan = new AssistantPlanGroundingFilter(entities).sanitize(text, plan, document);
        var result = commands.preview(document, commands.resolve(plan, document));
        new ProjectDocumentValidator().validate(result);
        return result;
    }
    @Test void addsUpdatesAndDeletesOneMethodWithoutMutatingOtherMethodsOrTheOriginal() {
        var originalMethod = method("validar", null);
        var document = fixture(List.of(originalMethod));
        var added = apply("Agrega el método confirmar a Pedido", AssistantToolName.UPSERT_METHOD, Map.of(
            "existing_class", "Pedido", "name", "confirmar", "return_type", "void", "visibility", "PUBLIC", "parameters", List.of()), document);
        assertEquals(1, document.umlModel().classes().getFirst().methods().size());
        assertEquals(2, added.umlModel().classes().getFirst().methods().size());
        var newMethod = added.umlModel().classes().getFirst().methods().getLast();
        var updated = apply("En Pedido cambia el método confirmar a confirmarAhora", AssistantToolName.UPSERT_METHOD, Map.of(
            "existing_class", "Pedido", "existing_signature", "confirmar()", "name", "confirmarAhora", "return_type", "boolean",
            "visibility", "PUBLIC", "parameters", List.of()), added);
        assertEquals(newMethod.id(), updated.umlModel().classes().getFirst().methods().getLast().id());
        assertEquals(originalMethod, updated.umlModel().classes().getFirst().methods().getFirst());
        var deleted = apply("Elimina el método confirmarAhora de Pedido", AssistantToolName.DELETE_METHOD,
            Map.of("existing_class", "Pedido", "existing_signature", "confirmarAhora()"), updated);
        assertEquals(List.of(originalMethod), deleted.umlModel().classes().getFirst().methods());
    }
    @Test void rejectsUnmentionedMethodAndRequiresExactOverload() {
        var document = fixture(List.of(method("buscar", "UUID"), method("buscar", "String")));
        assertThrows(AssistantPlanningException.class, () -> apply("Borra método de Pedido", AssistantToolName.DELETE_METHOD,
            Map.of("existing_class", "Pedido", "existing_signature", "buscar(UUID)"), document));
        assertThrows(AssistantPlanningException.class, () -> apply("Borra método buscar de Pedido", AssistantToolName.DELETE_METHOD,
            Map.of("existing_class", "Pedido", "existing_signature", "buscar(UUID)"), document));
        var result = apply("Borra método buscar(UUID) de Pedido", AssistantToolName.DELETE_METHOD,
            Map.of("existing_class", "Pedido", "existing_signature", "buscar(UUID)"), document);
        assertEquals("String", result.umlModel().classes().getFirst().methods().getFirst().parameters().getFirst().type());
    }
}
