import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { listSessions } from '../../../../admin/adminService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists sessions operationally (excludes private objective/notes). Query: ?status. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const status = new URL(request.url).searchParams.get('status') ?? undefined;
    return json({ sessions: await listSessions(s.tenantId, { status }) });
  } catch (err) {
    return respondError(err);
  }
}
