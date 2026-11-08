import { useService } from '../../core/view-state';
import { HttpClient } from '../../core/api/http-client';
import { Observable } from 'rxjs';

import {
CreateProjectRequest,
Project,
ProjectValidationResult,
SaveProjectDocumentRequest,
UpdateProjectRequest,
ValidateProjectDocumentRequest,
} from '../model/project';

export class ProjectApiService {
  private readonly http = useService(HttpClient);
  private readonly baseUrl = '/api/projects';

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(this.baseUrl);
  }

  get(projectId: string): Observable<Project> {
    return this.http.get<Project>(
      `${this.baseUrl}/${projectId}`,
    );
  }

  create(request: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(
      this.baseUrl,
      request,
    );
  }

  rename(
    projectId: string,
    request: UpdateProjectRequest,
  ): Observable<Project> {
    return this.http.patch<Project>(
      `${this.baseUrl}/${projectId}`,
      request,
    );
  }

  validateDocument(
    projectId: string,
    request: ValidateProjectDocumentRequest,
  ): Observable<ProjectValidationResult> {
    return this.http.post<ProjectValidationResult>(
      `${this.baseUrl}/${projectId}/validate`,
      request,
    );
  }

  saveDocument(
    projectId: string,
    request: SaveProjectDocumentRequest,
  ): Observable<Project> {
    return this.http.put<Project>(
      `${this.baseUrl}/${projectId}/document`,
      request,
    );
  }
}
