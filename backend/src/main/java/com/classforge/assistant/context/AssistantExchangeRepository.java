package com.classforge.assistant.context;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface AssistantExchangeRepository extends JpaRepository<AssistantExchange, Long> {
    @Query("select e from AssistantExchange e where e.scope = :scope and (:before is null or e.id < :before) order by e.id desc")
    List<AssistantExchange> history(String scope, Long before, Pageable page);
    void deleteByScope(String scope);
}
