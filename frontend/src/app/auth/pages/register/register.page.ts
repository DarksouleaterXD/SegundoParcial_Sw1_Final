import { DestroyScope,useService,signal,untilDestroyed } from '../../../core/view-state';
import { FormControl,FormGroup,Validators } from '../../../core/forms';
import { HttpErrorResponse } from '../../../core/api/http-client';
import { Navigation } from '../../../core/navigation';
import { finalize } from 'rxjs';

import { AuthService } from '../../data/auth.service';

export class RegisterPage {
  private readonly auth = useService(AuthService);
  private readonly router = useService(Navigation);
  private readonly destroyRef = useService(DestroyScope);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(72),
      ],
    }),
  });

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth
      .register(this.form.getRawValue())
      .pipe(
        finalize(() => this.submitting.set(false)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigate(['/projects']),
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.status === 409
              ? 'Ya existe una cuenta con ese correo.'
              : 'No pudimos crear la cuenta. Verifica los datos y el backend.',
          );
        },
      });
  }
}
