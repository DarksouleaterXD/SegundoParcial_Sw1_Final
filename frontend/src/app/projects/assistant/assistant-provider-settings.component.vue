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
      <header>
        <label for="assistant-provider">Proveedor de texto y voz</label>
        <button type="button" :disabled="checking() || !selected()" @click="refresh()">
          {{ checking() ? 'Comprobando…' : 'Comprobar conexión' }}
        </button>
      </header>
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
      <p>
        La selección se conserva en este navegador para este proyecto. No cambia la configuración de otros
        usuarios. Las claves y direcciones se administran en el servidor; imágenes usa su proveedor propio.
      </p>
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
                ? 'Bedrock está configurado; el acceso real al modelo aún no está comprobado.'
                : 'La conexión no garantiza que el modelo soporte las herramientas necesarias para proponer cambios.'
            }}
          </p>
          <small>Última comprobación: {{ checkedAt() }}</small>
        </template>
      </template>
      <template v-if="error()">
        <p role="status" class="error">{{ error() }}</p>
        <button type="button" :disabled="busy()" @click="loadAgain()">Recargar configuración</button>
      </template>
    </section>
  </app-assistant-provider-settings>
</template>

<style scoped lang="scss">
app-assistant-provider-settings {
  display: block;
}
.provider-settings {
  padding: 14px;
  background: #faf8fd;
  border-bottom: 1px solid #e5ddef;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
}
label {
  color: #4e3b70;
  font-size: 11px;
  font-weight: 600;
}
button {
  font: inherit;
  font-size: 10px;
  color: #6944b5;
  border: 1px solid #ded5e8;
  border-radius: 6px;
  padding: 7px 9px;
  background: white;
  cursor: pointer;
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
  font-size: 12px;
  color: #4e3b70;
  background: white;
}
p {
  font-size: 10px;
  line-height: 1.8;
  color: #82778e;
  margin: 8px 0;
}
.model {
  font-size: 11px;
  color: #6944b5;
  overflow-wrap: anywhere;
}
.availability {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}
.availability span {
  border-radius: 5px;
  padding: 5px 7px;
  font-size: 10px;
  background: #fceef2;
  color: #9c435c;
}
.availability span.available {
  background: #eee7f9;
  color: #6944b5;
}
small {
  font-size: 9px;
  color: #82778e;
}
.error {
  color: #a72c40;
}
</style>
