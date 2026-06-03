import { describe, it, expect, afterAll } from 'vitest';
import { provisionRealTenant, verifyLogin } from '../provisioningService.js';
import { resetPassword } from '../../auth/authService.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { closePools } from '../../tenancy/pool.js';
import { resolveActiveTenant } from '../../tenancy/admin.js';
import { getOverview } from '../../admin/adminService.js';
import { searchMentors } from '../../search/mentorSearch.js';
import type { EmailProvider, OutgoingEmail } from '../../email/provider.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL && process.env.AUTH_SECRET);
const rand = () => Math.random().toString(36).slice(2, 7);

describe.skipIf(!hasDb)('Real (production) tenant provisioning (integration)', () => {
  afterAll(async () => {
    await closePools();
  });

  it('provisions an empty, real tenant with one admin and a working set-password flow', async () => {
    const slug = `acme${rand()}`;
    const adminEmail = `ana.${rand()}@acme.test`;
    const sentEmails: OutgoingEmail[] = [];
    const emailProvider: EmailProvider = {
      name: 'fake',
      async send(e) {
        sentEmails.push(e);
        return { ok: true, providerMessageId: 'fake-1' };
      },
    };
    const r = await provisionRealTenant(
      { slug, name: 'Acme Inc', adminEmail, adminName: 'Ana Admin' },
      emailProvider,
    );

    expect(r.alreadyExisted).toBe(false);
    expect(r.admin.role).toBe('admin');
    expect(r.setPasswordToken.length).toBeGreaterThan(0);

    // The set-password link is emailed synchronously at provisioning time.
    expect(r.emailSent).toBe(true);
    expect(r.emailProvider).toBe('fake');
    expect(r.setPasswordUrlProd).toContain('/set-password?token=');
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toMatchObject({ to: adminEmail, templateKey: 'admin.set_password' });
    expect(sentEmails[0]!.body).toContain('/set-password?token=');

    const host = `${slug}.localhost`;

    // Tenant resolves by host (no dev intervention needed afterwards).
    const res = await resolveActiveTenant(host);
    expect(res.kind).toBe('TENANT');

    // No shared/known password: a login attempt fails until the admin sets one.
    await expect(verifyLogin(host, adminEmail, 'not-the-password')).rejects.toThrow();

    // The admin sets their first password via the one-time token, then logs in.
    const newPassword = `Str0ng-${rand()}-pass`;
    await resetPassword({ host, token: r.setPasswordToken, newPassword });
    const auth = await verifyLogin(host, adminEmail, newPassword);
    expect(auth.role).toBe('admin');

    // No demo data whatsoever (the anti-demo invariant).
    const ov = await getOverview(r.tenant.id);
    expect(ov.mentors.available).toBe(0);
    expect(ov.mentorships.active).toBe(0);
    expect(ov.sessions.total).toBe(0);

    const search = await searchMentors(r.tenant.id, {});
    expect(search.items.length).toBe(0);

    const counts = await withTenant(r.tenant.id, (db) =>
      db.query<{ users: number; participants: number }>(
        `SELECT
           (SELECT count(*)::int FROM tenant_user) AS users,
           (SELECT count(*)::int FROM program_participant) AS participants`,
      ),
    );
    expect(counts.rows[0]!.users).toBe(1); // exactly the admin
    expect(counts.rows[0]!.participants).toBe(0);

    // Branding explicitly configured (not relying on hidden defaults).
    const settings = await withTenant(r.tenant.id, (db) =>
      db.query<{ display_name: string }>('SELECT display_name FROM tenant_settings LIMIT 1'),
    );
    expect(settings.rows[0]?.display_name).toBe('Acme Inc');
  });

  it('is idempotent on slug (re-run does not duplicate)', async () => {
    const slug = `acme${rand()}`;
    const adminEmail = `a.${rand()}@acme.test`;
    await provisionRealTenant({ slug, name: 'Acme Inc', adminEmail });
    const again = await provisionRealTenant({ slug, name: 'Acme Inc', adminEmail });
    expect(again.alreadyExisted).toBe(true);
  });

  it('rejects reserved slugs and invalid admin emails', async () => {
    await expect(
      provisionRealTenant({ slug: 'admin', name: 'X', adminEmail: 'a@b.co' }),
    ).rejects.toThrow();
    await expect(
      provisionRealTenant({ slug: `acme${rand()}`, name: 'X', adminEmail: 'not-an-email' }),
    ).rejects.toThrow();
  });

  it('keeps real tenants isolated (A cannot see B)', async () => {
    const a = `acme${rand()}`;
    const b = `acme${rand()}`;
    const ra = await provisionRealTenant({ slug: a, name: 'A Inc', adminEmail: `admin@${a}.test` });
    const rb = await provisionRealTenant({ slug: b, name: 'B Inc', adminEmail: `admin@${b}.test` });

    // B's tenant context cannot see A's admin user.
    const cross = await withTenant(rb.tenant.id, (db) =>
      db.query<{ c: number }>('SELECT count(*)::int AS c FROM tenant_user WHERE email = $1', [
        ra.admin.email,
      ]),
    );
    expect(cross.rows[0]!.c).toBe(0);
    expect(ra.tenant.id).not.toBe(rb.tenant.id);
  });
});
