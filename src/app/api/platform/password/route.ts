import { requirePlatformAdmin } from '../../../../platform/requirePlatformAdmin.js';
import { changePlatformPassword } from '../../../../platform/platformAuthService.js';
import { json, respondError } from '../../../../auth/http.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Changes the signed-in platform admin's password (verifies the current one). */
export async function POST(request: Request): Promise<Response> {
  try {
    const admin = await requirePlatformAdmin(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (!currentPassword || !newPassword) throw expectedError(ErrorCode.VALIDATION, 'missing_fields');
    await changePlatformPassword(admin.id, currentPassword, newPassword);
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
