package com.classforge.assistant;

import com.classforge.assistant.providers.AssistantProviderRegistry;
import com.classforge.assistant.tools.GeminiAssistantGateway;
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
    private final AssistantProviderRegistry providers;
    private final GeminiAssistantGateway gemini;

    public AssistantVoiceService(
            ProjectService projectService,
            SpeechToTextGateway speechToTextGateway,
            AssistantPlanService planService,
            AssistantProviderRegistry providers,
            GeminiAssistantGateway gemini
    ) {
        this.projectService =
                projectService;

        this.speechToTextGateway =
                speechToTextGateway;

        this.planService =
                planService;
        this.providers = providers;
        this.gemini = gemini;
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
        String selectedProvider = providers.resolve(provider);

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
            byte[] wav = audio.getBytes();
            if ("gemini".equals(selectedProvider)) {
                WhisperCppSpeechToTextGateway.validateWav(wav);
                transcript = gemini.transcribe(wav);
            } else {
                transcript = speechToTextGateway.transcribe(wav, audio.getOriginalFilename());
            }
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

        return planService.planVoice(userId, projectId, transcript, selectedProvider);
    }
}
