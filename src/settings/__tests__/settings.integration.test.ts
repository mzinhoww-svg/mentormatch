import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import {
  getSettings,
  updateSettings,
  setTenantLogo,
  setTenantStatus,
  getPublicBranding,
} from '../settingsService.js';
import { BRAND_DEFAULTS } from '../branding.js';
import { isAppError } from '../../observability/errors.js';

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

const fresh = (label: string) => createTenant({ slug: `set${label}${rand()}`, name: `Set ${label}` });

describe.skipIf(!hasDb)('Tenant settings & branding foundation (integration)', () => {
  let shared: TenantRecord;
  beforeAll(async () => {
    shared = await fresh('shared');
  });
  afterAll(async () => {
    await closePools();
  });

  it('1. tenant A does not see tenant B settings', async () => {
    const a = await fresh('a1');
    const b = await fresh('b1');
    const adminA = await createAdmin(a.id);
    await updateSettings(a.id, adminA, { displayName: 'Empresa A', primaryColor: '#123456' });

    expect((await getSettings(a.id)).branding.displayName).toBe('Empresa A');
    expect((await getSettings(b.id)).branding.displayName).toBeNull();
    const crossB = await withTenant(b.id, (db) =>
      db.query('SELECT id FROM tenant_settings WHERE tenant_id = $1', [a.id]),
    );
    expect(crossB.rowCount).toBe(0);
  });

  it("2. tenant A branding does not affect tenant B", async () => {
    const a = await fresh('a2');
    const b = await fresh('b2');
    const adminA = await createAdmin(a.id);
    await updateSettings(a.id, adminA, { primaryColor: '#0A0A0A', secondaryColor: '#0B0B0B' });

    expect((await getSettings(a.id)).branding.primaryColor).toBe('#0A0A0A');
    // B keeps the brand-kit default.
    expect((await getSettings(b.id)).branding.primaryColor).toBe(BRAND_DEFAULTS.primaryColor);
  });

  it('3. logo/color defaults apply when there is no customization', async () => {
    const a = await fresh('a3');
    const b = await getSettings(a.id);
    expect(b.customized).toBe(false);
    expect(b.branding.logoUrl).toBeNull();
    expect(b.branding.primaryColor).toBe(BRAND_DEFAULTS.primaryColor);
    expect(b.branding.secondaryColor).toBe(BRAND_DEFAULTS.secondaryColor);
    expect(b.status).toBe('active');
    expect(b.defaultMentorCapacity).toBe(3);
  });

  it('4. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS c FROM tenant_settings');
    expect(raw.rows[0]?.c).toBe(0);
    await expect(
      appPool().query("INSERT INTO tenant_settings (tenant_id, status) VALUES ($1, 'active')", [
        shared.id,
      ]),
    ).rejects.toThrow();
  });

  it('5. tenant status works', async () => {
    const a = await fresh('a5');
    const adminA = await createAdmin(a.id);
    expect((await getSettings(a.id)).status).toBe('active');
    await setTenantStatus(a.id, adminA, 'inactive');
    expect((await getSettings(a.id)).status).toBe('inactive');
    await setTenantStatus(a.id, adminA, 'active');
    expect((await getSettings(a.id)).status).toBe('active');
  });

  it('6. settings are tenant-scoped', async () => {
    const a = await fresh('a6');
    const b = await fresh('b6');
    const adminA = await createAdmin(a.id);
    await updateSettings(a.id, adminA, { defaultMentorCapacity: 7, locale: 'en-US' });

    const sa = await getSettings(a.id);
    const sb = await getSettings(b.id);
    expect(sa.defaultMentorCapacity).toBe(7);
    expect(sa.branding.locale).toBe('en-US');
    expect(sb.defaultMentorCapacity).toBe(3); // default, unaffected
    expect(sb.branding.locale).toBe('pt-BR');
  });

  it('7. defaults never break the white-label contract', async () => {
    const a = await fresh('a7');
    const branding = await getPublicBranding(a.id);
    // Every contract token present and valid, with no customization at all.
    for (const c of [branding.primaryColor, branding.secondaryColor, branding.inkColor, branding.paperColor]) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(branding.locale).toBe('pt-BR');
    expect(branding.programName.length).toBeGreaterThan(0);

    // Invalid input is rejected (protects the contract).
    const adminA = await createAdmin(a.id);
    let threw = false;
    try {
      await updateSettings(a.id, adminA, { primaryColor: 'orange' });
    } catch (err) {
      threw = true;
      expect(isAppError(err)).toBe(true);
    }
    expect(threw).toBe(true);
  });

  it('8. audit events are generated for relevant changes', async () => {
    const a = await fresh('a8');
    const adminA = await createAdmin(a.id);
    await updateSettings(a.id, adminA, { displayName: 'Audited Co', logoUrl: 'https://x/l.svg' });
    await setTenantStatus(a.id, adminA, 'inactive');

    const events = await withTenant(a.id, (db) =>
      db.query<{ action: string }>("SELECT DISTINCT action FROM audit_event WHERE action LIKE 'settings.%'"),
    );
    const actions = events.rows.map((r) => r.action);
    expect(actions).toContain('settings.updated');
    expect(actions).toContain('settings.status_changed');
  });

  it('9. setTenantLogo sets and clears the logo (which updateSettings cannot clear)', async () => {
    const a = await fresh('a9');
    const adminA = await createAdmin(a.id);

    const s1 = await setTenantLogo(a.id, adminA, 'https://blob/new.png');
    expect(s1.branding.logoUrl).toBe('https://blob/new.png');
    expect((await getSettings(a.id)).branding.logoUrl).toBe('https://blob/new.png');

    // updateSettings with null keeps the existing logo (COALESCE)…
    await updateSettings(a.id, adminA, { logoUrl: null });
    expect((await getSettings(a.id)).branding.logoUrl).toBe('https://blob/new.png');

    // …but setTenantLogo(null) actually clears it.
    const s2 = await setTenantLogo(a.id, adminA, null);
    expect(s2.branding.logoUrl).toBeNull();
    expect((await getSettings(a.id)).branding.logoUrl).toBeNull();
  });
});
