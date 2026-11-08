package com.classforge.assistant;

import com.classforge.project.application.ProjectService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class AssistantVoiceService {

    private final ProjectService projectService;
    private final SpeechToTextGateway speechToTextGateway;
    private final AssistantPlanService planService;
    private final com.classforge.assistant.providers.AssistantProviderRegistry providers;

    public AssistantVoiceService(
            ProjectService projectService,
            SpeechToTextGateway speechToTextGateway,
            AssistantPlanService planService,
            com.classforge.assistant.providers.AssistantProviderRegistry providers
    ) {
        this.projectService =
                projectService;

        this.speechToTextGateway =
                speechToTextGateway;

        this.planService =
                planService;
        this.providers = providers;
    }

    public AssistantPlanResponse plan(
            UUID userId,
            UUID projectId,
            MultipartFile audio
    ) {
        return plan(userId, projectId, audio, null);
    }
    public AssistantPlanResponse plan(UUID userId, UUID projectId, MultipartFile audio, String provider) {
        projectService.get(
                userId,
                projectId
        );
        if (provider != null) providers.resolve(provider);

        if (
                audio == null
                        || audio.isEmpty()
        ) {
            throw new AssistantPlanningException(
                    "No se recibio audio para transcribir."
            );
        }

        if (
                audio.getSize()
                        > WhisperCppSpeechToTextGateway.MAX_AUDIO_BYTES
        ) {
            throw new AssistantPlanningException(
                    "El audio supera el limite de 4 MB."
            );
        }

        String transcript;

        try {
            transcript =
                    speechToTextGateway.transcribe(
                            audio.getBytes(),
                            audio.getOriginalFilename()
                    );
        } catch (
                AssistantPlanningException exception
        ) {
            throw exception.withDiagnostic(
                    AssistantPlanningStage.STT,
                    "VOICE",
                    null,
                    null
            );
        } catch (
                IOException exception
        ) {
            throw new AssistantPlanningException(
                    "No pudimos leer el audio recibido.",
                    exception
            ).withDiagnostic(
                    AssistantPlanningStage.STT,
                    "VOICE",
                    null,
                    null
            );
        }

        return provider == null ? planService.planVoice(userId, projectId, transcript)
                : planService.planVoice(userId, projectId, transcript, provider);
    }
}
