import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { listMentorships } from '../../../../admin/adminService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists active mentorships (participant names only, no ContactInfo). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    return json({ mentorships: await listMentorships(s.tenantId) });
  } catch (err) {
    return respondError(err);
  }
}
