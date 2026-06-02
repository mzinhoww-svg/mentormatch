/**
 * Route protection. Resolves the tenant from the host, reads + verifies the
 * session cookie, and CONFIRMS the session belongs to this tenant. A session
 * minted for tenant A is rejected on tenant B's host (tenant_mismatch).
 *
 * Throws AppError(UNAUTHORIZED) when no valid, tenant-matching session exists.
 */
import { resolveActiveTenant } from '../tenancy/admin.js';
import { parseCookies } from './cookies.js';
import { SESSION_COOKIE, verifySessionToken } from './session.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';

export interface Session {
  userId: string;
  tenantId: string;
  role: string;
}

export async function requireSession(
  host: string | null | undefined,
  cookieHeader: string | null | undefined,
): Promise<Session> {
  const resolution = await resolveActiveTenant(host);
  if (resolution.kind !== 'TENANT') {
    throw expectedError(ErrorCode.UNAUTHORIZED, 'no_tenant');
  }

  const token = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!token) throw expectedError(ErrorCode.UNAUTHORIZED, 'no_session');

  const claims = verifySessionToken(token);
  if (!claims) throw expectedError(ErrorCode.UNAUTHORIZED, 'invalid_session');

  if (claims.tenantId !== resolution.tenant.id) {
    throw expectedError(ErrorCode.UNAUTHORIZED, 'tenant_mismatch');
  }

  return { userId: claims.sub, tenantId: claims.tenantId, role: claims.role };
}
