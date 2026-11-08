<script lang="ts">
import { defineComponent } from 'vue';
import { ClassMethodsComponent } from './class-methods.component';
import { setupView } from '../../core/view-state';

import { DialogService } from '../../core/dialogs';
export default defineComponent({
  name: 'ClassMethodsComponentView',

  props: ['classifier'],

  setup(props, { emit }) {
    return {
      ...setupView(ClassMethodsComponent, props, emit, {
        providers: [DialogService],
      }),
    };
  },
});
</script>

<template>
  <app-class-methods class="studio-view">
    <section aria-label="Métodos de la clase" class="methods-section">
      <header>
        <strong>
          MÉTODOS
          <span>{{ classifier().methods?.length ?? 0 }}</span>
        </strong>
        <button
          type="button"
          :disabled="(classifier().methods?.length ?? 0) >= 50"
          @click="edit()"
          class="studio-button-base studio-button cf-button-secondary"
        >
          + Método
        </button>
      </header>
      <div class="method-list">
        <template v-for="(method, $index) in classifier().methods ?? []" :key="method.id">
          <article>
            <span class="signature">{{ signature(method) }}</span>
            <div class="actions">
              <button type="button" :aria-label="'Editar método ' + method.name" @click="edit(method)">
                <span aria-hidden="true" class="material-symbols-rounded">edit</span>
              </button>
              <button type="button" :aria-label="'Eliminar método ' + method.name" @click="remove(method)">
                <span aria-hidden="true" class="material-symbols-rounded">delete</span>
              </button>
            </div>
          </article>
        </template>
        <template v-if="!(classifier().methods ?? [])?.length"><p>Sin métodos definidos.</p></template>
      </div>
      <template v-if="error()">
        <p role="alert" class="error">{{ error() }}</p>
      </template>
    </section>
  </app-class-methods>
</template>

<style scoped lang="scss">
app-class-methods {
  display: block;
  min-width: 0;
}
.methods-section {
  border-top: 1px solid #e5ddef;
  margin-top: 14px;
  padding-top: 12px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
header strong {
  font-size: 9px;
  letter-spacing: 1px;
  color: #80649f;
}
header strong span {
  margin-left: 5px;
  color: #6944b5;
}
header button {
  font-size: 10px;
  padding: 0 7px;
  min-height: 28px;
  box-shadow: none;
}
.method-list {
  max-height: 180px;
  overflow: auto;
  scrollbar-width: thin;
}
article {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid #eee8f6;
}
.signature {
  flex: 1;
  font-size: 11px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  min-width: 0;
  color: #4e3b70;
}
.actions {
  display: flex;
  flex-shrink: 0;
}
.actions button {
  display: grid;
  place-items: center;
  width: 26px;
  height: 28px;
  background: transparent;
  color: #80649f;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}
.actions button:hover {
  background: #eee7f9;
}
.actions button:last-child {
  color: #a72c40;
}
.material-symbols-rounded {
  font-size: 15px;
}
p {
  font-size: 10px;
  color: #82778e;
  line-height: 1.8;
}
.error {
  color: #a72c40;
}
</style>
