import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import { emitNotification, setPreference } from '../../notifications/notificationService.js';
import { requestMentorship, acceptRequest, rejectRequest } from '../../mentorship/mentorshipService.js';
import { requestSession } from '../../session/sessionService.js';
import { upsertProfile, activateProfile, setMentorAvailable } from '../../profile/profileService.js';
import {
  enqueuePendingEmails,
  sendPendingEmails,
  processTenantEmails,
} from '../emailService.js';
import { __setEmailProvider, type EmailProvider, type OutgoingEmail, type SendResult } from '../provider.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 7);
const soon = () => new Date(Date.now() + 86_400_000).toISOString();

class CaptureProvider implements EmailProvider {
  readonly name = 'capture';
  sent: OutgoingEmail[] = [];
  async send(email: OutgoingEmail): Promise<SendResult> {
    this.sent.push(email);
    return { ok: true, providerMessageId: `cap-${this.sent.length}` };
  }
}
class FailingProvider implements EmailProvider {
  readonly name = 'failing';
  async send(): Promise<SendResult> {
    return { ok: false, error: 'provider_down' };
  }
}

async function createUser(tenantId: string, name: string, contactEmail?: string): Promise<{ id: string; email: string }> {
  const email = `${name}-${rand()}@acme.test`;
  const id = await withTenant(tenantId, async (db) => {
    const u = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, email, normalized_email, display_name, role, status, contact_email)
       VALUES ($1, $2, $3, $4, 'member', 'active', $5) RETURNING id`,
      [tenantId, email, email, name, contactEmail ?? null],
    );
    const uid = u.rows[0]!.id;
    await db.query(
      `INSERT INTO consent_record (tenant_id, tenant_user_id, terms_version) VALUES ($1, $2, '2026-06-01')`,
      [tenantId, uid],
    );
    return uid;
  });
  return { id, email };
}

async function mentor(tenantId: string, name: string, contactEmail?: string): Promise<{ id: string; email: string }> {
  const u = await createUser(tenantId, name, contactEmail);
  await upsertProfile(tenantId, u.id, { title: 'Eng', area: 'Plat' });
  await activateProfile(tenantId, u.id);
  await setMentorAvailable(tenantId, u.id, true);
  return u;
}

const fresh = (l: string) => createTenant({ slug: `eml${l}${rand()}`, name: `EML ${l}` });

describe.skipIf(!hasDb)('Email delivery foundation (integration)', () => {
  let shared: TenantRecord;
  // Domain flows deliver email SYNCHRONOUSLY via the configured provider; capture
  // it globally so domain-flow tests can assert what was sent.
  let cap: CaptureProvider;

  beforeAll(async () => {
    shared = await fresh('sh');
  });
  beforeEach(() => {
    cap = new CaptureProvider();
    __setEmailProvider(cap);
  });
  afterEach(() => {
    __setEmailProvider(null);
  });
  afterAll(async () => {
    await closePools();
  });

  const sentTo = (email: string) => cap.sent.filter((e) => e.to === email);

  it('1. tenant A never emails tenant B', async () => {
    const a = await fresh('a1');
    const b = await fresh('b1');
    const u = await createUser(a.id, 'Ana');
    // emitNotification only RECORDS — drain the outbox explicitly here.
    await emitNotification(a.id, { type: 'mentorship.requested', targetUserId: u.id, originEvent: 'mentorship.requested' });
    await processTenantEmails(a.id, cap);

    expect(sentTo(u.email).length).toBe(1);
    expect(cap.sent.every((e) => e.to === u.email)).toBe(true);

    // B sees nothing and queues/sends nothing.
    const crossB = await withTenant(b.id, (db) => db.query('SELECT id FROM email_message'));
    expect(crossB.rowCount).toBe(0);
    expect(await processTenantEmails(b.id, new CaptureProvider())).toMatchObject({ queued: 0, sent: 0 });
  });

  it('2. request / accept / reject deliver email by default (synchronously)', async () => {
    const t = await fresh('a2');
    const m = await mentor(t.id, 'Mentor');
    const mn = await createUser(t.id, 'Mentee');

    const req = await requestMentorship(t.id, mn.id, { mentorId: m.id });
    await acceptRequest(t.id, m.id, req.id);

    const m2 = await mentor(t.id, 'Mentor2');
    const mn2 = await createUser(t.id, 'Mentee2');
    const req2 = await requestMentorship(t.id, mn2.id, { mentorId: m2.id });
    await rejectRequest(t.id, m2.id, req2.id);

    const events = cap.sent.map((e) => e.originEvent);
    expect(events).toContain('mentorship.requested');
    expect(events).toContain('mentorship.accepted');
    expect(events).toContain('mentorship.rejected');
    // Delivered emails carry branded HTML.
    expect(cap.sent.every((e) => typeof e.html === 'string' && e.html.includes('<!doctype html>'))).toBe(true);

    const rows = await withTenant(t.id, (db) =>
      db.query<{ c: number }>("SELECT count(*)::int AS c FROM email_message WHERE status = 'sent'"),
    );
    expect(rows.rows[0]!.c).toBeGreaterThanOrEqual(3);
  });

  it('3. a session event delivers email by default', async () => {
    const t = await fresh('a3');
    const m = await mentor(t.id, 'Mentor');
    const mn = await createUser(t.id, 'Mentee');
    const req = await requestMentorship(t.id, mn.id, { mentorId: m.id });
    const acc = await acceptRequest(t.id, m.id, req.id);
    await requestSession(t.id, mn.id, { mentorshipId: acc.mentorshipId, scheduledAt: soon() });

    expect(cap.sent.map((e) => e.originEvent)).toContain('session.requested');
  });

  it('4. ContactInfo never appears in an email', async () => {
    const t = await fresh('a4');
    const contact = `secret-${rand()}@contact.com`;
    const m = await mentor(t.id, 'Mentor', contact);
    const mn = await createUser(t.id, 'Mentee');
    await requestMentorship(t.id, mn.id, { mentorId: m.id });

    const blob = JSON.stringify(cap.sent);
    expect(blob).not.toContain(contact);
    expect(blob.toLowerCase()).not.toContain('contact_email');
    // Recipient is the user's own account email, not their (hidden) ContactInfo.
    expect(sentTo(m.email).length).toBeGreaterThanOrEqual(1);
  });

  it('5. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS c FROM email_message');
    expect(raw.rows[0]?.c).toBe(0);
    await expect(
      appPool().query(
        "INSERT INTO email_message (tenant_id, recipient, template_key, subject, body, origin_event) VALUES ($1,'x','t','s','b','e')",
        [shared.id],
      ),
    ).rejects.toThrow();
  });

  it('6. an email=false preference suppresses the email (default is on)', async () => {
    const t = await fresh('a6');
    const on = await createUser(t.id, 'On'); // keeps the default (email ON)
    const off = await createUser(t.id, 'Off');
    await setPreference(t.id, off.id, 'mentorship.requested', { email: false });
    await emitNotification(t.id, { type: 'mentorship.requested', targetUserId: on.id, originEvent: 'mentorship.requested' });
    await emitNotification(t.id, { type: 'mentorship.requested', targetUserId: off.id, originEvent: 'mentorship.requested' });

    await processTenantEmails(t.id, cap);
    expect(cap.sent.map((e) => e.to)).toEqual([on.email]);
  });

  it('7. pending → failed → (retry) → sent', async () => {
    const t = await fresh('a7');
    const u = await createUser(t.id, 'User');
    // emitNotification records only (no drain), so the outbox state machine is testable.
    await emitNotification(t.id, { type: 'mentorship.requested', targetUserId: u.id, originEvent: 'mentorship.requested' });

    expect(await enqueuePendingEmails(t.id)).toBe(1);
    const pending = await withTenant(t.id, (db) =>
      db.query<{ status: string }>('SELECT status FROM email_message LIMIT 1'),
    );
    expect(pending.rows[0]!.status).toBe('pending');

    const fail = await sendPendingEmails(t.id, new FailingProvider());
    expect(fail).toMatchObject({ sent: 0, failed: 1 });
    const failed = await withTenant(t.id, (db) =>
      db.query<{ status: string; attempts: number; last_error: string }>(
        'SELECT status, attempts, last_error FROM email_message LIMIT 1',
      ),
    );
    expect(failed.rows[0]).toMatchObject({ status: 'failed', attempts: 1, last_error: 'provider_down' });

    const ok = await sendPendingEmails(t.id, new CaptureProvider()); // retry picks failed
    expect(ok).toMatchObject({ sent: 1, failed: 0 });
    const sent = await withTenant(t.id, (db) =>
      db.query<{ status: string }>('SELECT status FROM email_message LIMIT 1'),
    );
    expect(sent.rows[0]!.status).toBe('sent');
  });

  it('8. a provider failure does not break the core flow', async () => {
    const t = await fresh('a8');
    const m = await mentor(t.id, 'Mentor');
    const mn = await createUser(t.id, 'Mentee');
    __setEmailProvider(new FailingProvider()); // the synchronous drain will fail

    // Core domain op succeeds independently of email.
    const req = await requestMentorship(t.id, mn.id, { mentorId: m.id });
    expect(req.status).toBe('pending');

    // The email was attempted and marked failed, but the request is intact.
    const stillThere = await withTenant(t.id, (db) =>
      db.query<{ c: number }>('SELECT count(*)::int AS c FROM mentorship_request WHERE id = $1', [req.id]),
    );
    expect(stillThere.rows[0]!.c).toBe(1);
    const failed = await withTenant(t.id, (db) =>
      db.query<{ c: number }>("SELECT count(*)::int AS c FROM email_message WHERE status = 'failed'"),
    );
    expect(failed.rows[0]!.c).toBeGreaterThanOrEqual(1);
  });
});
