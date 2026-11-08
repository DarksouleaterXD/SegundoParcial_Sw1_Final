package com.classforge.collaboration.journal;

import com.classforge.auth.security.CurrentUser;
import com.classforge.project.application.ProjectNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/journal/summary")
public class ProjectActivitySummaryController {
    private final ProjectActivitySummaryService service;
    private final CurrentUser user;
    public ProjectActivitySummaryController(ProjectActivitySummaryService service, CurrentUser user) {
        this.service = service; this.user = user;
    }
    @GetMapping
    public ProjectActivitySummaryService.Summary summary(@PathVariable UUID projectId,
            @RequestParam(required = false) Instant from, @RequestParam(required = false) Instant to,
            @RequestParam(required = false) UUID actorId) {
        return service.summarize(user.id(), projectId, from, to, actorId);
    }
    @ExceptionHandler(ProjectNotFoundException.class) @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> notFound() { return Map.of("error", "PROJECT_NOT_FOUND"); }
}
