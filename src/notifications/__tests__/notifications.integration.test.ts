import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import {
  listNotifications,
  unreadCount,
  markRead,
  emitNotification,
} from '../notificationService.js';
import { requestMentorship, acceptRequest, rejectRequest } from '../../mentorship/mentorshipService.js';
import { requestSession } from '../../session/sessionService.js';
import {
  upsertProfile,
  activateProfile,
  setMentorAvailable,
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

function latestFor(list: { type: string }[], type: string): boolean {
  return list.some((n) => n.type === type);
}

describe.skipIf(!hasDb)('Notifications foundation (integration)', () => {
  let a: TenantRecord;
  let b: TenantRecord;

  beforeAll(async () => {
    a = await createTenant({ slug: `nta${rand()}`, name: 'Notif A' });
    b = await createTenant({ slug: `ntb${rand()}`, name: 'Notif B' });
  });

  afterAll(async () => {
    await closePools();
  });

  it('1. tenant A does not see tenant B notifications', async () => {
    const mentorA = await setupMentor(a.id, 'MentorA');
    const menteeA = await createUser(a.id, 'MenteeA');
    await requestMentorship(a.id, menteeA, { mentorId: mentorA }); // notifies mentorA

    expect((await listNotifications(a.id, mentorA)).length).toBeGreaterThan(0);
    // B cannot see A's notification row.
    const crossB = await withTenant(b.id, (db) =>
      db.query('SELECT id FROM notification WHERE target_user_id = $1', [mentorA]),
    );
    expect(crossB.rowCount).toBe(0);
  });

  it('2. a request event generates a notification (to the mentor)', async () => {
    const mentor = await setupMentor(a.id, 'ReqMentor');
    const mentee = await createUser(a.id, 'ReqMentee');
    await requestMentorship(a.id, mentee, { mentorId: mentor });
    expect(latestFor(await listNotifications(a.id, mentor), 'mentorship.requested')).toBe(true);
  });

  it('3. an accept event generates a notification (to the mentee)', async () => {
    const mentor = await setupMentor(a.id, 'AccMentor');
    const mentee = await createUser(a.id, 'AccMentee');
    const req = await requestMentorship(a.id, mentee, { mentorId: mentor });
    await acceptRequest(a.id, mentor, req.id);
    expect(latestFor(await listNotifications(a.id, mentee), 'mentorship.accepted')).toBe(true);
  });

  it('4. a reject event generates a notification (to the mentee)', async () => {
    const mentor = await setupMentor(a.id, 'RejMentor');
    const mentee = await createUser(a.id, 'RejMentee');
    const req = await requestMentorship(a.id, mentee, { mentorId: mentor });
    await rejectRequest(a.id, mentor, req.id);
    expect(latestFor(await listNotifications(a.id, mentee), 'mentorship.rejected')).toBe(true);
  });

  it('5. a session event generates a notification (to the counterpart)', async () => {
    const mentor = await setupMentor(a.id, 'SesMentor');
    const mentee = await createUser(a.id, 'SesMentee');
    const req = await requestMentorship(a.id, mentee, { mentorId: mentor });
    const accepted = await acceptRequest(a.id, mentor, req.id);
    // Mentee requests a session → the mentor (counterpart) is notified.
    await requestSession(a.id, mentee, { mentorshipId: accepted.mentorshipId, scheduledAt: soon() });
    expect(latestFor(await listNotifications(a.id, mentor), 'session.requested')).toBe(true);
  });

  it('6. marking as read works and is consistent', async () => {
    const mentor = await setupMentor(a.id, 'ReadMentor');
    const mentee = await createUser(a.id, 'ReadMentee');
    await requestMentorship(a.id, mentee, { mentorId: mentor });

    const before = await unreadCount(a.id, mentor);
    expect(before).toBeGreaterThan(0);
    const unread = await listNotifications(a.id, mentor, { status: 'unread' });
    await markRead(a.id, mentor, unread[0]!.id);

    expect(await unreadCount(a.id, mentor)).toBe(before - 1);
    const reread = (await listNotifications(a.id, mentor)).find((n) => n.id === unread[0]!.id);
    expect(reread?.status).toBe('read');
    expect(reread?.readAt).not.toBeNull();
  });

  it('7. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS c FROM notification');
    expect(raw.rows[0]?.c).toBe(0);
    await expect(
      appPool().query(
        "INSERT INTO notification (tenant_id, target_user_id, type, origin_event) VALUES ($1, $2, 'auth.login', 'auth.login')",
        [a.id, a.id],
      ),
    ).rejects.toThrow();
  });

  it('8. ContactInfo never appears in a notification payload', async () => {
    const contact = `mentor-${rand()}@a.com`;
    const mentor = await setupMentor(a.id, 'LeakMentor', contact);
    const mentee = await createUser(a.id, 'LeakMentee', `mentee-${rand()}@a.com`);
    const req = await requestMentorship(a.id, mentee, { mentorId: mentor });
    await acceptRequest(a.id, mentor, req.id);

    // Scan every payload generated across these flows for contact-ish content.
    const all = await withTenant(a.id, (db) =>
      db.query<{ payload: Record<string, unknown> }>('SELECT payload FROM notification'),
    );
    const blob = JSON.stringify(all.rows.map((r) => r.payload));
    expect(blob).not.toContain(contact);
    expect(blob.toLowerCase()).not.toContain('contact_email');
    expect(blob.toLowerCase()).not.toContain('@a.com');

    // The emit guard itself refuses a sensitive payload.
    let threw = false;
    try {
      await emitNotification(a.id, {
        type: 'profile.updated',
        targetUserId: mentor,
        originEvent: 'test',
        payload: { contact_email: contact },
      });
    } catch (err) {
      threw = true;
      expect(isAppError(err)).toBe(true);
    }
    expect(threw).toBe(true);
  });
});
