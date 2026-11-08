package com.classforge.assistant.providers;
import com.classforge.assistant.*;
import com.classforge.auth.security.CurrentUser;
import com.classforge.project.application.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;
@RestController
@RequestMapping("/api/projects/{projectId}/assistant/providers")
public class AssistantProviderController {
    private final AssistantProviderRegistry registry;
    private final AssistantRuntimeHealthService health;
    private final ProjectService projects;
    private final CurrentUser user;
    public AssistantProviderController(AssistantProviderRegistry registry, AssistantRuntimeHealthService health,
        ProjectService projects, CurrentUser user) { this.registry=registry; this.health=health; this.projects=projects; this.user=user; }
    @GetMapping public AssistantProviderRegistry.Configuration configuration(@PathVariable UUID projectId) {
        projects.get(user.id(), projectId); return registry.configuration();
    }
    @GetMapping("/health") public AssistantRuntimeHealthResponse health(@PathVariable UUID projectId, @RequestParam String provider) {
        projects.get(user.id(), projectId);
        return health.healthForProvider(user.id(), projectId, registry.resolve(provider));
    }
    @ExceptionHandler(ProjectNotFoundException.class) @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String,String> notFound() { return Map.of("error","PROJECT_NOT_FOUND"); }
}
