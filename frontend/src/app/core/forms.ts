import { shallowRef } from 'vue';
import { merge, Subject } from 'rxjs';

export type ValidationErrors = Record<string, unknown>;
export type ValidatorFn = (control: FormControl<any>) => ValidationErrors | null;
export type AbstractControl<T = unknown> = FormControl<T>;
interface ControlOptions { nonNullable?: boolean; validators?: ValidatorFn[]; }
interface UpdateOptions { emitEvent?: boolean; }

export class FormControl<T> {
  private readonly current;
  private readonly touchedState = shallowRef(false);
  private readonly validationRules;
  private readonly customErrors = shallowRef<ValidationErrors | null>(null);
  readonly valueChanges = new Subject<T>();

  constructor(private readonly initial: T, options?: ControlOptions) {
    this.current = shallowRef(initial);
    this.validationRules = shallowRef(options?.validators ?? []);
  }

  get value(): T { return this.current.value; }
  set value(value: T) { this.setValue(value); }
  get touched(): boolean { return this.touchedState.value; }
  get errors(): ValidationErrors | null {
    const result = Object.assign({}, ...this.validationRules.value.map(rule => rule(this)), this.customErrors.value);
    return Object.keys(result).length ? result : null;
  }
  get invalid(): boolean { return this.errors !== null; }
  hasError(key: string): boolean { return this.errors?.[key] !== undefined; }
  markAsTouched(): void { this.touchedState.value = true; }
  setValue(value: T, options?: UpdateOptions): void {
    this.current.value = value;
    this.customErrors.value = null;
    if (options?.emitEvent !== false) this.valueChanges.next(value);
  }
  reset(value: T = this.initial): void {
    this.touchedState.value = false;
    this.setValue(value);
  }
  setErrors(errors: ValidationErrors | null, options?: UpdateOptions): void {
    this.customErrors.value = errors;
    if (options?.emitEvent !== false) this.valueChanges.next(this.value);
  }
  setValidators(validators: ValidatorFn[]): void { this.validationRules.value = validators; }
  clearValidators(): void { this.setValidators([]); }
  updateValueAndValidity(options?: UpdateOptions): void {
    this.customErrors.value = null;
    if (options?.emitEvent !== false) this.valueChanges.next(this.value);
  }
}

type Values<T> = { [K in keyof T]: T[K] extends FormControl<infer V> ? V : never };

export class FormGroup<T extends Record<string, FormControl<any>>> {
  readonly valueChanges;
  constructor(readonly controls: T) {
    this.valueChanges = merge(...Object.values(controls).map(control => control.valueChanges));
  }
  get invalid(): boolean { return Object.values(this.controls).some(control => control.invalid); }
  getRawValue(): Values<T> {
    return Object.fromEntries(Object.entries(this.controls).map(([key, control]) => [key, control.value])) as Values<T>;
  }
  markAllAsTouched(): void { Object.values(this.controls).forEach(control => control.markAsTouched()); }
}

function empty(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

export const Validators = {
  required: ({ value }: FormControl<unknown>) => empty(value) ? { required: true } : null,
  email: ({ value }: FormControl<string>) => empty(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : { email: true },
  minLength: (minimum: number): ValidatorFn => ({ value }) => !empty(value) && value.length < minimum ? { minlength: true } : null,
  maxLength: (maximum: number): ValidatorFn => ({ value }) => value?.length > maximum ? { maxlength: true } : null,
  pattern: (pattern: RegExp): ValidatorFn => ({ value }) => empty(value) || pattern.test(String(value)) ? null : { pattern: true },
};
