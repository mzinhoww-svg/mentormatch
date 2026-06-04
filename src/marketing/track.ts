/**
 * Client-side funnel tracker. Fires an allowlisted event to /api/track using
 * sendBeacon (survives navigation), falling back to keepalive fetch. Best-effort
 * and silent: tracking must never affect the page or throw. No PII is sent — only
 * the event name and the current path.
 */
import { isFunnelEvent, type FunnelEvent } from './funnelEvents.js';

export function track(event: FunnelEvent): void {
  if (typeof window === 'undefined' || !isFunnelEvent(event)) return;
  const payload = JSON.stringify({ event, path: window.location?.pathname });
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  try {
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    }).catch(() => {});
  } catch {
    /* never throw from tracking */
  }
}
