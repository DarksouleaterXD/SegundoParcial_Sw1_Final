import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, catchError, exhaustMap, timer } from 'rxjs';
import { AuthService } from '../../auth/data/auth.service';
import { ProjectActivitySummaryComponent } from './project-activity-summary.component';

interface Entry {
  id: number; actorId: string; actorName: string; body: string;
  action: string | null; elementId: string | null; revision: number | null; createdAt: string;
}
interface History { entries: Entry[]; nextBefore: number | null; }

export type ProjectTeamTab = 'CHAT' | 'ACTIVITY' | 'SUMMARY';

@Component({
  selector: 'app-project-team-panel',
  imports: [DatePipe, FormsModule, ProjectActivitySummaryComponent],
  templateUrl: './project-team-panel.component.html',
  styleUrl: './project-team-panel.component.scss',
})
export class ProjectTeamPanelComponent {
  readonly projectId = input.required<string>();
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly tab = model<ProjectTeamTab>('CHAT');
  readonly entries = signal<Entry[]>([]);
  readonly nextBefore = signal<number | null>(null);
  readonly error = signal('');
  readonly sendError = signal('');
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly loadingOlder = signal(false);
  draft = '';
  readonly visible = computed(() => [...this.entries()].sort((a, b) =>
    this.tab() === 'CHAT' ? a.id - b.id : b.id - a.id));
  private readonly refresh = effect(onCleanup => {
    const projectId = this.projectId(), kind = this.tab();
    this.entries.set([]); this.nextBefore.set(null); this.loading.set(true); this.error.set('');
    if (kind === 'SUMMARY') { this.loading.set(false); return; }
    let initialized = false;
    const subscription = timer(0, 4000).pipe(
      exhaustMap(() => this.http.get<History>(this.url(projectId), { params: { kind } }).pipe(
        catchError((error: HttpErrorResponse) => {
          if ([401, 403, 404].includes(error.status)) { this.entries.set([]); this.nextBefore.set(null); }
          this.error.set('No se pudo actualizar. Comprueba tu conexión y el acceso al proyecto. Se reintentará automáticamente.');
          this.loading.set(false); return EMPTY;
        })
      ))
    ).subscribe(page => {
      const newestKnown = Math.max(0, ...this.entries().map(entry => entry.id));
      if (initialized && newestKnown > 0 && page.entries.length === 50 && page.entries.every(entry => entry.id > newestKnown)) {
        this.entries.set([]); initialized = false;
      }
      this.merge(page.entries);
      if (!initialized) { this.nextBefore.set(page.nextBefore); initialized = true; }
      this.loading.set(false); this.error.set('');
    });
    onCleanup(() => subscription.unsubscribe());
  });
  private url(id = this.projectId()): string { return '/api/projects/' + id + '/journal'; }
  private merge(incoming: Entry[]): void {
    this.entries.update(existing => [...new Map([...existing, ...incoming].map(entry => [entry.id, entry])).values()]);
  }
  older(): void {
    const before = this.nextBefore(); if (before === null || this.loadingOlder()) return;
    const kind = this.tab(), projectId = this.projectId();
    this.loadingOlder.set(true);
    this.http.get<History>(this.url(projectId), { params: {kind, before} })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: page => {
          if (kind === this.tab() && projectId === this.projectId()) {
            this.merge(page.entries); this.nextBefore.set(page.nextBefore); this.error.set('');
          }
          this.loadingOlder.set(false);
        },
        error: () => { this.error.set('No se pudo cargar el historial anterior. Vuelve a intentarlo.'); this.loadingOlder.set(false); }
      });
  }
  send(): void {
    const body = this.draft.trim(); if (!body || body.length > 2000 || this.sending()) return;
    const projectId = this.projectId();
    this.sending.set(true); this.sendError.set('');
    this.http.post<Entry>(this.url(projectId), { body }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: entry => {
        if (projectId === this.projectId()) {
          if (this.tab() === 'CHAT') this.merge([entry]);
          this.draft = '';
        }
        this.sending.set(false);
      },
      error: () => { this.sending.set(false); this.sendError.set('No se pudo enviar. Tu mensaje sigue disponible para reintentar.'); }
    });
  }
  action(entry: Entry): string {
    const labels: Record<string, string> = {
      PROJECT_CREATED: 'Creó el proyecto', PROJECT_RENAMED: 'Cambió el nombre del proyecto',
      DOCUMENT_SAVED: 'Guardó el documento', CREATE_CLASS: 'Creó una clase',
      SET_METHODS: 'Actualizó los métodos de una clase',
      RENAME_CLASS: 'Renombró una clase', DELETE_CLASS: 'Eliminó una clase', RESTORE_CLASS: 'Restauró una clase',
      ADD_ATTRIBUTE: 'Añadió un atributo', UPDATE_ATTRIBUTE: 'Editó un atributo', DELETE_ATTRIBUTE: 'Eliminó un atributo',
      CREATE_RELATIONSHIP: 'Creó una relación', UPDATE_RELATIONSHIP: 'Editó una relación',
      DELETE_RELATIONSHIP: 'Eliminó una relación', MOVE_CLASS: 'Movió una clase',
      CREATE_ASSOCIATION_CLASS: 'Creó una clase de asociación', DELETE_ASSOCIATION_CLASS: 'Eliminó una clase de asociación',
      RESTORE_ASSOCIATION_CLASS: 'Restauró una clase de asociación', BATCH: 'Aplicó cambios en lote'
    };
    return labels[entry.action ?? ''] ?? entry.body;
  }
}
