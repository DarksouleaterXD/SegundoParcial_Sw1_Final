import { DestroyScope,untracked,useService,signal,untilDestroyed } from '../../core/view-state';
import { FormControl,Validators } from '../../core/forms';
import { HttpErrorResponse } from '../../core/api/http-client';
import { AssistantChangeReview,reviewAssistantCommand } from './assistant-change-review';

import {
finalize,
} from 'rxjs';

import {
ProjectWorkspaceStore,
} from '../state/project-workspace.store';
import {
AssistantApiService,
} from './assistant-api.service';
import {
BrowserWavRecorderService,
} from './browser-wav-recorder.service';
import {
AssistantAttributePlan,
AssistantPlanAction,
AssistantPlanResponse,
AssistantRuntimeHealthResponse,
} from './assistant-model';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  context?: { revision: number; messages: number; included: boolean; changed: boolean; provider: string };
}

export class ProjectAssistantPanelComponent
   {
  private readonly api = useService(AssistantApiService);
  private readonly destroyRef = useService(DestroyScope);
  readonly mode = signal<'QUERY' | 'CHANGE'>('QUERY');
  readonly provider = signal('');
  selectProvider(provider: string): void {
    if (provider === untracked(() => this.provider())) return;
    this.provider.set(provider); this.runtimeHealth.set(null); this.plan.set(null); this.review.set(null);
    this.deletionAcknowledged.set(false); this.error.set(null);
  }
  readonly includeTeamChat = signal(false);
  readonly sharedQuery = signal(false);
  readonly historyRefresh = signal(0);
  private readonly recorder = useService(BrowserWavRecorderService);
  private voiceTimer: number | null = null;

  readonly store = useService(ProjectWorkspaceStore);
  readonly prompt = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(1000)],
  });
  readonly planning = signal(false);
  readonly runtimeHealth = signal<AssistantRuntimeHealthResponse | null>(null);
  readonly voiceState = signal<'idle' | 'recording' | 'transcribing'>('idle');
  readonly plan = signal<AssistantPlanResponse | null>(null);
  readonly review = signal<AssistantChangeReview | null>(null);
  readonly deletionAcknowledged = signal(false);
  readonly error = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);

  send(): void {
    if (!this.provider()) return;
    if (this.mode() === 'QUERY') { this.ask(); return; }
    const project = this.store.project();
    const text = this.prompt.value.trim();
    if (!project || !text || this.prompt.invalid || this.planning() || this.voiceBusy()) {
      return;
    }
    if (!this.runtimeReadyForText()) {
      this.error.set('El proveedor de texto no está disponible. Inícialo y pulsa Comprobar conexión.');
      return;
    }
    const blockReason = this.store.assistantPlanningBlockReason();
    if (blockReason) {
      this.error.set(blockReason);
      return;
    }

    this.messages.update((messages) => [...messages, { role: 'user', text }]);
    this.error.set(null);
    this.plan.set(null);
    this.planning.set(true);
    this.api.plan(project.id, text, this.provider()).pipe(
      finalize(() => this.planning.set(false)),
    ).subscribe({
      next: (plan) => {
        if (!this.acceptFreshPlan(plan)) {
          return;
        }
        this.messages.update((messages) => [
          ...messages,
          { role: 'assistant', text: plan.summary },
        ]);
      },
      error: () => {
        const message = 'El asistente no está disponible en este momento.';
        this.error.set(message);
        this.messages.update((messages) => [
          ...messages,
          { role: 'assistant', text: message },
        ]);
      },
    });
  }

  private ask(): void {
    const project = this.store.project();
    const text = this.prompt.value.trim();
    if (!project || !text || this.prompt.invalid || this.planning() || this.voiceBusy()) return;
    this.error.set(null); this.planning.set(true);
    const provider = this.provider();
    this.api.ask(project.id, text, this.includeTeamChat(), provider, this.sharedQuery()).pipe(
      untilDestroyed(this.destroyRef), finalize(() => this.planning.set(false)),
    ).subscribe({
      next: result => {
        if (this.store.project()?.id !== project.id) return;
        this.historyRefresh.update(value => value + 1);
        if (!result.memorySaved) this.error.set('El historial se borró durante la consulta. Esta respuesta no se guardó; vuelve a consultar.');
        else if (result.modelChanged) this.error.set('El modelo cambió durante la consulta. La respuesta guardada corresponde a una revisión anterior.');
        this.prompt.setValue('');
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(error.status === 404 ? 'Ya no tienes acceso a este proyecto.'
          : error.status === 503 ? (error.error?.message ?? 'El proveedor de IA no está disponible.')
          : 'No se pudo realizar la consulta. Tu pregunta sigue disponible para reintentar.');
      },
    });
  }

  apply(): void {
    const plan = this.plan();
    if (!plan || !plan.command || !this.canApplyPlan(plan)) {
      return;
    }
    const result = this.store.applyAssistantCommand(plan.command, plan.baseRevision);
    if (!result.applied) {
      this.error.set(result.reason ?? 'No se pudo aplicar el plan.');
      this.plan.set(null);
      return;
    }
    this.messages.update((messages) => [
      ...messages,
      { role: 'assistant', text: 'Propuesta incorporada al editor. Comprueba el estado de sincronización para confirmar el guardado.' },
    ]);
    this.plan.set(null);
    this.prompt.setValue('');
    this.error.set(null);
  }

  discard(): void {
    this.plan.set(null);
    this.review.set(null);
    this.deletionAcknowledged.set(false);
    this.error.set(null);
  }

  async toggleVoice(): Promise<void> {
    if (this.voiceState() === 'recording') {
      await this.finishVoice();
      return;
    }
    if (this.voiceBusy() || this.planning()) {
      return;
    }
    if (!this.runtimeReadyForVoice()) {
      this.error.set('Para usar el micrófono deben estar disponibles el proveedor de texto y Whisper. Pulsa Comprobar conexión para ver su estado.');
      return;
    }
    const blockReason = this.store.assistantPlanningBlockReason();
    if (blockReason) {
      this.error.set(blockReason);
      return;
    }
    await this.startVoice();
  }

  voiceBusy(): boolean {
    return this.voiceState() !== 'idle';
  }

  voiceLabel(): string {
    switch (this.voiceState()) {
      case 'recording': return 'Detener';
      case 'transcribing': return 'Procesando...';
      default: return 'Hablar';
    }
  }

  canApplyPlan(plan: AssistantPlanResponse): boolean {
    const review = this.review();
    return !!plan.command && !!review && review.commandId === plan.command.commandId
      && review.changes.length > 0
      && (review.removed === 0 || this.deletionAcknowledged())
      && this.store.revision() === plan.baseRevision
      && !this.store.assistantPlanningBlockReason();
  }

  actionCount(plan: AssistantPlanResponse): number {
    return plan.command?.type === 'BATCH' ? plan.command.commands.length : 0;
  }

  actionLabel(action: AssistantPlanAction): string {
    switch (action.type) {
      case 'SET_METHODS': return `Actualizar métodos de ${action.className ?? ''}`;
      case 'CREATE_CLASS': return `Crear clase ${action.className ?? ''}`.trim();
      case 'RENAME_CLASS': return `Renombrar ${action.className ?? ''} a ${action.newName ?? ''}`.trim();
      case 'DELETE_CLASS': return `Eliminar clase ${action.className ?? ''}`.trim();
      case 'ADD_ATTRIBUTES': return `Agregar atributos a ${action.className ?? ''}`.trim();
      case 'UPDATE_ATTRIBUTE': return `Modificar ${action.className ?? ''}.${action.attributeName ?? ''}`;
      case 'DELETE_ATTRIBUTE': return `Eliminar ${action.className ?? ''}.${action.attributeName ?? ''}`;
      case 'CREATE_RELATIONSHIP': return `Crear ${action.relationshipType ?? 'relacion'}: ${action.sourceClassName ?? ''} -> ${action.targetClassName ?? ''}`;
      case 'UPDATE_RELATIONSHIP': return `Modificar relacion: ${action.sourceClassName ?? ''} -> ${action.targetClassName ?? ''}`;
      case 'DELETE_RELATIONSHIP': return `Eliminar relacion: ${action.sourceClassName ?? ''} -> ${action.targetClassName ?? ''}`;
    }
  }

  attributeLabel(attribute: AssistantAttributePlan): string {
    return `${attribute.name ?? '?'}: ${attribute.dataType ?? 'STRING'}${attribute.identifier ? ' · ID' : ''}`;
  }

  dispose(): void {
    this.clearVoiceTimer();
    void this.recorder.cancel();
  }

  private async startVoice(): Promise<void> {
    this.error.set(null);
    this.plan.set(null);
    try {
      await this.recorder.start();
      this.voiceState.set('recording');
      this.voiceTimer = window.setTimeout(() => void this.finishVoice(), 20_000);
    } catch {
      await this.recorder.cancel();
      this.voiceState.set('idle');
      this.error.set('No pudimos iniciar el micrófono.');
    }
  }

  private async finishVoice(): Promise<void> {
    if (this.voiceState() !== 'recording') {
      return;
    }
    this.clearVoiceTimer();
    this.voiceState.set('transcribing');
    try {
      const audio = await this.recorder.stop();
      const project = this.store.project();
      if (!project) {
        throw new Error();
      }
      this.planning.set(true);
      this.error.set(null);
      this.plan.set(null);
      this.api.voice(project.id, audio, this.provider()).pipe(
        finalize(() => {
          this.planning.set(false);
          this.voiceState.set('idle');
        }),
      ).subscribe({
        next: (plan) => {
          if (!this.acceptFreshPlan(plan)) {
            return;
          }
          this.messages.update((messages) => [
            ...messages,
            { role: 'user', text: `Voz: ${plan.transcript}` },
            { role: 'assistant', text: plan.summary },
          ]);
        },
        error: () => this.error.set('El asistente no está disponible en este momento.'),
      });
    } catch {
      await this.recorder.cancel();
      this.voiceState.set('idle');
      this.planning.set(false);
      this.error.set('No pudimos procesar la grabación.');
    }
  }

  private runtimeReadyForText(): boolean {
    return this.runtimeHealth()?.readyForText ?? false;
  }

  private runtimeReadyForVoice(): boolean {
    return this.runtimeHealth()?.readyForVoice ?? false;
  }

  private acceptFreshPlan(plan: AssistantPlanResponse): boolean {
    this.review.set(null);
    this.deletionAcknowledged.set(false);
    if (this.store.revision() !== plan.baseRevision) {
      this.plan.set(null);
      this.error.set('El proyecto cambió mientras se preparaba el plan. Vuelve a intentarlo.');
      return false;
    }
    const blockReason = this.store.assistantPlanningBlockReason();
    if (blockReason) {
      this.plan.set(null);
      this.error.set(blockReason);
      return false;
    }
    const document = this.store.documentDraft();
    if (!plan.command || !document) {
      this.plan.set(null);
      this.error.set('La propuesta no contiene cambios que se puedan revisar.');
      return false;
    }
    try {
      this.review.set(reviewAssistantCommand(document, plan.command));
    } catch {
      this.plan.set(null);
      this.error.set('No se pudo preparar una vista previa de la propuesta. Vuelve a solicitarla.');
      return false;
    }
    this.plan.set(plan);
    return true;
  }

  private clearVoiceTimer(): void {
    if (this.voiceTimer !== null) {
      window.clearTimeout(this.voiceTimer);
      this.voiceTimer = null;
    }
  }
}
