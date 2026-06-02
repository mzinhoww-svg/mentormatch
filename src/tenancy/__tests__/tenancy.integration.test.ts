import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { withTenant } from '../withTenant.js';
import { appPool, closePools } from '../pool.js';
import { createTenant, findTenantBySlug, resolveActiveTenant, type TenantRecord } from '../admin.js';

// Integration tests require a real Postgres (DATABASE_URL = mm_app, DIRECT_URL = mm_owner).
// They self-skip when no database is configured so `npm test` still passes elsewhere.
const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);

const rand = () => Math.random().toString(36).slice(2, 8);

async function insertUser(
  tenantId: string,
  email: string,
  contact?: { email?: string; phone?: string },
): Promise<string> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, email, normalized_email, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenantId, email, email.trim().toLowerCase(), contact?.email ?? null, contact?.phone ?? null],
    );
    return res.rows[0]!.id;
  });
}

describe.skipIf(!hasDb)('Tenancy — RLS isolation (integration)', () => {
  let a: TenantRecord;
  let b: TenantRecord;
  const aSlug = `tena${rand()}`;
  const bSlug = `tenb${rand()}`;

  beforeAll(async () => {
    a = await createTenant({ slug: aSlug, name: 'Tenant A' });
    b = await createTenant({ slug: bSlug, name: 'Tenant B' });
    await insertUser(a.id, 'alice@a.com', { email: 'contact@a.com', phone: '+5511999990000' });
    await insertUser(b.id, 'bob@b.com');
  });

  afterAll(async () => {
    await closePools();
  });

  it('1. Tenant A cannot access Tenant B (and vice-versa)', async () => {
    const aRows = await withTenant(a.id, (db) =>
      db.query<{ tenant_id: string }>('SELECT tenant_id FROM tenant_user'),
    );
    expect(aRows.rowCount).toBeGreaterThan(0);
    expect(aRows.rows.every((r) => r.tenant_id === a.id)).toBe(true);

    // B explicitly queries A's id -> RLS filters first -> zero rows.
    const bSeesA = await withTenant(b.id, (db) =>
      db.query('SELECT id FROM tenant_user WHERE tenant_id = $1', [a.id]),
    );
    expect(bSeesA.rowCount).toBe(0);
  });

  it('2. A query without tenant context fails (default-deny)', async () => {
    // Raw read with no withTenant() -> no app.tenant_id -> 0 rows.
    const raw = await appPool().query('SELECT * FROM tenant_user');
    expect(raw.rowCount).toBe(0);

    // Raw insert with no context -> WITH CHECK against NULL tenant -> rejected.
    await expect(
      appPool().query(
        "INSERT INTO tenant_user (tenant_id, email, normalized_email) VALUES ($1, 'x@x.com', 'x@x.com')",
        [a.id],
      ),
    ).rejects.toThrow();

    // Entering tenant scope without a valid uuid is rejected by the guard.
    await expect(withTenant('not-a-uuid', async () => undefined)).rejects.toThrow(/valid tenantId/);
  });

  it('3. The same email works across two tenants; duplicate within one is rejected', async () => {
    const email = `dup-${rand()}@example.com`;
    const idA = await insertUser(a.id, email);
    const idB = await insertUser(b.id, email);
    expect(idA).not.toBe(idB);

    // Duplicate within tenant A violates unique(tenant_id, normalized_email).
    await expect(insertUser(a.id, email)).rejects.toThrow();
  });

  it('4. resolveActiveTenant resolves a provisioned host, rejects others', async () => {
    expect(await findTenantBySlug(aSlug)).toMatchObject({ id: a.id, slug: aSlug });

    const ok = await resolveActiveTenant(`${aSlug}.mentormatch.app`);
    expect(ok.kind).toBe('TENANT');
    if (ok.kind === 'TENANT') expect(ok.tenant.id).toBe(a.id);

    const ghost = await resolveActiveTenant('ghosttenant.mentormatch.app');
    expect(ghost).toMatchObject({ kind: 'NO_TENANT', reason: 'slug_not_provisioned' });

    const inst = await resolveActiveTenant('mentormatch.app');
    expect(inst.kind).toBe('NO_TENANT');
  });

  it('5. ContactInfo stays isolated across tenants', async () => {
    // B cannot see A's contact info at all.
    const leak = await withTenant(b.id, (db) =>
      db.query('SELECT contact_email, contact_phone FROM tenant_user WHERE contact_email = $1', [
        'contact@a.com',
      ]),
    );
    expect(leak.rowCount).toBe(0);

    // Within A, its own contact info is visible.
    const own = await withTenant(a.id, (db) =>
      db.query('SELECT contact_email FROM tenant_user WHERE contact_email = $1', ['contact@a.com']),
    );
    expect(own.rowCount).toBe(1);
  });
});
