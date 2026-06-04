import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { inviteMember } from '../memberInvite.js';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { closePools } from '../../tenancy/pool.js';
import { login, resetPassword } from '../../auth/authService.js';
import type { EmailProvider, OutgoingEmail } from '../../email/provider.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);

/** Captures every email instead of sending — lets us assert the envelope and
 *  pull the set-password link out of the body. */
function captureProvider(): { provider: EmailProvider; sent: OutgoingEmail[] } {
  const sent: OutgoingEmail[] = [];
  return {
    sent,
    provider: {
      name: 'capture',
      async send(e) {
        sent.push(e);
        return { ok: true, providerMessageId: `cap-${sent.length}` };
      },
    },
  };
}

describe.skipIf(!hasDb)('inviteMember (integration)', () => {
  let tenant: TenantRecord;
  let host: string;

  beforeAll(async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? 'integration-test-secret';
    tenant = await createTenant({ slug: `invite${rand()}`, name: 'Invite Co' });
    host = `${tenant.slug}.mentormatch.app`;
  });

  afterAll(async () => {
    await closePools();
  });

  it('creates an active account, emails a set-password link, and lets them set a password', async () => {
    const { provider, sent } = captureProvider();
    const email = `member-${rand()}@example.com`;
    const r = await inviteMember(
      { host, tenantName: 'Invite Co', email, displayName: 'Novo Membro', role: 'member' },
      provider,
    );

    expect(r.email).toBe(email);
    expect(r.role).toBe('member');
    expect(r.emailSent).toBe(true);
    expect(r.setPasswordUrl).toContain(`https://${host}/set-password?token=`);
    // The same link is what the email carries.
    expect(sent[0]!.body).toContain(r.setPasswordUrl);

    // The account exists, is active, and carries the requested role.
    const found = await withTenant(tenant.id, (db) =>
      db.query<{ role: string; status: string }>(
        'SELECT role, status FROM tenant_user WHERE id = $1',
        [r.userId],
      ),
    );
    expect(found.rows[0]).toMatchObject({ role: 'member', status: 'active' });

    // The emailed token actually works end-to-end: set a password, then log in.
    const token = new URL(r.setPasswordUrl).searchParams.get('token')!;
    await resetPassword({ host, token, newPassword: 'brand-new-pw-123' });
    const session = await login({ host, email, password: 'brand-new-pw-123' });
    expect(session.tenantId).toBe(tenant.id);
  });

  it('defaults an unknown role to member and honors program_manager/admin', async () => {
    const { provider } = captureProvider();
    const a = await inviteMember(
      { host, tenantName: 'Invite Co', email: `pm-${rand()}@example.com`, role: 'program_manager' },
      provider,
    );
    expect(a.role).toBe('program_manager');

    const b = await inviteMember(
      { host, tenantName: 'Invite Co', email: `weird-${rand()}@example.com`, role: 'superuser' },
      provider,
    );
    expect(b.role).toBe('member');
  });

  it('rejects a duplicate email with email_taken', async () => {
    const { provider } = captureProvider();
    const email = `dupe-${rand()}@example.com`;
    await inviteMember({ host, tenantName: 'Invite Co', email }, provider);
    await expect(inviteMember({ host, tenantName: 'Invite Co', email }, provider)).rejects.toThrow(/email_taken/);
  });
});
