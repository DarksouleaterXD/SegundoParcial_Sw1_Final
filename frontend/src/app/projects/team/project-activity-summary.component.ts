import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

interface Summary {
  from: string; to: string; generatedAt: string; actorId: string | null; total: number;
  actions: {action: string | null; count: number}[];
  contributors: {id: string; name: string; count: number}[];
}
function localDate(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
@Component({
  selector: 'app-project-activity-summary', imports: [DatePipe, FormsModule],
  templateUrl: './project-activity-summary.component.html', styleUrl: './project-activity-summary.component.scss',
})
export class ProjectActivitySummaryComponent {
  readonly projectId = input.required<string>();
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly result = signal<Summary | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly copied = signal('');
  from = localDate(new Date(Date.now() - 7 * 86400000));
  to = localDate(new Date(Date.now() + 60000));
  actorId = '';
  private readonly initial = effect(() => {
    this.projectId();
    untracked(() => { this.result.set(null); this.actorId = ''; this.load(); });
  });
  preset(days: number): void {
    this.from = localDate(new Date(Date.now() - days * 86400000));
    this.to = localDate(new Date(Date.now() + 60000)); this.actorId = ''; this.load();
  }
  load(): void {
    const start = new Date(this.from), end = new Date(this.to);
    if (!this.from || !this.to || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())
      || start >= end || end.getTime() - start.getTime() > 90 * 86400000) {
      this.error.set('Selecciona un período válido de hasta 90 días.'); return;
    }
    this.request?.unsubscribe();
    const projectId = this.projectId();
    const params: Record<string,string> = {from:start.toISOString(), to:end.toISOString()};
    if (this.actorId) params['actorId'] = this.actorId;
    this.loading.set(true); this.error.set(''); this.copied.set('');
    this.request = this.http.get<Summary>('/api/projects/' + projectId + '/journal/summary', {params})
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: result => { this.result.set(result); this.loading.set(false); },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          if ([401,403,404].includes(error.status)) this.result.set(null);
          this.error.set(error.status === 400 ? 'El período no es válido o supera 90 días.'
            : 'No se pudo cargar el resumen. Comprueba tu acceso y vuelve a intentarlo.');
        }
      });
  }
  label(action: string | null): string {
    const labels: Record<string,string> = {
      PROJECT_CREATED:'Proyectos creados',PROJECT_RENAMED:'Cambios de nombre del proyecto',DOCUMENT_SAVED:'Documentos guardados',
      CREATE_CLASS:'Clases creadas',RENAME_CLASS:'Clases renombradas',DELETE_CLASS:'Clases eliminadas',RESTORE_CLASS:'Clases restauradas',
      ADD_ATTRIBUTE:'Atributos añadidos',UPDATE_ATTRIBUTE:'Atributos editados',DELETE_ATTRIBUTE:'Atributos eliminados',
      CREATE_RELATIONSHIP:'Relaciones creadas',UPDATE_RELATIONSHIP:'Relaciones editadas',DELETE_RELATIONSHIP:'Relaciones eliminadas',
      MOVE_CLASS:'Movimientos de clases',SET_METHODS:'Actualizaciones de métodos',BATCH:'Lotes de cambios',
      CREATE_ASSOCIATION_CLASS:'Clases de asociación creadas',DELETE_ASSOCIATION_CLASS:'Clases de asociación eliminadas',
      RESTORE_ASSOCIATION_CLASS:'Clases de asociación restauradas'
    };
    return labels[action ?? ''] ?? 'Otras operaciones';
  }
  description(summary: Summary): string {
    const author = summary.actorId ? summary.contributors.find(value => value.id === summary.actorId)?.name ?? 'El integrante seleccionado' : 'El equipo';
    return summary.total === 0 ? 'No hay operaciones registradas para este filtro.'
      : author + ' realizó ' + summary.total + (summary.total === 1 ? ' operación confirmada' : ' operaciones confirmadas') + ' en el período seleccionado.';
  }
  async copy(): Promise<void> {
    const summary = this.result(); if (!summary) return;
    const text = ['Resumen de actividad', this.description(summary),
      'Desde: ' + new Date(summary.from).toLocaleString() + ' · Hasta (exclusivo): ' + new Date(summary.to).toLocaleString(),
      ...summary.actions.map(value => this.label(value.action) + ': ' + value.count),
      'Calculado: ' + new Date(summary.generatedAt).toLocaleString(),
      'Fuente: historial registrado. Los lotes cuentan como una operación; no se cuentan mensajes ni acciones anteriores al historial.'].join('\n');
    try { await navigator.clipboard.writeText(text); this.copied.set('Resumen copiado.'); }
    catch { this.copied.set('No se pudo copiar al portapapeles.'); }
  }
}
