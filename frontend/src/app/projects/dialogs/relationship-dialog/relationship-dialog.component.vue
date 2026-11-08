<script lang="ts">
import { defineComponent } from 'vue';
import { RelationshipDialogComponent } from './relationship-dialog.component';
import { setupView } from '../../../core/view-state';

export default defineComponent({
  name: 'RelationshipDialogComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(RelationshipDialogComponent, props, emit, {}),
    };
  },
});
</script>

<template>
  <app-relationship-dialog class="studio-view">
    <h2 class="studio-dialog-title">
      {{ data.mode === 'create' ? 'Nueva relacion' : 'Editar relacion' }}
    </h2>
    <cf-dialog-content>
      <p class="dialog-copy">
        {{
          form.controls.type.value === 'GENERALIZATION'
            ? 'En generalizacion, el origen es la subclase y el destino es la superclase.'
            : form.controls.type.value === 'AGGREGATION' || form.controls.type.value === 'COMPOSITION'
              ? 'En agregacion y composicion, el origen es el lado del rombo (el todo o propietario).'
              : 'Define los extremos y multiplicidades de la asociacion.'
        }}
      </p>
      <form id="relationship-form" @submit.prevent="submit()" novalidate class="relationship-form">
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>{{ form.controls.type.value === 'GENERALIZATION' ? 'Subclase' : 'Origen' }}</cf-label>
            <select
              v-model="form.controls.sourceClassId.value"
              @blur="form.controls.sourceClassId.markAsTouched()"
              :aria-invalid="form.controls.sourceClassId.invalid && form.controls.sourceClassId.touched"
            >
              <template v-for="(umlClass, $index) in data.classes" :key="umlClass.id">
                <option :value="umlClass.id">
                  {{ umlClass.name }}
                </option>
              </template>
            </select>
          </label>
          <div class="studio-field-notes"></div>
        </cf-form-field>
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>
              {{ form.controls.type.value === 'GENERALIZATION' ? 'Superclase' : 'Destino' }}
            </cf-label>
            <select
              v-model="form.controls.targetClassId.value"
              @blur="form.controls.targetClassId.markAsTouched()"
              :aria-invalid="form.controls.targetClassId.invalid && form.controls.targetClassId.touched"
            >
              <template v-for="(umlClass, $index) in data.classes" :key="umlClass.id">
                <option :value="umlClass.id">
                  {{ umlClass.name }}
                </option>
              </template>
            </select>
          </label>
          <div class="studio-field-notes">
            <template v-if="form.controls.targetClassId.hasError('selfGeneralization')">
              <cf-error>Una clase no puede heredar de si misma.</cf-error>
            </template>
          </div>
        </cf-form-field>
        <cf-form-field class="studio-field">
          <label class="studio-field-control">
            <cf-label>Tipo UML</cf-label>
            <select
              v-model="form.controls.type.value"
              @blur="form.controls.type.markAsTouched()"
              :aria-invalid="form.controls.type.invalid && form.controls.type.touched"
            >
              <template v-for="(option, $index) in typeOptions" :key="option.value">
                <option :value="option.value">
                  {{ option.label }}
                </option>
              </template>
            </select>
          </label>
          <div class="studio-field-notes"></div>
        </cf-form-field>
        <template v-if="form.controls.type.value !== 'GENERALIZATION'">
          <div class="multiplicity-grid">
            <cf-form-field class="studio-field">
              <label class="studio-field-control">
                <cf-label>Multiplicidad origen</cf-label>
                <select
                  v-model="form.controls.sourceMultiplicity.value"
                  @blur="form.controls.sourceMultiplicity.markAsTouched()"
                  :aria-invalid="
                    form.controls.sourceMultiplicity.invalid && form.controls.sourceMultiplicity.touched
                  "
                >
                  <template v-for="(option, $index) in multiplicityOptions" :key="option">
                    <option :value="option">
                      {{ option }}
                    </option>
                  </template>
                </select>
              </label>
              <div class="studio-field-notes"></div>
            </cf-form-field>
            <cf-form-field class="studio-field">
              <label class="studio-field-control">
                <cf-label>Multiplicidad destino</cf-label>
                <select
                  v-model="form.controls.targetMultiplicity.value"
                  @blur="form.controls.targetMultiplicity.markAsTouched()"
                  :aria-invalid="
                    form.controls.targetMultiplicity.invalid && form.controls.targetMultiplicity.touched
                  "
                >
                  <template v-for="(option, $index) in multiplicityOptions" :key="option">
                    <option :value="option">
                      {{ option }}
                    </option>
                  </template>
                </select>
              </label>
              <div class="studio-field-notes"></div>
            </cf-form-field>
          </div>
        </template>
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
        form="relationship-form"
        class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
      >
        <span aria-hidden="true" class="material-symbols-rounded">
          {{ data.mode === 'create' ? 'add_link' : 'check' }}
        </span>

        {{ data.mode === 'create' ? 'Crear relacion' : 'Guardar' }}
      </button>
    </cf-dialog-actions>
  </app-relationship-dialog>
</template>

<style scoped lang="scss">
cf-dialog-content {
  min-width: min(560px, 82vw);
}

.dialog-copy {
  max-width: 580px;
  margin: 0 0 1rem;
  color: var(--cf-muted);
  line-height: 1.6;
}

.relationship-form {
  display: grid;
  gap: 0.2rem;
}

.multiplicity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

cf-form-field {
  width: 100%;
}

button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

@media (max-width: 560px) {
  cf-dialog-content {
    min-width: 0;
  }

  .multiplicity-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
