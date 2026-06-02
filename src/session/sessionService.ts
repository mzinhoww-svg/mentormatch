/**
 * Mentorship session foundation. A session is a scheduled meeting INSIDE an
 * active mentorship. All tenant-scoped via withTenant (RLS), bound to
 * TenantUser, audited. Sessions can only exist for an active mentorship, only
 * the two participants act on them, and a paused mentor cannot start a new one.
 * ContactInfo reveal is unchanged (still gated by an active mentorship).
 */
import { withTenant, type TenantDb } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordSessionEvent } from './audit.js';
import { safeNotify } from '../notifications/notificationService.js';
import { canCancel, canComplete, canConfirm, type SessionStatus } from './rules.js';
import type { NotificationType } from '../notifications/types.js';

export interface SessionRecord {
  id: string;
  mentorshipId: string;
  requestedBy: string;
  scheduledAt: string | null;
  objective: string | null;
  notes: string | null;
  status: SessionStatus;
}

const SELECT_SESSION = `
  id, mentorship_id AS "mentorshipId", requested_by AS "requestedBy",
  scheduled_at AS "scheduledAt", objective, notes, status`;

interface MentorshipParticipants {
  mentorId: string;
  menteeId: string;
  status: string;
}

async function loadMentorship(db: TenantDb, mentorshipId: string): Promise<MentorshipParticipants | null> {
  const res = await db.query<{ mentor_id: string; mentee_id: string; status: string }>(
    'SELECT mentor_id, mentee_id, status FROM mentorship WHERE id = $1',
    [mentorshipId],
  );
  const r = res.rows[0];
  return r ? { mentorId: r.mentor_id, menteeId: r.mentee_id, status: r.status } : null;
}

function assertParticipant(m: MentorshipParticipants, actorId: string): void {
  if (actorId !== m.mentorId && actorId !== m.menteeId) {
    throw expectedError(ErrorCode.FORBIDDEN, 'not_a_participant');
  }
}

/** The participant who is NOT the actor — the one to notify. */
function counterpartOf(m: MentorshipParticipants, actorId: string): string {
  return actorId === m.mentorId ? m.menteeId : m.mentorId;
}

/** Notifies the actor's counterpart about a session event (no ContactInfo). */
async function notifyCounterpart(
  tenantId: string,
  type: NotificationType,
  counterpartId: string,
  sessionId: string,
): Promise<void> {
  await safeNotify(tenantId, {
    type,
    targetUserId: counterpartId,
    originEvent: type,
    payload: { sessionId },
  });
}

/** Loads a session and its mentorship participants, asserting actor membership. */
async function loadSessionForActor(
  db: TenantDb,
  sessionId: string,
  actorId: string,
): Promise<{ status: SessionStatus; mentorshipId: string; m: MentorshipParticipants }> {
  const res = await db.query<{ status: SessionStatus; mentorship_id: string }>(
    'SELECT status, mentorship_id FROM mentorship_session WHERE id = $1',
    [sessionId],
  );
  const s = res.rows[0];
  if (!s) throw expectedError(ErrorCode.NOT_FOUND, 'session_not_found');
  const m = await loadMentorship(db, s.mentorship_id);
  if (!m) throw expectedError(ErrorCode.NOT_FOUND, 'mentorship_not_found');
  assertParticipant(m, actorId);
  return { status: s.status, mentorshipId: s.mentorship_id, m };
}

export interface RequestSessionInput {
  mentorshipId: string;
  scheduledAt: string;
  objective?: string;
}

export async function requestSession(
  tenantId: string,
  actorId: string,
  input: RequestSessionInput,
): Promise<SessionRecord> {
  if (!input.scheduledAt) {
    throw expectedError(ErrorCode.VALIDATION, 'scheduled_at_required');
  }

  const { session, counterpartId } = await withTenant(tenantId, async (db) => {
    const m = await loadMentorship(db, input.mentorshipId);
    if (!m) throw expectedError(ErrorCode.NOT_FOUND, 'mentorship_not_found');
    // Sessions can only exist for an ACTIVE mentorship.
    if (m.status !== 'active') throw expectedError(ErrorCode.CONFLICT, 'mentorship_not_active');
    assertParticipant(m, actorId);

    // A paused mentor cannot start a new session.
    const paused = await db.query<{ mentor_paused: boolean }>(
      'SELECT mentor_paused FROM profile WHERE tenant_user_id = $1',
      [m.mentorId],
    );
    if (paused.rows[0]?.mentor_paused) {
      throw expectedError(ErrorCode.CONFLICT, 'mentor_paused');
    }

    const inserted = await db.query<SessionRecord>(
      `INSERT INTO mentorship_session
         (tenant_id, mentorship_id, requested_by, scheduled_at, objective, status)
       VALUES ($1, $2, $3, $4, $5, 'requested')
       RETURNING ${SELECT_SESSION}`,
      [tenantId, input.mentorshipId, actorId, input.scheduledAt, input.objective ?? null],
    );
    return { session: inserted.rows[0]!, counterpartId: counterpartOf(m, actorId) };
  });

  await recordSessionEvent(tenantId, 'session.requested', {
    actorId,
    targetId: session.id,
    metadata: { mentorshipId: session.mentorshipId, scheduledAt: session.scheduledAt },
  });
  await notifyCounterpart(tenantId, 'session.requested', counterpartId, session.id);
  return session;
}

export async function confirmSession(
  tenantId: string,
  actorId: string,
  sessionId: string,
): Promise<void> {
  const counterpartId = await withTenant(tenantId, async (db) => {
    const { status, m } = await loadSessionForActor(db, sessionId, actorId);
    if (!canConfirm(status)) throw expectedError(ErrorCode.VALIDATION, 'session_not_confirmable');
    await db.query(
      "UPDATE mentorship_session SET status = 'confirmed', confirmed_at = now() WHERE id = $1",
      [sessionId],
    );
    return counterpartOf(m, actorId);
  });
  await recordSessionEvent(tenantId, 'session.confirmed', { actorId, targetId: sessionId });
  await notifyCounterpart(tenantId, 'session.confirmed', counterpartId, sessionId);
}

export async function completeSession(
  tenantId: string,
  actorId: string,
  sessionId: string,
  notes?: string,
): Promise<void> {
  const counterpartId = await withTenant(tenantId, async (db) => {
    const { status, m } = await loadSessionForActor(db, sessionId, actorId);
    if (!canComplete(status)) throw expectedError(ErrorCode.VALIDATION, 'session_not_completable');
    await db.query(
      "UPDATE mentorship_session SET status = 'completed', completed_at = now(), notes = COALESCE($2, notes) WHERE id = $1",
      [sessionId, notes ?? null],
    );
    return counterpartOf(m, actorId);
  });
  await recordSessionEvent(tenantId, 'session.completed', { actorId, targetId: sessionId });
  await notifyCounterpart(tenantId, 'session.completed', counterpartId, sessionId);
}

export async function cancelSession(
  tenantId: string,
  actorId: string,
  sessionId: string,
  reason?: string,
): Promise<void> {
  const counterpartId = await withTenant(tenantId, async (db) => {
    const { status, m } = await loadSessionForActor(db, sessionId, actorId);
    if (!canCancel(status)) throw expectedError(ErrorCode.VALIDATION, 'session_not_cancellable');
    await db.query(
      "UPDATE mentorship_session SET status = 'cancelled', cancelled_at = now(), cancel_reason = $2 WHERE id = $1",
      [sessionId, reason ?? null],
    );
    return counterpartOf(m, actorId);
  });
  await recordSessionEvent(tenantId, 'session.cancelled', { actorId, targetId: sessionId });
  await notifyCounterpart(tenantId, 'session.cancelled', counterpartId, sessionId);
}

/** Lists sessions for mentorships the user participates in. */
export async function listSessions(tenantId: string, userId: string): Promise<SessionRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<SessionRecord>(
      `SELECT ${SELECT_SESSION} FROM mentorship_session s
       WHERE EXISTS (
         SELECT 1 FROM mentorship m
         WHERE m.id = s.mentorship_id AND (m.mentor_id = $1 OR m.mentee_id = $1)
       )
       ORDER BY s.created_at DESC`,
      [userId],
    );
    return res.rows;
  });
}
