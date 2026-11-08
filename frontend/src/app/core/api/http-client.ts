import { Observable } from 'rxjs';

export class HttpErrorResponse extends Error {
  constructor(readonly status: number, readonly error: any) {
    super(`HTTP ${status}`);
  }
}

export interface HttpResponse<T> { body: T | null; headers: Headers; status: number; }
interface Options {
  params?: Record<string, string | number | boolean>;
  observe?: 'response';
  responseType?: 'blob';
}

export class HttpClient {
  get<T>(path: string, options?: Options): Observable<T> { return this.request('GET', path, undefined, options); }
  post(path: string, body: unknown, options: Options & { observe: 'response'; responseType: 'blob' }): Observable<HttpResponse<Blob>>;
  post<T>(path: string, body: unknown, options?: Options): Observable<T>;
  post<T>(path: string, body: unknown, options?: Options): Observable<T> { return this.request('POST', path, body, options); }
  put<T>(path: string, body: unknown): Observable<T> { return this.request('PUT', path, body); }
  patch<T>(path: string, body: unknown): Observable<T> { return this.request('PATCH', path, body); }
  delete<T>(path: string): Observable<T> { return this.request('DELETE', path); }

  private request<T>(method: string, path: string, body?: unknown, options?: Options): Observable<T> {
    return new Observable<T>(subscriber => {
      const abort = new AbortController();
      const url = new URL(path, window.location.origin);
      Object.entries(options?.params ?? {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
      const headers = new Headers();
      const token = localStorage.getItem('classforge.accessToken');
      if (token && url.origin === location.origin && !/^\/api\/auth\/(login|register)$/.test(url.pathname)) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      let payload: BodyInit | undefined;
      if (body instanceof FormData || body instanceof Blob) payload = body;
      else if (body !== undefined) {
        headers.set('Content-Type', 'application/json');
        payload = JSON.stringify(body);
      }
      fetch(url, { method, headers, body: payload, signal: abort.signal }).then(async response => {
        const content = options?.responseType === 'blob' ? await response.blob() : await response.text();
        let data: unknown = content;
        if (typeof content === 'string') {
          try { data = content ? JSON.parse(content) : null; }
          catch { data = content; }
        }
        if (!response.ok) throw new HttpErrorResponse(response.status, data);
        subscriber.next((options?.observe === 'response' ? {
          body: data, headers: response.headers, status: response.status,
        } : data) as T);
        subscriber.complete();
      }).catch(error => {
        if (abort.signal.aborted) return;
        subscriber.error(error instanceof HttpErrorResponse ? error : new HttpErrorResponse(0, error));
      });
      return () => abort.abort();
    });
  }
}
