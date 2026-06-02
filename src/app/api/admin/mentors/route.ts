import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { listMentors } from '../../../../admin/adminService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists available mentors with capacity and current load (admin only). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    return json({ mentors: await listMentors(s.tenantId) });
  } catch (err) {
    return respondError(err);
  }
}
