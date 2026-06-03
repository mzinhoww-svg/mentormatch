import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { listEmails } from '../../../../email/emailService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin listing of transactional emails. Query: ?status=pending|sent|failed. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const status = new URL(request.url).searchParams.get('status') ?? undefined;
    return json({ emails: await listEmails(s.tenantId, { status }) });
  } catch (err) {
    return respondError(err);
  }
}
