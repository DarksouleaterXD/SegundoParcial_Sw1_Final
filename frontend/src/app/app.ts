import { useService,signal } from './core/view-state';
import { Navigation } from './core/navigation';
import { AuthService } from './auth/data/auth.service';
import { HealthService } from './core/api/health.service';

export class App {
  private readonly healthService = useService(HealthService);
  private readonly router = useService(Navigation);

  readonly auth = useService(AuthService);
  readonly backendOnline = signal<boolean | null>(null);

  constructor() {
    this.healthService.getHealth().subscribe({
      next: () => this.backendOnline.set(true),
      error: () => this.backendOnline.set(false),
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}
