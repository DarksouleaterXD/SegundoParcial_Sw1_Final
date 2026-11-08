<script lang="ts">
import { defineComponent } from 'vue';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { setupView } from '../../../core/view-state';

export default defineComponent({
  name: 'ConfirmDialogComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(ConfirmDialogComponent, props, emit),
    };
  },
});
</script>

<template>
  <app-confirm-dialog class="studio-view">
    <h2 class="studio-dialog-title">{{ data.title }}</h2>
    <cf-dialog-content>
      <div class="confirm-copy">
        <span aria-hidden="true" class="material-symbols-rounded confirm-icon">
          {{ data.icon ?? 'warning' }}
        </span>
        <p>{{ data.message }}</p>
      </div>
    </cf-dialog-content>
    <cf-dialog-actions align="end">
      <button
        type="button"
        @click="dialogRef.close(false)"
        class="studio-button-base studio-button cf-button-secondary"
      >
        Cancelar
      </button>
      <button
        type="button"
        @click="dialogRef.close(true)"
        class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
      >
        {{ data.confirmLabel }}
      </button>
    </cf-dialog-actions>
  </app-confirm-dialog>
</template>

<style scoped lang="scss">
.confirm-copy {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.8rem;
  align-items: start;
  max-width: 520px;
  color: var(--cf-muted);
  line-height: 1.65;
}

.confirm-copy p {
  margin: 0;
}

.confirm-icon {
  color: #b42318;
  font-size: 1.8rem;
}
</style>
