import { DestroyScope,computed,useService,signal,untilDestroyed } from '../../../core/view-state';
import { FormControl,FormGroup,Validators } from '../../../core/forms';
import { Navigation } from '../../../core/navigation';
import { finalize,timer } from 'rxjs';

import { ProjectApiService } from '../../data/project-api.service';
import { ProjectInvitationApiService } from '../../data/project-invitation-api.service';
import { Project } from '../../model/project';
import { ProjectInvitation } from '../../model/project-invitation';

export class ProjectListPage {
  private readonly projectApi = useService(ProjectApiService);
  private readonly invitationApi = useService(ProjectInvitationApiService);
  private readonly router = useService(Navigation);
  private readonly destroyRef = useService(DestroyScope);

  readonly projects = signal<Project[]>([]);
  readonly query = signal('');
  readonly accessFilter = signal<'ALL' | 'OWNER' | 'EDITOR'>('ALL');
  readonly filteredProjects = computed(() => this.projects()
    .filter(project => (this.accessFilter() === 'ALL' || project.accessRole === this.accessFilter())
      && project.name.toLocaleLowerCase().includes(this.query().trim().toLocaleLowerCase()))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)));
  readonly ownedCount = computed(() => this.projects().filter(project => project.accessRole === 'OWNER').length);
  readonly sharedCount = computed(() => this.projects().filter(project => project.accessRole === 'EDITOR').length);
  readonly pendingInvitations = signal<ProjectInvitation[]>([]);
  readonly loading = signal(true);
  readonly invitationsLoading = signal(true);
  readonly creating = signal(false);
  readonly invitationActionId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly invitationErrorMessage = signal<string | null>(null);

  readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.maxLength(120),
    ],
  });

  readonly form = new FormGroup({
    name: this.nameControl,
  });

  constructor() {
    this.loadProjects();
    this.loadPendingInvitations();

    timer(10_000, 10_000)
      .pipe(untilDestroyed(this.destroyRef))
      .subscribe(() => this.loadPendingInvitations(true));
  }

  createProject(): void {
    this.nameControl.markAsTouched();

    if (this.nameControl.invalid || this.creating()) {
      return;
    }

    const name = this.nameControl.value.trim();

    if (!name) {
      this.nameControl.setErrors({ required: true });
      return;
    }

    this.creating.set(true);
    this.errorMessage.set(null);

    this.projectApi
      .create({ name })
      .pipe(
        finalize(() => this.creating.set(false)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (project) => {
          void this.router.navigate(['/projects', project.id]);
        },
        error: () => {
          this.errorMessage.set(
            'No pudimos crear el proyecto. Verifica que el backend este disponible.',
          );
        },
      });
  }

  acceptInvitation(invitation: ProjectInvitation): void {
    if (this.invitationActionId()) {
      return;
    }

    this.invitationActionId.set(invitation.id);
    this.invitationErrorMessage.set(null);

    this.invitationApi
      .accept(invitation.id)
      .pipe(
        finalize(() => this.invitationActionId.set(null)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.pendingInvitations.update(
            (items) => items.filter((item) => item.id !== invitation.id),
          );
          this.loadProjects();
        },
        error: () => {
          this.invitationErrorMessage.set(
            'No pudimos aceptar la invitacion. Actualiza la bandeja e intenta nuevamente.',
          );
        },
      });
  }

  declineInvitation(invitation: ProjectInvitation): void {
    if (this.invitationActionId()) {
      return;
    }

    this.invitationActionId.set(invitation.id);
    this.invitationErrorMessage.set(null);

    this.invitationApi
      .decline(invitation.id)
      .pipe(
        finalize(() => this.invitationActionId.set(null)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.pendingInvitations.update(
            (items) => items.filter((item) => item.id !== invitation.id),
          );
        },
        error: () => {
          this.invitationErrorMessage.set(
            'No pudimos rechazar la invitacion. Actualiza la bandeja e intenta nuevamente.',
          );
        },
      });
  }

  retry(): void {
    this.loadProjects();
  }

  retryInvitations(): void {
    this.loadPendingInvitations();
  }

  private loadProjects(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.projectApi
      .list()
      .pipe(
        finalize(() => this.loading.set(false)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (projects) => this.projects.set(projects),
        error: () => {
          this.errorMessage.set(
            'No pudimos cargar tus proyectos. Verifica la conexion con ClassForge Backend.',
          );
        },
      });
  }

  private loadPendingInvitations(silent = false): void {
    if (!silent) {
      this.invitationsLoading.set(true);
      this.invitationErrorMessage.set(null);
    }

    this.invitationApi
      .pending()
      .pipe(
        finalize(() => {
          if (!silent) {
            this.invitationsLoading.set(false);
          }
        }),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (invitations) => this.pendingInvitations.set(invitations),
        error: () => {
          if (!silent) {
            this.invitationErrorMessage.set(
              'No pudimos cargar tus invitaciones pendientes.',
            );
          }
        },
      });
  }
}
