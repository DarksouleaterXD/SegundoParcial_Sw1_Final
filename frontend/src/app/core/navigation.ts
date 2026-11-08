export class Navigation {
  navigate(segments: string[]): void { this.navigateByUrl(segments.join('/').replace(/\/{2,}/g, '/')); }
  navigateByUrl(path: string): void {
    const target = new URL(path, location.origin);
    location.assign(target.origin === location.origin && target.pathname.startsWith('/') ? target.href : '/projects');
  }
}

export class RouteSnapshot {
  readonly snapshot = {
    paramMap: { get: (key: string) => key === 'id' ? location.pathname.match(/^\/projects\/([^/]+)\/?$/)?.[1] ?? null : null },
    queryParamMap: { get: (key: string) => new URLSearchParams(location.search).get(key) },
  };
}

export function currentRoute(path: string): boolean {
  const current = location.pathname.replace(/\/$/, '') || '/';
  return current === path || (path !== '/' && current.startsWith(path + '/'));
}

export function routeHref(path: string | string[], fragment?: string): string {
  const href = Array.isArray(path) ? path.join('/').replace(/\/{2,}/g, '/') : path;
  return fragment ? href + '#' + fragment : href;
}
