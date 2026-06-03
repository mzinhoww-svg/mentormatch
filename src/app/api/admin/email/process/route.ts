import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { processTenantEmails } from '../../../../../email/emailService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Runs the email worker for this tenant (queue eligible notifications + send).
 * Intended to be invoked by a scheduler/cron or manually by an admin.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const result = await processTenantEmails(s.tenantId);
    return json({ ok: true, ...result });
  } catch (err) {
    return respondError(err);
  }
}
