package com.classforge.collaboration.journal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;
import java.time.Instant;

public interface ProjectJournalRepository extends JpaRepository<ProjectJournalEntry, Long> {
    @Query("select e.action, count(e) from ProjectJournalEntry e where e.projectId = :projectId and e.kind = :kind and e.createdAt >= :start and e.createdAt < :end and (:actorId is null or e.actorId = :actorId) group by e.action")
    List<Object[]> actionCounts(@Param("projectId") UUID projectId, @Param("kind") ProjectJournalEntry.Kind kind,
        @Param("start") Instant start, @Param("end") Instant end, @Param("actorId") UUID actorId);

    @Query("select e.actorId, e.actorName, count(e) from ProjectJournalEntry e where e.projectId = :projectId and e.kind = :kind and e.createdAt >= :start and e.createdAt < :end group by e.actorId, e.actorName order by e.actorName")
    List<Object[]> actorCounts(@Param("projectId") UUID projectId, @Param("kind") ProjectJournalEntry.Kind kind,
        @Param("start") Instant start, @Param("end") Instant end);
    @Query("select e from ProjectJournalEntry e where e.projectId = :projectId and e.kind = :kind and e.id < :before order by e.id desc")
    List<ProjectJournalEntry> history(@Param("projectId") UUID projectId,
        @Param("kind") ProjectJournalEntry.Kind kind, @Param("before") long before, Pageable pageable);
}
