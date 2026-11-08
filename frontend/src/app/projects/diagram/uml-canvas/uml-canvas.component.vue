<script lang="ts">
import { defineComponent } from 'vue';
import { UmlCanvasComponent } from './uml-canvas.component';
import { setupView } from '../../../core/view-state';

export default defineComponent({
  name: 'UmlCanvasComponentView',

  props: ['document', 'requestedSelection', 'validating', 'remoteParticipants', 'canUndo', 'canRedo'],
  emits: [
    'createClassRequested',
    'validateRequested',
    'undoRequested',
    'redoRequested',
    'editClassRequested',
    'editRelationshipRequested',
    'relationshipRequested',
    'selectionChanged',
    'classMoved',
    'cursorMoved',
  ],
  setup(props, { emit }) {
    return {
      ...setupView(UmlCanvasComponent, props, emit, {
        refs: ['viewport', 'paperHost'],
        inputs: ['document', 'requestedSelection', 'validating', 'remoteParticipants', 'canUndo', 'canRedo'],

        keys: [{ method: 'handleHistoryShortcut' }],
      }),
    };
  },
});
</script>

<template>
  <app-uml-canvas class="studio-view">
    <section class="canvas-shell">
      <header class="canvas-toolbar">
        <div class="canvas-heading">
          <div>
            <p class="eyebrow">ÓRBITA / MODELADOR</p>
            <strong>Diagrama principal</strong>
          </div>
          <span class="canvas-count">
            {{ document?.umlModel?.classes?.length ?? 0 }} clases
            <span aria-hidden="true">/</span>
            {{ document?.umlModel?.relationships?.length ?? 0 }} relaciones
          </span>
        </div>
        <span class="canvas-mode">
          <span></span>
          Edición libre
        </span>
      </header>
      <div class="canvas-stage">
        <nav aria-label="Herramientas del diagrama" class="tool-dock">
          <div class="canvas-actions">
            <button
              type="button"
              title="Crear clase"
              aria-label="Crear clase"
              @click="createClassRequested.emit()"
              class="dock-button create-button"
            >
              <span aria-hidden="true" class="material-symbols-rounded">add</span>
              <small>Clase</small>
            </button>
            <template v-if="!relationshipMode()">
              <button
                type="button"
                title="Crear relación entre dos clases"
                aria-label="Relacion"
                :disabled="!document || document.umlModel.classes.length === 0"
                @click="startRelationshipMode()"
                class="dock-button relationship-button"
              >
                <span aria-hidden="true" class="material-symbols-rounded">add_link</span>
                <small>Relación</small>
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                aria-label="Cancelar relacion"
                @click="cancelRelationshipMode()"
                class="dock-button relationship-button relation-active"
              >
                <span aria-hidden="true" class="material-symbols-rounded">close</span>
                <small>Cancelar</small>
              </button>
            </template>
          </div>
          <span class="dock-divider"></span>
          <button
            type="button"
            title="Deshacer (Ctrl+Z)"
            aria-label="Deshacer"
            :disabled="!canUndo"
            @click="undoRequested.emit()"
            class="dock-button"
          >
            <span aria-hidden="true" class="material-symbols-rounded">undo</span>
            <small>Deshacer</small>
          </button>
          <button
            type="button"
            title="Rehacer (Ctrl+Mayús+Z)"
            aria-label="Rehacer"
            :disabled="!canRedo"
            @click="redoRequested.emit()"
            class="dock-button"
          >
            <span aria-hidden="true" class="material-symbols-rounded">redo</span>
            <small>Rehacer</small>
          </button>
          <span class="dock-divider"></span>
          <button
            type="button"
            aria-label="Validar modelo"
            title="Validar modelo"
            :disabled="!document || validating"
            @click="validateRequested.emit()"
            class="dock-button"
          >
            <span aria-hidden="true" class="material-symbols-rounded">verified</span>
            <small>{{ validating ? 'Revisando' : 'Validar' }}</small>
          </button>
        </nav>
        <div
          ref="viewport"
          @pointermove="handlePointerMove($event)"
          :class="{
            'is-empty': !document || document.umlModel.classes.length === 0,
            'is-linking': relationshipMode(),
          }"
          class="canvas-viewport"
        >
          <div aria-label="Canvas de diagrama UML" ref="paperHost" class="paper-host"></div>
          <div aria-hidden="true" class="remote-cursor-layer">
            <template v-for="(participant, $index) in remoteParticipants" :key="participant.clientId">
              <template v-if="participant.cursor">
                <div :style="{ transform: remoteCursorTransform(participant) }" class="remote-cursor">
                  <span class="material-symbols-rounded remote-cursor-icon">near_me</span>
                  <span class="remote-cursor-label">
                    {{ participant.actor.displayName }}
                  </span>
                </div>
              </template>
            </template>
          </div>
          <template v-if="relationshipMode()">
            <div aria-live="polite" class="relationship-guide">
              <span aria-hidden="true" class="material-symbols-rounded">
                {{ relationshipSourceId() ? 'ads_click' : 'touch_app' }}
              </span>
              <div>
                <strong>
                  {{ relationshipSourceId() ? 'Ahora selecciona el destino' : 'Selecciona la clase origen' }}
                </strong>
                <span>
                  {{
                    relationshipSourceId()
                      ? 'El origen esta marcado en naranja.'
                      : 'Despues seleccionaras la clase destino.'
                  }}
                </span>
              </div>
            </div>
          </template>
          <template v-if="!document || document.umlModel.classes.length === 0">
            <div class="canvas-empty-state">
              <div aria-hidden="true" class="empty-symbol">
                <span class="material-symbols-rounded">deployed_code</span>
                <span class="empty-orbit"></span>
              </div>
              <span class="empty-kicker">TODO EMPIEZA CON UNA CONEXIÓN</span>
              <strong>
                Aquí toma forma
                <br />
                tu próxima idea.
              </strong>
              <p>
                Añade tu primera clase. Conecta sus relaciones.
                <br />
                Construye el sistema a tu manera.
              </p>
              <button
                type="button"
                @click="createClassRequested.emit()"
                class="studio-button-base studio-button studio-unelevated-button empty-create"
              >
                <span aria-hidden="true" class="material-symbols-rounded">add_box</span>
                Crear primera clase
              </button>
            </div>
          </template>
        </div>
      </div>
      <footer class="canvas-footer">
        <div class="canvas-help">
          <span aria-hidden="true" class="material-symbols-rounded">mouse</span>
          <span class="desktop-help">Arrastra para mover · Doble clic para editar</span>
          <span class="mobile-help">Arrastra · Doble toque para editar</span>
        </div>
        <div aria-label="Vista del diagrama" class="view-dock">
          <button type="button" title="Alejar" aria-label="Alejar" @click="zoomOut()">
            <span aria-hidden="true" class="material-symbols-rounded">remove</span>
          </button>
          <output aria-label="Zoom" class="zoom-indicator">{{ zoomPercent() }}%</output>
          <button type="button" title="Acercar" aria-label="Acercar" @click="zoomIn()">
            <span aria-hidden="true" class="material-symbols-rounded">add</span>
          </button>
          <span class="view-divider"></span>
          <button
            type="button"
            title="Ajustar al contenido"
            aria-label="Ajustar al contenido"
            @click="fitToContent()"
          >
            <span aria-hidden="true" class="material-symbols-rounded">fit_screen</span>
          </button>
          <button type="button" title="Restablecer vista" aria-label="Restablecer vista" @click="resetView()">
            <span aria-hidden="true" class="material-symbols-rounded">recenter</span>
          </button>
        </div>
      </footer>
    </section>
  </app-uml-canvas>
</template>

<style scoped lang="scss" src="./uml-canvas.component.scss"></style>
