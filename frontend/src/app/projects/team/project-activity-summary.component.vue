<script lang="ts">
import { defineComponent } from 'vue';
import { ProjectActivitySummaryComponent } from './project-activity-summary.component';
import { present, setupView, formatDate } from '../../core/view-state';

export default defineComponent({
  name: 'ProjectActivitySummaryComponentView',

  props: ['projectId'],

  setup(props, { emit }) {
    return {
      ...setupView(ProjectActivitySummaryComponent, props, emit, { state: ['from', 'to', 'actorId'] }),
      present,
      formatDate,
    };
  },
});
</script>

<template>
  <app-project-activity-summary class="studio-view">
    <section aria-label="Resumen de actividad" class="summary-panel">
      <p class="explanation">
        Resumen calculado a partir del historial completo del período, aunque sus entradas no estén cargadas
        en pantalla. No requiere IA y no interpreta mensajes del chat.
      </p>
      <div role="group" aria-label="Períodos rápidos" class="presets">
        <button type="button" :disabled="loading()" @click="preset(1)">Últimas 24 horas</button>
        <button type="button" :disabled="loading()" @click="preset(7)">7 días</button>
        <button type="button" :disabled="loading()" @click="preset(30)">30 días</button>
      </div>
      <form @submit.prevent="load()" novalidate>
        <label>
          Desde
          <input name="from" type="datetime-local" required v-model="from" :disabled="loading()" />
        </label>
        <label>
          Hasta (exclusivo)
          <input name="to" type="datetime-local" required v-model="to" :disabled="loading()" />
        </label>
        <label>
          Integrante
          <select name="actor" aria-label="Integrante" v-model="actorId" :disabled="loading()">
            <option value>Todo el equipo</option>
            <template v-for="(actor, $index) in result()?.contributors ?? []" :key="actor.id">
              <option :value="actor.id">{{ actor.name }}</option>
            </template>
          </select>
        </label>
        <button type="submit" :disabled="loading()" class="refresh">
          {{ loading() ? 'Calculando…' : 'Actualizar resumen' }}
        </button>
      </form>
      <p class="timezone">
        Las fechas usan la zona horaria de tu navegador. El inicio está incluido y el límite final excluido.
        Máximo 90 días por consulta.
      </p>
      <template v-if="error()">
        <p role="alert" class="error">{{ error() }}</p>
      </template>
      <template v-if="loading()"><p role="status" class="status">Calculando el resumen…</p></template>
      <template v-if="result()">
        <template v-for="summary in present(result())">
          <div class="summary-heading">
            <div>
              <span class="eyebrow">ACTIVIDAD CONFIRMADA</span>
              <h3>{{ description(summary) }}</h3>
              <p>
                {{ formatDate(summary.from, 'dd/MM/yyyy HH:mm') }} →
                {{ formatDate(summary.to, 'dd/MM/yyyy HH:mm') }}
              </p>
            </div>
            <button type="button" :disabled="loading()" @click="copy()" class="copy">Copiar resumen</button>
          </div>
          <div class="summary-stats">
            <div>
              <strong>{{ summary.total }}</strong>
              <span>Operaciones del filtro</span>
            </div>
            <div>
              <strong>
                {{ summary.actorId ? (summary.total > 0 ? 1 : 0) : summary.contributors.length }}
              </strong>
              <span>Integrantes con actividad</span>
            </div>
            <div>
              <strong>{{ summary.actions.length }}</strong>
              <span>Tipos de operación</span>
            </div>
          </div>
          <template v-if="summary.actions.length">
            <div class="summary-columns">
              <section aria-label="Operaciones por tipo">
                <h4>Qué se hizo</h4>
                <template v-for="(item, $index) in summary.actions" :key="item.action ?? $index">
                  <div class="count-row">
                    <span>{{ label(item.action) }}</span>
                    <strong>{{ item.count }}</strong>
                  </div>
                </template>
              </section>
              <section aria-label="Actividad por integrante">
                <h4>Quién participó</h4>
                <template v-for="(actor, $index) in summary.contributors" :key="actor.id">
                  <template v-if="!summary.actorId || summary.actorId === actor.id">
                    <div class="count-row">
                      <span>{{ actor.name }}</span>
                      <strong>{{ actor.count }}</strong>
                    </div>
                  </template>
                </template>
              </section>
            </div>
          </template>
          <p class="footnote">
            Calculado el {{ formatDate(summary.generatedAt, 'dd/MM/yyyy HH:mm:ss') }}. Actualiza el resumen
            para incluir nuevas operaciones. Cada lote cuenta como una operación, aunque agrupe varios
            cambios. Los movimientos y el deshacer/rehacer también pueden generar operaciones. El conteo no
            mide productividad.
          </p>
        </template>
      </template>
      <p class="footnote">
        El historial comienza cuando se habilitó su registro; no se reconstruyen cambios anteriores.
      </p>
      <template v-if="copied()">
        <p role="status" class="status">{{ copied() }}</p>
      </template>
    </section>
  </app-project-activity-summary>
</template>

<style scoped lang="scss" src="./project-activity-summary.component.scss"></style>
