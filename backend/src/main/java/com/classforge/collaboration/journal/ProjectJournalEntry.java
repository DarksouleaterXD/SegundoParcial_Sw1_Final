package com.classforge.collaboration.journal;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_journal", indexes = {
    @Index(name = "idx_journal_project_kind_id", columnList = "project_id,kind,id"),
    @Index(name = "idx_journal_project_kind_time", columnList = "project_id,kind,created_at")
})
public class ProjectJournalEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "project_id", nullable = false) private UUID projectId;
    @Column(nullable = false, length = 16) @Enumerated(EnumType.STRING) private Kind kind;
    @Column(name = "actor_id", nullable = false) private UUID actorId;
    @Column(name = "actor_name", nullable = false, length = 80) private String actorName;
    @Column(nullable = false, length = 2000) private String body;
    @Column(length = 60) private String action;
    @Column(name = "element_id") private UUID elementId;
    private Long revision;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected ProjectJournalEntry() {}
    public ProjectJournalEntry(UUID projectId, Kind kind, UUID actorId, String actorName,
            String body, String action, UUID elementId, Long revision) {
        this.projectId = projectId; this.kind = kind; this.actorId = actorId;
        this.actorName = actorName; this.body = body; this.action = action;
        this.elementId = elementId; this.revision = revision; this.createdAt = Instant.now();
    }
    public enum Kind { CHAT, ACTIVITY }
    public record View(long id, UUID projectId, Kind kind, UUID actorId, String actorName,
            String body, String action, UUID elementId, Long revision, Instant createdAt) {}
    public View view() { return new View(id, projectId, kind, actorId, actorName, body, action, elementId, revision, createdAt); }
}
