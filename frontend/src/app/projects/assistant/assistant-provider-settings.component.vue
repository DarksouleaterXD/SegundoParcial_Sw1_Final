<script lang="ts">
import { defineComponent } from 'vue';
import { AssistantProviderSettingsComponent } from './assistant-provider-settings.component';
import { present, setupView } from '../../core/view-state';

export default defineComponent({
  name: 'AssistantProviderSettingsComponentView',

  props: ['projectId', 'busy'],
  emits: ['selectedChange', 'healthChange'],
  setup(props, { emit }) {
    return {
      ...setupView(AssistantProviderSettingsComponent, props, emit, {}),
      present,

      asValue: (target: EventTarget | null) => target as HTMLInputElement,
    };
  },
});
</script>

<template>
  <app-assistant-provider-settings class="studio-view">
    <section aria-label="Proveedor de inteligencia artificial" class="provider-settings">
      <h3>
        <span aria-hidden="true" class="material-symbols-rounded">tune</span>
        Conexión de IA
      </h3>
      <label for="assistant-provider">Proveedor de texto y voz</label>
      <select
        id="assistant-provider"
        :value="selected()"
        :disabled="busy() || loading()"
        @change="select(asValue($event.target).value)"
      >
        <template v-for="(option, $index) in options()" :key="option.id">
          <option :value="option.id" :disabled="!option.enabled">
            {{ option.name }}{{ option.enabled ? '' : ' · No habilitado' }}
          </option>
        </template>
      </select>
      <template v-if="loading()"><p role="status">Cargando proveedores habilitados…</p></template>
      <template v-for="(option, $index) in options()" :key="option.id">
        <template v-if="option.id === selected()">
          <p class="model">{{ option.model }}</p>
          <p>{{ option.note }}</p>
        </template>
      </template>
      <template v-if="status()">
        <template v-for="health in present(status())">
          <div class="availability">
            <span :class="{ available: health.llama.available }">Texto: {{ state(health.llama.state) }}</span>
            <span :class="{ available: health.whisper.available }">
              Transcripción: {{ state(health.whisper.state) }}
            </span>
          </div>
          <p>
            {{
              health.llama.state === 'CONFIGURED'
                ? 'El proveedor está configurado. Envía una consulta para comprobar el acceso al modelo.'
                : 'La conexión no garantiza que el modelo soporte las herramientas necesarias para proponer cambios.'
            }}
          </p>
        </template>
      </template>
      <div class="connection-actions">
        <button type="button" :disabled="checking() || !selected()" @click="refresh()">
          <span aria-hidden="true" class="material-symbols-rounded">sync</span>
          {{ checking() ? 'Comprobando…' : 'Comprobar conexión' }}
        </button>
        <small v-if="status()">Última comprobación: {{ checkedAt() }}</small>
      </div>
      <details>
        <summary>Sobre esta configuración</summary>
        <p>
          La selección se guarda en este navegador para este proyecto. Las claves y direcciones se administran
          en el servidor. El asistente de imágenes usa su propio proveedor.
        </p>
      </details>
      <template v-if="error()">
        <p role="status" class="error">{{ error() }}</p>
        <button type="button" :disabled="busy()" @click="loadAgain()">Recargar configuración</button>
      </template>
    </section>
  </app-assistant-provider-settings>
</template>

<style scoped lang="scss">
.provider-settings {
  display: grid;
  gap: 10px;
  padding: 16px;
  background: var(--cf-surface);
  border: 1px solid var(--cf-border);
  border-radius: 14px;
}
h3,
.connection-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
h3 {
  margin: 0;
  font-size: 0.95rem;
}
h3 .material-symbols-rounded {
  color: var(--cf-primary);
}
label {
  color: var(--cf-text);
  font-size: 0.8rem;
  font-weight: 600;
}
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  font: inherit;
  font-size: 0.75rem;
  color: var(--cf-primary);
  border: 1px solid #d8cbe9;
  border-radius: 8px;
  padding: 5px 10px;
  background: #f7f2fc;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: #eee6f8;
}
button .material-symbols-rounded {
  font-size: 1rem;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d9d1e7;
  border-radius: 7px;
  padding: 10px;
  font: inherit;
  font-size: 0.875rem;
  color: var(--cf-text);
  background: white;
}
p {
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--cf-muted);
  margin: 0;
}
.model {
  width: fit-content;
  padding: 3px 8px;
  border-radius: 6px;
  background: #f1eafa;
  color: var(--cf-primary);
  overflow-wrap: anywhere;
}
.availability {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.availability span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 7px;
  font-size: 0.72rem;
  background: #fceef2;
  color: #9c435c;
}
.availability span::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.availability span.available {
  background: #eee7f9;
  color: #6944b5;
}
small {
  font-size: 0.72rem;
  color: var(--cf-muted);
}
details {
  border-top: 1px solid var(--cf-border);
  padding-top: 8px;
}
details p {
  margin-top: 6px;
}
summary {
  color: var(--cf-primary);
  font-size: 0.78rem;
  cursor: pointer;
}
.error {
  color: #a72c40;
}
</style>
