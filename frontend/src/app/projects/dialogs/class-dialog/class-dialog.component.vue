<script lang="ts">
import { defineComponent } from 'vue';
import { ClassDialogComponent } from './class-dialog.component';
import { setupView } from '../../../core/view-state';

export default defineComponent({
  name: 'ClassDialogComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(ClassDialogComponent, props, emit),
    };
  },
});
</script>

<template>
  <app-class-dialog class="studio-view">
    <h2 class="studio-dialog-title">
      {{
        data.mode === 'create'
          ? data.kind === 'associationClass'
            ? 'Nueva clase de asociación'
            : 'Nueva clase'
          : 'Editar clase'
      }}
    </h2>
    <cf-dialog-content>
      <p class="dialog-copy">
        Usa un nombre compatible con codigo. Ejemplos:
        <strong>Animal</strong>
        ,
        <strong>Cita</strong>
        ,
        <strong>Propietario</strong>
        .
      </p>
      <form id="class-form" @submit.prevent="submit()" novalidate>
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>Nombre de la clase</cf-label>
            <input
              aria-required="true"
              maxlength="80"
              autocomplete="off"
              v-model="form.controls.name.value"
              @blur="form.controls.name.markAsTouched()"
              :aria-invalid="form.controls.name.invalid && form.controls.name.touched"
              placeholder=" "
            />
          </label>
          <div class="studio-field-notes">
            <template v-if="form.controls.name.hasError('required')">
              <cf-error>El nombre es obligatorio.</cf-error>
            </template>
            <template v-else-if="form.controls.name.hasError('pattern')">
              <cf-error>Usa letras, numeros y _, sin espacios.</cf-error>
            </template>
            <template v-else-if="form.controls.name.hasError('duplicate')">
              <cf-error>Ya existe una clase con ese nombre.</cf-error>
            </template>
          </div>
        </cf-form-field>
      </form>
    </cf-dialog-content>
    <cf-dialog-actions align="end">
      <button
        type="button"
        @click="dialogRef.close()"
        class="studio-button-base studio-button cf-button-secondary"
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="class-form"
        class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
      >
        <span aria-hidden="true" class="material-symbols-rounded">
          {{ data.mode === 'create' ? 'add' : 'check' }}
        </span>
        {{
          data.mode === 'create'
            ? data.kind === 'associationClass'
              ? 'Crear clase de asociación'
              : 'Crear clase'
            : 'Guardar'
        }}
      </button>
    </cf-dialog-actions>
  </app-class-dialog>
</template>

<style scoped lang="scss">
cf-dialog-content {
  min-width: min(430px, 78vw);
}

.dialog-copy {
  max-width: 520px;
  margin: 0 0 1.25rem;
  color: var(--cf-muted);
  line-height: 1.6;
}

form,
cf-form-field {
  width: 100%;
}

button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

@media (max-width: 520px) {
  cf-dialog-content {
    min-width: 0;
  }
}
</style>
