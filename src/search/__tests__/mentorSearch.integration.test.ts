import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import { searchMentors } from '../mentorSearch.js';
import {
  upsertProfile,
  activateProfile,
  setMentorAvailable,
  setMentorPaused,
  getProfileView,
} from '../../profile/profileService.js';
import { createSkill, addUserSkill } from '../../profile/skillService.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);

interface MentorSpec {
  name: string;
  title?: string;
  area?: string;
  seniority?: string;
  available?: boolean;
  paused?: boolean;
  active?: boolean; // default true
  offered?: string[];
  sought?: string[];
  contactEmail?: string;
  avatar?: string;
}

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

async function setupMentor(tenantId: string, spec: MentorSpec): Promise<string> {
  const id = await createUser(tenantId, spec.name, spec.contactEmail);
  await upsertProfile(tenantId, id, { title: spec.title, area: spec.area, seniority: spec.seniority, avatarUrl: spec.avatar ?? null });
  if (spec.active !== false) await activateProfile(tenantId, id);
  if (spec.available) await setMentorAvailable(tenantId, id, true);
  if (spec.paused) await setMentorPaused(tenantId, id, true);
  for (const name of spec.offered ?? []) {
    const sk = await createSkill(tenantId, { name });
    await addUserSkill(tenantId, id, { skillId: sk.id, relation: 'offered' });
  }
  for (const name of spec.sought ?? []) {
    const sk = await createSkill(tenantId, { name });
    await addUserSkill(tenantId, id, { skillId: sk.id, relation: 'sought' });
  }
  return id;
}

describe.skipIf(!hasDb)('Mentor search (integration)', () => {
  let a: TenantRecord;
  let b: TenantRecord;
  const ids = {} as {
    alice: string;
    bob: string;
    zoe: string;
    carolPaused: string;
    daveInactive: string;
    eveB: string;
  };
  const aliceContact = `alice-contact-${rand()}@a.com`;

  beforeAll(async () => {
    a = await createTenant({ slug: `srcha${rand()}`, name: 'Search A' });
    b = await createTenant({ slug: `srchb${rand()}`, name: 'Search B' });

    ids.alice = await setupMentor(a.id, {
      name: 'Alice', title: 'Engineer', area: 'Frontend', seniority: 'senior',
      available: true, offered: ['React', 'TypeScript'], sought: ['Leadership'],
      contactEmail: aliceContact,
    });
    ids.bob = await setupMentor(a.id, {
      name: 'Bob', title: 'Manager', area: 'Backend', seniority: 'mid',
      available: true, offered: ['Go'],
    });
    ids.zoe = await setupMentor(a.id, {
      name: 'Zoe', title: 'Engineer', area: 'Data', seniority: 'senior',
      available: true, offered: ['Python'],
    });
    ids.carolPaused = await setupMentor(a.id, {
      name: 'Carol', title: 'Engineer', area: 'Frontend', available: true, paused: true, offered: ['React'],
    });
    ids.daveInactive = await setupMentor(a.id, {
      name: 'Dave', title: 'Engineer', area: 'Frontend', available: true, active: false, offered: ['React'],
    });
    ids.eveB = await setupMentor(b.id, {
      name: 'Eve', title: 'Engineer', area: 'Frontend', available: true, offered: ['React'],
    });
  });

  afterAll(async () => {
    await closePools();
  });

  const idsIn = (res: { items: { tenantUserId: string }[] }) => res.items.map((i) => i.tenantUserId);

  it('1. tenant A does not see tenant B mentors', async () => {
    const inA = idsIn(await searchMentors(a.id, { limit: 100 }));
    expect(inA).toContain(ids.alice);
    expect(inA).not.toContain(ids.eveB);

    const inB = idsIn(await searchMentors(b.id, { limit: 100 }));
    expect(inB).toContain(ids.eveB);
    expect(inB).not.toContain(ids.alice);
  });

  it('2. skill filter works', async () => {
    const react = idsIn(await searchMentors(a.id, { skill: 'React', limit: 100 }));
    expect(react).toContain(ids.alice);
    expect(react).not.toContain(ids.bob); // Bob offers Go, not React
  });

  it('3. title (cargo) and area filters work', async () => {
    const managers = idsIn(await searchMentors(a.id, { title: 'Manager', limit: 100 }));
    expect(managers).toEqual([ids.bob]);

    const backend = idsIn(await searchMentors(a.id, { area: 'Backend', limit: 100 }));
    expect(backend).toEqual([ids.bob]);
  });

  it('4. paused and inactive mentors are not listed as available', async () => {
    const all = idsIn(await searchMentors(a.id, { limit: 100 }));
    expect(all).not.toContain(ids.carolPaused); // paused -> hidden
    expect(all).not.toContain(ids.daveInactive); // inactive profile -> hidden
  });

  it('5. the same TenantUser is a mentor here and a mentee in profile context', async () => {
    const mentors = idsIn(await searchMentors(a.id, { limit: 100 }));
    expect(mentors).toContain(ids.alice); // mentor context

    const view = await getProfileView(a.id, ids.alice);
    expect(view.roles.isMentor).toBe(true);
    expect(view.roles.isMentee).toBe(true); // mentee context (seeks Leadership)
  });

  it('6. a search without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS total FROM profile');
    expect(raw.rows[0]?.total).toBe(0);
  });

  it('7. ContactInfo is never exposed by search', async () => {
    const res = await searchMentors(a.id, { limit: 100 });
    const alice = res.items.find((i) => i.tenantUserId === ids.alice)!;
    expect(alice).toBeDefined();
    expect(JSON.stringify(res)).not.toContain(aliceContact);
    expect(alice).not.toHaveProperty('contactEmail');
  });

  it('8. pagination/ordering works without crossing tenants', async () => {
    // A has 3 available active mentors: Alice, Bob, Zoe (Carol paused, Dave inactive).
    const page1 = await searchMentors(a.id, { limit: 2, offset: 0 });
    expect(page1.total).toBe(3); // counts A only, not Eve in B
    expect(page1.items.map((i) => i.displayName)).toEqual(['Alice', 'Bob']);

    const page2 = await searchMentors(a.id, { limit: 2, offset: 2 });
    expect(page2.items.map((i) => i.displayName)).toEqual(['Zoe']);
  });

  it('9. projects the mentor avatar (null when unset)', async () => {
    const t = await createTenant({ slug: `mav${rand()}`, name: 'Avatar Co' });
    await setupMentor(t.id, { name: 'Foto', available: true, avatar: 'https://blob/x.png' });
    await setupMentor(t.id, { name: 'SemFoto', available: true });
    const res = await searchMentors(t.id, {});
    const foto = res.items.find((i) => i.displayName === 'Foto');
    const sem = res.items.find((i) => i.displayName === 'SemFoto');
    expect(foto?.avatarUrl).toBe('https://blob/x.png');
    expect(sem?.avatarUrl).toBeNull();
  });
});
