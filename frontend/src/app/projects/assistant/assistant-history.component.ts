import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { AssistantApiService, AssistantExchange } from './assistant-api.service';

@Component({
  selector: 'app-assistant-history',
  template: `
    <section class="history" [attr.aria-label]="shared() ? 'Historial compartido del asistente' : 'Historial privado del asistente'">
      <header>
        <strong>{{ shared() ? 'Conversación del equipo con la IA' : 'Tu conversación con la IA' }}</strong>
        @if (!shared()) {
          <button type="button" [disabled]="busy() || loading()" (click)="confirmClear.set(!confirmClear())">Borrar historial</button>
        }
      </header>
      @if (!shared() && confirmClear()) {
        <div role="alert">Se eliminarán tus consultas y respuestas guardadas en este proyecto.
          <button type="button" [disabled]="busy() || loading()" (click)="clear()">Confirmar borrado</button>
          <button type="button" (click)="confirmClear.set(false)">Cancelar</button>
        </div>
      }
      @if (hasMore()) { <button type="button" [disabled]="loading()" (click)="loadOlder()">Ver consultas anteriores</button> }
      @if (loading()) { <p role="status">Cargando historial…</p> }
      @if (error()) { <p role="alert">{{ error() }} <button type="button" (click)="reload()">Reintentar</button></p> }
      <div class="entries" tabindex="0">
        @for (entry of entries(); track entry.id) {
          <article>
            @if (shared()) { <small>{{ entry.authorName }}</small> }
            <p class="question">{{ entry.question }}</p><p>{{ entry.answer }}</p>
            <small>{{ entry.provider === 'bedrock' ? 'Amazon Bedrock' : 'llama.cpp' }} · Revisión {{ entry.revision }} · {{ entry.teamChatIncluded ? 'Incluyó chat del equipo' : 'Sin chat del equipo' }}</small>
          </article>
        } @empty { @if (!loading() && !error()) { <p>{{ shared() ? 'Todavía no hay consultas compartidas.' : 'No tienes consultas privadas guardadas.' }}</p> } }
      </div>
    </section>
  `,
  styles: [`
    .history { padding: 16px; border: 1px solid var(--cf-border, #ddd5ef); border-radius: 14px; color: inherit; }
    header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:8px; }
    button { font:inherit; color:inherit; cursor:pointer; border:1px solid #d8ccea; background:transparent; border-radius:8px; padding:6px 10px; }
    button:disabled { opacity:.5; cursor:default; } small { opacity:.75; }
    .entries { max-height:420px; overflow:auto; overflow-wrap:anywhere; }
    article { border-top:1px solid #ddd5ef; padding:12px 0; margin-top:12px; }
    p { white-space:pre-wrap; } .question { background:#eee7f8; color:#35234f; border-radius:10px; padding:10px; }
  `],
})
export class AssistantHistoryComponent {
  readonly projectId = input.required<string>();
  readonly shared = input(false);
  readonly refresh = input(0);
  readonly busy = input(false);
  private readonly api = inject(AssistantApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly entries = signal<AssistantExchange[]>([]);
  readonly hasMore = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly confirmClear = signal(false);
  private generation = 0;
  constructor() {
    effect(onCleanup => {
      const id = this.projectId();
      const shared = this.shared();
      this.refresh();
      const generation = ++this.generation;
      this.entries.set([]); this.hasMore.set(false); this.confirmClear.set(false);
      this.loading.set(true); this.error.set('');
      const subscription = this.api.history(id, undefined, shared).subscribe({
        next: result => { if (generation !== this.generation) return;
          this.entries.set([...result.entries].reverse()); this.hasMore.set(result.hasMore); this.loading.set(false); },
        error: () => { if (generation !== this.generation) return; this.loading.set(false); this.error.set('No se pudo recuperar el historial.'); },
      });
      const polling = shared ? timer(5000, 5000).subscribe(() => this.load(false, true)) : undefined;
      onCleanup(() => { ++this.generation; subscription.unsubscribe(); polling?.unsubscribe(); });
    });
  }
  reload(): void { this.load(false); }
  loadOlder(): void { this.load(true); }
  private load(older: boolean, poll = false): void {
    if (this.loading()) return;
    const generation = this.generation;
    this.loading.set(true); this.error.set('');
    this.api.history(this.projectId(), older ? this.entries()[0]?.id : undefined, this.shared())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => { if (generation !== this.generation) return;
        const incoming = [...result.entries].reverse();
        const current = this.entries();
        const newest = current.at(-1)?.id;
        if (poll && newest !== undefined && incoming.length > 0 && incoming[0].id <= newest) {
          const merged = new Map([...current, ...incoming].map(entry => [entry.id, entry]));
          this.entries.set([...merged.values()].sort((left, right) => left.id - right.id));
        } else {
          this.entries.set(incoming.concat(older ? current : []));
          this.hasMore.set(result.hasMore);
        }
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => { if (generation !== this.generation) return;
        if ([401,403,404].includes(error.status)) { this.entries.set([]); this.hasMore.set(false); }
        this.loading.set(false); this.error.set('No se pudo recuperar el historial.'); },
    });
  }
  clear(): void {
    if (this.shared() || this.busy() || this.loading()) return;
    const generation = this.generation;
    this.loading.set(true); this.error.set('');
    this.api.clearHistory(this.projectId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { if (generation !== this.generation) return;
        this.entries.set([]); this.hasMore.set(false); this.confirmClear.set(false); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { if (generation !== this.generation) return;
        if ([401,403,404].includes(error.status)) { this.entries.set([]); this.hasMore.set(false); }
        this.loading.set(false); this.error.set('No se pudo borrar el historial.'); },
    });
  }
}
