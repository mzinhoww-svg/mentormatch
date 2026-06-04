import { requirePlatformAdmin } from '../../../../../platform/requirePlatformAdmin.js';
import { resendSetPassword } from '../../../../../platform/tenantAdmin.js';
import { recordPlatformEvent } from '../../../../../platform/audit.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Resends a fresh set-password link to an existing tenant user (platform admin only). */
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
    const r = await resendSetPassword({ tenantId, email });
    await recordPlatformEvent(tenantId, 'platform.set_password_resent', {
      adminId: admin.id,
      metadata: { emailSent: r.emailSent },
    });
    return json({ ok: true, emailSent: r.emailSent, setPasswordUrl: r.setPasswordUrl });
  } catch (err) {
    return respondError(err);
  }
}
