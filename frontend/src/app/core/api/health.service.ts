import { useService } from '../view-state';
import { HttpClient } from './http-client';
export interface HealthResponse {
  status: string;
  application: string;
}

export class HealthService {
  private readonly http = useService(HttpClient);

  getHealth() {
    return this.http.get<HealthResponse>('/api/health');
  }
}
