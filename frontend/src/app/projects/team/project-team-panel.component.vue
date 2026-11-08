<script lang="ts">
import { defineComponent } from 'vue';
import { ProjectTeamPanelComponent } from './project-team-panel.component';
import { setupView, formatDate } from '../../core/view-state';
import ProjectActivitySummaryComponentView from './project-activity-summary.component.vue';

export default defineComponent({
  name: 'ProjectTeamPanelComponentView',
  components: { ProjectActivitySummaryComponentView },
  props: ['projectId', 'tab'],
  emits: ['update:tab'],
  setup(props, { emit }) {
    return {
      ...setupView(ProjectTeamPanelComponent, props, emit, { state: ['draft'] }),
      formatDate,
    };
  },
});
</script>

<template>
  <app-project-team-panel class="studio-view">
    <section aria-label="Conversación y actividad del proyecto" class="team-panel">
      <header>
        <div>
          <span class="eyebrow">ESPACIO COMPARTIDO</span>
          <h2>Tu equipo, en contexto.</h2>
        </div>
        <div role="group" aria-label="Contenido del equipo" class="tabs">
          <button
            type="button"
            :aria-pressed="tab() === 'CHAT'"
            @click="tab.set('CHAT')"
            :class="{ active: tab() === 'CHAT' }"
          >
            <span aria-hidden="true" class="material-symbols-rounded">forum</span>
            Conversación
          </button>
          <button
            type="button"
            :aria-pressed="tab() === 'ACTIVITY'"
            @click="tab.set('ACTIVITY')"
            :class="{ active: tab() === 'ACTIVITY' }"
          >
            <span aria-hidden="true" class="material-symbols-rounded">history</span>
            Actividad
          </button>
          <button
            type="button"
            :aria-pressed="tab() === 'SUMMARY'"
            @click="tab.set('SUMMARY')"
            :class="{ active: tab() === 'SUMMARY' }"
          >
            <span aria-hidden="true" class="material-symbols-rounded">summarize</span>
            Resumen
          </button>
        </div>
      </header>
      <template v-if="tab() === 'SUMMARY'">
        <ProjectActivitySummaryComponentView :project-id="projectId()"></ProjectActivitySummaryComponentView>
      </template>
      <template v-else>
        <p class="intro">
          {{
            tab() === 'CHAT'
              ? 'Mensajes guardados para los miembros de este proyecto. Este chat es del equipo; el asistente de IA se abre por separado.'
              : 'Cambios confirmados desde la activación del historial. Las operaciones anteriores no se reconstruyen.'
          }}
          Actualización cada 4 segundos.
        </p>
        <template v-if="error()">
          <p role="status" class="error">{{ error() }}</p>
        </template>
        <div
          tabindex="0"
          :aria-label="tab() === 'CHAT' ? 'Historial de mensajes' : 'Historial de actividad'"
          class="history"
        >
          <template v-if="nextBefore() !== null">
            <button type="button" :disabled="loadingOlder()" @click="older()" class="older">
              {{ loadingOlder() ? 'Cargando…' : 'Cargar anteriores' }}
            </button>
          </template>
          <template v-if="loading()"><p role="status" class="empty">Cargando historial…</p></template>
          <template v-for="(entry, $index) in visible()" :key="entry.id">
            <article :class="{ mine: entry.actorId === auth.user()?.id, activity: tab() === 'ACTIVITY' }">
              <div class="entry-heading">
                <strong>{{ entry.actorName }}</strong>
                <time :datetime="entry.createdAt">{{ formatDate(entry.createdAt, 'dd/MM HH:mm') }}</time>
              </div>
              <p>{{ tab() === 'CHAT' ? entry.body : action(entry) }}</p>
              <template v-if="tab() === 'ACTIVITY'">
                <div class="metadata">
                  <template v-if="entry.revision !== null">
                    <span>Revisión {{ entry.revision }}</span>
                  </template>
                  <template v-if="entry.elementId">
                    <span>Elemento {{ entry.elementId }}</span>
                  </template>
                </div>
              </template>
            </article>
          </template>
          <template v-if="!visible()?.length">
            <template v-if="!loading() && !error()">
              <div class="empty">
                <span aria-hidden="true" class="material-symbols-rounded">
                  {{ tab() === 'CHAT' ? 'chat_bubble' : 'history' }}
                </span>
                <p>
                  {{
                    tab() === 'CHAT'
                      ? 'Inicia la conversación con tu equipo.'
                      : 'Los próximos cambios del modelo aparecerán aquí.'
                  }}
                </p>
              </div>
            </template>
          </template>
        </div>
        <template v-if="tab() === 'CHAT'">
          <form @submit.prevent="send()" novalidate>
            <label for="team-message">Mensaje para el equipo</label>
            <textarea
              id="team-message"
              name="message"
              maxlength="2000"
              rows="2"
              placeholder="Comparte una idea o una decisión del proyecto…"
              v-model="draft"
              :disabled="sending()"
            ></textarea>
            <div class="compose-footer">
              <small>{{ draft.length }} / 2000</small>
              <button type="submit" :disabled="sending() || !draft.trim()">
                {{ sending() ? 'Enviando…' : 'Enviar mensaje' }}
                <span aria-hidden="true" class="material-symbols-rounded">arrow_upward</span>
              </button>
            </div>
            <template v-if="sendError()">
              <p role="alert" class="error">{{ sendError() }}</p>
            </template>
          </form>
        </template>
      </template>
    </section>
  </app-project-team-panel>
</template>

<style scoped lang="scss" src="./project-team-panel.component.scss"></style>
