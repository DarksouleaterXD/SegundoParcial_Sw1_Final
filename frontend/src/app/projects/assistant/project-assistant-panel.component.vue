<script lang="ts">
import { defineComponent } from 'vue';
import { ProjectAssistantPanelComponent } from './project-assistant-panel.component';
import { assistantProviderLabel } from './assistant-model';
import { present, setupView } from '../../core/view-state';
import AssistantHistoryComponentView from './assistant-history.component.vue';
import AssistantProviderSettingsComponentView from './assistant-provider-settings.component.vue';

export default defineComponent({
  name: 'ProjectAssistantPanelComponentView',
  components: { AssistantHistoryComponentView, AssistantProviderSettingsComponentView },

  setup(props, { emit }) {
    return {
      ...setupView(ProjectAssistantPanelComponent, props, emit, {}),
      present,
      assistantProviderLabel,

      asValue: (target: EventTarget | null) => target as HTMLInputElement,
    };
  },
});
</script>

<template>
  <app-project-assistant-panel class="studio-view">
    <section class="assistant-panel">
      <header class="assistant-header">
        <div class="assistant-title">
          <span aria-hidden="true" class="material-symbols-rounded">smart_toy</span>
          <div>
            <p class="assistant-kicker">MODELADO ASISTIDO</p>
            <h2>Asistente UML</h2>
            <p class="assistant-description">
              Consulta tu modelo o revisa una propuesta de cambios antes de aplicarla.
            </p>
          </div>
        </div>
      </header>
      <div class="assistant-workspace">
        <div class="assistant-conversation">
          <div role="group" aria-label="Modo del asistente" class="assistant-mode">
            <button
              type="button"
              :disabled="planning() || voiceBusy()"
              :aria-pressed="mode() === 'QUERY'"
              @click="mode.set('QUERY')"
              :class="{ active: mode() === 'QUERY' }"
            >
              Consultar
            </button>
            <button
              type="button"
              :disabled="planning() || voiceBusy()"
              :aria-pressed="mode() === 'CHANGE'"
              @click="mode.set('CHANGE')"
              :class="{ active: mode() === 'CHANGE' }"
            >
              Proponer cambios
            </button>
          </div>
          <template v-if="mode() === 'QUERY'">
            <template v-if="store.project()">
              <template v-for="project in present(store.project())">
                <AssistantHistoryComponentView
                  :project-id="project.id"
                  :shared="sharedQuery()"
                  :refresh="historyRefresh()"
                  :busy="planning() || voiceBusy()"
                ></AssistantHistoryComponentView>
              </template>
            </template>
          </template>
          <template v-if="mode() === 'CHANGE'">
            <div aria-live="polite" class="assistant-chat">
              <template v-if="messages().length === 0">
                <div class="assistant-empty">
                  <span aria-hidden="true" class="material-symbols-rounded">chat</span>
                  <p>
                    {{
                      mode() === 'QUERY'
                        ? 'Prueba: “¿Qué clases tiene el modelo y cómo se relacionan?”'
                        : 'Prueba: “Crea una clase Animal con id Long y nombre String”.'
                    }}
                  </p>
                </div>
              </template>
              <template v-for="(message, $index) in messages()" :key="$index">
                <div :class="{ 'is-user': message.role === 'user' }" class="assistant-message">
                  {{ message.text }}
                  <template v-if="message.context">
                    <template v-for="context in present(message.context)">
                      <small class="answer-context">
                        {{ assistantProviderLabel(context.provider) }} · Modelo:
                        revisión {{ context.revision }} ·
                        {{
                          context.included
                            ? context.messages + ' mensajes del equipo'
                            : 'Sin conversación del equipo'
                        }}
                      </small>
                      <template v-if="context.changed || store.revision() !== context.revision">
                        <small class="query-warning">
                          El modelo cambió. Vuelve a consultar para obtener una respuesta actualizada.
                        </small>
                      </template>
                    </template>
                  </template>
                </div>
              </template>
              <template v-if="voiceState() === 'transcribing'">
                <div class="assistant-thinking">
                  <cf-spinner
                    role="progressbar"
                    aria-label="Cargando"
                    style="--spinner-size: 18px"
                    class="studio-spinner"
                  ></cf-spinner>
                  Procesando...
                </div>
              </template>
              <template v-else-if="planning()">
                <div class="assistant-thinking">
                  <cf-spinner
                    role="progressbar"
                    aria-label="Cargando"
                    style="--spinner-size: 18px"
                    class="studio-spinner"
                  ></cf-spinner>
                  Interpretando...
                </div>
              </template>
            </div>
          </template>
          <template v-if="mode() === 'CHANGE'">
            <template v-if="plan()">
              <template v-for="currentPlan in present(plan())">
                <div class="assistant-preview">
                  <div class="preview-title">
                    <span aria-hidden="true" class="material-symbols-rounded">rule</span>
                    <div>
                      <strong>Revisa la propuesta</strong>
                      <small>
                        Basada en la revisión {{ currentPlan.baseRevision }} ·
                        {{ actionCount(currentPlan) }} acciones
                      </small>
                    </div>
                  </div>
                  <p>{{ currentPlan.summary }}</p>
                  <template v-if="review()">
                    <template v-for="comparison in present(review())">
                      <div class="review-counts">
                        <span>+ {{ comparison.added }} añadidos</span>
                        <span>↔ {{ comparison.updated }} modificados</span>
                        <span>− {{ comparison.removed }} eliminados</span>
                      </div>
                      <p class="review-copy">
                        Esta vista compara el resultado de los cambios con el modelo actual. Las eliminaciones
                        incluyen los atributos y conexiones que desaparecen con una clase.
                      </p>
                      <div
                        tabindex="0"
                        aria-label="Comparación de cambios propuestos"
                        class="change-comparison"
                      >
                        <template v-for="(change, $index) in comparison.changes" :key="change.id">
                          <article :class="{ removed: change.kind === 'REMOVED' }">
                            <header>
                              <strong>{{ change.label }}</strong>
                              <span>
                                {{
                                  change.kind === 'ADDED'
                                    ? 'Añadir'
                                    : change.kind === 'REMOVED'
                                      ? 'Eliminar'
                                      : 'Modificar'
                                }}
                              </span>
                            </header>
                            <div class="change-values">
                              <div>
                                <small>ACTUAL</small>
                                <p>{{ change.before ?? 'No existe' }}</p>
                              </div>
                              <div>
                                <small>PROPUESTA</small>
                                <p>{{ change.after ?? 'Se elimina' }}</p>
                              </div>
                            </div>
                          </article>
                        </template>
                        <template v-if="!comparison.changes?.length">
                          <p class="review-copy">La propuesta no produce cambios en el modelo.</p>
                        </template>
                      </div>
                      <template v-if="comparison.removed > 0">
                        <label class="deletion-confirmation">
                          <input
                            type="checkbox"
                            :checked="deletionAcknowledged()"
                            @change="deletionAcknowledged.set(asValue($event.target).checked)"
                          />
                          He revisado los {{ comparison.removed }} elementos que se eliminarán.
                        </label>
                      </template>
                    </template>
                  </template>
                  <template v-if="store.revision() !== currentPlan.baseRevision">
                    <p role="status" class="review-stale">
                      El proyecto cambió. Descarta esta propuesta y solicita una nueva antes de aplicar
                      cambios.
                    </p>
                  </template>
                  <template v-if="store.assistantPlanningBlockReason()">
                    <template v-for="reason in present(store.assistantPlanningBlockReason())">
                      <p role="status" class="review-stale">{{ reason }}</p>
                    </template>
                  </template>
                  <details class="semantic-details">
                    <summary>Ver instrucciones interpretadas</summary>
                    <div class="assistant-intents">
                      <template v-for="(action, $index) in currentPlan.plan.actions" :key="$index">
                        <div class="assistant-intent">
                          <strong>{{ actionLabel(action) }}</strong>
                          <template v-if="action.attributes.length > 0">
                            <ul>
                              <template v-for="(attribute, $index) in action.attributes" :key="$index">
                                <li>{{ attributeLabel(attribute) }}</li>
                              </template>
                            </ul>
                          </template>
                        </div>
                      </template>
                    </div>
                  </details>
                  <div class="preview-actions">
                    <button
                      type="button"
                      @click="discard()"
                      class="studio-button-base studio-button cf-button-secondary"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      :disabled="!canApplyPlan(currentPlan)"
                      @click="apply()"
                      class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
                    >
                      Aplicar propuesta
                    </button>
                  </div>
                </div>
              </template>
            </template>
          </template>
          <template v-if="error()">
            <div role="alert" class="assistant-error">
              <span aria-hidden="true" class="material-symbols-rounded">error</span>
              {{ error() }}
            </div>
          </template>
          <div class="assistant-composer">
            <div class="composer-heading">
              <label for="assistant-prompt">{{ mode() === 'QUERY' ? 'Tu pregunta' : 'Tu propuesta' }}</label>
              <span v-if="mode() === 'QUERY'" class="composer-scope">
                <span aria-hidden="true" class="material-symbols-rounded">
                  {{ sharedQuery() ? 'groups' : 'lock' }}
                </span>
                {{ sharedQuery() ? 'Compartida con el equipo' : 'Consulta privada' }}
              </span>
            </div>
            <textarea
              id="assistant-prompt"
              rows="3"
              maxlength="1000"
              :readonly="planning() || voiceBusy()"
              :placeholder="mode() === 'QUERY' ? 'Pregunta sobre tu proyecto…' : 'Describe el cambio UML…'"
              :aria-label="mode() === 'QUERY' ? 'Pregunta sobre el proyecto' : 'Orden para el asistente UML'"
              @keydown.control.enter="send()"
              @keydown.meta.enter="send()"
              v-model="prompt.value"
              @blur="prompt.markAsTouched()"
              :aria-invalid="prompt.invalid && prompt.touched"
            ></textarea>
            <div class="composer-actions">
              <small class="composer-count">{{ prompt.value.length }} / 1000</small>
              <template v-if="mode() === 'CHANGE'">
                <button
                  type="button"
                  :disabled="voiceState() === 'transcribing' || (planning() && voiceState() !== 'recording')"
                  @click="toggleVoice()"
                  :class="{ 'is-recording': voiceState() === 'recording' }"
                  class="studio-button-base studio-button assistant-mic"
                >
                  <span aria-hidden="true" class="material-symbols-rounded">
                    {{ voiceState() === 'recording' ? 'stop_circle' : 'mic' }}
                  </span>
                  {{ voiceLabel() }}
                </button>
              </template>
              <button
                type="button"
                :disabled="
                  !provider() ||
                  planning() ||
                  voiceBusy() ||
                  (mode() === 'CHANGE' && !!store.assistantPlanningBlockReason()) ||
                  prompt.invalid ||
                  !prompt.value.trim()
                "
                @click="send()"
                class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
              >
                <span aria-hidden="true" class="material-symbols-rounded">send</span>
                Enviar
              </button>
            </div>
            <div v-if="mode() === 'QUERY' && planning()" role="status" class="assistant-thinking query-progress">
              <span aria-hidden="true" class="studio-spinner" style="--spinner-size: 16px"></span>
              Consultando el modelo UML…
            </div>
            <template v-if="voiceState() === 'recording'">
              <small role="status" class="assistant-voice-status">
                <span aria-hidden="true" class="voice-dot"></span>
                Grabando · pulsa Detener o espera 20 s
              </small>
            </template>
          </div>
        </div>
        <aside class="assistant-settings" aria-label="Configuración de la consulta">
          <template v-if="store.project()">
            <template v-for="project in present(store.project())">
              <AssistantProviderSettingsComponentView
                :project-id="project.id"
                :busy="planning() || voiceBusy()"
                @selected-change="selectProvider($event)"
                @health-change="runtimeHealth.set($event)"
              ></AssistantProviderSettingsComponentView>
            </template>
          </template>
          <template v-if="mode() === 'QUERY'">
            <div class="query-context">
              <h3>Visibilidad de la consulta</h3>
              <p>
                Consulta el modelo guardado sin modificarlo. La respuesta usa la revisión disponible al enviar
                la pregunta.
              </p>
              <div role="group" aria-label="Visibilidad de la consulta" class="assistant-mode audience-mode">
                <button
                  type="button"
                  :disabled="planning()"
                  :aria-pressed="!sharedQuery()"
                  @click="sharedQuery.set(false)"
                  :class="{ active: !sharedQuery() }"
                >
                  Privada
                </button>
                <button
                  type="button"
                  :disabled="planning()"
                  :aria-pressed="sharedQuery()"
                  @click="sharedQuery.set(true)"
                  :class="{ active: sharedQuery() }"
                >
                  Compartida con el equipo
                </button>
              </div>
              <template v-if="sharedQuery()">
                <small>
                  Los miembros del proyecto verán tu nombre, pregunta y respuesta. La IA recibe el chat
                  reciente, la actividad y hasta 10 consultas compartidas anteriores.
                </small>
              </template>
              <template v-else>
                <label>
                  <input
                    type="checkbox"
                    :checked="includeTeamChat()"
                    :disabled="planning()"
                    @change="includeTeamChat.set(asValue($event.target).checked)"
                  />
                  Incluir conversación reciente del equipo
                </label>
                <small>
                  La IA recibe la actividad reciente y hasta 10 de tus consultas privadas anteriores. El
                  historial solo está disponible para tu cuenta.
                </small>
              </template>
              <template v-if="store.dirty()">
                <p class="query-warning">
                  Hay cambios locales: la consulta usará el modelo guardado en el servidor.
                </p>
              </template>
            </div>
          </template>
        </aside>
      </div>
    </section>
  </app-project-assistant-panel>
</template>

<style scoped lang="scss" src="./project-assistant-panel.component.scss"></style>
