package com.classforge.assistant.context;

import com.classforge.collaboration.journal.ProjectJournalEntry;
import com.classforge.collaboration.journal.ProjectJournalService;
import com.classforge.project.application.ProjectService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import java.util.*;

@Service
public class AssistantProjectContext {
    private final ProjectService projects;
    private final ProjectJournalService journal;
    private final JsonMapper json;
    public AssistantProjectContext(ProjectService projects, ProjectJournalService journal, JsonMapper json) {
        this.projects = projects; this.journal = journal; this.json = json;
    }
    public record TeamMessage(long id, String author, String text, String at) {}
    public record Activity(long id, String author, String action, String description, UUID elementId,
                           Long revision, String at) {}
    public record Snapshot(long revision, String payload, List<Long> messageIds) {}
    @Transactional(readOnly = true)
    public Snapshot snapshot(UUID userId, UUID projectId, boolean includeChat) {
        var project = projects.get(userId, projectId);
        var messages = includeChat ? journal.history(userId, projectId, ProjectJournalEntry.Kind.CHAT, null)
            .entries().stream().limit(20).sorted(Comparator.comparingLong(ProjectJournalEntry.View::id))
            .map(entry -> new TeamMessage(entry.id(), entry.actorName(),
                entry.body().substring(0, Math.min(600, entry.body().length())), entry.createdAt().toString())).toList()
            : List.<TeamMessage>of();
        var activity = journal.history(userId, projectId, ProjectJournalEntry.Kind.ACTIVITY, null).entries().stream()
            .filter(entry -> entry.revision() == null || entry.revision() <= project.revision())
            .limit(30)
            .map(entry -> new Activity(entry.id(), entry.actorName(), entry.action(), entry.body(),
                entry.elementId(), entry.revision(), entry.createdAt().toString())).toList();
        var payload = json.writeValueAsString(Map.of("projectName", project.name(),
            "revision", project.revision(), "model", project.document().umlModel(),
            "recentTeamMessages", messages, "recentActivity", activity));
        // Reject an oversized snapshot instead of sending an incomplete UML model silently.
        if (payload.length() > 100000)
            throw new com.classforge.assistant.AssistantPlanningException("El modelo es demasiado grande para esta consulta. Reduce su tamaño o consulta un proyecto más pequeño.");
        return new Snapshot(project.revision(), payload, messages.stream().map(TeamMessage::id).toList());
    }
}
