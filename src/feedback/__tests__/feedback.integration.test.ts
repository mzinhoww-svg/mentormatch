import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import {
  submitSessionFeedback,
  submitMentorshipFeedback,
  listMyFeedback,
  getAverageRating,
} from '../feedbackService.js';
import { requestMentorship, acceptRequest } from '../../mentorship/mentorshipService.js';
import { requestSession, confirmSession, completeSession } from '../../session/sessionService.js';
import { upsertProfile, activateProfile, setMentorAvailable } from '../../profile/profileService.js';
import { isAppError } from '../../observability/errors.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);
const soon = () => new Date(Date.now() + 86_400_000).toISOString();

async function createUser(tenantId: string, name: string, contactEmail?: string): Promise<string> {
  const email = `${name.toLowerCase()}-${rand()}@x.com`;
  return withTenant(tenantId, async (db) => {
    const u = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, email, normalized_email, display_name, role, status, contact_email)
       VALUES ($1, $2, $3, $4, 'member', 'active', $5) RETURNING id`,
      [tenantId, email, email, name, contactEmail ?? null],
    );
    const id = u.rows[0]!.id;
    await db.query(
      `INSERT INTO consent_record (tenant_id, tenant_user_id, terms_version) VALUES ($1, $2, '2026-06-01')`,
      [tenantId, id],
    );
    return id;
  });
}

async function setupMentor(tenantId: string, name: string, contactEmail?: string): Promise<string> {
  const id = await createUser(tenantId, name, contactEmail);
  await upsertProfile(tenantId, id, { title: 'Eng', area: 'Plataforma' });
  await activateProfile(tenantId, id);
  await setMentorAvailable(tenantId, id, true);
  return id;
}

async function activeMentorship(tenantId: string, mentorContact?: string) {
  const mentorId = await setupMentor(tenantId, `M${rand()}`, mentorContact);
  const menteeId = await createUser(tenantId, `U${rand()}`);
  const req = await requestMentorship(tenantId, menteeId, { mentorId });
  const accepted = await acceptRequest(tenantId, mentorId, req.id);
  return { mentorshipId: accepted.mentorshipId, mentorId, menteeId };
}

async function completedSession(tenantId: string, mentorContact?: string) {
  const m = await activeMentorship(tenantId, mentorContact);
  const sess = await requestSession(tenantId, m.menteeId, { mentorshipId: m.mentorshipId, scheduledAt: soon() });
  await confirmSession(tenantId, m.mentorId, sess.id);
  await completeSession(tenantId, m.mentorId, sess.id);
  return { sessionId: sess.id, ...m };
}

async function expectAppError(p: Promise<unknown>, message: string): Promise<void> {
  try {
    await p;
    throw new Error('expected rejection');
  } catch (err) {
    expect(isAppError(err)).toBe(true);
    if (isAppError(err)) expect(err.message).toBe(message);
  }
}

const fresh = (l: string) => createTenant({ slug: `fb${l}${rand()}`, name: `FB ${l}` });

describe.skipIf(!hasDb)('Feedback & ratings foundation (integration)', () => {
  let shared: TenantRecord;
  beforeAll(async () => {
    shared = await fresh('shared');
  });
  afterAll(async () => {
    await closePools();
  });

  it('1. tenant A does not see tenant B feedback', async () => {
    const a = await fresh('a1');
    const b = await fresh('b1');
    const sa = await completedSession(a.id);
    const fb = await submitSessionFeedback(a.id, sa.menteeId, sa.sessionId, 5, 'ótimo');

    expect((await listMyFeedback(a.id, sa.menteeId)).some((f) => f.id === fb.id)).toBe(true);
    const crossB = await withTenant(b.id, (db) =>
      db.query('SELECT id FROM feedback WHERE id = $1', [fb.id]),
    );
    expect(crossB.rowCount).toBe(0);
  });

  it('2. feedback can only exist for valid (completed) sessions', async () => {
    const a = await fresh('a2');
    const mentee = await createUser(a.id, 'Lonely');
    // Non-existent session.
    await expectAppError(submitSessionFeedback(a.id, mentee, a.id, 4), 'session_not_found');
    // Existing but not completed.
    const m = await activeMentorship(a.id);
    const sess = await requestSession(a.id, m.menteeId, { mentorshipId: m.mentorshipId, scheduledAt: soon() });
    await expectAppError(submitSessionFeedback(a.id, m.menteeId, sess.id, 4), 'session_not_completed');
  });

  it('3. rating works (valid stored, invalid rejected)', async () => {
    const s = await completedSession(shared.id);
    const fb = await submitSessionFeedback(shared.id, s.menteeId, s.sessionId, 4);
    expect(fb.score).toBe(4);
    const agg = await getAverageRating(shared.id, 'session', s.sessionId);
    expect(agg).toMatchObject({ average: 4, count: 1 });

    const s2 = await completedSession(shared.id);
    await expectAppError(submitSessionFeedback(shared.id, s2.menteeId, s2.sessionId, 6), 'invalid_score');
  });

  it('4. optional comment works (with and without)', async () => {
    const a = await fresh('a4');
    const s1 = await completedSession(a.id);
    const withComment = await submitSessionFeedback(a.id, s1.menteeId, s1.sessionId, 5, 'muito bom');
    expect(withComment.comment).toBe('muito bom');
    const s2 = await completedSession(a.id);
    const noComment = await submitSessionFeedback(a.id, s2.menteeId, s2.sessionId, 3);
    expect(noComment.comment).toBeNull();
  });

  it('5. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS c FROM feedback');
    expect(raw.rows[0]?.c).toBe(0);
    await expect(
      appPool().query(
        "INSERT INTO feedback (tenant_id, author_id, feedback_type, target_type, target_id, score) VALUES ($1,$2,'session','session',$3,5)",
        [shared.id, shared.id, shared.id],
      ),
    ).rejects.toThrow();
  });

  it('6. ContactInfo never leaks through feedback', async () => {
    const a = await fresh('a6');
    const contact = `mentor-${rand()}@a.com`;
    const m = await activeMentorship(a.id, contact);
    // Mentee rates the mentor (counterpart) — target is the mentor user.
    await submitMentorshipFeedback(a.id, m.menteeId, m.mentorshipId, 5, 'aprendi muito');
    const blob = JSON.stringify([
      await listMyFeedback(a.id, m.menteeId),
      await getAverageRating(a.id, 'tenant_user', m.mentorId),
    ]);
    expect(blob).not.toContain(contact);
    expect(blob.toLowerCase()).not.toContain('contact_email');
  });

  it('7. an audit event is generated when feedback is created', async () => {
    const a = await fresh('a7');
    const s = await completedSession(a.id);
    const fb = await submitSessionFeedback(a.id, s.menteeId, s.sessionId, 5);
    const events = await withTenant(a.id, (db) =>
      db.query("SELECT 1 FROM audit_event WHERE action = 'feedback.submitted' AND target_id = $1", [
        s.sessionId,
      ]),
    );
    expect(events.rowCount).toBe(1);
    expect(fb.status).toBe('submitted');
  });

  it('8. feedback lists are tenant-scoped (no crossing)', async () => {
    const a = await fresh('a8');
    const b = await fresh('b8');
    const sa = await completedSession(a.id);
    await submitSessionFeedback(a.id, sa.menteeId, sa.sessionId, 5);

    expect((await listMyFeedback(a.id, sa.menteeId)).length).toBe(1);
    // The same author id queried under B sees nothing.
    expect((await listMyFeedback(b.id, sa.menteeId)).length).toBe(0);
    expect(await getAverageRating(b.id, 'session', sa.sessionId)).toMatchObject({ count: 0 });
  });
});
