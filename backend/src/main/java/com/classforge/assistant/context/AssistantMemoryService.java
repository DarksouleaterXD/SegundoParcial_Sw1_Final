package com.classforge.assistant.context;

import com.classforge.project.access.ProjectAccessService;
import com.classforge.auth.persistence.UserRepository;
import com.classforge.project.persistence.ProjectEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class AssistantMemoryService {
    private final EntityManager entities;
    private final ProjectAccessService access;
    private final AssistantExchangeRepository exchanges;
    private final UserRepository users;
    public AssistantMemoryService(EntityManager entities, ProjectAccessService access,
                                  AssistantExchangeRepository exchanges, UserRepository users) {
        this.entities = entities; this.access = access; this.exchanges = exchanges;
        this.users = users;
    }
    public record ContextTurn(String question, String answer, long revision, String authorName) {}
    public record Snapshot(long generation, List<ContextTurn> turns) {}
    public record History(List<AssistantExchange.View> entries, boolean hasMore) {}
    private String scope(UUID user, UUID project) { return project + ":" + user; }
    private String teamScope(UUID project) { return project + ":team"; }
    private AssistantConversation lock(UUID user, UUID project) {
        access.requireRead(user, project);
        // Short database lock serializes initial creation, completion and deletion. Never held during inference.
        entities.find(ProjectEntity.class, project, LockModeType.PESSIMISTIC_WRITE);
        access.requireRead(user, project);
        var id = scope(user, project);
        var conversation = entities.find(AssistantConversation.class, id);
        if (conversation == null) { conversation = new AssistantConversation(id); entities.persist(conversation); }
        return conversation;
    }
    @Transactional
    public Snapshot snapshot(UUID user, UUID project) {
        var conversation = lock(user, project);
        return new Snapshot(conversation.generation(), recentTurns(scope(user, project)));
    }
    @Transactional(readOnly = true)
    public List<ContextTurn> teamContext(UUID user, UUID project) {
        access.requireEdit(user, project);
        return recentTurns(teamScope(project));
    }
    private List<ContextTurn> recentTurns(String scope) {
        var turns = new ArrayList<>(exchanges.history(scope, null, PageRequest.of(0, 10)).stream()
            .map(AssistantExchange::view).map(e -> new ContextTurn(e.question(),
                e.answer().substring(0, Math.min(2000, e.answer().length())), e.revision(), e.authorName())).toList());
        Collections.reverse(turns);
        return List.copyOf(turns);
    }
    @Transactional
    public boolean remember(UUID user, UUID project, long generation, String question, String answer,
                            String provider, long revision, boolean teamChat) {
        var conversation = lock(user, project);
        // Clearing the conversation also cancels persistence of any earlier in-flight response.
        if (generation != conversation.generation()) return false;
        exchanges.save(new AssistantExchange(scope(user, project), question, answer, provider, revision, teamChat));
        return true;
    }
    @Transactional(readOnly = true)
    public History history(UUID user, UUID project, Long before) {
        access.requireRead(user, project);
        return page(scope(user, project), before);
    }
    @Transactional(readOnly = true)
    public History teamHistory(UUID user, UUID project, Long before) {
        access.requireRead(user, project);
        return page(teamScope(project), before);
    }
    private History page(String scope, Long before) {
        var entries = exchanges.history(scope, before, PageRequest.of(0, 31));
        return new History(entries.stream().limit(30).map(AssistantExchange::view).toList(), entries.size() > 30);
    }
    @Transactional
    public void publish(UUID user, UUID project, String question, String answer, String provider, long revision) {
        access.requireEdit(user, project);
        String authorName = users.findById(user).orElseThrow().getDisplayName();
        exchanges.save(new AssistantExchange(teamScope(project), question, answer, provider, revision, true, authorName));
    }
    @Transactional
    public void clear(UUID user, UUID project) {
        lock(user, project).clear();
        exchanges.deleteByScope(scope(user, project));
    }
}
