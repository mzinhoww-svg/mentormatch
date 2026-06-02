import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import {
  requestMentorship,
  acceptRequest,
  rejectRequest,
  listRequestsForMentor,
  listMentorships,
  setMentorCapacity,
} from '../mentorshipService.js';
import { revealContact } from '../contactReveal.js';
import {
  upsertProfile,
  activateProfile,
  setMentorAvailable,
  setMentorPaused,
} from '../../profile/profileService.js';
import { isAppError } from '../../observability/errors.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);

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

async function setupMentor(
  tenantId: string,
  opts: { name: string; capacity?: number; paused?: boolean; contactEmail?: string },
): Promise<string> {
  const id = await createUser(tenantId, opts.name, opts.contactEmail);
  await upsertProfile(tenantId, id, { title: 'Engineer', area: 'Platform' });
  await activateProfile(tenantId, id);
  await setMentorAvailable(tenantId, id, true);
  if (opts.capacity !== undefined) await setMentorCapacity(tenantId, id, opts.capacity);
  if (opts.paused) await setMentorPaused(tenantId, id, true);
  return id;
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

describe.skipIf(!hasDb)('Mentorship request & approval (integration)', () => {
  let a: TenantRecord;
  let b: TenantRecord;

  beforeAll(async () => {
    a = await createTenant({ slug: `mra${rand()}`, name: 'Mentorship A' });
    b = await createTenant({ slug: `mrb${rand()}`, name: 'Mentorship B' });
  });

  afterAll(async () => {
    await closePools();
  });

  it('1. a request in tenant A does not affect tenant B', async () => {
    const mentorA = await setupMentor(a.id, { name: 'MentorA' });
    const menteeA = await createUser(a.id, 'MenteeA');
    await setupMentor(b.id, { name: 'MentorB' });

    await requestMentorship(a.id, menteeA, { mentorId: mentorA });
    expect((await listRequestsForMentor(a.id, mentorA)).length).toBe(1);

    // B sees nothing about A's request.
    const crossB = await withTenant(b.id, (db) =>
      db.query('SELECT id FROM mentorship_request WHERE mentor_id = $1', [mentorA]),
    );
    expect(crossB.rowCount).toBe(0);
  });

  it('2. mentor accepts a request and an active mentorship is created', async () => {
    const mentor = await setupMentor(a.id, { name: 'AccMentor' });
    const mentee = await createUser(a.id, 'AccMentee');
    const req = await requestMentorship(a.id, mentee, { mentorId: mentor });
    expect(req.status).toBe('pending');

    const result = await acceptRequest(a.id, mentor, req.id);
    expect(result.mentorshipId).toBeTruthy();

    const mentorships = await listMentorships(a.id, mentor);
    expect(mentorships.some((m) => m.menteeId === mentee && m.status === 'active')).toBe(true);
  });

  it('3. mentor rejects a request (no mentorship)', async () => {
    const mentor = await setupMentor(a.id, { name: 'RejMentor' });
    const mentee = await createUser(a.id, 'RejMentee');
    const req = await requestMentorship(a.id, mentee, { mentorId: mentor });
    await rejectRequest(a.id, mentor, req.id);

    const reqs = await listRequestsForMentor(a.id, mentor);
    expect(reqs.find((r) => r.id === req.id)?.status).toBe('rejected');
    const mentorships = await listMentorships(a.id, mentee);
    expect(mentorships.length).toBe(0);
  });

  it('4. ContactInfo is revealed only after acceptance', async () => {
    const contact = `mentor-contact-${rand()}@a.com`;
    const mentor = await setupMentor(a.id, { name: 'RevMentor', contactEmail: contact });
    const mentee = await createUser(a.id, 'RevMentee');
    const req = await requestMentorship(a.id, mentee, { mentorId: mentor });

    // Before acceptance: hidden.
    await expectAppError(revealContact(a.id, mentee, mentor), 'contact_not_revealed');

    await acceptRequest(a.id, mentor, req.id);

    // After acceptance: revealed.
    const revealed = await revealContact(a.id, mentee, mentor);
    expect(revealed.contactEmail).toBe(contact);
  });

  it('5. a full mentor sends new requests to the waitlist', async () => {
    const mentor = await setupMentor(a.id, { name: 'FullMentor', capacity: 1 });
    const mentee1 = await createUser(a.id, 'Full1');
    const mentee2 = await createUser(a.id, 'Full2');

    const r1 = await requestMentorship(a.id, mentee1, { mentorId: mentor });
    await acceptRequest(a.id, mentor, r1.id); // fills the single slot

    const r2 = await requestMentorship(a.id, mentee2, { mentorId: mentor });
    expect(r2.status).toBe('waitlisted');
  });

  it('6. a paused mentor cannot receive new requests', async () => {
    const mentor = await setupMentor(a.id, { name: 'PausedMentor', paused: true });
    const mentee = await createUser(a.id, 'PausedMentee');
    await expectAppError(requestMentorship(a.id, mentee, { mentorId: mentor }), 'mentor_unavailable');
  });

  it('7. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS c FROM mentorship_request');
    expect(raw.rows[0]?.c).toBe(0);
    await expect(
      appPool().query(
        "INSERT INTO mentorship_request (tenant_id, mentee_id, mentor_id, status) VALUES ($1, $2, $3, 'pending')",
        [a.id, a.id, a.id],
      ),
    ).rejects.toThrow();
  });

  it('8. audit events are recorded for request / accept / reject', async () => {
    const mentor = await setupMentor(a.id, { name: 'AuditMentor' });
    const m1 = await createUser(a.id, 'AuditAccept');
    const m2 = await createUser(a.id, 'AuditReject');
    const rA = await requestMentorship(a.id, m1, { mentorId: mentor });
    await acceptRequest(a.id, mentor, rA.id);
    const rB = await requestMentorship(a.id, m2, { mentorId: mentor });
    await rejectRequest(a.id, mentor, rB.id);

    const events = await withTenant(a.id, (db) =>
      db.query<{ action: string }>(
        "SELECT DISTINCT action FROM audit_event WHERE action LIKE 'mentorship.%'",
      ),
    );
    const actions = events.rows.map((r) => r.action);
    expect(actions).toContain('mentorship.requested');
    expect(actions).toContain('mentorship.accepted');
    expect(actions).toContain('mentorship.rejected');
  });
});
