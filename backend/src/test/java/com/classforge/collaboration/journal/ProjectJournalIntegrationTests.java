package com.classforge.collaboration.journal;

import com.classforge.collaboration.application.*;
import com.classforge.collaboration.protocol.*;
import com.classforge.project.persistence.*;
import com.classforge.project.access.ProjectAccessRole;
import com.classforge.project.domain.document.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:journal-test;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class ProjectJournalIntegrationTests {
    @LocalServerPort int port;
    @Autowired JsonMapper json;
    @Autowired ProjectMembershipRepository memberships;
    @Autowired ProjectCollaborationService collaboration;
    final HttpClient http = HttpClient.newHttpClient();
    record Account(String token, UUID id) {}
    Account account(String name) throws Exception {
        var response = request("POST", "/api/auth/register", Map.of("displayName", name,
            "email", UUID.randomUUID()+"@journal.test", "password", "JournalTest2026!"), null);
        assertEquals(201, response.statusCode());
        var body = json.readTree(response.body());
        return new Account(body.get("accessToken").asString(), UUID.fromString(body.at("/user/id").asString()));
    }
    HttpResponse<String> request(String method, String path, Object data, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer "+token);
        return http.send(builder.method(method, data == null ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data))).build(), HttpResponse.BodyHandlers.ofString());
    }
    JsonNode get(String path, Account user) throws Exception {
        var response = request("GET", path, null, user.token()); assertEquals(200, response.statusCode());
        return json.readTree(response.body());
    }
    @Test void sharesHistoryWithMembersPaginatesValidatesAndRevokesAccess() throws Exception {
        var owner = account("Propietario"); var editor = account("Editor"); var stranger = account("Ajeno");
        var created = request("POST", "/api/projects", Map.of("name", "Equipo"), owner.token());
        assertEquals(201, created.statusCode());
        UUID projectId = UUID.fromString(json.readTree(created.body()).get("id").asString());
        String path = "/api/projects/"+projectId+"/journal";
        assertEquals(401, request("GET", path, null, null).statusCode());
        assertEquals(404, request("GET", path, null, stranger.token()).statusCode());
        assertEquals(404, request("POST", path, Map.of("body", "Intruso"), stranger.token()).statusCode());
        var member = memberships.save(new ProjectMembershipEntity(UUID.randomUUID(), projectId,
            editor.id(), ProjectAccessRole.EDITOR, Instant.now()));
        assertEquals(400, request("POST", path, Map.of("body", "   "), owner.token()).statusCode());
        assertEquals(400, request("POST", path, Map.of("body", "x".repeat(2001)), owner.token()).statusCode());
        for (int i=0; i<52; i++) {
            assertEquals(201, request("POST", path, Map.of("body", "Mensaje "+i), (i%2 == 0 ? owner : editor).token()).statusCode());
        }
        var latest = get(path, editor);
        assertEquals(50, latest.get("entries").size());
        assertEquals("Mensaje 51", latest.at("/entries/0/body").asString());
        assertEquals("Editor", latest.at("/entries/0/actorName").asString());
        var older = get(path+"?before="+latest.get("nextBefore").asLong(), owner);
        assertEquals(2, older.get("entries").size());
        assertTrue(older.get("nextBefore").isNull());
        assertEquals("Mensaje 0", older.at("/entries/1/body").asString());
        assertEquals(1, get(path+"?kind=ACTIVITY", owner).get("entries").size());
        memberships.deleteById(member.getId());
        assertEquals(404, request("GET", path, null, editor.token()).statusCode());
        assertEquals(404, request("GET", path+"?kind=ACTIVITY", null, editor.token()).statusCode());
        assertEquals(404, request("POST", path, Map.of("body", "Sin acceso"), editor.token()).statusCode());
    }
    @Test void journalsOnlyCommittedModelChangesWithActorElementAndRevision() throws Exception {
        var owner = account("Diseñador");
        var created = request("POST", "/api/projects", Map.of("name", "Modelo"), owner.token());
        UUID projectId = UUID.fromString(json.readTree(created.body()).get("id").asString());
        UUID classId = UUID.randomUUID();
        var operation = new ProjectOperationRequest(UUID.randomUUID(), projectId, UUID.randomUUID(), 0,
            new UmlCommandPayload(UUID.randomUUID(), Instant.now(), UmlCommandType.CREATE_CLASS,
                null, null, new UmlClass(classId, "Producto", List.of()),
                new DiagramNodeLayout(80,80,260,160), null,null,null,null));
        collaboration.apply(owner.id(), projectId, operation);
        assertThrows(ProjectOperationRejectedException.class, () -> collaboration.apply(owner.id(), projectId, operation));
        String path = "/api/projects/"+projectId+"/journal?kind=ACTIVITY";
        var entries = get(path, owner).get("entries");
        assertEquals(2, entries.size());
        assertEquals("CREATE_CLASS", entries.get(0).get("action").asString());
        assertEquals(classId.toString(), entries.get(0).get("elementId").asString());
        assertEquals(owner.id().toString(), entries.get(0).get("actorId").asString());
        assertEquals(1, entries.get(0).get("revision").asLong());
        assertEquals(200, request("PATCH", "/api/projects/"+projectId, Map.of("name", "Renombrado"), owner.token()).statusCode());
        assertEquals("PROJECT_RENAMED", get(path, owner).at("/entries/0/action").asString());
    }
}
