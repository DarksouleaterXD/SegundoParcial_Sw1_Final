package com.classforge.assistant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssistantPlanRequest(
        @NotBlank
        @Size(max = 1000)
        String text,
        @Size(max = 32) String provider
) {
    public AssistantPlanRequest(String text) { this(text, null); }
}
