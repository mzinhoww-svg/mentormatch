import { vi } from 'vitest';

export interface MockResponse {
  status?: number;
  body: unknown;
}
type Handler = MockResponse | ((body: unknown) => MockResponse);
export type Routes = Record<string, Handler>;

export interface FetchMock {
  calls: { method: string; path: string; url: string; body: unknown }[];
}

/**
 * Installs a global.fetch stub that routes `"METHOD /path"` (query stripped) to
 * canned responses. Mirrors only what src/ui/api.ts consumes (ok/status/json).
 */
export function installFetch(routes: Routes): FetchMock {
  const mock: FetchMock = { calls: [] };
  const fn = vi.fn(async (input: unknown, init?: { method?: string; body?: string }) => {
    const url = String(input);
    const path = url.split('?')[0] ?? url;
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(init.body) : undefined;
    mock.calls.push({ method, path, url, body });
    const entry = routes[`${method} ${path}`];
    const resolved =
      typeof entry === 'function' ? entry(body) : (entry ?? { status: 404, body: { error: 'NOT_FOUND', message: 'no_route' } });
    const status = resolved.status ?? 200;
    return {
      ok: status < 400,
      status,
      json: async () => resolved.body,
    } as unknown as Response;
  });
  (globalThis as unknown as { fetch: unknown }).fetch = fn;
  return mock;
}

export function calledWith(mock: FetchMock, method: string, path: string): boolean {
  return mock.calls.some((c) => c.method === method && c.path === path);
}
