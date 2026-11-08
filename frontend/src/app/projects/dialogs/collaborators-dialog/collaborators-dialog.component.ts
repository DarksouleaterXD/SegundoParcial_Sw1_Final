import { DestroyScope,computed,useService,signal,untilDestroyed,DIALOG_DATA,DIALOG_HANDLE } from '../../../core/view-state';
import { FormControl,FormGroup,Validators } from '../../../core/forms';
import { HttpErrorResponse } from '../../../core/api/http-client';
import { DialogHandle } from '../../../core/dialogs';
import { finalize } from 'rxjs';

import { ProjectInvitationApiService } from '../../data/project-invitation-api.service';
import { ProjectAccessRole } from '../../model/project';
import { ProjectCollaborators } from '../../model/project-invitation';
import { ProjectPresenceService } from '../../presence/project-presence.service';

export interface CollaboratorsDialogData {
  projectId: string;
  projectName: string;
  accessRole: ProjectAccessRole;
}

export class CollaboratorsDialogComponent {
  readonly data = useService<CollaboratorsDialogData>(DIALOG_DATA);
  readonly dialogRef = useService<DialogHandle<CollaboratorsDialogComponent>>(DIALOG_HANDLE);
  readonly presence = useService(ProjectPresenceService);

  private readonly api = useService(ProjectInvitationApiService);
  private readonly destroyRef = useService(DestroyScope);

  readonly collaborators = signal<ProjectCollaborators | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly actionSuccess = signal<string | null>(null);
  readonly sendingInvite = signal(false);
  readonly cancellingInvitationId = signal<string | null>(null);

  readonly isOwner = computed(
    () => this.data.accessRole === 'OWNER',
  );

  readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.email,
      Validators.maxLength(160),
    ],
  });

  readonly inviteForm = new FormGroup({
    email: this.emailControl,
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api
      .collaborators(this.data.projectId)
      .pipe(
        finalize(() => this.loading.set(false)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (collaborators) => this.collaborators.set(collaborators),
        error: () => {
          this.errorMessage.set(
            'No pudimos cargar los colaboradores del proyecto.',
          );
        },
      });
  }

  invite(): void {
    this.emailControl.markAsTouched();

    if (!this.isOwner() || this.emailControl.invalid || this.sendingInvite()) {
      return;
    }

    const email = this.emailControl.value.trim();

    if (!email) {
      this.emailControl.setErrors({ required: true });
      return;
    }

    this.sendingInvite.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.api
      .invite(this.data.projectId, email)
      .pipe(
        finalize(() => this.sendingInvite.set(false)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (invitation) => {
          this.emailControl.reset('');
          this.actionSuccess.set(
            `Invitacion creada para ${invitation.invitedEmail}. La otra cuenta la vera en su bandeja en unos segundos.`,
          );
          this.collaborators.update((current) =>
            current
              ? {
                  ...current,
                  pendingInvitations: [
                    ...current.pendingInvitations,
                    invitation,
                  ],
                }
              : current,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.actionError.set(
            this.invitationFailureMessage(error),
          );
        },
      });
  }

  cancelInvitation(invitationId: string): void {
    if (!this.isOwner() || this.cancellingInvitationId()) {
      return;
    }

    this.cancellingInvitationId.set(invitationId);
    this.actionError.set(null);
    this.actionSuccess.set(null);

    this.api
      .cancel(this.data.projectId, invitationId)
      .pipe(
        finalize(() => this.cancellingInvitationId.set(null)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.actionSuccess.set('Invitacion pendiente cancelada.');
          this.collaborators.update((current) =>
            current
              ? {
                  ...current,
                  pendingInvitations: current.pendingInvitations.filter(
                    (invitation) => invitation.id !== invitationId,
                  ),
                }
              : current,
          );
        },
        error: (error: HttpErrorResponse) => {
          this.actionError.set(
            this.invitationFailureMessage(
              error,
              'No pudimos cancelar la invitacion pendiente.',
            ),
          );
        },
      });
  }

  private invitationFailureMessage(
    error: HttpErrorResponse,
    fallback = 'No pudimos crear la invitacion.',
  ): string {
    const backendMessage = error.error?.message;

    if (
      typeof backendMessage === 'string'
      && backendMessage.trim()
    ) {
      return backendMessage.trim();
    }

    if (error.status === 0) {
      return 'No pudimos contactar con ClassForge Backend. La invitacion no fue confirmada.';
    }

    return fallback;
  }
}
