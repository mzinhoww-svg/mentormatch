import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { getOverview } from '../../../../admin/adminService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tenant operational overview / basic usage metrics (admin only). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    return json({ overview: await getOverview(s.tenantId) });
  } catch (err) {
    return respondError(err);
  }
}
