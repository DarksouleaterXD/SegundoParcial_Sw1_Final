<script lang="ts">
import { computed, defineComponent, useTemplateRef } from 'vue';
import { ProjectWorkspacePage } from './project-workspace.page';
import { present, setupView, formatDate } from '../../../core/view-state';
import ProjectAssistantPanelComponentView from '../../assistant/project-assistant-panel.component.vue';
import ProjectImageUmlPanelComponentView from '../../assistant/project-image-uml-panel.component.vue';
import UmlCanvasComponentView from '../../diagram/uml-canvas/uml-canvas.component.vue';
import ClassMethodsComponentView from '../../methods/class-methods.component.vue';
import ProjectTeamPanelComponentView from '../../team/project-team-panel.component.vue';
import { ProjectWorkspaceStore } from '../../state/project-workspace.store';
import { DialogService } from '../../../core/dialogs';
export default defineComponent({
  name: 'ProjectWorkspacePageView',
  components: {
    ProjectAssistantPanelComponentView,
    ProjectImageUmlPanelComponentView,
    UmlCanvasComponentView,
    ClassMethodsComponentView,
    ProjectTeamPanelComponentView,
  },

  setup(props, { emit }) {
    const workspace = setupView(ProjectWorkspacePage, props, emit, {
      refs: ['textAssistantPanel'],

      providers: [ProjectWorkspaceStore, DialogService],
      keys: [{ method: 'exitFocusMode', key: 'escape' }],
    });
    return {
      ...workspace,
      currentProject: computed(() => workspace.store.project()),
      diagramSection: useTemplateRef<HTMLElement>('diagramSection'),
      teamSection: useTemplateRef<HTMLElement>('teamSection'),
      present,
      formatDate,
    };
  },
});
</script>

<template>
  <app-project-workspace-page class="studio-view">
    <section :class="{ 'is-focused': focusMode() }" class="workspace-shell">
      <nav aria-label="Navegacion" class="breadcrumbs">
        <a href="/projects" class="studio-button-base studio-button cf-button-secondary">
          <span aria-hidden="true" class="material-symbols-rounded">arrow_back</span>
          Proyectos
        </a>
        <span aria-hidden="true">/</span>
        <span>
          {{ store.project()?.name ?? 'Cargando...' }}
        </span>
      </nav>
      <template v-if="store.errorMessage() && !store.project()">
        <div role="alert" class="feedback-panel error-panel">
          <span aria-hidden="true" class="material-symbols-rounded feedback-icon">error</span>
          <p>{{ store.errorMessage() }}</p>
          <div class="feedback-actions">
            <button
              type="button"
              @click="retry()"
              class="studio-button-base studio-button cf-button-secondary"
            >
              <span aria-hidden="true" class="material-symbols-rounded">refresh</span>
              Reintentar
            </button>
            <a href="/projects" class="studio-button-base studio-button cf-button-secondary">
              Volver a proyectos
            </a>
          </div>
        </div>
      </template>
      <template v-else-if="store.loading()">
        <div aria-live="polite" class="feedback-panel">
          <cf-spinner
            role="progressbar"
            aria-label="Cargando"
            style="--spinner-size: 40px"
            class="studio-spinner"
          ></cf-spinner>
          <p>Abriendo proyecto...</p>
        </div>
      </template>
      <template v-else-if="currentProject">
        <header class="workspace-heading">
          <div class="title-block">
            <p class="eyebrow">WORKSPACE</p>
            <template v-if="editingName()">
              <div class="rename-row">
                <cf-form-field subscriptSizing="dynamic" class="studio-field">
                  <label class="studio-field-control">
                    <cf-label>Nombre del proyecto</cf-label>
                    <input
                      maxlength="120"
                      @keyup.enter="rename()"
                      @keyup.escape="cancelRename()"
                      v-model="nameControl.value"
                      @blur="nameControl.markAsTouched()"
                      :aria-invalid="nameControl.invalid && nameControl.touched"
                      placeholder=" "
                    />
                  </label>
                  <div class="studio-field-notes"></div>
                </cf-form-field>
                <div class="rename-actions">
                  <button
                    type="button"
                    :disabled="store.renaming()"
                    @click="rename()"
                    class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
                  >
                    <span aria-hidden="true" class="material-symbols-rounded">check</span>
                    Guardar nombre
                  </button>
                  <button
                    type="button"
                    @click="cancelRename()"
                    class="studio-button-base studio-button cf-button-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="title-row">
                <h1>{{ currentProject.name }}</h1>
                <template v-if="currentProject.accessRole === 'OWNER'">
                  <button
                    type="button"
                    @click="startRename()"
                    class="studio-button-base studio-button cf-button-secondary rename-button"
                  >
                    <span aria-hidden="true" class="material-symbols-rounded">edit</span>
                    Renombrar
                  </button>
                </template>
              </div>
            </template>
          </div>
          <div class="save-toolbar">
            <button
              type="button"
              :aria-pressed="focusMode()"
              :title="focusMode() ? 'Salir del modo enfoque (Esc)' : 'Ampliar el espacio de trabajo'"
              @click="focusMode.set(!focusMode())"
              class="studio-button-base studio-button cf-button-secondary focus-button"
            >
              <span aria-hidden="true" class="material-symbols-rounded">
                {{ focusMode() ? 'close_fullscreen' : 'open_in_full' }}
              </span>
              {{ focusMode() ? 'Salir del enfoque' : 'Modo enfoque' }}
            </button>
            <button
              type="button"
              @click="openCollaborators()"
              class="studio-button-base studio-button cf-button-secondary"
            >
              <span aria-hidden="true" class="material-symbols-rounded">group</span>
              Equipo · {{ presence.participantCount() }}
            </button>
            <button
              type="button"
              :disabled="springBootExportBlockReason() !== null"
              :title="springBootExportBlockReason() ?? 'Importar o exportar un archivo XMI'"
              @click="openXmiInterchange()"
              class="studio-button-base studio-button cf-button-secondary"
            >
              <span aria-hidden="true" class="material-symbols-rounded">swap_horiz</span>
              Importar / exportar
            </button>
            <button
              type="button"
              :disabled="springBootExportBlockReason() !== null"
              :title="
                springBootExportBlockReason() ?? 'Configurar y descargar el backend Spring Boot generado'
              "
              @click="openSpringBootExport()"
              class="studio-button-base studio-button cf-button-secondary spring-export-button"
            >
              <span aria-hidden="true" class="material-symbols-rounded">download</span>
              Descargar backend
            </button>
          </div>
        </header>
        <div aria-label="Herramientas del proyecto" class="workspace-tools">
          <div role="status" class="project-state">
            <span aria-hidden="true" class="material-symbols-rounded">
              {{ store.collaborationStatusIcon() }}
            </span>
            <span>{{ store.collaborationStatusText() }} · {{ saveStateText(store.saveState()) }}</span>
            <small>Revisión {{ store.revision() }}</small>
          </div>
          <button
            type="button"
            :disabled="!store.dirty() || store.saving() || store.realtimeActive()"
            @click="save()"
            class="studio-button-base studio-button cf-button-secondary"
          >
            <span aria-hidden="true" class="material-symbols-rounded">save</span>
            Guardar
          </button>
          <button
            type="button"
            aria-controls="text-assistant"
            :aria-expanded="assistantOpen()"
            @click="toggleTextAssistant()"
            class="studio-button-base studio-button cf-button-secondary"
          >
            <span aria-hidden="true" class="material-symbols-rounded">auto_awesome</span>
            Texto y voz
          </button>
          <button
            type="button"
            aria-controls="image-assistant"
            :aria-expanded="imageAssistantOpen()"
            @click="imageAssistantOpen.set(!imageAssistantOpen())"
            class="studio-button-base studio-button cf-button-secondary"
          >
            <span aria-hidden="true" class="material-symbols-rounded">image</span>
            Imagen a UML
          </button>
          <a
            fragment="generated"
            :href="'/guide#generated'"
            class="studio-button-base studio-button cf-button-secondary"
          >
            Guía del backend
          </a>
        </div>
        <template v-if="store.collaborationMessage()">
          <template v-for="collaborationMessage in present(store.collaborationMessage())">
            <div
              role="status"
              :class="{
                'is-warning':
                  store.collaborationStatus() === 'local_changes' ||
                  store.collaborationStatus() === 'conflict',
                'is-error': store.collaborationStatus() === 'error',
              }"
              class="collaboration-banner"
            >
              <span aria-hidden="true" class="material-symbols-rounded">
                {{ store.collaborationStatusIcon() }}
              </span>
              <div>
                <strong>Colaboracion</strong>
                <p>
                  {{ collaborationMessage }}
                </p>
              </div>
              <template
                v-if="
                  store.collaborationStatus() === 'disconnected' || store.collaborationStatus() === 'error'
                "
              >
                <button
                  type="button"
                  :disabled="store.dirty()"
                  @click="store.reconnectCollaboration()"
                  class="studio-button-base studio-button cf-button-secondary"
                >
                  <span aria-hidden="true" class="material-symbols-rounded">sync</span>
                  Reconectar
                </button>
              </template>
            </div>
          </template>
        </template>
        <template v-if="store.errorMessage()">
          <div
            role="alert"
            :class="{ 'conflict-alert': store.saveState() === 'conflict' }"
            class="workspace-alert"
          >
            <span aria-hidden="true" class="material-symbols-rounded">
              {{ store.saveState() === 'conflict' ? 'warning' : 'error' }}
            </span>
            <div class="alert-copy">
              <strong>
                {{ store.saveState() === 'conflict' ? 'El documento cambio' : 'Revisa el modelo' }}
              </strong>
              <p>{{ store.errorMessage() }}</p>
              <template v-if="store.validationViolations().length > 0">
                <ul class="validation-list">
                  <template
                    v-for="(violation, $index) in store.validationViolations()"
                    :key="violation.field + violation.code"
                  >
                    <li>
                      <strong>{{ violation.message }}</strong>
                      <small>
                        {{ violation.field }}
                      </small>
                    </li>
                  </template>
                </ul>
              </template>
            </div>
            <template v-if="store.saveState() === 'conflict'">
              <button
                type="button"
                @click="retry()"
                class="studio-button-base studio-button cf-button-secondary"
              >
                <span aria-hidden="true" class="material-symbols-rounded">refresh</span>
                Recargar revision
                {{ store.conflictRevision() }}
              </button>
            </template>
          </div>
        </template>
        <div class="diagram-workbench">
          <section aria-label="Diagrama de clases" tabindex="-1" ref="diagramSection" class="diagram-section">
            <UmlCanvasComponentView
              :document="store.documentDraft()"
              :requested-selection="diagramSelection()"
              :validating="store.validating()"
              :can-undo="store.canUndo()"
              :can-redo="store.canRedo()"
              :remote-participants="presence.remoteParticipants()"
              @create-class-requested="createClass()"
              @undo-requested="store.undo()"
              @redo-requested="store.redo()"
              @validate-requested="validateModel()"
              @edit-class-requested="editClassById($event)"
              @edit-relationship-requested="editRelationshipById($event)"
              @relationship-requested="createRelationshipFromCanvas($event)"
              @selection-changed="selectDiagramElement($event)"
              @class-moved="moveClass($event)"
              @cursor-moved="movePresenceCursor($event)"
            ></UmlCanvasComponentView>
          </section>
          <aside aria-label="Panel lateral del workspace" class="workspace-side-rail">
            <section aria-label="Inspector UML" class="context-inspector">
              <cf-card class="studio-card-outlined">
                <cf-card-header>
                  <cf-card-title>
                    <span class="details-title">
                      <span aria-hidden="true" class="material-symbols-rounded">tune</span>
                      Propiedades
                    </span>
                  </cf-card-title>
                </cf-card-header>
                <cf-card-content>
                  <template v-if="selectedClass()">
                    <template v-for="umlClass in present(selectedClass())">
                      <div class="inspector-content">
                        <span class="inspector-kind">CLASE / SELECCIÓN</span>
                        <h3>{{ umlClass.name }}</h3>
                        <ClassMethodsComponentView :classifier="umlClass"></ClassMethodsComponentView>
                        <template v-if="presence.participantsOnElement(umlClass.id).length > 0">
                          <div class="element-presence">
                            <span aria-hidden="true" class="material-symbols-rounded">person</span>
                            <span>
                              {{ presence.participantsOnElement(umlClass.id)[0].actor.displayName }}
                              esta trabajando aqui
                            </span>
                          </div>
                        </template>
                        <dl class="inspector-facts">
                          <div>
                            <dt>Atributos</dt>
                            <dd>
                              {{ umlClass.attributes.length }}
                            </dd>
                          </div>
                        </dl>
                        <template v-if="umlClass.attributes.length > 0">
                          <div aria-label="Atributos de la clase" class="property-fields">
                            <template v-for="(attribute, $index) in umlClass.attributes" :key="attribute.id">
                              <div class="property-field">
                                <span aria-hidden="true" class="material-symbols-rounded">
                                  {{ attribute.identifier ? 'key' : 'data_object' }}
                                </span>
                                <div>
                                  <strong>{{ attribute.name }}</strong>
                                  <small>{{ dataTypeLabel(attribute) }}</small>
                                </div>
                                <button
                                  type="button"
                                  :aria-label="'Editar atributo ' + attribute.name"
                                  @click="editAttribute(umlClass, attribute)"
                                  class="studio-button-base studio-button studio-icon-button"
                                >
                                  <span aria-hidden="true" class="material-symbols-rounded">edit</span>
                                </button>
                              </div>
                            </template>
                          </div>
                        </template>
                        <div class="inspector-actions">
                          <button
                            type="button"
                            @click="addAttribute(umlClass)"
                            class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">add</span>
                            Atributo
                          </button>
                          <button
                            type="button"
                            @click="editClass(umlClass)"
                            class="studio-button-base studio-button cf-button-secondary"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">edit</span>
                            Editar
                          </button>
                          <button
                            type="button"
                            @click="deleteClass(umlClass)"
                            class="studio-button-base studio-button cf-button-secondary inspector-danger"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">delete</span>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </template>
                  </template>
                  <template v-else-if="selectedAssociationClass()">
                    <template v-for="associationClass in present(selectedAssociationClass())">
                      <div class="inspector-content">
                        <span class="inspector-kind">ASSOCIATION CLASS</span>
                        <h3>{{ associationClass.name }}</h3>
                        <ClassMethodsComponentView :classifier="associationClass"></ClassMethodsComponentView>
                        <p class="workspace-subtitle">
                          Asociada a {{ associationClassRelationshipLabel(associationClass) }}
                        </p>
                        <dl class="inspector-facts">
                          <div>
                            <dt>Atributos</dt>
                            <dd>{{ associationClass.attributes.length }}</dd>
                          </div>
                        </dl>
                        <template v-if="associationClass.attributes.length > 0">
                          <div class="attribute-list">
                            <template
                              v-for="(attribute, $index) in associationClass.attributes"
                              :key="attribute.id"
                            >
                              <div class="attribute-row">
                                <span>
                                  {{ visibilitySymbol(attribute.visibility) }} {{ attribute.name }} :
                                  {{ dataTypeLabel(attribute) }}
                                </span>
                                <span class="attribute-actions">
                                  <button
                                    type="button"
                                    aria-label="Editar atributo"
                                    @click="editAttribute(associationClass, attribute)"
                                    class="studio-button-base studio-button studio-icon-button"
                                  >
                                    <span class="material-symbols-rounded">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Eliminar atributo"
                                    @click="deleteAttribute(associationClass, attribute)"
                                    class="studio-button-base studio-button studio-icon-button"
                                  >
                                    <span class="material-symbols-rounded">delete</span>
                                  </button>
                                </span>
                              </div>
                            </template>
                          </div>
                        </template>
                        <div class="inspector-actions">
                          <button
                            type="button"
                            @click="addAttribute(associationClass)"
                            class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">add</span>
                            Atributo
                          </button>
                          <button
                            type="button"
                            @click="editClass(associationClass)"
                            class="studio-button-base studio-button cf-button-secondary"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">edit</span>
                            Editar
                          </button>
                          <button
                            type="button"
                            @click="deleteAssociationClass(associationClass)"
                            class="studio-button-base studio-button cf-button-secondary inspector-danger"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">delete</span>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </template>
                  </template>
                  <template v-else-if="selectedRelationship()">
                    <template v-for="relationship in present(selectedRelationship())">
                      <div class="inspector-content">
                        <span class="inspector-kind">RELATIONSHIP</span>
                        <h3>
                          {{ relationshipTypeLabel(relationship) }}
                        </h3>
                        <template v-if="presence.participantsOnElement(relationship.id).length > 0">
                          <div class="element-presence">
                            <span aria-hidden="true" class="material-symbols-rounded">person</span>
                            <span>
                              {{ presence.participantsOnElement(relationship.id)[0].actor.displayName }}
                              esta trabajando aqui
                            </span>
                          </div>
                        </template>
                        <div class="relationship-endpoints">
                          <div>
                            <span>Origen</span>
                            <strong>{{ className(relationship.sourceClassId) }}</strong>
                            <template v-if="relationship.type !== 'GENERALIZATION'">
                              <code>
                                {{ multiplicityLabel(relationship, 'source') }}
                              </code>
                            </template>
                          </div>
                          <span aria-hidden="true" class="material-symbols-rounded">arrow_forward</span>
                          <div>
                            <span>Destino</span>
                            <strong>{{ className(relationship.targetClassId) }}</strong>
                            <template v-if="relationship.type !== 'GENERALIZATION'">
                              <code>
                                {{ multiplicityLabel(relationship, 'target') }}
                              </code>
                            </template>
                          </div>
                        </div>
                        <template v-if="relationship.type === 'ASSOCIATION'">
                          <div class="inspector-actions">
                            <template v-if="associationClassFor(relationship.id)">
                              <template
                                v-for="associationClass in present(associationClassFor(relationship.id))"
                              >
                                <span class="inspector-kind">
                                  Clase de asociación: {{ associationClass.name }}
                                </span>
                              </template>
                            </template>
                            <template v-else>
                              <button
                                type="button"
                                @click="createAssociationClass(relationship)"
                                class="studio-button-base studio-button cf-button-secondary"
                              >
                                <span aria-hidden="true" class="material-symbols-rounded">account_tree</span>
                                Crear clase de asociación
                              </button>
                            </template>
                          </div>
                        </template>
                        <div class="inspector-actions">
                          <button
                            type="button"
                            @click="editRelationship(relationship)"
                            class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">edit</span>
                            Editar relacion
                          </button>
                          <button
                            type="button"
                            @click="deleteRelationship(relationship)"
                            class="studio-button-base studio-button cf-button-secondary inspector-danger"
                          >
                            <span aria-hidden="true" class="material-symbols-rounded">link_off</span>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </template>
                  </template>
                  <template v-else>
                    <div class="inspector-empty">
                      <span aria-hidden="true" class="material-symbols-rounded">arrow_selector_tool</span>
                      <strong>Explora tu modelo</strong>
                      <p>Selecciona una clase o conexión para trabajar en sus detalles.</p>
                    </div>
                  </template>
                </cf-card-content>
              </cf-card>
            </section>
            <section aria-label="Elementos del diagrama" class="model-outline">
              <header>
                <span>EXPLORADOR</span>
                <small>{{ store.classes().length + store.associationClasses().length }}</small>
              </header>
              <template v-for="(umlClass, $index) in store.classes()" :key="umlClass.id">
                <button
                  type="button"
                  :aria-pressed="selectedClass()?.id === umlClass.id"
                  @click="selectDiagramElement({ kind: 'class', id: umlClass.id })"
                  :class="{ selected: selectedClass()?.id === umlClass.id }"
                >
                  <span aria-hidden="true" class="material-symbols-rounded">deployed_code</span>
                  <span>{{ umlClass.name }}</span>
                  <small>{{ umlClass.attributes.length }}</small>
                </button>
              </template>
              <template
                v-for="(associationClass, $index) in store.associationClasses()"
                :key="associationClass.id"
              >
                <button
                  type="button"
                  :aria-pressed="selectedAssociationClass()?.id === associationClass.id"
                  @click="selectDiagramElement({ kind: 'class', id: associationClass.id })"
                  :class="{ selected: selectedAssociationClass()?.id === associationClass.id }"
                >
                  <span aria-hidden="true" class="material-symbols-rounded">account_tree</span>
                  <span>{{ associationClass.name }}</span>
                  <small>{{ associationClass.attributes.length }}</small>
                </button>
              </template>
              <template v-if="store.classes().length + store.associationClasses().length === 0">
                <p>Tus clases aparecerán aquí.</p>
              </template>
            </section>
          </aside>
        </div>
        <section aria-label="Equipo del proyecto" tabindex="-1" ref="teamSection" class="team-section">
          <ProjectTeamPanelComponentView
            :project-id="currentProject.id"
            :tab="teamTab()"
            @update:tab="teamTab.set($event)"
          ></ProjectTeamPanelComponentView>
        </section>
        <nav aria-label="Accesos del proyecto" class="mobile-workspace-nav">
          <button type="button" @click="jumpToSection(diagramSection)">
            <span aria-hidden="true" class="material-symbols-rounded">account_tree</span>
            Diagrama
          </button>
          <button
            type="button"
            @click="
              teamTab.set('CHAT');
              jumpToSection(teamSection);
            "
          >
            <span aria-hidden="true" class="material-symbols-rounded">forum</span>
            Conversación
          </button>
          <button
            type="button"
            @click="
              teamTab.set('ACTIVITY');
              jumpToSection(teamSection);
            "
          >
            <span aria-hidden="true" class="material-symbols-rounded">history</span>
            Actividad
          </button>
        </nav>
        <section aria-label="Asistentes de modelado" class="assistant-workbench">
          <template v-if="assistantOpen()">
            <section
              id="text-assistant"
              aria-label="Asistente de texto y voz"
              tabindex="-1"
              ref="textAssistantPanel"
            >
              <ProjectAssistantPanelComponentView></ProjectAssistantPanelComponentView>
            </section>
          </template>
          <template v-if="imageAssistantOpen()">
            <div id="image-assistant">
              <ProjectImageUmlPanelComponentView></ProjectImageUmlPanelComponentView>
            </div>
          </template>
        </section>
        <template v-if="store.validationRequestError()">
          <section role="alert" class="validation-request-error">
            <span aria-hidden="true" class="material-symbols-rounded">cloud_off</span>
            <div>
              <strong>No se pudo completar la validacion</strong>
              <p>
                {{ store.validationRequestError() }}
              </p>
            </div>
            <button
              type="button"
              @click="validateModel()"
              class="studio-button-base studio-button cf-button-secondary"
            >
              Reintentar
            </button>
          </section>
        </template>
        <template v-if="store.validationResult()">
          <template v-for="validation in present(store.validationResult())">
            <section
              aria-labelledby="validation-title"
              :class="{ 'has-errors': validation.errors > 0 }"
              class="validation-panel"
            >
              <header class="validation-header">
                <div class="validation-title-group">
                  <span
                    aria-hidden="true"
                    :class="{ 'success-icon': validation.errors === 0 }"
                    class="material-symbols-rounded validation-main-icon"
                  >
                    {{ validation.errors === 0 ? 'task_alt' : 'rule' }}
                  </span>
                  <div>
                    <p class="eyebrow">REVISIÓN DEL MODELO</p>
                    <h2 id="validation-title">
                      {{
                        validation.errors === 0
                          ? validation.warnings === 0
                            ? 'Modelo valido'
                            : 'Modelo valido con observaciones'
                          : 'El modelo necesita correcciones'
                      }}
                    </h2>
                    <template v-if="store.validationCheckedAt()">
                      <template v-for="checkedAt in present(store.validationCheckedAt())">
                        <p class="validation-time">
                          Validado
                          {{ formatDate(checkedAt, 'mediumTime') }}
                          · no se guardaron cambios
                        </p>
                      </template>
                    </template>
                  </div>
                </div>
                <div class="validation-counts">
                  <span class="error-count">
                    <strong>{{ validation.errors }}</strong>
                    errores
                  </span>
                  <span class="warning-count">
                    <strong>{{ validation.warnings }}</strong>
                    advertencias
                  </span>
                  <span class="info-count">
                    <strong>{{ validation.infos }}</strong>
                    info
                  </span>
                </div>
              </header>
              <template v-if="validation.diagnostics.length === 0">
                <div class="validation-clean">
                  <span aria-hidden="true" class="material-symbols-rounded">verified</span>
                  <div>
                    <strong>No encontramos problemas.</strong>
                    <p>
                      El documento supera las reglas estructurales y de calidad disponibles en esta iteracion.
                    </p>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="diagnostic-list">
                  <template
                    v-for="(diagnostic, $index) in validation.diagnostics"
                    :key="diagnostic.severity + diagnostic.code + diagnostic.field"
                  >
                    <button
                      type="button"
                      :disabled="!diagnostic.elementId"
                      @click="selectValidationDiagnostic(diagnostic)"
                      :class="{
                        'diagnostic-error': diagnostic.severity === 'ERROR',
                        'diagnostic-warning': diagnostic.severity === 'WARNING',
                        'diagnostic-info': diagnostic.severity === 'INFO',
                        'is-navigable': diagnostic.elementId,
                      }"
                      class="diagnostic-row"
                    >
                      <span aria-hidden="true" class="material-symbols-rounded diagnostic-icon">
                        {{ validationSeverityIcon(diagnostic) }}
                      </span>
                      <span class="diagnostic-copy">
                        <span class="diagnostic-meta">
                          <strong>{{ validationSeverityLabel(diagnostic) }}</strong>
                          <code>
                            {{ diagnostic.code }}
                          </code>
                        </span>
                        <span class="diagnostic-message">{{ diagnostic.message }}</span>
                        <small>
                          {{ diagnostic.field }}
                        </small>
                      </span>
                      <template v-if="diagnostic.elementId">
                        <span
                          aria-label="Mostrar elemento en el canvas"
                          title="Mostrar elemento en el canvas"
                          class="material-symbols-rounded diagnostic-target"
                        >
                          center_focus_strong
                        </span>
                      </template>
                    </button>
                  </template>
                </div>
              </template>
            </section>
          </template>
        </template>
        <section class="workspace-layout" aria-labelledby="model-overview-title">
          <header class="model-overview-heading">
            <div>
              <p class="eyebrow">ESTRUCTURA UML</p>
              <h2 id="model-overview-title">Resumen del modelo</h2>
            </div>
            <p>Consulta y edita los elementos del diagrama.</p>
          </header>
          <div class="model-editor">
            <section aria-label="Modelo canónico" class="canonical-section">
              <div class="section-heading">
                <div class="model-card-heading">
                  <span aria-hidden="true" class="material-symbols-rounded model-card-icon">data_object</span>
                  <div>
                    <p class="eyebrow">MODELO CANÓNICO</p>
                    <h3>Clases y atributos</h3>
                  </div>
                </div>
                <div class="summary-pills">
                  <span>
                    {{ store.classes().length }}
                    {{ store.classes().length === 1 ? 'clase' : 'clases' }}
                  </span>
                  <span>
                    {{ totalAttributeCount() }}
                    {{ totalAttributeCount() === 1 ? 'atributo' : 'atributos' }}
                  </span>
                </div>
                <button
                  type="button"
                  aria-controls="class-model-content"
                  :aria-expanded="classesExpanded()"
                  @click="classesExpanded.set(!classesExpanded())"
                  class="studio-button-base studio-button section-collapse-button"
                >
                  <span aria-hidden="true" class="material-symbols-rounded">
                    {{ classesExpanded() ? 'expand_less' : 'expand_more' }}
                  </span>
                  {{ classesExpanded() ? 'Contraer' : 'Ver clases' }}
                </button>
              </div>
              <template v-if="classesExpanded()">
                <div id="class-model-content">
                  <template v-if="store.classes().length === 0">
                    <cf-card class="empty-model studio-card-outlined">
                      <cf-card-content>
                        <span aria-hidden="true" class="material-symbols-rounded empty-icon">
                          data_object
                        </span>
                        <p class="eyebrow">SIN CLASES</p>
                        <h3>El modelo esta vacio.</h3>
                        <p>Crea la primera clase desde el canvas.</p>
                      </cf-card-content>
                    </cf-card>
                  </template>
                  <template v-else>
                    <div class="class-grid">
                      <template v-for="(umlClass, $index) in store.classes()" :key="umlClass.id">
                        <cf-card class="uml-class-card studio-card-outlined">
                          <cf-card-header>
                            <div class="class-header">
                              <div class="class-identity">
                                <span aria-hidden="true" class="material-symbols-rounded class-icon">
                                  data_object
                                </span>
                                <div>
                                  <span class="class-kind">CLASS</span>
                                  <h3>
                                    {{ umlClass.name }}
                                  </h3>
                                </div>
                              </div>
                              <div class="class-actions">
                                <button
                                  type="button"
                                  title="Editar clase"
                                  :aria-label="'Editar ' + umlClass.name"
                                  @click="editClass(umlClass)"
                                  class="studio-button-base studio-button icon-action"
                                >
                                  <span aria-hidden="true" class="material-symbols-rounded">edit</span>
                                </button>
                                <button
                                  type="button"
                                  title="Eliminar clase"
                                  :aria-label="'Eliminar ' + umlClass.name"
                                  @click="deleteClass(umlClass)"
                                  class="studio-button-base studio-button icon-action danger-action"
                                >
                                  <span aria-hidden="true" class="material-symbols-rounded">delete</span>
                                </button>
                              </div>
                            </div>
                          </cf-card-header>
                          <cf-card-content>
                            <ClassMethodsComponentView :classifier="umlClass"></ClassMethodsComponentView>
                            <div class="attribute-section">
                              <div class="attribute-heading">
                                <div>
                                  <span>ATRIBUTOS</span>
                                  <strong>
                                    {{ umlClass.attributes.length }}
                                  </strong>
                                </div>
                                <button
                                  type="button"
                                  @click="addAttribute(umlClass)"
                                  class="studio-button-base studio-button cf-button-secondary compact-button"
                                >
                                  <span aria-hidden="true" class="material-symbols-rounded">add</span>
                                  Atributo
                                </button>
                              </div>
                              <template v-if="umlClass.attributes.length === 0">
                                <div class="empty-attributes">Esta clase aun no tiene atributos.</div>
                              </template>
                              <template v-else>
                                <div class="attribute-list">
                                  <template
                                    v-for="(attribute, $index) in umlClass.attributes"
                                    :key="attribute.id"
                                  >
                                    <div class="attribute-row">
                                      <div class="attribute-signature">
                                        <template v-if="attribute.identifier">
                                          <span
                                            aria-label="Identificador"
                                            title="Identificador"
                                            class="material-symbols-rounded key-icon"
                                          >
                                            key
                                          </span>
                                        </template>
                                        <code>
                                          {{ visibilitySymbol(attribute.visibility) }}
                                          {{ attribute.name }}: {{ dataTypeLabel(attribute) }}
                                        </code>
                                        <template v-if="attribute.nullable">
                                          <span class="nullable-badge">nullable</span>
                                        </template>
                                      </div>
                                      <div class="attribute-actions">
                                        <button
                                          type="button"
                                          title="Editar atributo"
                                          :aria-label="'Editar atributo ' + attribute.name"
                                          @click="editAttribute(umlClass, attribute)"
                                          class="studio-button-base studio-button icon-action"
                                        >
                                          <span aria-hidden="true" class="material-symbols-rounded">
                                            edit
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          title="Eliminar atributo"
                                          :aria-label="'Eliminar atributo ' + attribute.name"
                                          @click="deleteAttribute(umlClass, attribute)"
                                          class="studio-button-base studio-button icon-action danger-action"
                                        >
                                          <span aria-hidden="true" class="material-symbols-rounded">
                                            delete
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </template>
                                </div>
                              </template>
                            </div>
                          </cf-card-content>
                        </cf-card>
                      </template>
                    </div>
                  </template>
                </div>
              </template>
            </section>
            <section aria-labelledby="relationships-title" class="relationships-section">
              <div class="section-heading compact-heading">
                <div class="model-card-heading">
                  <span aria-hidden="true" class="material-symbols-rounded model-card-icon">
                    conversion_path
                  </span>
                  <div>
                    <p class="eyebrow">CONECTORES</p>
                    <h3 id="relationships-title">Relaciones</h3>
                  </div>
                </div>
                <span class="relationship-count">
                  {{ store.relationships().length }}
                  {{ store.relationships().length === 1 ? 'relación' : 'relaciones' }}
                </span>
                <button
                  type="button"
                  aria-controls="relationships-content"
                  :aria-expanded="relationshipsExpanded()"
                  @click="relationshipsExpanded.set(!relationshipsExpanded())"
                  class="studio-button-base studio-button section-collapse-button"
                >
                  <span aria-hidden="true" class="material-symbols-rounded">
                    {{ relationshipsExpanded() ? 'expand_less' : 'expand_more' }}
                  </span>
                  {{ relationshipsExpanded() ? 'Contraer' : 'Ver relaciones' }}
                </button>
              </div>
              <template v-if="relationshipsExpanded()">
                <div id="relationships-content">
                  <template v-if="store.relationships().length === 0">
                    <div class="empty-relationships">
                      <span aria-hidden="true" class="material-symbols-rounded">add_link</span>
                      <div>
                        <strong>Aun no hay relaciones.</strong>
                        <p>Usa el boton Relacion del canvas y selecciona origen y destino.</p>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div class="relationship-list">
                      <template
                        v-for="(relationship, $index) in store.relationships()"
                        :key="relationship.id"
                      >
                        <article class="relationship-row">
                          <div class="relationship-main">
                            <span aria-hidden="true" class="material-symbols-rounded relation-icon">
                              conversion_path
                            </span>
                            <div>
                              <strong>
                                {{ className(relationship.sourceClassId) }}
                                →
                                {{ className(relationship.targetClassId) }}
                              </strong>
                              <span>
                                {{ relationshipTypeLabel(relationship) }}

                                <template v-if="relationship.type !== 'GENERALIZATION'">
                                  ·
                                  {{ multiplicityLabel(relationship, 'source') }}
                                  →
                                  {{ multiplicityLabel(relationship, 'target') }}
                                </template>
                              </span>
                            </div>
                          </div>
                          <div class="relationship-actions">
                            <button
                              type="button"
                              title="Editar relacion"
                              aria-label="Editar relacion"
                              @click="editRelationship(relationship)"
                              class="studio-button-base studio-button icon-action"
                            >
                              <span aria-hidden="true" class="material-symbols-rounded">edit</span>
                            </button>
                            <button
                              type="button"
                              title="Eliminar relacion"
                              aria-label="Eliminar relacion"
                              @click="deleteRelationship(relationship)"
                              class="studio-button-base studio-button icon-action danger-action"
                            >
                              <span aria-hidden="true" class="material-symbols-rounded">link_off</span>
                            </button>
                          </div>
                        </article>
                      </template>
                    </div>
                  </template>
                </div>
              </template>
            </section>
          </div>
          <aside class="details-panel">
            <cf-card class="studio-card-outlined">
              <cf-card-header>
                <cf-card-title>
                  <span class="details-title">
                    <span aria-hidden="true" class="material-symbols-rounded">info</span>
                    Estado del documento
                  </span>
                </cf-card-title>
              </cf-card-header>
              <cf-card-content>
                <dl class="details-list">
                  <div>
                    <dt>Clases</dt>
                    <dd>
                      {{ store.classes().length }}
                    </dd>
                  </div>
                  <div>
                    <dt>Atributos</dt>
                    <dd>
                      {{ totalAttributeCount() }}
                    </dd>
                  </div>
                  <div>
                    <dt>Relaciones</dt>
                    <dd>
                      {{ store.relationships().length }}
                    </dd>
                  </div>
                  <div>
                    <dt>Posiciones guardadas</dt>
                    <dd>
                      {{ layoutNodeCount() }}
                    </dd>
                  </div>
                  <div>
                    <dt>Revisión guardada</dt>
                    <dd>
                      {{ currentProject.revision }}
                    </dd>
                  </div>
                  <div>
                    <dt>Último guardado</dt>
                    <dd>
                      <time :datetime="currentProject.updatedAt">
                        {{ formatDate(currentProject.updatedAt, 'medium') }}
                      </time>
                    </dd>
                  </div>
                </dl>
              </cf-card-content>
            </cf-card>
          </aside>
        </section>
      </template>
    </section>
  </app-project-workspace-page>
</template>

<style scoped lang="scss" src="./project-workspace.page.scss"></style>
