/**
 * Tenant admin foundation: operational overview, basic usage metrics, and
 * minimal user management — all derived from the tables already created and
 * strictly tenant-scoped via withTenant (RLS). Admin views deliberately exclude
 * private content: ContactInfo (contact_email/phone/whatsapp) and private
 * session content (objective/notes) are never selected here.
 */
import { withTenant, type TenantDb } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordAdminEvent } from './audit.js';
import { participationRate, countsByStatus } from './metrics.js';

const SESSION_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const;
const REQUEST_STATUSES = [
  'pending',
  'waitlisted',
  'accepted',
  'rejected',
  'cancelled',
  'expired',
] as const;

async function scalar(db: TenantDb, sql: string, params: unknown[] = []): Promise<number> {
  const res = await db.query<{ n: number }>(sql, params);
  return res.rows[0]?.n ?? 0;
}

export interface TenantOverview {
  users: { active: number };
  mentors: { active: number; available: number };
  mentees: { active: number };
  mentorships: { active: number };
  sessions: { total: number; byStatus: Record<(typeof SESSION_STATUSES)[number], number> };
  requests: { byStatus: Record<(typeof REQUEST_STATUSES)[number], number> };
  capacity: { total: number; used: number; waitlisted: number };
  participationRate: number;
}

/** Operational snapshot of the tenant. Empty tenants return all-zero metrics. */
export async function getOverview(tenantId: string): Promise<TenantOverview> {
  return withTenant(tenantId, async (db) => {
    const activeUsers = await scalar(
      db,
      "SELECT count(*)::int AS n FROM tenant_user WHERE status = 'active'",
    );
    const activeMentorships = await scalar(
      db,
      "SELECT count(*)::int AS n FROM mentorship WHERE status = 'active'",
    );
    const activeMentors = await scalar(
      db,
      "SELECT count(DISTINCT mentor_id)::int AS n FROM mentorship WHERE status = 'active'",
    );
    const activeMentees = await scalar(
      db,
      "SELECT count(DISTINCT mentee_id)::int AS n FROM mentorship WHERE status = 'active'",
    );
    const availableMentors = await scalar(
      db,
      "SELECT count(*)::int AS n FROM profile WHERE status = 'active' AND mentor_available = true AND mentor_paused = false",
    );
    const totalCapacity = await scalar(
      db,
      "SELECT COALESCE(sum(mentor_capacity), 0)::int AS n FROM profile WHERE status = 'active' AND mentor_available = true",
    );
    const participants = await scalar(
      db,
      `SELECT count(*)::int AS n FROM (
         SELECT mentor_id AS uid FROM mentorship WHERE status = 'active'
         UNION
         SELECT mentee_id AS uid FROM mentorship WHERE status = 'active'
       ) t`,
    );

    const sessionRows = await db.query<{ status: string; count: number }>(
      'SELECT status, count(*)::int AS count FROM mentorship_session GROUP BY status',
    );
    const requestRows = await db.query<{ status: string; count: number }>(
      'SELECT status, count(*)::int AS count FROM mentorship_request GROUP BY status',
    );
    const sessionsByStatus = countsByStatus(sessionRows.rows, SESSION_STATUSES);
    const requestsByStatus = countsByStatus(requestRows.rows, REQUEST_STATUSES);
    const sessionsTotal = Object.values(sessionsByStatus).reduce((a, b) => a + b, 0);

    return {
      users: { active: activeUsers },
      mentors: { active: activeMentors, available: availableMentors },
      mentees: { active: activeMentees },
      mentorships: { active: activeMentorships },
      sessions: { total: sessionsTotal, byStatus: sessionsByStatus },
      requests: { byStatus: requestsByStatus },
      capacity: {
        total: totalCapacity,
        used: activeMentorships,
        waitlisted: requestsByStatus.waitlisted,
      },
      participationRate: participationRate(participants, activeUsers),
    };
  });
}

export interface AdminUserRow {
  id: string;
  displayName: string | null;
  email: string;
  role: string;
  status: string;
  profileStatus: string | null;
}

/** Lists tenant users for management. Excludes ContactInfo (contact_*). */
export async function listUsers(
  tenantId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<AdminUserRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  return withTenant(tenantId, async (db) => {
    const res = await db.query<AdminUserRow>(
      `SELECT u.id, u.display_name AS "displayName", u.email, u.role, u.status,
              p.status AS "profileStatus"
       FROM tenant_user u
       LEFT JOIN profile p ON p.tenant_user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
    );
    return res.rows;
  });
}

export interface AdminMentorRow {
  id: string;
  displayName: string | null;
  capacity: number;
  paused: boolean;
  activeMentees: number;
}

/** Lists available mentors with capacity and current load. No ContactInfo. */
export async function listMentors(tenantId: string): Promise<AdminMentorRow[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<AdminMentorRow>(
      `SELECT u.id, u.display_name AS "displayName", p.mentor_capacity AS capacity,
              p.mentor_paused AS paused,
              (SELECT count(*)::int FROM mentorship m
                 WHERE m.mentor_id = u.id AND m.status = 'active') AS "activeMentees"
       FROM profile p
       JOIN tenant_user u ON u.id = p.tenant_user_id
       WHERE p.status = 'active' AND p.mentor_available = true
       ORDER BY u.display_name NULLS LAST`,
    );
    return res.rows;
  });
}

export interface AdminMentorshipRow {
  id: string;
  status: string;
  mentorName: string | null;
  menteeName: string | null;
  createdAt: string;
}

/** Lists active mentorships (participant display names only, no ContactInfo). */
export async function listMentorships(tenantId: string): Promise<AdminMentorshipRow[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<AdminMentorshipRow>(
      `SELECT m.id, m.status, m.created_at AS "createdAt",
              mu.display_name AS "mentorName", su.display_name AS "menteeName"
       FROM mentorship m
       JOIN tenant_user mu ON mu.id = m.mentor_id
       JOIN tenant_user su ON su.id = m.mentee_id
       WHERE m.status = 'active'
       ORDER BY m.created_at DESC`,
    );
    return res.rows;
  });
}

export interface AdminSessionRow {
  id: string;
  status: string;
  scheduledAt: string | null;
  mentorshipId: string;
  createdAt: string;
}

/** Lists sessions operationally. Excludes private content (objective/notes). */
export async function listSessions(
  tenantId: string,
  opts: { status?: string; limit?: number } = {},
): Promise<AdminSessionRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return withTenant(tenantId, async (db) => {
    const res = await db.query<AdminSessionRow>(
      `SELECT id, status, scheduled_at AS "scheduledAt", mentorship_id AS "mentorshipId",
              created_at AS "createdAt"
       FROM mentorship_session
       ${opts.status ? 'WHERE status = $1' : ''}
       ORDER BY created_at DESC LIMIT ${limit}`,
      opts.status ? [opts.status] : [],
    );
    return res.rows;
  });
}

const USER_STATUSES = ['active', 'suspended'] as const;
export type AdminUserStatus = (typeof USER_STATUSES)[number];

/** Minimal admin action: activate/suspend a tenant user. Audited. */
export async function setUserStatus(
  tenantId: string,
  adminId: string,
  targetUserId: string,
  status: AdminUserStatus,
): Promise<void> {
  if (!USER_STATUSES.includes(status)) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_user_status');
  }
  if (targetUserId === adminId) {
    // Guard against an admin locking themselves out.
    throw expectedError(ErrorCode.VALIDATION, 'cannot_change_own_status');
  }
  const res = await withTenant(tenantId, (db) =>
    db.query('UPDATE tenant_user SET status = $1, updated_at = now() WHERE id = $2', [
      status,
      targetUserId,
    ]),
  );
  if (res.rowCount === 0) {
    throw expectedError(ErrorCode.NOT_FOUND, 'user_not_found');
  }
  await recordAdminEvent(tenantId, 'admin.user_status_changed', {
    actorId: adminId,
    targetId: targetUserId,
    metadata: { status },
  });
}
