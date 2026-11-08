<script lang="ts">
import { defineComponent } from 'vue';
import { SpringBootExportDialogComponent } from './spring-boot-export-dialog.component';
import { present, setupView } from '../../../core/view-state';

export default defineComponent({
  name: 'SpringBootExportDialogComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(SpringBootExportDialogComponent, props, emit, {}),
      present,
    };
  },
});
</script>

<template>
  <app-spring-boot-export-dialog class="studio-view">
    <h2 class="studio-dialog-title">Generar sistema Spring Boot</h2>
    <cf-dialog-content>
      <p class="dialog-copy">
        El ZIP incluye el modelo de origen, catálogo de métodos, Dockerfile y guía de ejecución. Los métodos
        UML se conservan como documentación; el CRUD generado no implementa sus reglas de negocio.
      </p>
      <form id="spring-boot-export-form" @submit.prevent="generate()" novalidate class="generation-form">
        <section aria-labelledby="generation-mode-title" class="mode-section">
          <strong id="generation-mode-title">Modo de generacion</strong>
          <cf-radio-group @change="modeChanged()" class="mode-options">
            <cf-radio-button>
              <label>
                <input
                  type="radio"
                  name="export-mode"
                  value="SIMPLE_CRUD"
                  v-model="form.controls.mode.value"
                />
                <span class="mode-title">CRUD simple</span>
                <span class="mode-description">
                  API CRUD, busqueda, filtros, ordenamiento, paginacion, conteo y relaciones. Sin login ni
                  JWT.
                </span>
              </label>
            </cf-radio-button>
            <cf-radio-button>
              <label>
                <input
                  type="radio"
                  name="export-mode"
                  value="AUTH_INFORMATION_SYSTEM"
                  v-model="form.controls.mode.value"
                />
                <span class="mode-title">Sistema de Informacion con Auth</span>
                <span class="mode-description">El mismo CRUD mas Spring Security, BCrypt, login y JWT.</span>
              </label>
            </cf-radio-button>
          </cf-radio-group>
        </section>
        <template v-if="authMode()">
          <div class="auth-config">
            <p class="auth-copy">
              Selecciona la entidad que representara las cuentas y, dentro de ella, los atributos STRING
              usados para usuario y contrasena.
            </p>
            <cf-form-field class="studio-field">
              <label class="studio-field-control">
                <cf-label>Tabla / entidad de autenticacion</cf-label>
                <select
                  @change="authClassChanged()"
                  v-model="form.controls.authClassId.value"
                  @blur="form.controls.authClassId.markAsTouched()"
                  :aria-invalid="form.controls.authClassId.invalid && form.controls.authClassId.touched"
                >
                  <template v-for="(umlClass, $index) in data.classes" :key="umlClass.id">
                    <option :value="umlClass.id">
                      {{ umlClass.name }}
                    </option>
                  </template>
                </select>
              </label>
              <div class="studio-field-notes">
                <cf-hint>Debe corresponder a una clase UML real.</cf-hint>
                <template v-if="form.controls.authClassId.hasError('required')">
                  <cf-error>Selecciona la entidad de autenticacion.</cf-error>
                </template>
              </div>
            </cf-form-field>
            <div class="credential-grid">
              <cf-form-field class="studio-field">
                <label class="studio-field-control">
                  <cf-label>Atributo de usuario / login</cf-label>
                  <select
                    v-model="form.controls.usernameAttributeId.value"
                    @blur="form.controls.usernameAttributeId.markAsTouched()"
                    :aria-invalid="
                      form.controls.usernameAttributeId.invalid && form.controls.usernameAttributeId.touched
                    "
                  >
                    <template v-for="(attribute, $index) in authAttributes()" :key="attribute.id">
                      <option
                        :value="attribute.id"
                        :disabled="attribute.id === form.controls.passwordAttributeId.value"
                      >
                        {{ attribute.name }}
                      </option>
                    </template>
                  </select>
                </label>
                <div class="studio-field-notes">
                  <template v-if="form.controls.usernameAttributeId.hasError('required')">
                    <cf-error>Selecciona el atributo de usuario.</cf-error>
                  </template>
                </div>
              </cf-form-field>
              <cf-form-field class="studio-field">
                <label class="studio-field-control">
                  <cf-label>Atributo de contrasena</cf-label>
                  <select
                    v-model="form.controls.passwordAttributeId.value"
                    @blur="form.controls.passwordAttributeId.markAsTouched()"
                    :aria-invalid="
                      form.controls.passwordAttributeId.invalid && form.controls.passwordAttributeId.touched
                    "
                  >
                    <template v-for="(attribute, $index) in authAttributes()" :key="attribute.id">
                      <option
                        :value="attribute.id"
                        :disabled="attribute.id === form.controls.usernameAttributeId.value"
                      >
                        {{ attribute.name }}
                      </option>
                    </template>
                  </select>
                </label>
                <div class="studio-field-notes">
                  <template v-if="form.controls.passwordAttributeId.hasError('required')">
                    <cf-error>Selecciona el atributo de contrasena.</cf-error>
                  </template>
                </div>
              </cf-form-field>
            </div>
            <template v-if="authAttributes().length < 2">
              <div role="alert" class="auth-warning">
                La entidad elegida necesita al menos dos atributos STRING distintos para usuario y contrasena.
              </div>
            </template>
          </div>
        </template>
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>Nombre del artefacto</cf-label>
            <input
              autocomplete="off"
              maxlength="63"
              placeholder="biblioteca-api"
              v-model="form.controls.artifactName.value"
              @blur="form.controls.artifactName.markAsTouched()"
              :aria-invalid="form.controls.artifactName.invalid && form.controls.artifactName.touched"
            />
          </label>
          <div class="studio-field-notes">
            <cf-hint>Minusculas, numeros y guiones.</cf-hint>
            <template v-if="form.controls.artifactName.hasError('required')">
              <cf-error>El nombre del artefacto es obligatorio.</cf-error>
            </template>
            <template v-else-if="form.controls.artifactName.hasError('pattern')">
              <cf-error>Debe iniciar con una letra minuscula y usar solo a-z, 0-9 o -.</cf-error>
            </template>
          </div>
        </cf-form-field>
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>Package base</cf-label>
            <input
              autocomplete="off"
              placeholder="com.example.biblioteca"
              v-model="form.controls.basePackage.value"
              @blur="form.controls.basePackage.markAsTouched()"
              :aria-invalid="form.controls.basePackage.invalid && form.controls.basePackage.touched"
            />
          </label>
          <div class="studio-field-notes">
            <cf-hint>Ej. com.example.biblioteca</cf-hint>
            <template v-if="form.controls.basePackage.hasError('required')">
              <cf-error>El package base es obligatorio.</cf-error>
            </template>
            <template v-else-if="form.controls.basePackage.hasError('javaPackage')">
              <cf-error>Usa segmentos Java validos en minusculas y evita palabras reservadas.</cf-error>
            </template>
          </div>
        </cf-form-field>
        <section aria-labelledby="primary-color-title" class="color-config">
          <div>
            <strong id="primary-color-title">Color primario del frontend</strong>
            <p>
              Se aplica a navegacion, acciones principales y acentos de las interfaces Angular y Flutter
              generadas.
            </p>
          </div>
          <label class="color-picker">
            <input
              type="color"
              aria-label="Color primario"
              v-model="form.controls.primaryColor.value"
              @blur="form.controls.primaryColor.markAsTouched()"
              :aria-invalid="form.controls.primaryColor.invalid && form.controls.primaryColor.touched"
              placeholder=" "
            />
            <code>{{ form.controls.primaryColor.value }}</code>
          </label>
        </section>
      </form>
      <template v-if="errorCopy()">
        <template v-for="generationError in present(errorCopy())">
          <div
            role="alert"
            :class="{
              'is-stale': generationError.staleRevision,
              'is-warning': generationError.primaryKeyFallbackAvailable,
            }"
            class="generation-error"
          >
            <span aria-hidden="true" class="material-symbols-rounded">
              {{
                generationError.staleRevision
                  ? 'sync_problem'
                  : generationError.primaryKeyFallbackAvailable
                    ? 'warning'
                    : 'error'
              }}
            </span>
            <div>
              <strong>{{ generationError.title }}</strong>
              <p>{{ generationError.message }}</p>
              <template v-if="generationError.observations.length > 0">
                <ul class="generation-observations">
                  <template v-for="(observation, $index) in generationError.observations" :key="observation">
                    <li>{{ observation }}</li>
                  </template>
                </ul>
              </template>
              <template v-if="generationError.primaryKeyFallbackAvailable">
                <button
                  type="button"
                  :disabled="generating()"
                  @click="generate(true)"
                  class="studio-button-base studio-button studio-outlined-button primary-key-fallback-action"
                >
                  Continuar usando el primer atributo como clave primaria
                </button>
              </template>
            </div>
          </div>
        </template>
      </template>
      <div aria-label="Contenido de la exportacion" class="generation-scope">
        <span aria-hidden="true" class="material-symbols-rounded">inventory_2</span>
        <p>
          El ZIP incluye Gradle Wrapper, entidades/repositories JPA, DTOs, services y controllers, ademas de
          openapi.yaml, una coleccion Postman y domain-manifest.json con la semantica del dominio, un frontend
          Angular web y una app Flutter mobile para Android, ambos con dashboard y componentes especificos por
          entidad. CU-19 agrega un Assistant de chat y voz en ambas interfaces: el Spring generado reutiliza
          Whisper y Qwen/llama.cpp locales para planificar consultas y mutaciones con preview/confirmacion. En
          Auth tambien incluye Security, BCrypt, bootstrap inicial, login, JWT y proteccion de navegacion.
        </p>
      </div>
    </cf-dialog-content>
    <cf-dialog-actions align="end">
      <button
        type="button"
        :disabled="generating()"
        @click="dialogRef.close()"
        class="studio-button-base studio-button cf-button-secondary"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="spring-boot-export-form"
        :disabled="generating()"
        class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
      >
        <span aria-hidden="true" :class="{ 'is-spinning': generating() }" class="material-symbols-rounded">
          {{ generating() ? 'progress_activity' : 'download' }}
        </span>
        {{ generating() ? 'Generando...' : 'Generar y descargar' }}
      </button>
    </cf-dialog-actions>
  </app-spring-boot-export-dialog>
</template>

<style scoped lang="scss">
cf-dialog-content {
  width: min(640px, 84vw);
}

.dialog-copy,
.auth-copy {
  color: var(--cf-muted);
  line-height: 1.55;
}

.dialog-copy {
  margin: 0 0 1rem;
}

.generation-form {
  display: grid;
  gap: 0.65rem;
}

.mode-section {
  display: grid;
  gap: 0.65rem;
  padding: 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.8rem;
}

.mode-options {
  display: grid;
  gap: 0.55rem;
}

.mode-options cf-radio-button {
  display: block;
}

.mode-title,
.mode-description {
  display: block;
}

.mode-title {
  font-weight: 650;
}

.mode-description {
  margin-top: 0.15rem;
  color: var(--cf-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.auth-config {
  display: grid;
  gap: 0.2rem;
  padding: 0.85rem;
  border-radius: 0.8rem;
  background: #f8fafc;
}

.auth-copy {
  margin: 0 0 0.65rem;
}

.credential-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.auth-warning {
  margin-bottom: 0.55rem;
  padding: 0.65rem 0.75rem;
  border-radius: 0.65rem;
  background: #fff7ed;
  color: #9a3412;
  font-size: 0.82rem;
}

.color-config {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.8rem;
}

.color-config p {
  margin: 0.2rem 0 0;
  color: var(--cf-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.color-picker input {
  width: 2.75rem;
  height: 2.25rem;
  padding: 0.1rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: white;
}

cf-form-field {
  width: 100%;
}

.generation-error,
.generation-scope {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.7rem;
  align-items: start;
  border-radius: 0.75rem;
  padding: 0.8rem 0.9rem;
}

.generation-error {
  margin-top: 0.6rem;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.generation-error.is-stale,
.generation-error.is-warning {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.generation-observations {
  margin: 0.65rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.25rem;
}

.primary-key-fallback-action {
  margin-top: 0.75rem;
}

.generation-error strong,
.generation-error p,
.generation-scope p {
  margin: 0;
}

.generation-error p,
.generation-scope p {
  margin-top: 0.18rem;
  line-height: 1.5;
}

.generation-scope {
  margin-top: 0.85rem;
  background: #f8fafc;
  color: var(--cf-muted);
  font-size: 0.82rem;
}

button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

@media (max-width: 640px) {
  cf-dialog-content {
    width: auto;
    min-width: 0;
  }

  .credential-grid {
    grid-template-columns: 1fr;
  }
}
</style>
