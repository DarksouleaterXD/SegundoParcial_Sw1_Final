<script lang="ts">
import { defineComponent, useTemplateRef } from 'vue';
import { ProjectImageUmlPanelComponent } from './project-image-uml-panel.component';
import { present, setupView } from '../../core/view-state';

export default defineComponent({
  name: 'ProjectImageUmlPanelComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(ProjectImageUmlPanelComponent, props, emit),
      imageInput: useTemplateRef<HTMLInputElement>('imageInput'),
      present,
    };
  },
});
</script>

<template>
  <app-project-image-uml-panel class="studio-view">
    <section class="image-panel">
      <header class="image-header">
        <span aria-hidden="true" class="material-symbols-rounded">image</span>
        <div>
          <h2>Imagen a UML</h2>
          <p>Importa un diagrama y revisa los elementos reconocidos antes de incorporarlos.</p>
        </div>
      </header>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Seleccionar una imagen para crear UML"
        ref="imageInput"
        @change="onImageSelected($event)"
        class="image-input"
      />
      <template v-if="!selectedImage()">
        <button
          type="button"
          @click="imageInput?.click()"
          @dragover="onImageDragOver($event)"
          @drop="onImageDrop($event)"
          class="image-dropzone"
        >
          <span aria-hidden="true" class="material-symbols-rounded">upload</span>
          <strong>Arrastra una imagen aquí</strong>
          <span>o selecciónala</span>
        </button>
      </template>
      <template v-else>
        <div @dragover="onImageDragOver($event)" @drop="onImageDrop($event)" class="image-content">
          <template v-if="!imageResult()">
            <div class="image-selected">
              <template v-if="imagePreviewUrl()">
                <template v-for="previewUrl in present(imagePreviewUrl())">
                  <img alt="Vista previa de la imagen seleccionada" :src="previewUrl" />
                </template>
              </template>
              <strong :title="selectedImage()?.name">{{ selectedImage()?.name }}</strong>
            </div>
          </template>
          <template v-if="!imagePlanning() && !imageResult()">
            <div class="image-toolbar">
              <button
                type="button"
                aria-label="Girar a la izquierda"
                title="Girar a la izquierda"
                :disabled="imagePlanning()"
                @click="rotateImage(-90)"
                class="studio-button-base studio-button studio-icon-button"
              >
                <span aria-hidden="true" class="material-symbols-rounded">rotate_left</span>
              </button>
              <button
                type="button"
                aria-label="Girar a la derecha"
                title="Girar a la derecha"
                :disabled="imagePlanning()"
                @click="rotateImage(90)"
                class="studio-button-base studio-button studio-icon-button"
              >
                <span aria-hidden="true" class="material-symbols-rounded">rotate_right</span>
              </button>
              <button
                type="button"
                aria-label="Recortar imagen"
                title="Recortar imagen"
                :disabled="imagePlanning() || imageCropInsetPercent() >= 30"
                @click="cropImage()"
                class="studio-button-base studio-button studio-icon-button"
              >
                <span aria-hidden="true" class="material-symbols-rounded">crop</span>
              </button>
              <button
                type="button"
                aria-label="Restablecer imagen"
                title="Restablecer imagen"
                :disabled="imagePlanning()"
                @click="resetImageEdits()"
                class="studio-button-base studio-button studio-icon-button"
              >
                <span aria-hidden="true" class="material-symbols-rounded">restart_alt</span>
              </button>
              <button
                type="button"
                aria-label="Quitar imagen"
                title="Quitar imagen"
                :disabled="imagePlanning()"
                @click="clearSelectedImage()"
                class="studio-button-base studio-button studio-icon-button"
              >
                <span aria-hidden="true" class="material-symbols-rounded">delete</span>
              </button>
            </div>
          </template>
          <template v-if="imagePlanning()">
            <div aria-live="polite" class="image-status">
              <cf-spinner
                role="progressbar"
                aria-label="Cargando"
                style="--spinner-size: 20px"
                class="studio-spinner"
              ></cf-spinner>
              <strong>Analizando imagen...</strong>
              <span>Puede tardar entre 2 y 5 min según el tamaño del diagrama.</span>
            </div>
          </template>
          <template v-else-if="imageResult()">
            <template v-for="result in present(imageResult())">
              <div aria-live="polite" class="image-ready">
                <span aria-hidden="true" class="material-symbols-rounded">check_circle</span>
                <strong>Análisis completo</strong>
                <span>¿Quieres aplicarlo?</span>
              </div>
              <div class="image-actions">
                <button
                  type="button"
                  @click="discardImagePlan()"
                  class="studio-button-base studio-button cf-button-secondary"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  @click="applyImagePlan()"
                  class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
                >
                  Aplicar
                </button>
              </div>
            </template>
          </template>
          <template v-else-if="error()">
            <div role="alert" class="image-error">{{ error() }}</div>
            <div class="image-actions">
              <button
                type="button"
                @click="imageInput?.click()"
                class="studio-button-base studio-button cf-button-secondary"
              >
                Cambiar imagen
              </button>
              <button
                type="button"
                @click="retryImageAnalysis()"
                class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
              >
                Reintentar
              </button>
            </div>
          </template>
          <template v-else>
            <button
              type="button"
              :disabled="!selectedImage() || imagePlanning()"
              @click="analyzeImage()"
              class="studio-button-base studio-button studio-unelevated-button cf-button-primary image-analyze"
            >
              Analizar imagen
            </button>
            <p class="image-estimate">Puede tardar entre 2 y 5 min según el tamaño del diagrama.</p>
          </template>
        </div>
      </template>
    </section>
  </app-project-image-uml-panel>
</template>

<style scoped lang="scss" src="./project-image-uml-panel.component.scss"></style>
