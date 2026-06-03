/**
 * Gate for the platform console. Double check:
 *  1. the request host is the platform host (admin.<base>) — never a tenant host;
 *  2. a valid platform session whose subject is still an ACTIVE platform admin.
 *
 * A tenant session (typ 'session') can never satisfy verifyPlatformToken, and a
 * platform session is scoped to the admin host, so neither surface can reach the
 * other. Throws AppError(UNAUTHORIZED) when any check fails.
 */
import { resolveTenantFromHost } from '../tenancy/resolveTenant.js';
import { parseCookies } from '../auth/cookies.js';
import { PLATFORM_COOKIE, verifyPlatformToken } from '../auth/session.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { getActivePlatformAdmin, type PlatformAdmin } from './platformAuthService.js';

export async function requirePlatformAdmin(
  host: string | null | undefined,
  cookieHeader: string | null | undefined,
): Promise<PlatformAdmin> {
  if (resolveTenantFromHost(host).kind !== 'PLATFORM_ADMIN') {
    throw expectedError(ErrorCode.UNAUTHORIZED, 'not_platform_host');
  }
  const token = parseCookies(cookieHeader)[PLATFORM_COOKIE];
  if (!token) throw expectedError(ErrorCode.UNAUTHORIZED, 'no_platform_session');
  const claims = verifyPlatformToken(token);
  if (!claims) throw expectedError(ErrorCode.UNAUTHORIZED, 'invalid_platform_session');
  const admin = await getActivePlatformAdmin(claims.sub);
  if (!admin) throw expectedError(ErrorCode.UNAUTHORIZED, 'platform_admin_revoked');
  return admin;
}
