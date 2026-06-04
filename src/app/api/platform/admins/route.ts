import { requirePlatformAdmin } from '../../../../platform/requirePlatformAdmin.js';
import { listPlatformAdmins, addPlatformAdmin } from '../../../../platform/platformAuthService.js';
import { json, respondError } from '../../../../auth/http.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists platform admins (platform admin only). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requirePlatformAdmin(request.headers.get('host'), request.headers.get('cookie'));
    return json({ admins: await listPlatformAdmins() });
  } catch (err) {
    return respondError(err);
  }
}

/** Adds a new platform admin with an initial password (platform admin only). */
export async function POST(request: Request): Promise<Response> {
  try {
    await requirePlatformAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) throw expectedError(ErrorCode.VALIDATION, 'email_and_password_required');
    const admin = await addPlatformAdmin({
      email,
      password,
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
    });
    return json({ ok: true, admin }, 201);
  } catch (err) {
    return respondError(err);
  }
}
