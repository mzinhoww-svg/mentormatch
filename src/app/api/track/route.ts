import { logger } from '../../../observability/logger.js';
import { isFunnelEvent } from '../../../marketing/funnelEvents.js';
import { createRateLimiter } from '../../../auth/rateLimit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public, unauthenticated funnel beacon. Rate-limited per client to prevent log
// spam; only allowlisted events are recorded, and no request body beyond the
// event name + a short path is ever logged.
const limiter = createRateLimiter({ max: 30, windowMs: 60_000 });

function clientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Records a marketing funnel event. Always returns 200 (it's a fire-and-forget
 *  beacon) — invalid/over-limit calls are simply not logged. */
export async function POST(request: Request): Promise<Response> {
  const ok = () => Response.json({ ok: true });
  if (!limiter.check(`track:${clientKey(request)}`).allowed) return ok();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isFunnelEvent(body.event)) return ok();
  const path = typeof body.path === 'string' ? body.path.slice(0, 128) : undefined;
  logger.info('funnel', { event: body.event, path });
  return ok();
}
