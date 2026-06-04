import { signup } from '../../../../auth/authService.js';
import { resolveActiveTenant } from '../../../../tenancy/admin.js';
import { getSettings } from '../../../../settings/settingsService.js';
import { createSessionToken } from '../../../../auth/session.js';
import { serializeSessionCookie } from '../../../../auth/cookies.js';
import { createRateLimiter } from '../../../../auth/rateLimit.js';
import { json, jsonWithCookie, respondError } from '../../../../auth/http.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const limiter = createRateLimiter({ max: 10, windowMs: 60_000 });

export async function POST(request: Request): Promise<Response> {
  try {
    const host = request.headers.get('host');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const key = `${host ?? '-'}:${String(body.email ?? '').toLowerCase()}`;
    if (!limiter.check(key).allowed) {
      throw expectedError(ErrorCode.RATE_LIMITED, 'rate_limited');
    }

    // Self-signup must be enabled for this tenant (provisioning bypasses this by
    // calling the service directly; only this public route enforces the flag).
    const resolution = await resolveActiveTenant(host);
    if (resolution.kind !== 'TENANT') throw expectedError(ErrorCode.UNAUTHORIZED, 'no_tenant');
    if (!(await getSettings(resolution.tenant.id)).allowSelfSignup) {
      throw expectedError(ErrorCode.VALIDATION, 'signup_disabled');
    }

    const user = await signup({
      host,
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
      displayName: body.displayName ? String(body.displayName) : undefined,
      consent: body.consent === true,
      ip: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    const token = createSessionToken({ sub: user.id, tenantId: user.tenantId, role: user.role });
    return jsonWithCookie(
      { ok: true, role: user.role },
      serializeSessionCookie(token, SESSION_TTL_SECONDS),
      201,
    );
  } catch (err) {
    return respondError(err);
  }
}

export function GET(): Response {
  return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
}
