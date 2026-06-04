import { describe, it, expect, vi, afterEach } from 'vitest';
import { isFunnelEvent, FUNNEL_EVENTS } from '../funnelEvents.js';
import { POST } from '../../app/api/track/route.js';
import { logger } from '../../observability/logger.js';

function req(body: unknown, ip: string): Request {
  return new Request('http://mentormatch.app/api/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('isFunnelEvent', () => {
  it('accepts allowlisted events and rejects everything else', () => {
    for (const e of FUNNEL_EVENTS) expect(isFunnelEvent(e)).toBe(true);
    expect(isFunnelEvent('landing_view')).toBe(true);
    expect(isFunnelEvent('not_an_event')).toBe(false);
    expect(isFunnelEvent('')).toBe(false);
    expect(isFunnelEvent(42)).toBe(false);
    expect(isFunnelEvent(null)).toBe(false);
  });
});

describe('POST /api/track', () => {
  it('logs an allowlisted funnel event', async () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const res = await POST(req({ event: 'landing_view', path: '/' }, '10.1.0.1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(spy).toHaveBeenCalledWith('funnel', { event: 'landing_view', path: '/' });
  });

  it('silently ignores an unknown event (200, not logged)', async () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const res = await POST(req({ event: 'evil; rm -rf', path: '/' }, '10.1.0.2'));
    expect(res.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not log a path longer than 128 chars in full', async () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    await POST(req({ event: 'demo_view', path: 'x'.repeat(500) }, '10.1.0.3'));
    const logged = spy.mock.calls[0]?.[1] as { path?: string };
    expect(logged.path?.length).toBe(128);
  });

  it('rate-limits abusive clients (still 200, but stops logging)', async () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const ip = '10.1.0.99';
    for (let i = 0; i < 35; i++) {
      const res = await POST(req({ event: 'landing_view' }, ip));
      expect(res.status).toBe(200);
    }
    // The limiter caps at 30/min, so not every call is logged.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(30);
  });
});
