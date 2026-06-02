/**
 * Per-request context propagated via AsyncLocalStorage.
 *
 * Carries `requestId` (always) and `tenantId` (when resolved). Framework-agnostic
 * on purpose: it does NOT know about mentoring, auth, or any feature. A future
 * HTTP layer (middleware / route handler) is expected to build a context and wrap
 * request handling in `runWithRequestContext`.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface RequestContext {
  /** Correlation id for the current request. Always present. */
  requestId: string;
  /** Resolved tenant id, when the request belongs to a tenant. */
  tenantId?: string;
  /** Open bag for additional, non-sensitive correlation data. */
  [key: string]: unknown;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Runs `fn` with `ctx` available to everything in the async call tree. */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Current request context, or `undefined` outside a request. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Current request id, if inside a request. */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/** Current tenant id, if resolved for this request. */
export function getTenantId(): string | undefined {
  return storage.getStore()?.tenantId;
}

/** Generates a fresh request id. */
export function generateRequestId(): string {
  return randomUUID();
}

/** Minimal shape for reading a header from various runtimes. */
export type HeaderSource =
  | { get(name: string): string | null | undefined }
  | Record<string, string | string[] | undefined>;

const REQUEST_ID_HEADER = 'x-request-id';

function readHeader(headers: HeaderSource, name: string): string | undefined {
  if (typeof (headers as { get?: unknown }).get === 'function') {
    const value = (headers as { get(n: string): string | null | undefined }).get(name);
    return value ?? undefined;
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const direct = record[name] ?? record[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0];
  return direct ?? undefined;
}

/** Extracts an incoming request id from headers, if present. */
export function resolveRequestIdFromHeaders(headers: HeaderSource): string | undefined {
  return readHeader(headers, REQUEST_ID_HEADER);
}

export interface CreateRequestContextInit {
  requestId?: string;
  tenantId?: string;
  headers?: HeaderSource;
  [key: string]: unknown;
}

/**
 * Builds a `RequestContext`, resolving `requestId` from (in order):
 * explicit value → `x-request-id` header → a freshly generated id.
 */
export function createRequestContext(init: CreateRequestContextInit = {}): RequestContext {
  const { requestId, tenantId, headers, ...rest } = init;
  const resolvedRequestId =
    requestId ?? (headers ? resolveRequestIdFromHeaders(headers) : undefined) ?? generateRequestId();

  const ctx: RequestContext = { requestId: resolvedRequestId, ...rest };
  if (tenantId !== undefined) ctx.tenantId = tenantId;
  return ctx;
}
