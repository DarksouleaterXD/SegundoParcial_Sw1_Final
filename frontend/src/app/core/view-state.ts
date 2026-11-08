import {
  computed as derive, effectScope, getCurrentInstance, inject as injectVue, nextTick,
  onBeforeUnmount, onMounted, provide, shallowReactive, shallowRef, toRef,
  useTemplateRef, watch, watchEffect,
} from 'vue';
import { pauseTracking, resetTracking } from '@vue/reactivity';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type Constructor<T> = new () => T;
export interface ReadSignal<T> { (): T; }
export interface Signal<T> extends ReadSignal<T> {
  set(value: T): void;
  update(change: (value: T) => T): void;
  asReadonly(): ReadSignal<T>;
}

export function signal<T>(initial: T): Signal<T> {
  const value = shallowRef(initial);
  const read = () => value.value;
  return Object.assign(read, {
    set: (next: T) => { value.value = next; },
    update: (change: (current: T) => T) => { value.value = change(value.value); },
    asReadonly: () => () => value.value,
  });
}

export function computed<T>(calculate: () => T): ReadSignal<T> {
  const value = derive(calculate);
  return () => value.value;
}

export function effect(run: (cleanup: (callback: () => void) => void) => void): void {
  watchEffect(run, { flush: 'post' });
}

export function untracked<T>(run: () => T): T {
  pauseTracking();
  try { return run(); }
  finally { resetTracking(); }
}

export class DestroyScope {
  private callbacks = new Set<() => void>();
  onDestroy(callback: () => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  dispose(): void {
    for (const callback of this.callbacks) callback();
    this.callbacks.clear();
  }
}

export function untilDestroyed(lifetime: DestroyScope) {
  const destroyed = new Observable<void>(subscriber =>
    lifetime.onDestroy(() => { subscriber.next(); subscriber.complete(); }),
  );
  return <T>(source: Observable<T>): Observable<T> => source.pipe(takeUntil(destroyed));
}

export const DIALOG_DATA = Symbol('dialog-data');
export const DIALOG_HANDLE = Symbol('dialog-handle');
const contextKey = Symbol('studio-view-context');

interface ViewContext {
  parent?: ViewContext;
  props: Record<string, unknown>;
  emit: (name: string, value?: unknown) => void;
  refs: Record<string, Readonly<{ value: unknown }>>;
  values: Map<unknown, unknown>;
  lifetime: DestroyScope;
  effects: ReturnType<typeof effectScope>;
}
const root: ViewContext = {
  props: {}, emit: () => {}, refs: {}, values: new Map(),
  lifetime: new DestroyScope(), effects: effectScope(true),
};
let active: ViewContext = root;

function within<T>(context: ViewContext, create: () => T): T {
  const previous = active;
  active = context;
  try { return context.effects.run(create)!; }
  finally { active = previous; }
}

export function useService<T>(token: Constructor<T>): T;
export function useService<T>(token: symbol): T;
export function useService<T>(token: Constructor<T> | symbol): T {
  if (token === DestroyScope) return active.lifetime as T;
  let scope: ViewContext | undefined = active;
  while (scope) {
    if (scope.values.has(token)) {
      const value = scope.values.get(token);
      if (value !== undefined) return value as T;
      if (typeof token === 'function') {
        const created = within(scope, () => new token());
        scope.values.set(token, created);
        return created;
      }
    }
    scope = scope.parent;
  }
  if (typeof token === 'symbol') throw new Error('Falta el contexto del diálogo.');
  const service = within(root, () => new token());
  root.values.set(token, service);
  return service;
}

export function captureViewContext(): ViewContext { return active; }
export function provideDialogContext(parent: ViewContext, data: unknown, handle: unknown): void {
  provide(contextKey, {
    ...parent, parent, values: new Map([[DIALOG_DATA, data], [DIALOG_HANDLE, handle]]),
  });
}

export function viewProp<T>(name: string, fallback?: T): ReadSignal<T> {
  const props = active.props;
  return () => (props[name] ?? fallback) as T;
}

export function viewModel<T>(name: string, initial: T): Signal<T> {
  const context = active;
  const state = signal(initial);
  const read = () => (context.props[name] as T | undefined) ?? state();
  const set = (value: T) => { state.set(value); context.emit(`update:${name}`, value); };
  return Object.assign(read, {
    set, update: (change: (value: T) => T) => set(change(read())),
    asReadonly: () => read,
  });
}

export function viewEvent<T>(name: string) {
  const emit = active.emit;
  return { emit: (value: T) => emit(name, value) };
}

export interface ElementRef<T> { nativeElement: T; }
export function viewElement<T>(name: string): ElementRef<T> {
  const ref = active.refs[name];
  return {
    get nativeElement() {
      const value = ref?.value;
      if (value && typeof value === 'object' && '$el' in value) return value.$el as T;
      return value as T;
    },
  };
}
export function viewChild<T extends ElementRef<unknown>>(name: string): () => T | undefined {
  const ref = viewElement(name);
  return () => ref.nativeElement ? ref as T : undefined;
}
export function afterPaint(callback: () => void): void { void nextTick(callback); }

interface ViewOptions {
  refs?: string[];
  inputs?: string[];
  state?: string[];
  providers?: Constructor<unknown>[];
  keys?: { key?: string; method: string; prevent?: boolean }[];
}

type ViewBindings<T> = { [K in keyof T]: T[K] };

export function setupView<T extends object, EventName extends string>(
  Controller: Constructor<T>,
  props: Record<string, unknown>,
  emit: (name: EventName, value?: unknown) => void,
  options: ViewOptions = {},
): ViewBindings<T> {
  if (!getCurrentInstance()) throw new Error('La vista requiere un componente Vue.');
  const refs = Object.fromEntries((options.refs ?? []).map(name => [name, useTemplateRef(name)]));
  const parent = injectVue<ViewContext>(contextKey, root);
  const context: ViewContext = {
    parent, props, emit: (name, value) => emit(name as EventName, value),
    refs, lifetime: new DestroyScope(), effects: effectScope(),
    values: new Map((options.providers ?? []).map(token => [token, undefined])),
  };
  provide(contextKey, context);
  const controller = within(context, () => new Controller()) as T & Record<string, any>;
  const state = shallowReactive<Record<string, unknown>>({});
  const bindings: Record<string, unknown> = {};
  const reactiveKeys = new Set([...options.inputs ?? [], ...options.state ?? []]);
  for (const key of Object.keys(controller)) {
    if (key in refs) continue;
    if (!reactiveKeys.has(key)) {
      bindings[key] = controller[key];
      continue;
    }
    state[key] = controller[key];
    Object.defineProperty(controller, key, {
      configurable: true,
      get: () => state[key],
      set: value => { state[key] = value; },
    });
    bindings[key] = toRef(state, key);
  }
  for (const name of Object.getOwnPropertyNames(Controller.prototype)) {
    if (name === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(Controller.prototype, name);
    if (descriptor?.get) bindings[name] = derive(() => controller[name]);
    if (typeof descriptor?.value === 'function') bindings[name] = descriptor.value.bind(controller);
  }
  if (options.inputs?.length) {
    const names = options.inputs;
    watch(() => names.map(name => props[name]), (values, previous) => {
      const changes: Record<string, unknown> = {};
      names.forEach((name, i) => {
        if (values[i] !== undefined || previous?.[i] !== undefined) Reflect.set(controller, name, values[i]);
        if (values[i] !== previous?.[i]) changes[name] = { currentValue: values[i], previousValue: previous?.[i] };
      });
      controller['updateInputs']?.(changes);
    }, { immediate: true, flush: 'post' });
  }
  const onKey = (event: KeyboardEvent) => {
    for (const binding of options.keys ?? []) {
      if (binding.key && event.key.toLowerCase() !== binding.key) continue;
      controller[binding.method](event);
    }
  };
  onMounted(() => {
    if (options.keys?.length) window.addEventListener('keydown', onKey);
    controller['mount']?.();
  });
  onBeforeUnmount(() => {
    if (options.keys?.length) window.removeEventListener('keydown', onKey);
    controller['dispose']?.();
    context.lifetime.dispose();
    context.effects.stop();
  });
  return bindings as ViewBindings<T>;
}

export function present<T>(value: T | null | undefined): T[] {
  return value == null ? [] : [value];
}

export function formatDate(value: string | number | Date | null | undefined, format?: string): string {
  if (value == null) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  if (format?.startsWith('dd/MM')) {
    const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return `${day}${format.includes('yyyy') ? '/' + date.getFullYear() : ''} ${time}${format.endsWith(':ss') ? ':' + pad(date.getSeconds()) : ''}`;
  }
  if (format === 'mediumTime') return new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' }).format(date);
  if (format === 'short') return new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  if (format === 'medium') return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(date);
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}
