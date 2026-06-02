import { describe, it, expect } from 'vitest';
import {
  runWithRequestContext,
  getRequestContext,
  getRequestId,
  getTenantId,
  generateRequestId,
  createRequestContext,
  resolveRequestIdFromHeaders,
} from '../request-context.js';

describe('request context storage', () => {
  it('exposes nothing outside a request', () => {
    expect(getRequestContext()).toBeUndefined();
    expect(getRequestId()).toBeUndefined();
    expect(getTenantId()).toBeUndefined();
  });

  it('exposes requestId and tenantId inside a request', () => {
    runWithRequestContext({ requestId: 'r-1', tenantId: 't-1' }, () => {
      expect(getRequestId()).toBe('r-1');
      expect(getTenantId()).toBe('t-1');
    });
    // restored after the scope ends
    expect(getRequestId()).toBeUndefined();
  });

  it('isolates nested contexts', () => {
    runWithRequestContext({ requestId: 'outer' }, () => {
      runWithRequestContext({ requestId: 'inner' }, () => {
        expect(getRequestId()).toBe('inner');
      });
      expect(getRequestId()).toBe('outer');
    });
  });
});

describe('generateRequestId', () => {
  it('produces unique UUID-shaped ids', () => {
    const a = generateRequestId();
    const b = generateRequestId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe('resolveRequestIdFromHeaders', () => {
  it('reads x-request-id from a Headers-like object', () => {
    const headers = new Map<string, string>([['x-request-id', 'from-headers']]);
    const headersLike = { get: (n: string) => headers.get(n) ?? null };
    expect(resolveRequestIdFromHeaders(headersLike)).toBe('from-headers');
  });

  it('reads x-request-id from a plain record', () => {
    expect(resolveRequestIdFromHeaders({ 'x-request-id': 'rec' })).toBe('rec');
  });

  it('returns undefined when absent', () => {
    expect(resolveRequestIdFromHeaders({})).toBeUndefined();
  });
});

describe('createRequestContext', () => {
  it('prefers an explicit requestId', () => {
    const ctx = createRequestContext({ requestId: 'explicit', headers: { 'x-request-id': 'h' } });
    expect(ctx.requestId).toBe('explicit');
  });

  it('falls back to the header, then to a generated id', () => {
    expect(createRequestContext({ headers: { 'x-request-id': 'h' } }).requestId).toBe('h');
    expect(createRequestContext().requestId).toMatch(/[0-9a-f-]{36}/i);
  });

  it('only sets tenantId when provided', () => {
    expect(createRequestContext({ tenantId: 't' }).tenantId).toBe('t');
    expect('tenantId' in createRequestContext()).toBe(false);
  });
});
