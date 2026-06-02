import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import {
  upsertProfile,
  getProfile,
  activateProfile,
  setMentorAvailable,
  setMentorPaused,
  getProfileView,
} from '../profileService.js';
import { createSkill, listSkills, addUserSkill } from '../skillService.js';
import { isAppError } from '../../observability/errors.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);

async function createUser(
  tenantId: string,
  opts: { email: string; withConsent?: boolean },
): Promise<string> {
  return withTenant(tenantId, async (db) => {
    const u = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, email, normalized_email, role, status)
       VALUES ($1, $2, $3, 'member', 'active') RETURNING id`,
      [tenantId, opts.email, opts.email.toLowerCase()],
    );
    const id = u.rows[0]!.id;
    if (opts.withConsent) {
      await db.query(
        `INSERT INTO consent_record (tenant_id, tenant_user_id, terms_version) VALUES ($1, $2, '2026-06-01')`,
        [tenantId, id],
      );
    }
    return id;
  });
}

describe.skipIf(!hasDb)('Profile + Skills (integration)', () => {
  let a: TenantRecord;
  let b: TenantRecord;
  let uA: string;
  let uB: string;

  beforeAll(async () => {
    a = await createTenant({ slug: `prfa${rand()}`, name: 'Profile A' });
    b = await createTenant({ slug: `prfb${rand()}`, name: 'Profile B' });
    uA = await createUser(a.id, { email: `ua-${rand()}@a.com`, withConsent: true });
    uB = await createUser(b.id, { email: `ub-${rand()}@b.com`, withConsent: true });
    await upsertProfile(a.id, uA, { bio: 'A only bio', title: 'Staff Eng', area: 'Platform', seniority: 'senior' });
    await upsertProfile(b.id, uB, { bio: 'B only bio' });
  });

  afterAll(async () => {
    await closePools();
  });

  it('1. tenant A does not read tenant B profile', async () => {
    expect(await getProfile(a.id, uA)).toMatchObject({ bio: 'A only bio' });
    // B's context cannot see A's profile (RLS).
    expect(await getProfile(b.id, uA)).toBeNull();
    const cross = await withTenant(b.id, (db) =>
      db.query("SELECT id FROM profile WHERE bio = 'A only bio'"),
    );
    expect(cross.rowCount).toBe(0);
  });

  it('2. skills of tenant A do not appear in tenant B', async () => {
    await createSkill(a.id, { name: `TypeScript-${rand()}` });
    const goName = `Golang-${rand()}`;
    await createSkill(b.id, { name: goName });
    const aSkills = (await listSkills(a.id)).map((s) => s.name);
    const bSkills = (await listSkills(b.id)).map((s) => s.name);
    expect(bSkills).toContain(goName);
    expect(aSkills).not.toContain(goName);
  });

  it('3. the same TenantUser can be both mentor and mentee', async () => {
    const offered = await createSkill(a.id, { name: `React-${rand()}` });
    const sought = await createSkill(a.id, { name: `Leadership-${rand()}` });
    await addUserSkill(a.id, uA, { skillId: offered.id, relation: 'offered' });
    await addUserSkill(a.id, uA, { skillId: sought.id, relation: 'sought' });
    await setMentorAvailable(a.id, uA, true);

    const view = await getProfileView(a.id, uA);
    expect(view.roles).toEqual({ isMentor: true, isMentee: true });
    expect(view.skills.offered.length).toBeGreaterThan(0);
    expect(view.skills.sought.length).toBeGreaterThan(0);
  });

  it('4. mentor availability can be paused', async () => {
    const u = await createUser(a.id, { email: `pause-${rand()}@a.com`, withConsent: true });
    await setMentorAvailable(a.id, u, true);
    expect((await getProfileView(a.id, u)).roles.isMentor).toBe(true);

    await setMentorPaused(a.id, u, true);
    expect((await getProfileView(a.id, u)).roles.isMentor).toBe(false);

    await setMentorPaused(a.id, u, false);
    expect((await getProfileView(a.id, u)).roles.isMentor).toBe(true);
  });

  it('5. a profile without consent cannot be activated', async () => {
    const u = await createUser(a.id, { email: `noconsent-${rand()}@a.com`, withConsent: false });
    let threw = false;
    try {
      await activateProfile(a.id, u);
    } catch (err) {
      threw = true;
      expect(isAppError(err)).toBe(true);
      if (isAppError(err)) expect(err.message).toBe('consent_required');
    }
    expect(threw).toBe(true);
    expect(await getProfile(a.id, u)).toBeNull(); // not activated

    // After recording consent, activation succeeds.
    await withTenant(a.id, (db) =>
      db.query(
        `INSERT INTO consent_record (tenant_id, tenant_user_id, terms_version) VALUES ($1, $2, '2026-06-01')`,
        [a.id, u],
      ),
    );
    const activated = await activateProfile(a.id, u);
    expect(activated.status).toBe('active');
  });

  it('6. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT * FROM profile');
    expect(raw.rowCount).toBe(0);
    await expect(
      appPool().query("INSERT INTO profile (tenant_id, tenant_user_id) VALUES ($1, $2)", [a.id, uA]),
    ).rejects.toThrow();
  });

  it('7. sensitive data stays isolated across tenants', async () => {
    // B cannot read A's profile descriptive data.
    const leak = await withTenant(b.id, (db) =>
      db.query("SELECT bio, title FROM profile WHERE title = 'Staff Eng'"),
    );
    expect(leak.rowCount).toBe(0);
  });

  it('8. an audit event is recorded when the profile changes', async () => {
    await upsertProfile(a.id, uA, { bio: 'updated bio' });
    const events = await withTenant(a.id, (db) =>
      db.query<{ action: string }>(
        "SELECT action FROM audit_event WHERE actor_id = $1 AND action LIKE 'profile.%'",
        [uA],
      ),
    );
    expect(events.rows.some((r) => r.action === 'profile.updated')).toBe(true);
  });
});
