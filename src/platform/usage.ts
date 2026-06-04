/**
 * Lightweight per-tenant usage counts for the platform console list. Each count
 * is tenant-scoped, so it must run through withTenant (RLS) — the owner role
 * can't read tenant tables directly under FORCE RLS. One round-trip per tenant;
 * fine for a console with a handful of tenants.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { logger } from '../observability/logger.js';

export interface TenantUsage {
  users: number;
  mentorships: number;
  sessions: number;
}

const ZERO: TenantUsage = { users: 0, mentorships: 0, sessions: 0 };

/** Counts users, active mentorships and total sessions for one tenant. */
export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
  return withTenant(tenantId, async (db) => {
    const r = await db.query<TenantUsage>(
      `SELECT
         (SELECT count(*)::int FROM tenant_user) AS users,
         (SELECT count(*)::int FROM mentorship WHERE status = 'active') AS mentorships,
         (SELECT count(*)::int FROM mentorship_session) AS sessions`,
    );
    return r.rows[0] ?? ZERO;
  });
}

/** Best-effort usage for many tenants (a failing tenant yields zeros, not an
 *  error, so one bad tenant never breaks the whole console list). */
export async function getUsageForTenants(
  tenantIds: string[],
): Promise<Record<string, TenantUsage>> {
  const entries = await Promise.all(
    tenantIds.map(async (id): Promise<[string, TenantUsage]> => {
      try {
        return [id, await getTenantUsage(id)];
      } catch (err) {
        logger.warn('platform.usage_failed', {
          tenantId: id,
          error: err instanceof Error ? err.message : String(err),
        });
        return [id, ZERO];
      }
    }),
  );
  return Object.fromEntries(entries);
}
