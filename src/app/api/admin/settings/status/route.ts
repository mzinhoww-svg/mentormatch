import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { setTenantStatus, type TenantStatus } from '../../../../../settings/settingsService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sets the tenant operational status: body { status: 'active'|'inactive' }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await setTenantStatus(s.tenantId, s.userId, String(body.status ?? '') as TenantStatus);
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
