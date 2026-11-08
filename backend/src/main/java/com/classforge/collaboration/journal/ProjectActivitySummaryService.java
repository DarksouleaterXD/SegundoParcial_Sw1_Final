package com.classforge.collaboration.journal;

import com.classforge.project.access.ProjectAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

@Service
public class ProjectActivitySummaryService {
    private final ProjectJournalRepository journal;
    private final ProjectAccessService access;
    public ProjectActivitySummaryService(ProjectJournalRepository journal, ProjectAccessService access) {
        this.journal = journal; this.access = access;
    }
    public record ActionCount(String action, long count) {}
    public record Contributor(UUID id, String name, long count) {}
    public record Summary(Instant from, Instant to, Instant generatedAt, UUID actorId, long total,
        List<ActionCount> actions, List<Contributor> contributors) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Summary summarize(UUID userId, UUID projectId, Instant from, Instant to, UUID actorId) {
        access.requireRead(userId, projectId);
        Instant now = Instant.now();
        Instant end = to == null ? now : to;
        Instant start = from == null ? end.minus(Duration.ofDays(7)) : from;
        if (!start.isBefore(end) || Duration.between(start, end).compareTo(Duration.ofDays(90)) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El período debe ser válido y no superar 90 días.");
        }
        var actions = journal.actionCounts(projectId, ProjectJournalEntry.Kind.ACTIVITY, start, end, actorId)
            .stream().map(row -> new ActionCount((String) row[0], ((Number) row[1]).longValue()))
            .sorted(Comparator.comparingLong(ActionCount::count).reversed().thenComparing(ActionCount::action,
                Comparator.nullsLast(Comparator.naturalOrder()))).toList();
        Map<UUID, Contributor> contributors = new LinkedHashMap<>();
        for (Object[] row : journal.actorCounts(projectId, ProjectJournalEntry.Kind.ACTIVITY, start, end)) {
            UUID id = (UUID) row[0]; long count = ((Number) row[2]).longValue();
            var previous = contributors.get(id);
            contributors.put(id, new Contributor(id, (String) row[1], count + (previous == null ? 0 : previous.count())));
        }
        return new Summary(start, end, now, actorId, actions.stream().mapToLong(ActionCount::count).sum(), actions,
            contributors.values().stream().sorted(Comparator.comparingLong(Contributor::count).reversed()
                .thenComparing(Contributor::name)).toList());
    }
}
