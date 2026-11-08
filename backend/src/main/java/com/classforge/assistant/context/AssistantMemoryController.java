package com.classforge.assistant.context;

import com.classforge.auth.security.CurrentUser;
import com.classforge.project.application.ProjectNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/assistant/history")
public class AssistantMemoryController {
    private final AssistantMemoryService memory;
    private final CurrentUser user;
    public AssistantMemoryController(AssistantMemoryService memory, CurrentUser user) { this.memory = memory; this.user = user; }
    @GetMapping public AssistantMemoryService.History history(@PathVariable UUID projectId,
            @RequestParam(required = false) Long before) { return memory.history(user.id(), projectId, before); }
    @GetMapping("/team")
    public AssistantMemoryService.History teamHistory(@PathVariable UUID projectId,
            @RequestParam(required = false) Long before) {
        return memory.teamHistory(user.id(), projectId, before);
    }
    @DeleteMapping @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(@PathVariable UUID projectId) { memory.clear(user.id(), projectId); }
    @ExceptionHandler(ProjectNotFoundException.class) @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> unavailable() { return Map.of("error", "PROJECT_NOT_FOUND"); }
}
