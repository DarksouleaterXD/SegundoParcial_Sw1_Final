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
        <strong>{{ shared() ? 'Conversación del equipo con la IA' : 'Tu conversación con la IA' }}</strong>
        <template v-if="!shared()">
          <button type="button" :disabled="busy() || loading()" @click="confirmClear.set(!confirmClear())">
            Borrar historial
          </button>
        </template>
      </header>
      <template v-if="!shared() && confirmClear()">
        <div role="alert">
          Se eliminarán tus consultas y respuestas guardadas en este proyecto.
          <button type="button" :disabled="busy() || loading()" @click="clear()">Confirmar borrado</button>
          <button type="button" @click="confirmClear.set(false)">Cancelar</button>
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
      <div tabindex="0" class="entries">
        <template v-for="(entry, $index) in entries()" :key="entry.id">
          <article>
            <template v-if="shared()">
              <small>{{ entry.authorName }}</small>
            </template>
            <p class="question">{{ entry.question }}</p>
            <p>{{ entry.answer }}</p>
            <small>
              {{ entry.provider === 'bedrock' ? 'Amazon Bedrock' : 'llama.cpp' }} · Revisión
              {{ entry.revision }} ·
              {{ entry.teamChatIncluded ? 'Incluyó chat del equipo' : 'Sin chat del equipo' }}
            </small>
          </article>
        </template>
        <template v-if="!entries()?.length">
          <template v-if="!loading() && !error()">
            <p>
              {{
                shared() ? 'Todavía no hay consultas compartidas.' : 'No tienes consultas privadas guardadas.'
              }}
            </p>
          </template>
        </template>
      </div>
    </section>
  </app-assistant-history>
</template>
