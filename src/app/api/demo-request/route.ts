import { logger } from '../../../observability/logger.js';
import { validateDemoRequest } from '../../../marketing/demoRequest.js';
import { createRateLimiter } from '../../../auth/rateLimit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Basic anti-spam on the public form: 5 submissions / minute / client.
const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });

function clientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Public commercial demo request. Registers interest (structured log) — no CRM
 * dependency, no tenant/product coupling. Durable storage / CRM is a future
 * slice; this is the acquisition foundation.
 */
export async function POST(request: Request): Promise<Response> {
  if (!limiter.check(`demo:${clientKey(request)}`).allowed) {
    return Response.json({ error: 'RATE_LIMITED', message: 'too_many_requests' }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = validateDemoRequest(body);
  if (!result.ok) {
    return Response.json({ error: 'VALIDATION', message: result.error }, { status: 400 });
  }
  // Register interest (no ContactInfo of product users involved).
  logger.info('demo_request', {
    company: result.value.company,
    role: result.value.role,
    headcount: result.value.headcount,
    // email/name are the lead's own marketing contact, intentionally captured.
    email: result.value.email,
    name: result.value.name,
  });
  return Response.json({ ok: true });
}
