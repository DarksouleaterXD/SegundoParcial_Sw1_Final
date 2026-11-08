<script lang="ts">
import { defineComponent } from 'vue';
import { AttributeDialogComponent } from './attribute-dialog.component';
import { setupView } from '../../../core/view-state';

export default defineComponent({
  name: 'AttributeDialogComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(AttributeDialogComponent, props, emit),
    };
  },
});
</script>

<template>
  <app-attribute-dialog class="studio-view">
    <h2 class="studio-dialog-title">
      {{ data.mode === 'create' ? 'Nuevo atributo' : 'Editar atributo' }}
    </h2>
    <cf-dialog-content>
      <p class="dialog-copy">
        Clase
        <strong>{{ data.className }}</strong>
      </p>
      <form id="attribute-form" @submit.prevent="submit()" novalidate class="attribute-form">
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>Nombre</cf-label>
            <input
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
              <cf-error>La clase ya tiene un atributo con ese nombre.</cf-error>
            </template>
          </div>
        </cf-form-field>
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>Tipo</cf-label>
            <select
              v-model="form.controls.dataType.value"
              @blur="form.controls.dataType.markAsTouched()"
              :aria-invalid="form.controls.dataType.invalid && form.controls.dataType.touched"
            >
              <template v-for="(option, $index) in dataTypes" :key="option.value">
                <option :value="option.value">
                  {{ option.label }}
                </option>
              </template>
            </select>
          </label>
          <div class="studio-field-notes"></div>
        </cf-form-field>
        <template v-if="form.controls.dataType.value === 'CUSTOM'">
          <cf-form-field class="studio-field">
            <label class="studio-field-control">
              <cf-label>Tipo personalizado</cf-label>
              <input
                maxlength="120"
                autocomplete="off"
                placeholder="Ej. Money"
                v-model="form.controls.customTypeName.value"
                @blur="form.controls.customTypeName.markAsTouched()"
                :aria-invalid="form.controls.customTypeName.invalid && form.controls.customTypeName.touched"
              />
            </label>
            <div class="studio-field-notes">
              <template v-if="form.controls.customTypeName.hasError('required')">
                <cf-error>Indica el nombre del tipo personalizado.</cf-error>
              </template>
              <template v-else-if="form.controls.customTypeName.hasError('pattern')">
                <cf-error>Usa un nombre compatible con codigo.</cf-error>
              </template>
            </div>
          </cf-form-field>
        </template>
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>Visibilidad UML</cf-label>
            <select
              v-model="form.controls.visibility.value"
              @blur="form.controls.visibility.markAsTouched()"
              :aria-invalid="form.controls.visibility.invalid && form.controls.visibility.touched"
            >
              <template v-for="(option, $index) in visibilityOptions" :key="option.value">
                <option :value="option.value">{{ option.symbol }} {{ option.label }}</option>
              </template>
            </select>
          </label>
          <div class="studio-field-notes"></div>
        </cf-form-field>
        <div class="flags">
          <cf-checkbox>
            <label>
              <input type="checkbox" v-model="form.controls.identifier.value" />
              Identificador
            </label>
          </cf-checkbox>
          <cf-checkbox>
            <label>
              <input
                type="checkbox"
                v-model="form.controls.nullable.value"
                :disabled="form.controls.identifier.value"
              />
              Nullable
            </label>
          </cf-checkbox>
        </div>
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
        form="attribute-form"
        class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
      >
        <span aria-hidden="true" class="material-symbols-rounded">
          {{ data.mode === 'create' ? 'add' : 'check' }}
        </span>
        {{ data.mode === 'create' ? 'Anadir' : 'Guardar' }}
      </button>
    </cf-dialog-actions>
  </app-attribute-dialog>
</template>

<style scoped lang="scss">
cf-dialog-content {
  min-width: min(520px, 82vw);
}

.dialog-copy {
  margin: 0 0 1rem;
  color: var(--cf-muted);
}

.attribute-form {
  display: grid;
  gap: 0.2rem;
}

cf-form-field {
  width: 100%;
}

.flags {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.6rem;
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

  .flags {
    display: grid;
    gap: 0.35rem;
  }
}
</style>
