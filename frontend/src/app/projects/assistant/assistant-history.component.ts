import { DestroyScope,effect,useService,signal,untilDestroyed,viewProp } from '../../core/view-state';
import { HttpErrorResponse } from '../../core/api/http-client';
import { timer } from 'rxjs';
import { AssistantApiService,AssistantExchange } from './assistant-api.service';

export class AssistantHistoryComponent {
  readonly projectId = viewProp<string>('projectId');
  readonly shared = viewProp('shared', false);
  readonly refresh = viewProp('refresh', 0);
  readonly busy = viewProp('busy', false);
  private readonly api = useService(AssistantApiService);
  private readonly destroyRef = useService(DestroyScope);
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
      .pipe(untilDestroyed(this.destroyRef)).subscribe({
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
    this.api.clearHistory(this.projectId()).pipe(untilDestroyed(this.destroyRef)).subscribe({
      next: () => { if (generation !== this.generation) return;
        this.entries.set([]); this.hasMore.set(false); this.confirmClear.set(false); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { if (generation !== this.generation) return;
        if ([401,403,404].includes(error.status)) { this.entries.set([]); this.hasMore.set(false); }
        this.loading.set(false); this.error.set('No se pudo borrar el historial.'); },
    });
  }
}
