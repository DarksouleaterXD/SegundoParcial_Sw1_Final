import { shallowRef } from 'vue';
import { Observable, Subject } from 'rxjs';
import { captureViewContext } from './view-state';

type DialogController<T> = new () => T;
interface DialogOptions {
  data?: unknown;
  width?: string;
  maxWidth?: string;
  disableClose?: boolean;
}

export class DialogHandle<T = unknown, R = any> {
  private readonly closed = new Subject<R | undefined>();
  close(result?: R): void {
    if (!activeDialogs.value.some(entry => entry.handle === this)) return;
    activeDialogs.value = activeDialogs.value.filter(entry => entry.handle !== this);
    this.closed.next(result);
    this.closed.complete();
  }
  afterClosed(): Observable<R | undefined> { return this.closed.asObservable(); }
}

export interface DialogEntry {
  id: number;
  controller: DialogController<unknown>;
  handle: DialogHandle;
  options: DialogOptions;
  context: ReturnType<typeof captureViewContext>;
}
export const activeDialogs = shallowRef<DialogEntry[]>([]);
let lastDialogId = 0;

export class DialogService {
  private readonly context = captureViewContext();
  get openDialogs(): readonly DialogEntry[] { return activeDialogs.value; }
  open<T, R = any>(controller: DialogController<T>, options: DialogOptions = {}): DialogHandle<T, R> {
    const handle = new DialogHandle<T, R>();
    activeDialogs.value = [...activeDialogs.value, {
      id: ++lastDialogId, controller, handle, options, context: this.context,
    }];
    return handle;
  }
}
