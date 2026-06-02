/**
 * Feedback & ratings foundation. Post-session feedback, mentor/mentee ratings
 * within a mentorship, and program feedback. All tenant-scoped via withTenant
 * (RLS), bound to TenantUser, audited. Feedback can only be created for valid
 * sessions / mentorships / programs the author participates in. Listing exposes
 * only what's necessary — aggregate ratings carry no comments; ContactInfo is
 * never read or returned here.
 */
import { withTenant, type TenantDb } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordFeedbackEvent } from './audit.js';
import { isValidScore, averageScore, type FeedbackType, type TargetType } from './rules.js';

export interface FeedbackRecord {
  id: string;
  feedbackType: FeedbackType;
  targetType: TargetType;
  targetId: string;
  score: number;
  comment: string | null;
  status: 'submitted' | 'withdrawn';
  createdAt: string;
}

const SELECT_FEEDBACK = `
  id, feedback_type AS "feedbackType", target_type AS "targetType",
  target_id AS "targetId", score, comment, status, created_at AS "createdAt"`;

function assertScore(score: number): void {
  if (!isValidScore(score)) throw expectedError(ErrorCode.VALIDATION, 'invalid_score');
}

async function ensureNoDuplicate(
  db: TenantDb,
  authorId: string,
  feedbackType: FeedbackType,
  targetId: string,
): Promise<void> {
  const existing = await db.query(
    `SELECT 1 FROM feedback
     WHERE author_id = $1 AND feedback_type = $2 AND target_id = $3 AND status = 'submitted' LIMIT 1`,
    [authorId, feedbackType, targetId],
  );
  if (existing.rowCount > 0) throw expectedError(ErrorCode.CONFLICT, 'feedback_already_exists');
}

interface InsertInput {
  authorId: string;
  feedbackType: FeedbackType;
  targetType: TargetType;
  targetId: string;
  mentorshipId: string | null;
  score: number;
  comment?: string;
}

async function insertFeedback(
  tenantId: string,
  db: TenantDb,
  input: InsertInput,
): Promise<FeedbackRecord> {
  const res = await db.query<FeedbackRecord>(
    `INSERT INTO feedback
       (tenant_id, author_id, feedback_type, target_type, target_id, mentorship_id, score, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${SELECT_FEEDBACK}`,
    [
      tenantId,
      input.authorId,
      input.feedbackType,
      input.targetType,
      input.targetId,
      input.mentorshipId,
      input.score,
      input.comment?.trim() ? input.comment.trim() : null,
    ],
  );
  return res.rows[0]!;
}

/** Post-session feedback. The session must be completed and the author a participant. */
export async function submitSessionFeedback(
  tenantId: string,
  authorId: string,
  sessionId: string,
  score: number,
  comment?: string,
): Promise<FeedbackRecord> {
  assertScore(score);
  const fb = await withTenant(tenantId, async (db) => {
    const res = await db.query<{ status: string; mentorship_id: string; mentor_id: string; mentee_id: string }>(
      `SELECT s.status, s.mentorship_id, m.mentor_id, m.mentee_id
       FROM mentorship_session s JOIN mentorship m ON m.id = s.mentorship_id
       WHERE s.id = $1`,
      [sessionId],
    );
    const row = res.rows[0];
    if (!row) throw expectedError(ErrorCode.NOT_FOUND, 'session_not_found');
    if (authorId !== row.mentor_id && authorId !== row.mentee_id) {
      throw expectedError(ErrorCode.FORBIDDEN, 'not_a_participant');
    }
    if (row.status !== 'completed') throw expectedError(ErrorCode.CONFLICT, 'session_not_completed');
    await ensureNoDuplicate(db, authorId, 'session', sessionId);
    return insertFeedback(tenantId, db, {
      authorId,
      feedbackType: 'session',
      targetType: 'session',
      targetId: sessionId,
      mentorshipId: row.mentorship_id,
      score,
      comment,
    });
  });
  await recordFeedbackEvent(tenantId, 'feedback.submitted', {
    actorId: authorId,
    targetId: sessionId,
    metadata: { feedbackType: 'session', score },
  });
  return fb;
}

/** Rates the counterpart within a mentorship (mentor rates mentee, or vice versa). */
export async function submitMentorshipFeedback(
  tenantId: string,
  authorId: string,
  mentorshipId: string,
  score: number,
  comment?: string,
): Promise<FeedbackRecord> {
  assertScore(score);
  const result = await withTenant(tenantId, async (db) => {
    const res = await db.query<{ mentor_id: string; mentee_id: string }>(
      'SELECT mentor_id, mentee_id FROM mentorship WHERE id = $1',
      [mentorshipId],
    );
    const m = res.rows[0];
    if (!m) throw expectedError(ErrorCode.NOT_FOUND, 'mentorship_not_found');
    if (authorId !== m.mentor_id && authorId !== m.mentee_id) {
      throw expectedError(ErrorCode.FORBIDDEN, 'not_a_participant');
    }
    const isMentor = authorId === m.mentor_id;
    const counterpart = isMentor ? m.mentee_id : m.mentor_id;
    const feedbackType: FeedbackType = isMentor ? 'mentee' : 'mentor';
    await ensureNoDuplicate(db, authorId, feedbackType, counterpart);
    const fb = await insertFeedback(tenantId, db, {
      authorId,
      feedbackType,
      targetType: 'tenant_user',
      targetId: counterpart,
      mentorshipId,
      score,
      comment,
    });
    return { fb, feedbackType, counterpart };
  });
  await recordFeedbackEvent(tenantId, 'feedback.submitted', {
    actorId: authorId,
    targetId: result.counterpart,
    metadata: { feedbackType: result.feedbackType, score },
  });
  return result.fb;
}

/** Program feedback. The author must be an active participant of the program. */
export async function submitProgramFeedback(
  tenantId: string,
  authorId: string,
  programId: string,
  score: number,
  comment?: string,
): Promise<FeedbackRecord> {
  assertScore(score);
  const fb = await withTenant(tenantId, async (db) => {
    const prog = await db.query('SELECT 1 FROM program WHERE id = $1', [programId]);
    if (prog.rowCount === 0) throw expectedError(ErrorCode.NOT_FOUND, 'program_not_found');
    const part = await db.query(
      "SELECT 1 FROM program_participant WHERE program_id = $1 AND tenant_user_id = $2 AND status = 'active'",
      [programId, authorId],
    );
    if (part.rowCount === 0) throw expectedError(ErrorCode.FORBIDDEN, 'not_a_participant');
    await ensureNoDuplicate(db, authorId, 'program', programId);
    return insertFeedback(tenantId, db, {
      authorId,
      feedbackType: 'program',
      targetType: 'program',
      targetId: programId,
      mentorshipId: null,
      score,
      comment,
    });
  });
  await recordFeedbackEvent(tenantId, 'feedback.submitted', {
    actorId: authorId,
    targetId: programId,
    metadata: { feedbackType: 'program', score },
  });
  return fb;
}

/** Feedback authored by the current user. */
export async function listMyFeedback(tenantId: string, authorId: string): Promise<FeedbackRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<FeedbackRecord>(
      `SELECT ${SELECT_FEEDBACK} FROM feedback WHERE author_id = $1 ORDER BY created_at DESC`,
      [authorId],
    );
    return res.rows;
  });
}

/** Aggregate rating for a target (no comments — safe to expose broadly). */
export async function getAverageRating(
  tenantId: string,
  targetType: TargetType,
  targetId: string,
): Promise<{ average: number; count: number }> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<{ score: number }>(
      `SELECT score FROM feedback WHERE target_type = $1 AND target_id = $2 AND status = 'submitted'`,
      [targetType, targetId],
    );
    const scores = res.rows.map((r) => r.score);
    return { average: averageScore(scores), count: scores.length };
  });
}

/** Admin listing of tenant feedback (operational). */
export async function listFeedback(
  tenantId: string,
  opts: { feedbackType?: FeedbackType; limit?: number } = {},
): Promise<FeedbackRecord[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return withTenant(tenantId, async (db) => {
    const res = await db.query<FeedbackRecord>(
      `SELECT ${SELECT_FEEDBACK} FROM feedback
       ${opts.feedbackType ? 'WHERE feedback_type = $1' : ''}
       ORDER BY created_at DESC LIMIT ${limit}`,
      opts.feedbackType ? [opts.feedbackType] : [],
    );
    return res.rows;
  });
}

export async function withdrawFeedback(
  tenantId: string,
  authorId: string,
  feedbackId: string,
): Promise<void> {
  const res = await withTenant(tenantId, (db) =>
    db.query(
      "UPDATE feedback SET status = 'withdrawn', updated_at = now() WHERE id = $1 AND author_id = $2 AND status = 'submitted'",
      [feedbackId, authorId],
    ),
  );
  if (res.rowCount === 0) throw expectedError(ErrorCode.NOT_FOUND, 'feedback_not_found');
  await recordFeedbackEvent(tenantId, 'feedback.withdrawn', { actorId: authorId, targetId: feedbackId });
}
