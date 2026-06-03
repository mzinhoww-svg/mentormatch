import { processAllTenants, isAuthorizedCron } from '../../../../email/cron.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Scheduled email worker (Vercel Cron). Authorized by `CRON_SECRET`
 * (Authorization: Bearer <secret>). Returns 503 when CRON_SECRET is unset
 * (endpoint disabled), 401 when the secret doesn't match. Processes pending
 * emails for every active tenant, each in its own tenant context.
 */
async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'DISABLED', message: 'cron_disabled' }, { status: 503 });
  }
  if (!isAuthorizedCron(request.headers.get('authorization'), secret)) {
    return Response.json({ error: 'UNAUTHORIZED', message: 'invalid_cron_secret' }, { status: 401 });
  }
  const result = await processAllTenants();
  return Response.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
