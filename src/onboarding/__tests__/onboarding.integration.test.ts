import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { closePools } from '../../tenancy/pool.js';
import { completeOnboarding, getOnboardingStatus } from '../onboardingService.js';
import { getProfileView } from '../../profile/profileService.js';

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

describe.skipIf(!hasDb)('Onboarding (integration)', () => {
  let t: TenantRecord;

  beforeAll(async () => {
    t = await createTenant({ slug: `onb${rand()}`, name: 'Onboarding Co' });
  });
  afterAll(async () => {
    await closePools();
  });

  it('starts not-onboarded and flips after completion', async () => {
    const u = await createUser(t.id, { email: `a-${rand()}@x.com`, withConsent: true });
    expect((await getOnboardingStatus(t.id, u)).onboarded).toBe(false);

    await completeOnboarding(t.id, u, {
      intention: 'mentor',
      displayName: 'Ana Souza',
      title: 'Product Manager',
      bio: 'Olá!',
      languages: ['Português', 'português', 'Inglês'],
      contactWhatsapp: '+55 11 90000-0000',
      whatsappPublic: true,
      skills: [{ name: `Liderança-${rand()}`, level: 'avancado' }],
    });

    expect((await getOnboardingStatus(t.id, u)).onboarded).toBe(true);

    const view = await getProfileView(t.id, u);
    expect(view.profile?.onboardedAt).toBeTruthy();
    expect(view.profile?.status).toBe('active'); // consent present → activated
    expect(view.profile?.mentorAvailable).toBe(true);
    expect(view.profile?.languages).toEqual(['Português', 'Inglês']); // deduped
    expect(view.roles.isMentor).toBe(true);
    expect(view.skills.offered).toHaveLength(1);
    expect(view.skills.offered[0]?.level).toBe('avancado');
    expect(view.contact.contactWhatsapp).toBe('+55 11 90000-0000');
    expect(view.contact.contactPublic).toBe(true);
  });

  it('mentee intention seeks skills and does not offer mentoring', async () => {
    const u = await createUser(t.id, { email: `b-${rand()}@x.com`, withConsent: true });
    await completeOnboarding(t.id, u, {
      intention: 'mentee',
      skills: [{ name: `Carreira-${rand()}` }],
    });

    const view = await getProfileView(t.id, u);
    expect(view.profile?.mentorAvailable).toBe(false);
    expect(view.skills.sought).toHaveLength(1);
    expect(view.skills.offered).toHaveLength(0);
    expect(view.roles.isMentee).toBe(true);
    expect(view.roles.isMentor).toBe(false);
  });

  it('without consent it still marks onboarded but leaves the profile inactive', async () => {
    const u = await createUser(t.id, { email: `c-${rand()}@x.com`, withConsent: false });
    await completeOnboarding(t.id, u, { intention: 'mentee', skills: [] });

    const view = await getProfileView(t.id, u);
    expect((await getOnboardingStatus(t.id, u)).onboarded).toBe(true);
    expect(view.profile?.onboardedAt).toBeTruthy();
    expect(view.profile?.status).toBe('inactive');
  });

  it('rejects an invalid intention', async () => {
    const u = await createUser(t.id, { email: `d-${rand()}@x.com`, withConsent: true });
    await expect(
      // @ts-expect-error deliberately invalid
      completeOnboarding(t.id, u, { intention: 'boss', skills: [] }),
    ).rejects.toThrow();
  });
});
