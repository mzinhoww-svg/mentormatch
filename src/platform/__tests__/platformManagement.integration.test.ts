import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  createPlatformAdmin,
  addPlatformAdmin,
  listPlatformAdmins,
  setPlatformAdminStatus,
} from '../platformAuthService.js';
import { setTenantAdmin, resendSetPassword } from '../tenantAdmin.js';
import { recordPlatformEvent } from '../audit.js';
import { getTenantUsage } from '../usage.js';
import { inviteMember } from '../../admin/memberInvite.js';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { closePools } from '../../tenancy/pool.js';
import type { EmailProvider, OutgoingEmail } from '../../email/provider.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);
const SAVED = process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN;

function capture(): { provider: EmailProvider; sent: OutgoingEmail[] } {
  const sent: OutgoingEmail[] = [];
  return {
    sent,
    provider: {
      name: 'capture',
      async send(e) {
        sent.push(e);
        return { ok: true, providerMessageId: `c-${sent.length}` };
      },
    },
  };
}

describe.skipIf(!hasDb)('Platform management (integration)', () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'integration-test-secret';
  });
  beforeEach(() => {
    process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN = 'boot-secret';
  });
  afterEach(() => {
    if (SAVED === undefined) delete process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN;
    else process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN = SAVED;
  });
  afterAll(async () => {
    await closePools();
  });

  describe('platform admin management', () => {
    it('adds + lists an admin, and rejects a duplicate email', async () => {
      const email = `pa-${rand()}@x.com`;
      const a = await addPlatformAdmin({ email, password: 'pw12345678', displayName: 'Op' });
      expect(a.status).toBe('active');
      expect((await listPlatformAdmins()).some((r) => r.id === a.id)).toBe(true);
      await expect(addPlatformAdmin({ email, password: 'pw12345678' })).rejects.toThrow(/email_taken/);
    });

    it('suspends/reactivates another admin but never yourself', async () => {
      const a = await addPlatformAdmin({ email: `pa-${rand()}@x.com`, password: 'pw12345678' });
      const b = await addPlatformAdmin({ email: `pa-${rand()}@x.com`, password: 'pw12345678' });

      // Can't change your own status (lockout guard).
      await expect(setPlatformAdminStatus(a.id, 'suspended', a.id)).rejects.toThrow(/cannot_change_own_status/);

      // A can suspend and reactivate B.
      expect((await setPlatformAdminStatus(b.id, 'suspended', a.id)).status).toBe('suspended');
      expect((await setPlatformAdminStatus(b.id, 'active', a.id)).status).toBe('active');
    });
  });

  describe('tenant admin from the console', () => {
    let tenant: TenantRecord;
    beforeAll(async () => {
      tenant = await createTenant({ slug: `mgmt${rand()}`, name: 'Mgmt Co' });
    });

    it('creates a brand-new admin and emails a set-password link', async () => {
      const { provider, sent } = capture();
      const email = `newadmin-${rand()}@x.com`;
      const r = await setTenantAdmin({ tenantId: tenant.id, email, displayName: 'New Admin' }, provider);
      expect(r.created).toBe(true);
      expect(r.emailSent).toBe(true);
      expect(r.setPasswordUrl).toContain('/set-password?token=');
      expect(sent).toHaveLength(1);

      const role = await withTenant(tenant.id, (db) =>
        db.query<{ role: string }>('SELECT role FROM tenant_user WHERE id = $1', [r.userId]),
      );
      expect(role.rows[0]?.role).toBe('admin');
    });

    it('promotes an existing member to admin (no new account)', async () => {
      const { provider } = capture();
      const email = `member-${rand()}@x.com`;
      await inviteMember(
        { host: `${tenant.slug}.mentormatch.app`, tenantName: 'Mgmt Co', email, role: 'member' },
        provider,
      );
      const r = await setTenantAdmin({ tenantId: tenant.id, email }, provider);
      expect(r.created).toBe(false);
      const role = await withTenant(tenant.id, (db) =>
        db.query<{ role: string }>('SELECT role FROM tenant_user WHERE id = $1', [r.userId]),
      );
      expect(role.rows[0]?.role).toBe('admin');
    });

    it('resends a link to an existing user and 404s for an unknown email', async () => {
      const { provider, sent } = capture();
      const email = `resend-${rand()}@x.com`;
      await setTenantAdmin({ tenantId: tenant.id, email }, provider);
      sent.length = 0;

      const r = await resendSetPassword({ tenantId: tenant.id, email }, provider);
      expect(r.emailSent).toBe(true);
      expect(r.setPasswordUrl).toContain('/set-password?token=');
      expect(sent).toHaveLength(1);

      await expect(
        resendSetPassword({ tenantId: tenant.id, email: `nobody-${rand()}@x.com` }, provider),
      ).rejects.toThrow(/user_not_found/);
    });
  });

  describe('usage + audit', () => {
    it('counts tenant usage and grows with users', async () => {
      const tenant = await createTenant({ slug: `usage${rand()}`, name: 'Usage Co' });
      const before = await getTenantUsage(tenant.id);
      expect(before).toEqual({ users: 0, mentorships: 0, sessions: 0 });

      const { provider } = capture();
      await inviteMember(
        { host: `${tenant.slug}.mentormatch.app`, tenantName: 'Usage Co', email: `u-${rand()}@x.com` },
        provider,
      );
      expect((await getTenantUsage(tenant.id)).users).toBe(1);
    });

    it('persists a platform action to the tenant audit_event with actor_type=platform_admin', async () => {
      const tenant = await createTenant({ slug: `audit${rand()}`, name: 'Audit Co' });
      const admin = await createPlatformAdmin({
        token: 'boot-secret',
        email: `op-${rand()}@x.com`,
        password: 'pw12345678',
      });
      await recordPlatformEvent(tenant.id, 'platform.tenant_status_changed', {
        adminId: admin.id,
        metadata: { status: 'suspended' },
      });

      const rows = await withTenant(tenant.id, (db) =>
        db.query<{ action: string; actor_type: string; actor_id: string }>(
          'SELECT action, actor_type, actor_id FROM audit_event WHERE tenant_id = $1',
          [tenant.id],
        ),
      );
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({
        action: 'platform.tenant_status_changed',
        actor_type: 'platform_admin',
        actor_id: admin.id,
      });
    });
  });
});
