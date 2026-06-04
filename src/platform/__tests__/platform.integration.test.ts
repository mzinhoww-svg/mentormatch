import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import {
  createPlatformAdmin,
  loginPlatformAdmin,
  getActivePlatformAdmin,
  changePlatformPassword,
} from '../platformAuthService.js';
import {
  createTenant,
  listTenants,
  setTenantRegistryStatus,
  resolveActiveTenant,
} from '../../tenancy/admin.js';
import { closePools } from '../../tenancy/pool.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);
const SAVED = process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN;

describe.skipIf(!hasDb)('Platform admin + tenant ops (integration)', () => {
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

  it('bootstraps an admin (token-gated), logs in, rejects bad token/password', async () => {
    const email = `ops-${rand()}@x.com`;
    await expect(
      createPlatformAdmin({ token: 'wrong', email, password: 'pw12345678' }),
    ).rejects.toThrow();

    const admin = await createPlatformAdmin({
      token: 'boot-secret',
      email,
      password: 'pw12345678',
      displayName: 'Ops',
    });
    expect(admin.email).toBe(email);

    const back = await loginPlatformAdmin({ email, password: 'pw12345678' });
    expect(back.id).toBe(admin.id);
    await expect(loginPlatformAdmin({ email, password: 'nope' })).rejects.toThrow();
    expect((await getActivePlatformAdmin(admin.id))?.id).toBe(admin.id);
  });

  it('lists tenants; suspending the registry status blocks login resolution', async () => {
    const slug = `plt${rand()}`;
    const t = await createTenant({ slug, name: 'Plat Co' });

    expect((await listTenants()).some((r) => r.id === t.id)).toBe(true);
    expect((await resolveActiveTenant(`${slug}.localhost`)).kind).toBe('TENANT');

    await setTenantRegistryStatus(t.id, 'suspended');
    expect((await resolveActiveTenant(`${slug}.localhost`)).kind).toBe('NO_TENANT');

    await setTenantRegistryStatus(t.id, 'active');
    expect((await resolveActiveTenant(`${slug}.localhost`)).kind).toBe('TENANT');
  });

  it('changes the password — old fails, new works, wrong current rejected', async () => {
    const email = `ops-${rand()}@x.com`;
    const admin = await createPlatformAdmin({ token: 'boot-secret', email, password: 'pw12345678' });

    await changePlatformPassword(admin.id, 'pw12345678', 'newpass9999');
    await expect(loginPlatformAdmin({ email, password: 'pw12345678' })).rejects.toThrow();
    expect((await loginPlatformAdmin({ email, password: 'newpass9999' })).id).toBe(admin.id);
    await expect(changePlatformPassword(admin.id, 'wrong-current', 'another9999')).rejects.toThrow();
  });
});
