import { DestroyScope,useService,signal,untilDestroyed } from '../../../core/view-state';
import { FormControl,FormGroup,Validators } from '../../../core/forms';
import { HttpErrorResponse } from '../../../core/api/http-client';
import { RouteSnapshot,Navigation } from '../../../core/navigation';
import { finalize } from 'rxjs';

import { AuthService } from '../../data/auth.service';

export class LoginPage {
  private readonly auth = useService(AuthService);
  private readonly router = useService(Navigation);
  private readonly route = useService(RouteSnapshot);
  private readonly destroyRef = useService(DestroyScope);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
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
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => this.submitting.set(false)),
        untilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/projects';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.status === 401
              ? 'Correo o contrasena incorrectos.'
              : 'No pudimos iniciar sesion. Verifica que el backend este disponible.',
          );
        },
      });
  }
}
