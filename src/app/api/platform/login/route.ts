import { loginPlatformAdmin } from '../../../../platform/platformAuthService.js';
import { createPlatformToken } from '../../../../auth/session.js';
import { serializePlatformCookie } from '../../../../auth/cookies.js';
import { createRateLimiter } from '../../../../auth/rateLimit.js';
import { resolveTenantFromHost } from '../../../../tenancy/resolveTenant.js';
import { json, jsonWithCookie, respondError } from '../../../../auth/http.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLATFORM_TTL_SECONDS = 60 * 60 * 8;
const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });

/** Platform-admin login (only on the platform host). Sets the mm_platform cookie. */
export async function POST(request: Request): Promise<Response> {
  try {
    const host = request.headers.get('host');
    if (resolveTenantFromHost(host).kind !== 'PLATFORM_ADMIN') {
      throw expectedError(ErrorCode.UNAUTHORIZED, 'not_platform_host');
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = String(body.email ?? '');
    const password = String(body.password ?? '');

    const key = `platform:${email.toLowerCase()}`;
    if (!limiter.check(key).allowed) throw expectedError(ErrorCode.RATE_LIMITED, 'rate_limited');

    const admin = await loginPlatformAdmin({ email, password });
    const token = createPlatformToken({ sub: admin.id });
    limiter.reset(key);
    return jsonWithCookie({ ok: true }, serializePlatformCookie(token, PLATFORM_TTL_SECONDS), 200);
  } catch (err) {
    return respondError(err);
  }
}

export function GET(): Response {
  return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
}
