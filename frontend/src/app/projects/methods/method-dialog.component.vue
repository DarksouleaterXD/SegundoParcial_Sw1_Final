<script lang="ts">
import { defineComponent } from 'vue';
import { MethodDialogComponent } from './class-methods.component';
import { setupView } from '../../core/view-state';

export default defineComponent({
  name: 'MethodDialogComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(MethodDialogComponent, props, emit, { state: ['name', 'visibility', 'returnType', 'parameters'] }),
    };
  },
});
</script>

<template>
  <app-method-dialog class="studio-view">
    <h2 class="studio-dialog-title">{{ data.method ? 'Editar método' : 'Nuevo método' }}</h2>
    <cf-dialog-content>
      <p>Clase {{ data.classifier.name }} · Operación UML de documentación.</p>
      <form id="method-form" @submit.prevent="submit()" novalidate>
        <label>
          Nombre del método
          <input name="name" maxlength="80" required v-model="name" />
        </label>
        <div class="fields">
          <label>
            Visibilidad
            <select name="visibility" v-model="visibility">
              <option value="PUBLIC">+ Público</option>
              <option value="PRIVATE">− Privado</option>
              <option value="PROTECTED"># Protegido</option>
              <option value="PACKAGE">~ Paquete</option>
            </select>
          </label>
          <label>
            Tipo de retorno
            <input
              name="returnType"
              maxlength="120"
              placeholder="void, String, Cliente…"
              required
              v-model="returnType"
            />
          </label>
        </div>
        <label>
          Parámetros
          <textarea
            name="parameters"
            rows="4"
            maxlength="5000"
            placeholder="Un parámetro por línea. Ejemplo:
id: UUID
nombre: String"
            v-model="parameters"
          ></textarea>
        </label>
        <small>
          Hasta 20 parámetros. Tipos simples, nombres de clase o arreglos como String[]. No se implementa el
          cuerpo del método.
        </small>
        <template v-if="error()">
          <p role="alert" class="error">{{ error() }}</p>
        </template>
      </form>
    </cf-dialog-content>
    <cf-dialog-actions align="end">
      <button type="button" @click="ref.close()" class="studio-button-base studio-button">Cancelar</button>
      <button
        form="method-form"
        type="submit"
        class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
      >
        Guardar método
      </button>
    </cf-dialog-actions>
  </app-method-dialog>
</template>

<style scoped lang="scss">
cf-dialog-content {
  width: min(520px, 80vw);
  box-sizing: border-box;
}
form,
label {
  display: grid;
  gap: 8px;
}
form {
  gap: 16px;
}
label {
  font-size: 12px;
  color: #4e3b70;
}
p,
small {
  font-size: 11px;
  color: #82778e;
  line-height: 1.8;
}
input,
select,
textarea {
  font: inherit;
  font-size: 13px;
  padding: 10px;
  background: #fcfaff;
  border: 1px solid #d9d1e7;
  border-radius: 7px;
  width: 100%;
  box-sizing: border-box;
  color: #222337;
}
textarea {
  resize: vertical;
}
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.error {
  color: #a72c40;
}
@media (max-width: 600px) {
  .fields {
    grid-template-columns: 1fr;
  }
}
</style>
