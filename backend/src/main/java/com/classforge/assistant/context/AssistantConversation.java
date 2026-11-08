package com.classforge.assistant.context;

import jakarta.persistence.*;

@Entity
@Table(name = "assistant_conversations")
public class AssistantConversation {
    @Id @Column(length = 73) private String id;
    @Column(nullable = false) private long generation;
    protected AssistantConversation() {}
    AssistantConversation(String id) { this.id = id; }
    long generation() { return generation; }
    void clear() { generation++; }
}
