/**
 * Mentorship request & approval flow. All tenant-scoped via withTenant (RLS),
 * bound to TenantUser, audited. A paused/unavailable mentor cannot receive new
 * requests; when a mentor is at capacity, new requests are waitlisted.
 */
import { withTenant, type TenantDb } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordMentorshipEvent } from './audit.js';
import { safeNotify } from '../notifications/notificationService.js';
import { decideInitialStatus, isOpenForDecision, type RequestStatus } from './rules.js';

const DEFAULT_EXPIRY_DAYS = 14;

export interface RequestRecord {
  id: string;
  menteeId: string;
  mentorId: string;
  skillId: string | null;
  status: RequestStatus;
  createdAt: string;
}

const SELECT_REQUEST = `
  id, mentee_id AS "menteeId", mentor_id AS "mentorId", skill_id AS "skillId",
  status, created_at AS "createdAt"`;

async function countActiveMentorships(db: TenantDb, mentorId: string): Promise<number> {
  const res = await db.query<{ c: number }>(
    "SELECT count(*)::int AS c FROM mentorship WHERE mentor_id = $1 AND status = 'active'",
    [mentorId],
  );
  return res.rows[0]?.c ?? 0;
}

export interface RequestInput {
  mentorId: string;
  skillId?: string;
  message?: string;
  expiresInDays?: number;
}

export async function requestMentorship(
  tenantId: string,
  menteeId: string,
  input: RequestInput,
): Promise<RequestRecord> {
  if (input.mentorId === menteeId) {
    throw expectedError(ErrorCode.VALIDATION, 'cannot_request_self');
  }
  const days = input.expiresInDays ?? DEFAULT_EXPIRY_DAYS;

  const request = await withTenant(tenantId, async (db) => {
    const mentor = await db.query<{
      status: string;
      mentor_available: boolean;
      mentor_paused: boolean;
      mentor_capacity: number;
    }>(
      `SELECT status, mentor_available, mentor_paused, mentor_capacity
       FROM profile WHERE tenant_user_id = $1`,
      [input.mentorId],
    );
    const m = mentor.rows[0];
    // Mentor must be effectively available (active, offering, not paused).
    if (!m || m.status !== 'active' || !m.mentor_available || m.mentor_paused) {
      throw expectedError(ErrorCode.CONFLICT, 'mentor_unavailable');
    }

    const existing = await db.query(
      `SELECT 1 FROM mentorship_request
       WHERE mentee_id = $1 AND mentor_id = $2
         AND status IN ('pending','waitlisted','accepted') LIMIT 1`,
      [menteeId, input.mentorId],
    );
    if (existing.rowCount > 0) {
      throw expectedError(ErrorCode.CONFLICT, 'request_already_open');
    }

    const active = await countActiveMentorships(db, input.mentorId);
    const status = decideInitialStatus(active, m.mentor_capacity);

    const inserted = await db.query<RequestRecord>(
      `INSERT INTO mentorship_request
         (tenant_id, mentee_id, mentor_id, skill_id, message, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval)
       RETURNING ${SELECT_REQUEST}`,
      [tenantId, menteeId, input.mentorId, input.skillId ?? null, input.message ?? null, status, String(days)],
    );
    return inserted.rows[0]!;
  });

  await recordMentorshipEvent(tenantId, 'mentorship.requested', {
    actorId: menteeId,
    targetId: input.mentorId,
    targetType: 'tenant_user',
    metadata: { requestId: request.id, status: request.status },
  });
  // Notify the mentor that a request arrived (no ContactInfo in payload).
  await safeNotify(tenantId, {
    type: 'mentorship.requested',
    targetUserId: input.mentorId,
    originEvent: 'mentorship.requested',
    payload: { requestId: request.id, status: request.status },
  });
  return request;
}

export interface AcceptResult {
  requestId: string;
  mentorshipId: string;
  menteeId: string;
}

export async function acceptRequest(
  tenantId: string,
  mentorId: string,
  requestId: string,
): Promise<AcceptResult> {
  const result = await withTenant(tenantId, async (db) => {
    const found = await db.query<{ mentee_id: string; mentor_id: string; status: RequestStatus }>(
      'SELECT mentee_id, mentor_id, status FROM mentorship_request WHERE id = $1',
      [requestId],
    );
    const r = found.rows[0];
    if (!r) throw expectedError(ErrorCode.NOT_FOUND, 'request_not_found');
    if (r.mentor_id !== mentorId) throw expectedError(ErrorCode.FORBIDDEN, 'not_your_request');
    if (!isOpenForDecision(r.status)) throw expectedError(ErrorCode.VALIDATION, 'request_not_open');

    const cap = await db.query<{ mentor_capacity: number }>(
      'SELECT mentor_capacity FROM profile WHERE tenant_user_id = $1',
      [mentorId],
    );
    const capacity = cap.rows[0]?.mentor_capacity ?? 0;
    if ((await countActiveMentorships(db, mentorId)) >= capacity) {
      throw expectedError(ErrorCode.CONFLICT, 'mentor_at_capacity');
    }

    const ms = await db.query<{ id: string }>(
      `INSERT INTO mentorship (tenant_id, mentor_id, mentee_id, request_id, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
      [tenantId, mentorId, r.mentee_id, requestId],
    );
    await db.query(
      "UPDATE mentorship_request SET status = 'accepted', decided_at = now() WHERE id = $1",
      [requestId],
    );
    return { requestId, mentorshipId: ms.rows[0]!.id, menteeId: r.mentee_id };
  });

  await recordMentorshipEvent(tenantId, 'mentorship.accepted', {
    actorId: mentorId,
    targetId: result.menteeId,
    targetType: 'tenant_user',
    metadata: { requestId, mentorshipId: result.mentorshipId },
  });
  // Notify the mentee that their request was accepted.
  await safeNotify(tenantId, {
    type: 'mentorship.accepted',
    targetUserId: result.menteeId,
    originEvent: 'mentorship.accepted',
    payload: { requestId, mentorshipId: result.mentorshipId },
  });
  return result;
}

export async function rejectRequest(
  tenantId: string,
  mentorId: string,
  requestId: string,
): Promise<void> {
  const menteeId = await withTenant(tenantId, async (db) => {
    const found = await db.query<{ mentee_id: string; mentor_id: string; status: RequestStatus }>(
      'SELECT mentee_id, mentor_id, status FROM mentorship_request WHERE id = $1',
      [requestId],
    );
    const r = found.rows[0];
    if (!r) throw expectedError(ErrorCode.NOT_FOUND, 'request_not_found');
    if (r.mentor_id !== mentorId) throw expectedError(ErrorCode.FORBIDDEN, 'not_your_request');
    if (!isOpenForDecision(r.status)) throw expectedError(ErrorCode.VALIDATION, 'request_not_open');
    await db.query(
      "UPDATE mentorship_request SET status = 'rejected', decided_at = now() WHERE id = $1",
      [requestId],
    );
    return r.mentee_id;
  });

  await recordMentorshipEvent(tenantId, 'mentorship.rejected', {
    actorId: mentorId,
    targetId: menteeId,
    targetType: 'tenant_user',
    metadata: { requestId },
  });
  // Notify the mentee that their request was rejected.
  await safeNotify(tenantId, {
    type: 'mentorship.rejected',
    targetUserId: menteeId,
    originEvent: 'mentorship.rejected',
    payload: { requestId },
  });
}

export async function cancelRequest(
  tenantId: string,
  menteeId: string,
  requestId: string,
): Promise<void> {
  await withTenant(tenantId, async (db) => {
    const found = await db.query<{ mentee_id: string; status: RequestStatus }>(
      'SELECT mentee_id, status FROM mentorship_request WHERE id = $1',
      [requestId],
    );
    const r = found.rows[0];
    if (!r) throw expectedError(ErrorCode.NOT_FOUND, 'request_not_found');
    if (r.mentee_id !== menteeId) throw expectedError(ErrorCode.FORBIDDEN, 'not_your_request');
    if (!isOpenForDecision(r.status)) throw expectedError(ErrorCode.VALIDATION, 'request_not_open');
    await db.query(
      "UPDATE mentorship_request SET status = 'cancelled', decided_at = now() WHERE id = $1",
      [requestId],
    );
  });
  await recordMentorshipEvent(tenantId, 'mentorship.cancelled', {
    actorId: menteeId,
    targetType: 'mentorship_request',
    metadata: { requestId },
  });
}

/** Marks open requests past their expiry as expired (lazy housekeeping). */
export async function expireRequests(tenantId: string): Promise<number> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query(
      `UPDATE mentorship_request SET status = 'expired'
       WHERE status IN ('pending','waitlisted') AND expires_at IS NOT NULL AND expires_at < now()`,
    );
    return res.rowCount;
  });
}

export async function listRequestsForMentor(
  tenantId: string,
  mentorId: string,
): Promise<RequestRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<RequestRecord>(
      `SELECT ${SELECT_REQUEST} FROM mentorship_request WHERE mentor_id = $1 ORDER BY created_at DESC`,
      [mentorId],
    );
    return res.rows;
  });
}

export async function listRequestsForMentee(
  tenantId: string,
  menteeId: string,
): Promise<RequestRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<RequestRecord>(
      `SELECT ${SELECT_REQUEST} FROM mentorship_request WHERE mentee_id = $1 ORDER BY created_at DESC`,
      [menteeId],
    );
    return res.rows;
  });
}

export interface MentorshipRecord {
  id: string;
  mentorId: string;
  menteeId: string;
  status: string;
}

export async function listMentorships(
  tenantId: string,
  userId: string,
): Promise<MentorshipRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<MentorshipRecord>(
      `SELECT id, mentor_id AS "mentorId", mentee_id AS "menteeId", status
       FROM mentorship WHERE mentor_id = $1 OR mentee_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return res.rows;
  });
}

/** Sets a mentor's capacity (max concurrent active mentees). */
export async function setMentorCapacity(
  tenantId: string,
  userId: string,
  capacity: number,
): Promise<void> {
  const value = Math.max(0, Math.floor(capacity));
  await withTenant(tenantId, (db) =>
    db.query(
      `INSERT INTO profile (tenant_id, tenant_user_id, mentor_capacity)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, tenant_user_id) DO UPDATE SET mentor_capacity = $3, updated_at = now()`,
      [tenantId, userId, value],
    ),
  );
  await recordMentorshipEvent(tenantId, 'profile.capacity_changed', {
    actorId: userId,
    targetType: 'profile',
    metadata: { capacity: value },
  });
  // Notify the mentor that their capacity changed.
  await safeNotify(tenantId, {
    type: 'profile.capacity_changed',
    targetUserId: userId,
    originEvent: 'profile.capacity_changed',
    payload: { capacity: value },
  });
}
