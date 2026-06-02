import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import {
  requestSession,
  confirmSession,
  completeSession,
  cancelSession,
  listSessions,
} from '../sessionService.js';
import { requestMentorship, acceptRequest } from '../../mentorship/mentorshipService.js';
import { revealContact } from '../../mentorship/contactReveal.js';
import {
  upsertProfile,
  activateProfile,
  setMentorAvailable,
  setMentorPaused,
} from '../../profile/profileService.js';
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
  await upsertProfile(tenantId, id, { title: 'Engineer', area: 'Platform' });
  await activateProfile(tenantId, id);
  await setMentorAvailable(tenantId, id, true);
  return id;
}

/** Creates an active mentorship and returns its id plus the two participants. */
async function activeMentorship(
  tenantId: string,
  opts: { mentorName?: string; menteeName?: string; mentorContact?: string } = {},
): Promise<{ mentorshipId: string; mentorId: string; menteeId: string }> {
  const mentorId = await setupMentor(tenantId, opts.mentorName ?? 'Mentor', opts.mentorContact);
  const menteeId = await createUser(tenantId, opts.menteeName ?? 'Mentee');
  const req = await requestMentorship(tenantId, menteeId, { mentorId });
  const accepted = await acceptRequest(tenantId, mentorId, req.id);
  return { mentorshipId: accepted.mentorshipId, mentorId, menteeId };
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

describe.skipIf(!hasDb)('Mentorship session foundation (integration)', () => {
  let a: TenantRecord;
  let b: TenantRecord;

  beforeAll(async () => {
    a = await createTenant({ slug: `msa${rand()}`, name: 'Session A' });
    b = await createTenant({ slug: `msb${rand()}`, name: 'Session B' });
  });

  afterAll(async () => {
    await closePools();
  });

  it('1. a session in tenant A does not appear in tenant B', async () => {
    const { mentorshipId, menteeId } = await activeMentorship(a.id);
    const s = await requestSession(a.id, menteeId, { mentorshipId, scheduledAt: soon() });

    expect((await listSessions(a.id, menteeId)).some((x) => x.id === s.id)).toBe(true);
    const crossB = await withTenant(b.id, (db) =>
      db.query('SELECT id FROM mentorship_session WHERE id = $1', [s.id]),
    );
    expect(crossB.rowCount).toBe(0);
  });

  it('2. a session can only exist for an active mentorship', async () => {
    const { mentorshipId, menteeId } = await activeMentorship(a.id);
    // End the mentorship → new sessions must be refused.
    await withTenant(a.id, (db) =>
      db.query("UPDATE mentorship SET status = 'ended' WHERE id = $1", [mentorshipId]),
    );
    await expectAppError(
      requestSession(a.id, menteeId, { mentorshipId, scheduledAt: soon() }),
      'mentorship_not_active',
    );
    // A non-existent mentorship is also refused.
    await expectAppError(
      requestSession(a.id, menteeId, { mentorshipId: a.id, scheduledAt: soon() }),
      'mentorship_not_found',
    );
  });

  it('3. confirming a session changes its status correctly', async () => {
    const { mentorshipId, mentorId, menteeId } = await activeMentorship(a.id);
    const s = await requestSession(a.id, menteeId, { mentorshipId, scheduledAt: soon() });
    expect(s.status).toBe('requested');
    await confirmSession(a.id, mentorId, s.id);
    const after = (await listSessions(a.id, mentorId)).find((x) => x.id === s.id);
    expect(after?.status).toBe('confirmed');
  });

  it('4. completing a session closes the cycle', async () => {
    const { mentorshipId, mentorId, menteeId } = await activeMentorship(a.id);
    const s = await requestSession(a.id, menteeId, { mentorshipId, scheduledAt: soon() });
    await confirmSession(a.id, mentorId, s.id);
    await completeSession(a.id, mentorId, s.id, 'Discussed roadmap.');
    const after = (await listSessions(a.id, mentorId)).find((x) => x.id === s.id);
    expect(after?.status).toBe('completed');
    expect(after?.notes).toBe('Discussed roadmap.');
    // Cannot complete twice.
    await expectAppError(completeSession(a.id, mentorId, s.id), 'session_not_completable');
  });

  it('5. cancelling a session works', async () => {
    const { mentorshipId, menteeId } = await activeMentorship(a.id);
    const s = await requestSession(a.id, menteeId, { mentorshipId, scheduledAt: soon() });
    await cancelSession(a.id, menteeId, s.id, 'conflict');
    const after = (await listSessions(a.id, menteeId)).find((x) => x.id === s.id);
    expect(after?.status).toBe('cancelled');
  });

  it('6. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS c FROM mentorship_session');
    expect(raw.rows[0]?.c).toBe(0);
    await expect(
      appPool().query(
        "INSERT INTO mentorship_session (tenant_id, mentorship_id, requested_by, status) VALUES ($1, $2, $3, 'requested')",
        [a.id, a.id, a.id],
      ),
    ).rejects.toThrow();
  });

  it('7. audit events are recorded for session create and completion', async () => {
    const { mentorshipId, mentorId, menteeId } = await activeMentorship(a.id);
    const s = await requestSession(a.id, menteeId, { mentorshipId, scheduledAt: soon() });
    await confirmSession(a.id, mentorId, s.id);
    await completeSession(a.id, mentorId, s.id);

    const events = await withTenant(a.id, (db) =>
      db.query<{ action: string }>(
        "SELECT DISTINCT action FROM audit_event WHERE action LIKE 'session.%' AND target_id = $1",
        [s.id],
      ),
    );
    const actions = events.rows.map((r) => r.action);
    expect(actions).toContain('session.requested');
    expect(actions).toContain('session.completed');
  });

  it('8. ContactInfo stays isolated (sessions open no leak)', async () => {
    const contact = `mentor-${rand()}@a.com`;
    const { mentorshipId, mentorId, menteeId } = await activeMentorship(a.id, {
      mentorContact: contact,
    });
    // Participant (matched) can see contact; a session does not change that.
    await requestSession(a.id, menteeId, { mentorshipId, scheduledAt: soon() });
    expect((await revealContact(a.id, menteeId, mentorId)).contactEmail).toBe(contact);

    // An unrelated user (no mentorship) still cannot see the mentor's contact.
    const outsider = await createUser(a.id, 'Outsider');
    await expectAppError(revealContact(a.id, outsider, mentorId), 'contact_not_revealed');
  });

  it('9. a paused mentor cannot start a new session', async () => {
    const { mentorshipId, mentorId, menteeId } = await activeMentorship(a.id);
    await setMentorPaused(a.id, mentorId, true);
    await expectAppError(
      requestSession(a.id, menteeId, { mentorshipId, scheduledAt: soon() }),
      'mentor_paused',
    );
  });
});
