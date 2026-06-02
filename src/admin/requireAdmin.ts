/**
 * Tenant-admin authorization. Builds on requireSession (tenant resolved by host,
 * RLS) and additionally requires a tenant-admin role. No cross-tenant access:
 * the session is already pinned to the host's tenant.
 */
import { requireSession, type Session } from '../auth/requireSession.js';
import { requireRole } from '../auth/rbac.js';

/** Roles allowed to operate the tenant admin area. */
export const ADMIN_ROLES = ['admin', 'program_manager'] as const;

export async function requireAdmin(
  host: string | null | undefined,
  cookieHeader: string | null | undefined,
): Promise<Session> {
  const session = await requireSession(host, cookieHeader);
  requireRole(session, ADMIN_ROLES);
  return session;
}
