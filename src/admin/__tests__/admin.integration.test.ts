import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import {
  getOverview,
  listUsers,
  listMentors,
  listMentorships,
  listSessions,
  setUserStatus,
} from '../adminService.js';
import { ADMIN_ROLES } from '../requireAdmin.js';
import { requireRole } from '../../auth/rbac.js';
import { requestMentorship, acceptRequest } from '../../mentorship/mentorshipService.js';
import { requestSession } from '../../session/sessionService.js';
import { upsertProfile, activateProfile, setMentorAvailable } from '../../profile/profileService.js';
import { isAppError } from '../../observability/errors.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);
const soon = () => new Date(Date.now() + 86_400_000).toISOString();

async function createUser(
  tenantId: string,
  name: string,
  opts: { role?: string; contactEmail?: string } = {},
): Promise<string> {
  const email = `${name.toLowerCase()}-${rand()}@x.com`;
  return withTenant(tenantId, async (db) => {
    const u = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, email, normalized_email, display_name, role, status, contact_email)
       VALUES ($1, $2, $3, $4, $5, 'active', $6) RETURNING id`,
      [tenantId, email, email, name, opts.role ?? 'member', opts.contactEmail ?? null],
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
  const id = await createUser(tenantId, name, { contactEmail });
  await upsertProfile(tenantId, id, { title: 'Engineer', area: 'Platform' });
  await activateProfile(tenantId, id);
  await setMentorAvailable(tenantId, id, true);
  return id;
}

async function activeMentorship(
  tenantId: string,
  opts: { mentorName?: string; menteeName?: string; mentorContact?: string } = {},
): Promise<{ mentorshipId: string; mentorId: string; menteeId: string }> {
  const mentorId = await setupMentor(tenantId, opts.mentorName ?? `M${rand()}`, opts.mentorContact);
  const menteeId = await createUser(tenantId, opts.menteeName ?? `U${rand()}`);
  const req = await requestMentorship(tenantId, menteeId, { mentorId });
  const accepted = await acceptRequest(tenantId, mentorId, req.id);
  return { mentorshipId: accepted.mentorshipId, mentorId, menteeId };
}

const fresh = (label: string) => createTenant({ slug: `adm${label}${rand()}`, name: `Admin ${label}` });

describe.skipIf(!hasDb)('Tenant admin foundation (integration)', () => {
  let shared: TenantRecord;
  beforeAll(async () => {
    shared = await fresh('shared');
  });
  afterAll(async () => {
    await closePools();
  });

  it('1. admin of tenant A does not see tenant B data', async () => {
    const a = await fresh('a1');
    const b = await fresh('b1');
    const a1 = await activeMentorship(a.id);
    await activeMentorship(b.id);

    const aMentorships = await listMentorships(a.id);
    expect(aMentorships.length).toBe(1);
    expect(aMentorships[0]!.id).toBe(a1.mentorshipId);
    // None of A's mentorship ids belong to B.
    const bIds = (await listMentorships(b.id)).map((m) => m.id);
    expect(bIds).not.toContain(a1.mentorshipId);
  });

  it('2. metrics are tenant-scoped', async () => {
    const a = await fresh('a2');
    const b = await fresh('b2');
    await activeMentorship(a.id);
    await activeMentorship(a.id);
    await activeMentorship(b.id);

    expect((await getOverview(a.id)).mentorships.active).toBe(2);
    expect((await getOverview(b.id)).mentorships.active).toBe(1);
  });

  it('3. admin sees only permitted data (no private session content)', async () => {
    const a = await fresh('a3');
    const m = await activeMentorship(a.id);
    await requestSession(a.id, m.menteeId, {
      mentorshipId: m.mentorshipId,
      scheduledAt: soon(),
      objective: 'SECRET-OBJECTIVE',
    });
    const sessions = await listSessions(a.id);
    expect(sessions.length).toBe(1);
    const keys = Object.keys(sessions[0]!);
    expect(keys).not.toContain('objective');
    expect(keys).not.toContain('notes');

    const users = await listUsers(a.id);
    for (const u of users) {
      const ks = Object.keys(u);
      expect(ks).not.toContain('contactEmail');
      expect(ks).not.toContain('contact_email');
      expect(ks).not.toContain('contactPhone');
    }
  });

  it('4. ContactInfo stays isolated across all admin views', async () => {
    const a = await fresh('a4');
    const contact = `secret-contact-${rand()}@a.com`;
    await activeMentorship(a.id, { mentorContact: contact });
    const blob = JSON.stringify([
      await getOverview(a.id),
      await listUsers(a.id),
      await listMentors(a.id),
      await listMentorships(a.id),
      await listSessions(a.id),
    ]);
    expect(blob).not.toContain(contact);
    expect(blob.toLowerCase()).not.toContain('contact_email');
  });

  it('5. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS c FROM tenant_user');
    expect(raw.rows[0]?.c).toBe(0);
    await expect(
      appPool().query('SELECT count(*)::int AS c FROM mentorship WHERE status = $1', ['active']),
    ).resolves.toMatchObject({ rows: [{ c: 0 }] });
  });

  it('6. operational data reflects the underlying tables', async () => {
    const a = await fresh('a6');
    await activeMentorship(a.id);
    await activeMentorship(a.id);
    // A full mentor (capacity 1) → a second mentee request is waitlisted.
    const mentorId = await setupMentor(a.id, `Full${rand()}`);
    await withTenant(a.id, (db) =>
      db.query('UPDATE profile SET mentor_capacity = 1 WHERE tenant_user_id = $1', [mentorId]),
    );
    const u1 = await createUser(a.id, `q1${rand()}`);
    const u2 = await createUser(a.id, `q2${rand()}`);
    const r1 = await requestMentorship(a.id, u1, { mentorId });
    await acceptRequest(a.id, mentorId, r1.id); // fills the slot → 3 active mentorships
    const r2 = await requestMentorship(a.id, u2, { mentorId });
    expect(r2.status).toBe('waitlisted');

    const ov = await getOverview(a.id);
    expect(ov.mentorships.active).toBe(3);
    expect((await listMentorships(a.id)).length).toBe(3);
    expect(ov.capacity.waitlisted).toBe(1);
  });

  it('7. an admin action generates an audit event', async () => {
    const a = await fresh('a7');
    const admin = await createUser(a.id, 'AdminUser', { role: 'admin' });
    const member = await createUser(a.id, 'MemberUser');
    await setUserStatus(a.id, admin, member, 'suspended');

    const status = await withTenant(a.id, (db) =>
      db.query<{ status: string }>('SELECT status FROM tenant_user WHERE id = $1', [member]),
    );
    expect(status.rows[0]?.status).toBe('suspended');

    const events = await withTenant(a.id, (db) =>
      db.query("SELECT 1 FROM audit_event WHERE action = 'admin.user_status_changed' AND target_id = $1", [
        member,
      ]),
    );
    expect(events.rowCount).toBe(1);
  });

  it('8. empty states and permissions work without crossing tenants', async () => {
    const empty = await fresh('a8');
    await createUser(empty.id, 'OnlyAdmin', { role: 'admin' });
    const ov = await getOverview(empty.id);
    expect(ov.mentorships.active).toBe(0);
    expect(ov.sessions.total).toBe(0);
    expect(ov.capacity.waitlisted).toBe(0);
    expect(ov.participationRate).toBe(0);
    expect(await listMentorships(empty.id)).toEqual([]);
    expect(await listMentors(empty.id)).toEqual([]);

    // Permissions: admin roles pass, a plain member is rejected.
    expect(() => requireRole({ role: 'member' }, ADMIN_ROLES)).toThrow();
    expect(() => requireRole({ role: 'admin' }, ADMIN_ROLES)).not.toThrow();
  });

  it('admin action refuses self status change', async () => {
    const a = shared;
    const admin = await createUser(a.id, 'SelfAdmin', { role: 'admin' });
    let threw = false;
    try {
      await setUserStatus(a.id, admin, admin, 'suspended');
    } catch (err) {
      threw = true;
      expect(isAppError(err)).toBe(true);
    }
    expect(threw).toBe(true);
  });
});
