import { useService } from '../../core/view-state';
import { HttpClient } from '../../core/api/http-client';
import {
AssistantImagePlanResponse,
AssistantPlanResponse,
AssistantRuntimeHealthResponse,
} from './assistant-model';

export interface AssistantExchange {
  id: number; question: string; answer: string; provider: string; revision: number;
  teamChatIncluded: boolean; createdAt: string; authorName?: string | null;
}

export class AssistantApiService {
  history(projectId: string, before?: number, shared = false) {
    const path = `/api/projects/${projectId}/assistant/history`;
    return this.http.get<{entries: AssistantExchange[]; hasMore: boolean}>(shared ? `${path}/team` : path,
      {params: before === undefined ? {} : {before}});
  }
  clearHistory(projectId: string) { return this.http.delete<void>(`/api/projects/${projectId}/assistant/history`); }
  providers(projectId: string) {
    return this.http.get<{defaultProvider: string; providers: {id: string; name: string; model: string; enabled: boolean; note: string}[]}>(`/api/projects/${projectId}/assistant/providers`);
  }
  providerHealth(projectId: string, provider: string) {
    return this.http.get<AssistantRuntimeHealthResponse>(`/api/projects/${projectId}/assistant/providers/health`, {params:{provider}});
  }
  ask(projectId: string, text: string, includeTeamChat: boolean, shared = false) {
    return this.http.post<{ answer: string; baseRevision: number; modelChanged: boolean; teamChatIncluded: boolean; teamMessageIds: number[]; previousExchanges: number; memorySaved: boolean }>(
      `/api/projects/${projectId}/assistant/ask`, { text, includeTeamChat, shared },
    );
  }
  private readonly http =
    useService(HttpClient);

  plan(
    projectId: string,
    text: string,
  ) {
    return this.http.post<AssistantPlanResponse>(
      `/api/projects/${projectId}/assistant/plan`,
      { text },
    );
  }

  voice(
    projectId: string,
    audio: Blob,
  ) {
    const form =
      new FormData();

    form.append(
      'audio',
      audio,
      'classforge-voice.wav',
    );
    return this.http.post<AssistantPlanResponse>(
      `/api/projects/${projectId}/assistant/voice`,
      form,
    );
  }

  imagePlan(
    projectId: string,
    image: File,
    baseRevision: number,
  ) {
    const form =
      new FormData();

    form.append(
      'image',
      image,
      image.name,
    );

    form.append(
      'baseRevision',
      String(baseRevision),
    );

    return this.http.post<AssistantImagePlanResponse>(
      `/api/projects/${projectId}/assistant/image/plan`,
      form,
    );
  }

  health(
    projectId: string,
  ) {
    return this.http.get<AssistantRuntimeHealthResponse>(
      `/api/projects/${projectId}/assistant/health`,
    );
  }
}
