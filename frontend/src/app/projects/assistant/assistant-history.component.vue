<script lang="ts">
import { defineComponent } from 'vue';
import { AssistantHistoryComponent } from './assistant-history.component';
import { setupView } from '../../core/view-state';

export default defineComponent({
  name: 'AssistantHistoryComponentView',

  props: ['projectId', 'shared', 'refresh', 'busy'],

  setup(props, { emit }) {
    return {
      ...setupView(AssistantHistoryComponent, props, emit),
    };
  },
});
</script>

<template>
  <app-assistant-history class="studio-view">
    <section
      :aria-label="shared() ? 'Historial compartido del asistente' : 'Historial privado del asistente'"
      class="history"
    >
      <header>
        <div class="history-title">
          <span aria-hidden="true" class="material-symbols-rounded">{{ shared() ? 'groups' : 'forum' }}</span>
          <h3>{{ shared() ? 'Conversación del equipo con la IA' : 'Tu conversación con la IA' }}</h3>
        </div>
        <template v-if="!shared()">
          <button
            type="button"
            class="history-clear"
            :aria-expanded="confirmClear()"
            :disabled="busy() || loading()"
            @click="confirmClear.set(!confirmClear())"
          >
            <span aria-hidden="true" class="material-symbols-rounded">delete_outline</span>
            Borrar historial
          </button>
        </template>
      </header>
      <template v-if="!shared() && confirmClear()">
        <div role="alert" class="history-confirm">
          Se eliminarán tus consultas y respuestas guardadas en este proyecto.
          <div class="history-actions">
            <button type="button" class="history-clear" :disabled="busy() || loading()" @click="clear()">
              Confirmar borrado
            </button>
            <button type="button" @click="confirmClear.set(false)">Cancelar</button>
          </div>
        </div>
      </template>
      <template v-if="hasMore()">
        <button type="button" :disabled="loading()" @click="loadOlder()">Ver consultas anteriores</button>
      </template>
      <template v-if="loading()"><p role="status">Cargando historial…</p></template>
      <template v-if="error()">
        <p role="alert">
          {{ error() }}
          <button type="button" @click="reload()">Reintentar</button>
        </p>
      </template>
      <div
        v-if="entries().length"
        tabindex="0"
        role="region"
        aria-label="Consultas guardadas"
        class="entries"
      >
        <template v-for="(entry, $index) in entries()" :key="entry.id">
          <article>
            <template v-if="shared()">
              <small>{{ entry.authorName }}</small>
            </template>
            <p class="question">{{ entry.question }}</p>
            <p>{{ entry.answer }}</p>
            <small>
              Revisión {{ entry.revision }} ·
              {{ entry.teamChatIncluded ? 'Incluyó chat del equipo' : 'Sin chat del equipo' }}
            </small>
          </article>
        </template>
      </div>
      <div v-else-if="!loading() && !error()" class="history-empty">
        <span aria-hidden="true" class="material-symbols-rounded">chat_bubble_outline</span>
        <p>
          {{ shared() ? 'Todavía no hay consultas compartidas.' : 'No tienes consultas privadas guardadas.' }}
        </p>
        <small>Escribe una pregunta para empezar.</small>
      </div>
    </section>
  </app-assistant-history>
</template>

<style scoped lang="scss">
.history {
  display: grid;
  gap: 12px;
  min-width: 0;
  color: var(--cf-text);
  font-size: 0.875rem;
}

header,
.history-title,
.history-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

header {
  justify-content: space-between;
}
.history-title .material-symbols-rounded {
  color: var(--cf-primary);
}
h3 {
  margin: 0;
  font-size: 0.95rem;
}

button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  min-height: 34px;
  padding: 5px 10px;
  border: 1px solid var(--cf-border);
  border-radius: 8px;
  background: var(--cf-surface);
  color: var(--cf-primary);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #f2ebfa;
}
button:disabled {
  color: var(--cf-muted);
  opacity: 0.65;
  cursor: not-allowed;
}
button .material-symbols-rounded {
  font-size: 1rem;
}
.history-clear:not(:disabled) {
  color: #98354d;
}

.history-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 26px 16px;
  border: 1px dashed #d8cbe9;
  border-radius: 12px;
  background: #faf8fd;
  text-align: center;
}

.history-empty .material-symbols-rounded {
  padding: 9px;
  border-radius: 12px;
  background: #eee6f8;
  color: var(--cf-primary);
}

.history p {
  margin: 0;
  line-height: 1.55;
}
.history small {
  color: var(--cf-muted);
  font-size: 0.75rem;
}

.entries {
  display: grid;
  gap: 10px;
  max-height: 300px;
  overflow: auto;
  scrollbar-width: thin;
}

.entries article,
.history-confirm {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: #faf8fd;
  overflow-wrap: anywhere;
}

.entries article p {
  white-space: pre-wrap;
}
.entries .question {
  font-weight: 650;
}
.history-confirm {
  background: #fff5f7;
  color: #98354d;
  border-color: #ebcbd3;
}
</style>
