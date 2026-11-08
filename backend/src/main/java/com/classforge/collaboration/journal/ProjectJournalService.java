package com.classforge.collaboration.journal;

import com.classforge.auth.persistence.UserRepository;
import com.classforge.project.access.ProjectAccessService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class ProjectJournalService {
    private final ProjectJournalRepository repository;
    private final ProjectAccessService access;
    private final UserRepository users;
    public ProjectJournalService(ProjectJournalRepository repository, ProjectAccessService access, UserRepository users) {
        this.repository = repository; this.access = access; this.users = users;
    }
    public record History(List<ProjectJournalEntry.View> entries, Long nextBefore) {}
    @Transactional(readOnly = true)
    public History history(UUID userId, UUID projectId, ProjectJournalEntry.Kind kind, Long before) {
        access.requireRead(userId, projectId);
        var entries = repository.history(projectId, kind, before == null ? Long.MAX_VALUE : before, PageRequest.of(0, 51));
        var page = entries.stream().limit(50).map(ProjectJournalEntry::view).toList();
        return new History(page, entries.size() > 50 ? page.getLast().id() : null);
    }
    @Transactional
    public ProjectJournalEntry.View send(UUID userId, UUID projectId, String body) {
        access.requireEdit(userId, projectId);
        return append(userId, projectId, ProjectJournalEntry.Kind.CHAT, body.strip(), null, null, null);
    }
    // Called inside the model mutation transaction: rejected/rolled-back changes leave no activity.
    @Transactional
    public void activity(UUID userId, UUID projectId, String action, String description, UUID elementId, long revision) {
        append(userId, projectId, ProjectJournalEntry.Kind.ACTIVITY, description, action, elementId, revision);
    }
    private ProjectJournalEntry.View append(UUID userId, UUID projectId, ProjectJournalEntry.Kind kind,
            String body, String action, UUID elementId, Long revision) {
        var actor = users.findById(userId).orElseThrow();
        return repository.save(new ProjectJournalEntry(projectId, kind, userId, actor.getDisplayName(),
                body, action, elementId, revision)).view();
    }
}
