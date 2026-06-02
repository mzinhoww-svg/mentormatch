import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { setUserStatus, type AdminUserStatus } from '../../../../../admin/adminService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Activates/suspends a tenant user: body { userId, status: 'active'|'suspended' }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await setUserStatus(
      s.tenantId,
      s.userId,
      String(body.userId ?? ''),
      String(body.status ?? '') as AdminUserStatus,
    );
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
