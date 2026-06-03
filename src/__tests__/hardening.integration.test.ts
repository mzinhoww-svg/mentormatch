import { describe, it, expect, afterAll } from 'vitest';
import { createTenant } from '../tenancy/admin.js';
import { withTenant } from '../tenancy/withTenant.js';
import { ownerPool, closePools } from '../tenancy/pool.js';
import { emitNotification, setPreference } from '../notifications/notificationService.js';
import { processTenantEmails } from '../email/emailService.js';
import { listActiveTenantIds } from '../email/cron.js';
import type { EmailProvider, OutgoingEmail, SendResult } from '../email/provider.js';
import { provisionDemoTenant, verifyLogin } from '../provisioning/provisioningService.js';
import { getOverview } from '../admin/adminService.js';
import { searchMentors } from '../search/mentorSearch.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL && process.env.AUTH_SECRET);
const rand = () => Math.random().toString(36).slice(2, 7);

class Capture implements EmailProvider {
  readonly name = 'capture';
  sent: OutgoingEmail[] = [];
  async send(e: OutgoingEmail): Promise<SendResult> {
    this.sent.push(e);
    return { ok: true };
  }
}

async function userWithEmailPref(tenantId: string): Promise<{ id: string; email: string }> {
  const email = `u-${rand()}@hard.test`;
  const id = await withTenant(tenantId, async (db) => {
    const u = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, email, normalized_email, display_name, role, status)
       VALUES ($1,$2,$3,'U','member','active') RETURNING id`,
      [tenantId, email, email],
    );
    const uid = u.rows[0]!.id;
    await db.query(`INSERT INTO consent_record (tenant_id, tenant_user_id, terms_version) VALUES ($1,$2,'2026-06-01')`, [tenantId, uid]);
    return uid;
  });
  await setPreference(tenantId, id, 'mentorship.requested', { email: true });
  await emitNotification(tenantId, { type: 'mentorship.requested', targetUserId: id, originEvent: 'mentorship.requested' });
  return { id, email };
}

const fresh = (l: string) => createTenant({ slug: `hard${l}${rand()}`, name: `H ${l}` });

describe.skipIf(!hasDb)('Production hardening (integration)', () => {
  afterAll(async () => {
    await closePools();
  });

  it('processes pending emails per tenant without crossing tenants', async () => {
    const a = await fresh('a');
    const b = await fresh('b');
    const ua = await userWithEmailPref(a.id);
    const ub = await userWithEmailPref(b.id);

    const capA = new Capture();
    const capB = new Capture();
    expect(await processTenantEmails(a.id, capA)).toMatchObject({ queued: 1, sent: 1, failed: 0 });
    expect(await processTenantEmails(b.id, capB)).toMatchObject({ queued: 1, sent: 1, failed: 0 });

    expect(capA.sent.map((e) => e.to)).toEqual([ua.email]);
    expect(capB.sent.map((e) => e.to)).toEqual([ub.email]);

    // B's tenant context cannot see A's email_message.
    const cross = await withTenant(b.id, (db) =>
      db.query<{ c: number }>('SELECT count(*)::int AS c FROM email_message WHERE recipient = $1', [ua.email]),
    );
    expect(cross.rows[0]!.c).toBe(0);

    const ids = await listActiveTenantIds();
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
  });

  it('has the worker hot-path index (perf hardening)', async () => {
    const res = await ownerPool().query<{ n: number }>(
      "SELECT count(*)::int AS n FROM pg_indexes WHERE indexname IN ('idx_notification_email_pending','idx_request_expiry')",
    );
    expect(res.rows[0]!.n).toBe(2);
  });

  it('smoke: a provisioned tenant serves real data end to end, isolated', async () => {
    const a = await provisionDemoTenant({ slug: `hsmoke${rand()}` });
    const b = await provisionDemoTenant({ slug: `hsmoke${rand()}` });

    // Login works (real auth).
    expect((await verifyLogin(a.host, a.admin.email, a.password)).role).toBe('admin');

    // Admin metrics are real and non-zero.
    const ov = await getOverview(a.tenant.id);
    expect(ov.users.active).toBeGreaterThanOrEqual(8);
    expect(ov.mentorships.active).toBe(1);

    // Directory non-empty.
    expect((await searchMentors(a.tenant.id, {})).items.length).toBeGreaterThanOrEqual(3);

    // Isolation: B never sees A's seeded users.
    const cross = await withTenant(b.tenant.id, (db) =>
      db.query<{ c: number }>('SELECT count(*)::int AS c FROM tenant_user WHERE email LIKE $1', [`%@${a.tenant.slug}.demo`]),
    );
    expect(cross.rows[0]!.c).toBe(0);
  });
});
