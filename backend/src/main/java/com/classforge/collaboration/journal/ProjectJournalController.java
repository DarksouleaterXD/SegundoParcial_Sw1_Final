package com.classforge.collaboration.journal;

import com.classforge.auth.security.CurrentUser;
import com.classforge.project.application.ProjectNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/journal")
public class ProjectJournalController {
    private final ProjectJournalService service;
    private final CurrentUser user;
    public ProjectJournalController(ProjectJournalService service, CurrentUser user) {
        this.service = service; this.user = user;
    }
    public record Message(@NotBlank @Size(max = 2000) String body) {}
    @GetMapping
    public ProjectJournalService.History history(@PathVariable UUID projectId,
            @RequestParam(defaultValue = "CHAT") ProjectJournalEntry.Kind kind,
            @RequestParam(required = false) Long before) {
        return service.history(user.id(), projectId, kind, before);
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ProjectJournalEntry.View send(@PathVariable UUID projectId, @Valid @RequestBody Message message) {
        return service.send(user.id(), projectId, message.body());
    }
    @ExceptionHandler(ProjectNotFoundException.class) @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> notFound() { return Map.of("error", "PROJECT_NOT_FOUND"); }
}
