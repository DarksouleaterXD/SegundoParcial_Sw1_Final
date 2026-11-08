package com.classforge.assistant.context;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record AssistantQuestionRequest(@NotBlank @Size(max = 1000) String text, Boolean includeTeamChat,
        @Size(max = 32) String provider, Boolean shared) {
    public AssistantQuestionRequest(String text, Boolean includeTeamChat, String provider) {
        this(text, includeTeamChat, provider, false);
    }
    public AssistantQuestionRequest(String text, Boolean includeTeamChat) { this(text, includeTeamChat, null); }
    public boolean isShared() { return Boolean.TRUE.equals(shared); }
    public boolean useTeamChat() { return isShared() || Boolean.TRUE.equals(includeTeamChat); }
}
