<script lang="ts">
import { defineComponent } from 'vue';
import { XmiInterchangeDialogComponent } from './xmi-interchange-dialog.component';
import { present, setupView } from '../../core/view-state';

export default defineComponent({
  name: 'XmiInterchangeDialogComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(XmiInterchangeDialogComponent, props, emit, {}),
      present,
    };
  },
});
</script>

<template>
  <app-xmi-interchange-dialog class="studio-view">
    <h2 class="studio-dialog-title">Enterprise Architect · XMI 2.1</h2>
    <cf-dialog-content>
      <p class="copy">
        Importa o exporta el subconjunto UML de NexaUML: clases, atributos, tipos, asociaciones, agregaciones,
        composiciones, generalizaciones y multiplicidades. Los paquetes XMI se aplanan al modelo canonico.
      </p>
      <section class="xmi-section">
        <div>
          <strong>Importar desde Enterprise Architect</strong>
          <p>El archivo se analiza y valida primero. El proyecto no cambia hasta que confirmes el preview.</p>
        </div>
        <label class="file-picker">
          <span aria-hidden="true" class="material-symbols-rounded">upload_file</span>
          <span>{{ selectedFile()?.name ?? 'Seleccionar .xmi o .xml' }}</span>
          <input
            type="file"
            accept=".xmi,.xml,application/xml,text/xml"
            :disabled="busy()"
            @change="fileSelected($event)"
          />
        </label>
        <button
          type="button"
          :disabled="!selectedFile() || busy()"
          @click="previewImport()"
          class="studio-button-base studio-button studio-outlined-button"
        >
          {{ previewing() ? 'Analizando...' : 'Analizar XMI' }}
        </button>
      </section>
      <template v-if="preview()">
        <template v-for="currentPreview in present(preview())">
          <section aria-live="polite" class="preview">
            <strong>Preview listo</strong>
            <div class="metrics">
              <span>{{ currentPreview.classCount }} clases</span>
              <span>{{ currentPreview.associationClassCount }} clases de asociación</span>
              <span>{{ currentPreview.attributeCount }} atributos</span>
              <span>{{ currentPreview.relationshipCount }} relaciones</span>
              <span>{{ currentPreview.packageCount }} paquetes</span>
            </div>
            <template v-if="currentPreview.diagnostics.length > 0">
              <ul>
                <template
                  v-for="(diagnostic, $index) in currentPreview.diagnostics"
                  :key="diagnostic.code + diagnostic.message"
                >
                  <li>
                    <strong>{{ diagnostic.severity }}</strong>
                    {{ diagnostic.message }}
                  </li>
                </template>
              </ul>
            </template>
            <button
              type="button"
              :disabled="busy()"
              @click="applyImport()"
              class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
            >
              {{ applying() ? 'Aplicando...' : 'Reemplazar UML con este XMI' }}
            </button>
          </section>
        </template>
      </template>
      <section class="xmi-section export-section">
        <div>
          <strong>Exportar para Enterprise Architect</strong>
          <p>Genera XMI 2.1 determinista usando el modelo guardado actualmente.</p>
        </div>
        <button
          type="button"
          :disabled="busy()"
          @click="exportXmi()"
          class="studio-button-base studio-button studio-outlined-button"
        >
          {{ exporting() ? 'Exportando...' : 'Descargar XMI 2.1' }}
        </button>
      </section>
      <template v-if="message()">
        <div role="status" :class="{ error: error() }" class="message">
          {{ message() }}
        </div>
      </template>
    </cf-dialog-content>
    <cf-dialog-actions align="end">
      <button
        type="button"
        :disabled="busy()"
        @click="dialogRef.close()"
        class="studio-button-base studio-button"
      >
        Cerrar
      </button>
    </cf-dialog-actions>
  </app-xmi-interchange-dialog>
</template>

<style scoped lang="scss">
cf-dialog-content {
  width: min(680px, 86vw);
  display: grid;
  gap: 1rem;
}
.copy,
.xmi-section p {
  color: var(--cf-muted);
  line-height: 1.5;
  margin: 0.35rem 0 0;
}
.xmi-section,
.preview {
  border: 1px solid var(--cf-border);
  border-radius: 14px;
  padding: 1rem;
  display: grid;
  gap: 0.85rem;
}
.file-picker {
  border: 1px dashed var(--cf-border);
  border-radius: 12px;
  padding: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
}
.file-picker input {
  display: none;
}
.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.metrics span {
  background: var(--cf-secondary-bg);
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
}
ul {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--cf-muted);
}
.message {
  border-radius: 10px;
  padding: 0.75rem;
  background: var(--cf-secondary-bg);
}
.message.error {
  color: #b42318;
}
</style>
