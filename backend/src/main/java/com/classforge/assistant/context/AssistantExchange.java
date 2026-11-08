package com.classforge.assistant.context;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "assistant_exchanges", indexes = @Index(name = "idx_assistant_scope_id", columnList = "scope,id"))
public class AssistantExchange {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 73) private String scope;
    @Column(nullable = false, length = 1000) private String question;
    @Column(nullable = false, length = 16000) private String answer;
    @Column(nullable = false, length = 32) private String provider;
    @Column(nullable = false) private long revision;
    @Column(nullable = false) private boolean teamChatIncluded;
    @Column(nullable = false) private Instant createdAt;
    @Column(length = 80) private String authorName;
    protected AssistantExchange() {}
    AssistantExchange(String scope, String question, String answer, String provider, long revision, boolean teamChatIncluded) {
        this(scope, question, answer, provider, revision, teamChatIncluded, null);
    }
    AssistantExchange(String scope, String question, String answer, String provider, long revision,
                      boolean teamChatIncluded, String authorName) {
        this.scope = scope; this.question = question; this.answer = answer; this.provider = provider;
        this.revision = revision; this.teamChatIncluded = teamChatIncluded; this.createdAt = Instant.now();
        this.authorName = authorName;
    }
    public record View(long id, String question, String answer, String provider, long revision,
                       boolean teamChatIncluded, Instant createdAt, String authorName) {}
    public View view() { return new View(id, question, answer, provider, revision, teamChatIncluded, createdAt, authorName); }
}
