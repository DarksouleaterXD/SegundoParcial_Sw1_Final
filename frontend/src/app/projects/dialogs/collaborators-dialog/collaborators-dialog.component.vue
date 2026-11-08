<script lang="ts">
import { defineComponent } from 'vue';
import { CollaboratorsDialogComponent } from './collaborators-dialog.component';
import { present, setupView, formatDate } from '../../../core/view-state';

export default defineComponent({
  name: 'CollaboratorsDialogComponentView',

  setup(props, { emit }) {
    return {
      ...setupView(CollaboratorsDialogComponent, props, emit, {}),
      present,
      formatDate,
    };
  },
});
</script>

<template>
  <app-collaborators-dialog class="studio-view">
    <h2 class="studio-dialog-title">
      <span class="dialog-title-row">
        <span aria-hidden="true" class="material-symbols-rounded">group</span>
        Colaboradores
      </span>
    </h2>
    <cf-dialog-content>
      <p class="dialog-copy">
        {{ data.projectName }} · {{ data.accessRole === 'OWNER' ? 'Propietario' : 'Compartido · Editor' }}
      </p>
      <template v-if="loading()">
        <div aria-live="polite" class="dialog-feedback">
          <cf-spinner
            role="progressbar"
            aria-label="Cargando"
            style="--spinner-size: 32px"
            class="studio-spinner"
          ></cf-spinner>
          <span>Cargando colaboradores...</span>
        </div>
      </template>
      <template v-else-if="errorMessage()">
        <div role="alert" class="dialog-feedback is-error">
          <span aria-hidden="true" class="material-symbols-rounded">error</span>
          <span>{{ errorMessage() }}</span>
          <button type="button" @click="load()" class="studio-button-base studio-button cf-button-secondary">
            Reintentar
          </button>
        </div>
      </template>
      <template v-else-if="collaborators()">
        <template v-for="collaboratorsData in present(collaborators())">
          <section aria-labelledby="owner-title" class="people-section">
            <div class="section-title-row">
              <div>
                <p class="section-kicker">PROPIETARIO</p>
                <h3 id="owner-title">Responsable del proyecto</h3>
              </div>
            </div>
            <div class="person-row">
              <span aria-hidden="true" class="material-symbols-rounded person-icon">person</span>
              <div class="person-copy">
                <strong>{{ collaboratorsData.owner.displayName }}</strong>
                <small>{{ collaboratorsData.owner.email }}</small>
              </div>
              <span class="role-badge">OWNER</span>
            </div>
          </section>
          <section aria-labelledby="editors-title" class="people-section">
            <div class="section-title-row">
              <div>
                <p class="section-kicker">EDITORES</p>
                <h3 id="editors-title">Miembros con edición</h3>
              </div>
              <span class="count-badge">{{ collaboratorsData.editors.length }}</span>
            </div>
            <template v-if="collaboratorsData.editors.length === 0">
              <p class="empty-copy">Todavia no hay editores persistentes.</p>
            </template>
            <template v-else>
              <div class="people-list">
                <template v-for="(editor, $index) in collaboratorsData.editors" :key="editor.userId">
                  <div class="person-row">
                    <span aria-hidden="true" class="material-symbols-rounded person-icon">person</span>
                    <div class="person-copy">
                      <strong>{{ editor.displayName }}</strong>
                      <small>{{ editor.email }}</small>
                    </div>
                    <span class="role-badge is-editor">EDITOR</span>
                  </div>
                </template>
              </div>
            </template>
          </section>
          <template v-if="isOwner()">
            <section aria-labelledby="invite-title" class="people-section management-section">
              <div class="section-title-row">
                <div>
                  <p class="section-kicker">INVITACIONES</p>
                  <h3 id="invite-title">Invitar por correo</h3>
                </div>
              </div>
              <form @submit.prevent="invite()" novalidate class="invite-form">
                <cf-form-field subscriptSizing="dynamic" class="studio-field">
                  <label class="studio-field-control">
                    <cf-label>correo@example.com</cf-label>
                    <input
                      type="email"
                      maxlength="160"
                      autocomplete="email"
                      v-model="inviteForm.controls.email.value"
                      @blur="inviteForm.controls.email.markAsTouched()"
                      :aria-invalid="inviteForm.controls.email.invalid && inviteForm.controls.email.touched"
                      placeholder=" "
                    />
                  </label>
                  <div class="studio-field-notes">
                    <template v-if="emailControl.hasError('required') && emailControl.touched">
                      <cf-error>El correo es obligatorio.</cf-error>
                    </template>
                    <template v-else-if="emailControl.hasError('email') && emailControl.touched">
                      <cf-error>Usa un correo valido.</cf-error>
                    </template>
                  </div>
                </cf-form-field>
                <button
                  type="submit"
                  :disabled="sendingInvite()"
                  class="studio-button-base studio-button studio-unelevated-button cf-button-primary"
                >
                  <span aria-hidden="true" class="material-symbols-rounded">person_add</span>
                  {{ sendingInvite() ? 'Invitando...' : 'Invitar' }}
                </button>
              </form>
              <template v-if="actionSuccess()">
                <p role="status" class="action-feedback is-success">
                  <span aria-hidden="true" class="material-symbols-rounded">check_circle</span>
                  <span>{{ actionSuccess() }}</span>
                </p>
              </template>
              <template v-if="actionError()">
                <p role="alert" class="action-feedback is-error">
                  <span aria-hidden="true" class="material-symbols-rounded">error</span>
                  <span>{{ actionError() }}</span>
                </p>
              </template>
              <template v-if="collaboratorsData.pendingInvitations.length > 0">
                <div class="pending-list">
                  <template
                    v-for="(invitation, $index) in collaboratorsData.pendingInvitations"
                    :key="invitation.id"
                  >
                    <div class="pending-row">
                      <span aria-hidden="true" class="material-symbols-rounded">schedule</span>
                      <div>
                        <strong>{{ invitation.invitedEmail }}</strong>
                        <small>Pendiente desde {{ formatDate(invitation.createdAt, 'short') }}</small>
                      </div>
                      <button
                        type="button"
                        :disabled="cancellingInvitationId() === invitation.id"
                        @click="cancelInvitation(invitation.id)"
                        class="studio-button-base studio-button cf-button-secondary compact-action"
                      >
                        {{ cancellingInvitationId() === invitation.id ? 'Cancelando...' : 'Cancelar' }}
                      </button>
                    </div>
                  </template>
                </div>
              </template>
            </section>
          </template>
          <section aria-labelledby="presence-title" class="people-section presence-section">
            <div class="section-title-row">
              <div>
                <p class="section-kicker">PRESENCIA</p>
                <h3 id="presence-title">Conectados ahora</h3>
              </div>
              <span class="count-badge is-live">{{ presence.participantCount() }}</span>
            </div>
            <template v-if="presence.participants().length === 0">
              <p class="empty-copy">Esperando presencia STOMP...</p>
            </template>
            <template v-else>
              <div class="people-list">
                <template
                  v-for="(participant, $index) in presence.participants()"
                  :key="participant.clientId"
                >
                  <div class="person-row compact-person-row">
                    <span aria-hidden="true" class="material-symbols-rounded person-icon">
                      radio_button_checked
                    </span>
                    <div class="person-copy">
                      <strong>{{ presence.displayLabel(participant) }}</strong>
                      <small>
                        <template v-if="participant.selectedElement">
                          {{ participant.selectedElement.elementType === 'CLASS' ? 'Clase' : 'Relacion' }}
                          seleccionada
                        </template>
                        <template v-else>En el proyecto</template>
                      </small>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </section>
        </template>
      </template>
    </cf-dialog-content>
    <cf-dialog-actions align="end">
      <button
        type="button"
        @click="dialogRef.close()"
        class="studio-button-base studio-button cf-button-secondary"
      >
        Cerrar
      </button>
    </cf-dialog-actions>
  </app-collaborators-dialog>
</template>

<style scoped lang="scss">
cf-dialog-content {
  width: min(680px, 82vw);
  max-height: min(74vh, 760px);
}

.dialog-title-row,
.section-title-row,
.person-row,
.invite-form,
.pending-row {
  display: flex;
  align-items: center;
}

.dialog-title-row {
  gap: 0.5rem;
}

.dialog-copy {
  margin: 0 0 1rem;
  color: var(--cf-muted);
  line-height: 1.55;
}

.dialog-feedback {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.7rem;
  color: var(--cf-muted);
}

.dialog-feedback.is-error,
.action-feedback.is-error {
  color: #b42318;
}

.action-feedback.is-success {
  color: #166534;
}

.people-section {
  display: grid;
  gap: 0.75rem;
  padding: 1rem 0;
  border-top: 1px solid var(--cf-border);
}

.people-section:first-of-type {
  border-top: 0;
}

.section-title-row {
  justify-content: space-between;
  gap: 1rem;
}

.section-kicker {
  margin: 0;
  color: var(--cf-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

h3 {
  margin: 0.15rem 0 0;
  font-size: 1rem;
}

.people-list,
.pending-list {
  display: grid;
  gap: 0.55rem;
}

.person-row,
.pending-row {
  min-width: 0;
  gap: 0.65rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid var(--cf-border);
  border-radius: 0.7rem;
  background: #fff;
}

.person-icon,
.pending-row > .material-symbols-rounded {
  color: #4f46e5;
}

.person-copy,
.pending-row > div {
  min-width: 0;
  display: grid;
  gap: 0.1rem;
  flex: 1 1 auto;
}

.person-copy strong,
.person-copy small,
.pending-row strong,
.pending-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-copy small,
.pending-row small,
.empty-copy {
  color: var(--cf-muted);
  font-size: 0.78rem;
}

.empty-copy,
.action-feedback {
  margin: 0;
  line-height: 1.55;
}

.action-feedback {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid currentColor;
  border-radius: 0.65rem;
  background: rgb(255 255 255 / 72%);
  font-size: 0.82rem;
}

.action-feedback .material-symbols-rounded {
  flex: 0 0 auto;
  font-size: 1.05rem;
}

.role-badge,
.count-badge {
  flex: 0 0 auto;
  padding: 0.2rem 0.5rem;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 0.66rem;
  font-weight: 800;
}

.role-badge.is-editor {
  border-color: var(--cf-border);
  background: #f9fafb;
  color: #475467;
}

.count-badge.is-live {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.invite-form {
  align-items: flex-start;
  gap: 0.65rem;
}

.invite-form cf-form-field {
  flex: 1 1 auto;
}

.invite-form button {
  flex: 0 0 auto;
  min-height: 56px;
}

.pending-row .compact-action {
  flex: 0 0 auto;
  min-height: 36px;
}

.compact-person-row {
  padding-block: 0.55rem;
}

@media (max-width: 620px) {
  cf-dialog-content {
    width: auto;
  }

  .invite-form,
  .pending-row {
    align-items: stretch;
    flex-direction: column;
  }

  .invite-form button,
  .pending-row .compact-action {
    width: 100%;
  }
}
</style>
