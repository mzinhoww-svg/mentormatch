import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTenant, type TenantRecord } from '../../tenancy/admin.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { appPool, closePools } from '../../tenancy/pool.js';
import {
  listPrograms,
  getDefaultProgram,
  createProgram,
  updateProgram,
  setProgramStatus,
  addParticipant,
  listParticipants,
} from '../programService.js';
import { isAppError } from '../../observability/errors.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);

async function createUser(tenantId: string, name: string, withConsent = true): Promise<string> {
  const email = `${name.toLowerCase()}-${rand()}@x.com`;
  return withTenant(tenantId, async (db) => {
    const u = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, email, normalized_email, display_name, role, status)
       VALUES ($1, $2, $3, $4, 'member', 'active') RETURNING id`,
      [tenantId, email, email, name],
    );
    const id = u.rows[0]!.id;
    if (withConsent) {
      await db.query(
        `INSERT INTO consent_record (tenant_id, tenant_user_id, terms_version) VALUES ($1, $2, '2026-06-01')`,
        [tenantId, id],
      );
    }
    return id;
  });
}

const fresh = (label: string) => createTenant({ slug: `prg${label}${rand()}`, name: `Prog ${label}` });

async function expectAppError(p: Promise<unknown>, message: string): Promise<void> {
  try {
    await p;
    throw new Error('expected rejection');
  } catch (err) {
    expect(isAppError(err)).toBe(true);
    if (isAppError(err)) expect(err.message).toBe(message);
  }
}

describe.skipIf(!hasDb)('Program management foundation (integration)', () => {
  let admin: string;
  let shared: TenantRecord;
  beforeAll(async () => {
    shared = await fresh('shared');
    admin = await createUser(shared.id, 'Admin');
  });
  afterAll(async () => {
    await closePools();
  });

  it('1. tenant A does not see tenant B programs', async () => {
    const a = await fresh('a1');
    const b = await fresh('b1');
    const adminA = await createUser(a.id, 'AdminA');
    await createProgram(a.id, adminA, { name: 'A-only Program' });

    const aNames = (await listPrograms(a.id)).map((p) => p.name);
    expect(aNames).toContain('A-only Program');
    const bNames = (await listPrograms(b.id)).map((p) => p.name);
    expect(bNames).not.toContain('A-only Program');
  });

  it('2. a default program exists per tenant', async () => {
    const a = await fresh('a2');
    const def = await getDefaultProgram(a.id);
    expect(def.isDefault).toBe(true);
    expect(def.status).toBe('active');
    // Exactly one default.
    const defaults = (await listPrograms(a.id)).filter((p) => p.isDefault);
    expect(defaults.length).toBe(1);
  });

  it('3. admin creates and edits a program', async () => {
    const created = await createProgram(shared.id, admin, {
      name: 'Leadership',
      description: 'v1',
      capacity: 5,
    });
    expect(created.isDefault).toBe(false);
    expect(created.capacity).toBe(5);

    const edited = await updateProgram(shared.id, admin, created.id, {
      name: 'Leadership Track',
      capacity: 10,
    });
    expect(edited.name).toBe('Leadership Track');
    expect(edited.capacity).toBe(10);
  });

  it('4. program status works (and default cannot be deactivated)', async () => {
    const p = await createProgram(shared.id, admin, { name: 'Pausable' });
    await setProgramStatus(shared.id, admin, p.id, 'inactive');
    const after = (await listPrograms(shared.id)).find((x) => x.id === p.id);
    expect(after?.status).toBe('inactive');

    const def = await getDefaultProgram(shared.id);
    await expectAppError(
      setProgramStatus(shared.id, admin, def.id, 'inactive'),
      'cannot_deactivate_default',
    );
  });

  it('5. participants are tenant-scoped', async () => {
    const a = await fresh('a5');
    const b = await fresh('b5');
    const adminA = await createUser(a.id, 'AdminA5');
    const userA = await createUser(a.id, 'UserA5');
    const progA = await getDefaultProgram(a.id);
    await addParticipant(a.id, adminA, progA.id, userA, 'mentee');

    expect((await listParticipants(a.id, progA.id)).some((x) => x.tenantUserId === userA)).toBe(true);
    // B cannot see A's participant rows.
    const crossB = await withTenant(b.id, (db) =>
      db.query('SELECT id FROM program_participant WHERE tenant_user_id = $1', [userA]),
    );
    expect(crossB.rowCount).toBe(0);
  });

  it('6. a query without tenant context still fails (default-deny)', async () => {
    const raw = await appPool().query('SELECT count(*)::int AS c FROM program');
    expect(raw.rows[0]?.c).toBe(0);
    await expect(
      appPool().query(
        "INSERT INTO program (tenant_id, name, is_default) VALUES ($1, 'x', false)",
        [shared.id],
      ),
    ).rejects.toThrow();
  });

  it('7. admin actions never cross tenants', async () => {
    const a = await fresh('a7');
    const b = await fresh('b7');
    const adminB = await createUser(b.id, 'AdminB7');
    const progA = await getDefaultProgram(a.id);
    // Operating under tenant B, A's program id is invisible → not found.
    await expectAppError(
      setProgramStatus(b.id, adminB, progA.id, 'inactive'),
      'program_not_found',
    );
    await expectAppError(
      updateProgram(b.id, adminB, progA.id, { name: 'hijack' }),
      'program_not_found',
    );
  });

  it('8. program reflects the underlying tables (capacity, consent, status rules)', async () => {
    const a = await fresh('a8');
    const adminA = await createUser(a.id, 'AdminA8');
    const prog = await createProgram(a.id, adminA, { name: 'Capped', capacity: 1 });
    const u1 = await createUser(a.id, 'P1');
    const u2 = await createUser(a.id, 'P2');
    const noConsent = await createUser(a.id, 'NoConsent', false);

    await addParticipant(a.id, adminA, prog.id, u1, 'mentee');
    // Capacity 1 reached → second participant refused.
    await expectAppError(addParticipant(a.id, adminA, prog.id, u2, 'mentee'), 'program_full');
    // Consent is mandatory to participate.
    const open = await getDefaultProgram(a.id);
    await expectAppError(addParticipant(a.id, adminA, open.id, noConsent), 'consent_required');
    // Inactive program refuses participation.
    const inactive = await createProgram(a.id, adminA, { name: 'Closed' });
    await setProgramStatus(a.id, adminA, inactive.id, 'inactive');
    await expectAppError(addParticipant(a.id, adminA, inactive.id, u2), 'program_inactive');

    expect((await listParticipants(a.id, prog.id)).length).toBe(1);
  });
});
