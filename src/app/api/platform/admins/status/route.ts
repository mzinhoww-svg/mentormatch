import { requirePlatformAdmin } from '../../../../../platform/requirePlatformAdmin.js';
import { setPlatformAdminStatus } from '../../../../../platform/platformAuthService.js';
import { json, respondError } from '../../../../../auth/http.js';
import { expectedError } from '../../../../../observability/errors.js';
import { ErrorCode } from '../../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Suspends or reactivates another platform admin (platform admin only). Guards
 *  against self-lockout and suspending the last active admin live in the service. */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requirePlatformAdmin(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const targetId = typeof body.adminId === 'string' ? body.adminId : '';
    const status =
      body.status === 'suspended' ? 'suspended' : body.status === 'active' ? 'active' : null;
    if (!targetId || !status) throw expectedError(ErrorCode.VALIDATION, 'invalid_status_request');
    const updated = await setPlatformAdminStatus(targetId, status, admin.id);
    return json({ ok: true, admin: updated });
  } catch (err) {
    return respondError(err);
  }
}
