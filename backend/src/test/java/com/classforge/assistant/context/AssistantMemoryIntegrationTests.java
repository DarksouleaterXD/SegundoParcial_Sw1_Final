package com.classforge.assistant.context;

import com.classforge.project.application.ProjectService;
import com.classforge.project.persistence.*;
import com.classforge.project.access.ProjectAccessRole;
import com.classforge.assistant.AssistantPlanningException;
import com.classforge.collaboration.application.ProjectCollaborationService;
import com.classforge.collaboration.journal.ProjectJournalService;
import com.classforge.collaboration.protocol.ProjectOperationRequest;
import com.classforge.collaboration.protocol.UmlCommandPayload;
import com.classforge.collaboration.protocol.UmlCommandType;
import com.classforge.project.domain.document.DiagramNodeLayout;
import com.classforge.project.domain.document.UmlClass;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:assistant-memory;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class AssistantMemoryIntegrationTests {
    @LocalServerPort int port;
    @Autowired JsonMapper json;
    @Autowired ProjectMembershipRepository memberships;
    @Autowired AssistantMemoryService memory;
    @Autowired AssistantQuestionService questions;
    @Autowired ProjectService projects;
    @Autowired ProjectCollaborationService collaboration;
    @Autowired ProjectJournalService journal;
    @MockitoBean AssistantQuestionGateway gateway;
    final HttpClient http = HttpClient.newHttpClient();
    record Account(UUID id, String token) {}
    HttpResponse<String> request(String method, String path, Object data, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer "+token);
        return http.send(builder.method(method, data == null ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data))).build(), HttpResponse.BodyHandlers.ofString());
    }
    Account account() throws Exception {
        return account("Diseñador");
    }
    Account account(String displayName) throws Exception {
        var response = request("POST", "/api/auth/register", Map.of("displayName", displayName,
            "email", UUID.randomUUID()+"@memory.test", "password", "MemoryTest2026!"), null);
        assertEquals(201, response.statusCode()); var body = json.readTree(response.body());
        return new Account(UUID.fromString(body.at("/user/id").asString()), body.get("accessToken").asString());
    }
    @Test void sharesAnswersWithMembersAndUsesCommittedActivityWithoutPrivateMemory() throws Exception {
        var owner = account("Fernando");
        var editor = account("Ana");
        var stranger = account();
        var project = projects.create(owner.id(), "Equipo");
        var projectId = project.id();
        var member = memberships.save(new ProjectMembershipEntity(UUID.randomUUID(), projectId, editor.id(),
            ProjectAccessRole.EDITOR, Instant.now()));
        var classId = UUID.randomUUID();
        collaboration.apply(owner.id(), projectId, new ProjectOperationRequest(UUID.randomUUID(), projectId,
            UUID.randomUUID(), 0, new UmlCommandPayload(UUID.randomUUID(), Instant.now(), UmlCommandType.CREATE_CLASS,
                null, null, new UmlClass(classId, "Pedido", List.of()), new DiagramNodeLayout(80, 80, 260, 160),
                null, null, null, null)));
        journal.send(owner.id(), projectId, "Vamos a modelar pedidos.");
        var privateSnapshot = memory.snapshot(editor.id(), projectId);
        assertTrue(memory.remember(editor.id(), projectId, privateSnapshot.generation(),
            "Pregunta privada", "Respuesta privada", "llama-cpp", 1, false));

        when(gateway.answer(anyString(), anyString(), eq("llama-cpp"))).thenAnswer(invocation -> {
            var prompt = json.readTree((String) invocation.getArgument(1));
            var activity = prompt.at("/projectContext/recentActivity/0");
            assertEquals("Fernando", activity.get("author").asString());
            assertEquals("CREATE_CLASS", activity.get("action").asString());
            assertEquals(classId.toString(), activity.get("elementId").asString());
            assertEquals(1, activity.get("revision").asLong());
            assertEquals("Vamos a modelar pedidos.", prompt.at("/projectContext/recentTeamMessages/0/text").asString());
            assertFalse(prompt.toString().contains("Respuesta privada"));
            if (prompt.get("question").asString().equals("¿Qué hizo Fernando?")) {
                assertTrue(prompt.get("previousQuestions").isEmpty());
                return "Fernando creó Pedido en la revisión 1.";
            }
            assertEquals("Ana", prompt.at("/previousQuestions/0/authorName").asString());
            return "La clase registrada es Pedido.";
        });

        String assistant = "/api/projects/" + projectId + "/assistant";
        String team = assistant + "/history/team";
        var first = request("POST", assistant + "/ask", Map.of("text", "¿Qué hizo Fernando?", "shared", true), editor.token());
        assertEquals(200, first.statusCode(), first.body());
        var fromOwner = request("GET", team, null, owner.token());
        var fromEditor = request("GET", team, null, editor.token());
        assertEquals(200, fromOwner.statusCode(), fromOwner.body());
        assertEquals(fromOwner.body(), fromEditor.body());
        var entry = json.readTree(fromOwner.body()).at("/entries/0");
        assertEquals("Ana", entry.get("authorName").asString());
        assertEquals("Fernando creó Pedido en la revisión 1.", entry.get("answer").asString());
        assertEquals(404, request("GET", team, null, stranger.token()).statusCode());
        assertEquals(404, request("POST", assistant + "/ask", Map.of("text", "Consulta ajena", "shared", true), stranger.token()).statusCode());
        assertEquals(204, request("DELETE", assistant + "/history", null, editor.token()).statusCode());
        assertEquals(1, memory.teamHistory(owner.id(), projectId, null).entries().size());
        var second = request("POST", assistant + "/ask", Map.of("text", "¿Qué clase era?", "shared", true), owner.token());
        assertEquals(200, second.statusCode(), second.body());
        assertEquals(1, json.readTree(second.body()).get("previousExchanges").asInt());
        memberships.deleteById(member.getId());
        assertEquals(404, request("GET", team, null, editor.token()).statusCode());
    }
    @Test void storesPrivateHistoryUsesBoundedMemoryPaginatesAndEnforcesAccess() throws Exception {
        var owner = account(); var editor = account(); var stranger = account();
        var project = projects.create(owner.id(), "Memoria");
        var member = memberships.save(new ProjectMembershipEntity(UUID.randomUUID(), project.id(), editor.id(), ProjectAccessRole.EDITOR, Instant.now()));
        String path = "/api/projects/"+project.id()+"/assistant/history";
        assertEquals(401, request("GET", path, null, null).statusCode());
        assertEquals(404, request("GET", path, null, stranger.token()).statusCode());
        assertEquals(404, request("DELETE", path, null, stranger.token()).statusCode());
        var snapshot = memory.snapshot(owner.id(), project.id());
        for (int i=0;i<32;i++) assertTrue(memory.remember(owner.id(), project.id(), snapshot.generation(), "Pregunta "+i, "Respuesta "+i, "llama-cpp", 0, false));
        var first = memory.history(owner.id(), project.id(), null);
        assertEquals(30, first.entries().size()); assertTrue(first.hasMore());
        var older = memory.history(owner.id(), project.id(), first.entries().getLast().id());
        assertEquals(2, older.entries().size()); assertFalse(older.hasMore());
        assertTrue(memory.history(editor.id(), project.id(), null).entries().isEmpty());
        assertEquals(10, memory.snapshot(owner.id(), project.id()).turns().size());
        when(gateway.answer(anyString(), anyString(), eq("llama-cpp"))).thenAnswer(invocation -> {
            var prompt = json.readTree((String) invocation.getArgument(1));
            assertEquals(10, prompt.get("previousQuestions").size());
            assertEquals("Pregunta 22", prompt.at("/previousQuestions/0/question").asString());
            return "Consulta guardada";
        });
        var answer = questions.ask(owner.id(), project.id(), new AssistantQuestionRequest("Otra pregunta", false, "llama-cpp"));
        assertTrue(answer.memorySaved()); assertEquals(10, answer.previousExchanges());
        assertEquals("Consulta guardada", memory.history(owner.id(), project.id(), null).entries().getFirst().answer());
        assertEquals(204, request("DELETE", path, null, owner.token()).statusCode());
        assertTrue(memory.history(owner.id(), project.id(), null).entries().isEmpty());
        assertFalse(memory.remember(owner.id(), project.id(), snapshot.generation(), "Antigua", "Tardía", "llama-cpp", 0, false));
        memberships.deleteById(member.getId());
        assertEquals(404, request("GET", path, null, editor.token()).statusCode());
        assertEquals(404, request("DELETE", path, null, editor.token()).statusCode());
    }
    @Test void doesNotStoreFailuresOrRestoreHistoryClearedDuringInference() throws Exception {
        var owner = account(); var project = projects.create(owner.id(), "Consulta");
        when(gateway.answer(anyString(), anyString(), anyString())).thenThrow(new AssistantPlanningException("Sin conexión"));
        assertThrows(AssistantPlanningException.class, () -> questions.ask(owner.id(), project.id(), new AssistantQuestionRequest("Pregunta", false, "llama-cpp")));
        assertTrue(memory.history(owner.id(), project.id(), null).entries().isEmpty());
        doAnswer(invocation -> {
            memory.clear(owner.id(), project.id()); return "Respuesta tardía";
        }).when(gateway).answer(anyString(), anyString(), anyString());
        assertFalse(questions.ask(owner.id(), project.id(), new AssistantQuestionRequest("Pregunta", false, "llama-cpp")).memorySaved());
        assertTrue(memory.history(owner.id(), project.id(), null).entries().isEmpty());
    }
}
