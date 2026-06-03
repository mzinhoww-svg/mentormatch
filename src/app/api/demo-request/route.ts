import { logger } from '../../../observability/logger.js';
import { validateDemoRequest } from '../../../marketing/demoRequest.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public commercial demo request. Registers interest (structured log) — no CRM
 * dependency, no tenant/product coupling. Durable storage / CRM is a future
 * slice; this is the acquisition foundation.
 */
export async function POST(request: Request): Promise<Response> {
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
