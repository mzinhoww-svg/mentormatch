import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { listUsers } from '../../../../admin/adminService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists tenant users for management (no ContactInfo). Query: ?limit&offset. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit')) || undefined;
    const offset = Number(url.searchParams.get('offset')) || undefined;
    return json({ users: await listUsers(s.tenantId, { limit, offset }) });
  } catch (err) {
    return respondError(err);
  }
}
