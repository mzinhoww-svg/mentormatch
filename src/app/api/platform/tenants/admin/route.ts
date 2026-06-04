import { requirePlatformAdmin } from '../../../../../platform/requirePlatformAdmin.js';
import { setTenantAdmin } from '../../../../../platform/tenantAdmin.js';
import { recordPlatformEvent } from '../../../../../platform/audit.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sets (promotes or creates) the admin of a tenant (platform admin only). */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requirePlatformAdmin(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!tenantId || !email) throw expectedError(ErrorCode.VALIDATION, 'tenantId_and_email_required');
    const r = await setTenantAdmin({
      tenantId,
      email,
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
    });
    await recordPlatformEvent(tenantId, 'platform.tenant_admin_set', {
      adminId: admin.id,
      targetId: r.userId,
      metadata: { created: r.created },
    });
    return json({ ok: true, created: r.created, emailSent: r.emailSent, setPasswordUrl: r.setPasswordUrl }, r.created ? 201 : 200);
  } catch (err) {
    return respondError(err);
  }
}
