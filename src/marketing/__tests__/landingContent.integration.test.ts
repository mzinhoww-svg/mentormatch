import { describe, it, expect, afterAll } from 'vitest';
import { createTenant } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { closePools } from '../../tenancy/pool.js';
import { updateSettings, getPublicLanding, getSettings } from '../../settings/settingsService.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);

async function createAdmin(tenantId: string): Promise<string> {
  const email = `admin-${rand()}@x.com`;
  return withTenant(tenantId, async (db) => {
    const u = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, email, normalized_email, display_name, role, status)
       VALUES ($1, $2, $3, 'Admin', 'admin', 'active') RETURNING id`,
      [tenantId, email, email],
    );
    return u.rows[0]!.id;
  });
}

describe.skipIf(!hasDb)('Tenant landing content (integration)', () => {
  afterAll(async () => {
    await closePools();
  });

  it('persists sanitized landing copy and reads it back; empty by default', async () => {
    const t = await createTenant({ slug: `lc${rand()}`, name: 'Landing Co' });
    const admin = await createAdmin(t.id);

    // Default: empty landing content.
    expect(await getPublicLanding(t.id)).toMatchObject({ niche: null, testimonials: [] });

    await updateSettings(t.id, admin, {
      landing: {
        niche: '  Liderança técnica ',
        transformation: 'você vira referência',
        methodology: '',
        audience: 'novos líderes',
        testimonials: [
          { quote: 'Top', author: 'Ana', role: 'PM' },
          { quote: '   ' }, // dropped
        ],
      },
    });

    const landing = await getPublicLanding(t.id);
    expect(landing.niche).toBe('Liderança técnica'); // trimmed
    expect(landing.methodology).toBeNull(); // blank → null
    expect(landing.testimonials).toHaveLength(1);
    expect(landing.testimonials[0]).toMatchObject({ quote: 'Top', author: 'Ana', role: 'PM' });

    // Branding/other settings remain intact alongside landing.
    expect((await getSettings(t.id)).branding).toBeTruthy();
  });

  it("does not leak one tenant's landing into another", async () => {
    const a = await createTenant({ slug: `lca${rand()}`, name: 'A' });
    const b = await createTenant({ slug: `lcb${rand()}`, name: 'B' });
    const adminA = await createAdmin(a.id);
    await updateSettings(a.id, adminA, { landing: { niche: 'A-only-niche' } });

    expect((await getPublicLanding(a.id)).niche).toBe('A-only-niche');
    expect((await getPublicLanding(b.id)).niche).toBeNull();
  });
});
