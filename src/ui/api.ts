/**
 * Browser API client. All requests use SAME-ORIGIN RELATIVE paths, so they are
 * always bound to the current tenant's host (and carry the mm_session cookie).
 * Absolute/cross-origin URLs are rejected — the UI can never reach another
 * tenant. This is the front-end half of the tenant-isolation guarantee (the
 * back-end half is RLS).
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Guards that a path is a same-origin relative path (no scheme, no //). */
export function assertSameOrigin(path: string): void {
  if (!path.startsWith('/') || path.startsWith('//') || /^[a-z]+:/i.test(path)) {
    throw new Error(`unsafe_api_path: ${path}`);
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  assertSameOrigin(path);
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; message?: string };
    throw new ApiError(res.status, d.error ?? 'ERROR', d.message ?? 'request_failed');
  }
  return data as T;
}

/** Multipart upload (e.g. avatar/logo). Keeps the same same-origin/cookie guarantees. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  assertSameOrigin(path);
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', body: form });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; message?: string };
    throw new ApiError(res.status, d.error ?? 'ERROR', d.message ?? 'request_failed');
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  upload,
};
