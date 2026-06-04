import { describe, it, expect, afterAll } from 'vitest';
import { createTenant, resolveActiveTenant, findTenantByCustomDomain } from '../admin.js';
import {
  addCustomDomain,
  verifyCustomDomain,
  listCustomDomains,
  removeCustomDomain,
} from '../customDomainService.js';
import { verifyRecordValue } from '../customDomain.js';
import { getBaseDomain } from '../resolveTenant.js';
import { closePools } from '../pool.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const rand = () => Math.random().toString(36).slice(2, 8);

describe.skipIf(!hasDb)('Custom domains (integration)', () => {
  afterAll(async () => {
    await closePools();
  });

  it('adds, resolves only after DNS verification, then removes', async () => {
    const t = await createTenant({ slug: `cd${rand()}`, name: 'CD Co' });
    const domain = `mentoria-${rand()}.example.com`;

    const added = await addCustomDomain(t.id, domain);
    expect(added.verified).toBe(false);
    expect(added.verificationToken).toBeTruthy();
    expect((await listCustomDomains(t.id)).length).toBe(1);

    // Unverified → never resolves (anti-hijacking).
    expect(await findTenantByCustomDomain(domain)).toBeNull();
    expect((await resolveActiveTenant(domain)).kind).toBe('NO_TENANT');

    // Verify with an injected resolver returning the expected TXT record.
    const good: string[][] = [[verifyRecordValue(added.verificationToken!)]];
    const verified = await verifyCustomDomain(t.id, domain, async () => good);
    expect(verified.verified).toBe(true);

    // Verified → resolves to the tenant.
    const res = await resolveActiveTenant(domain);
    expect(res.kind).toBe('TENANT');
    if (res.kind === 'TENANT') expect(res.tenant.id).toBe(t.id);

    await removeCustomDomain(t.id, domain);
    expect(await findTenantByCustomDomain(domain)).toBeNull();
  });

  it('rejects a wrong TXT and a different tenant claiming the same domain', async () => {
    const a = await createTenant({ slug: `cda${rand()}`, name: 'A' });
    const b = await createTenant({ slug: `cdb${rand()}`, name: 'B' });
    const domain = `shared-${rand()}.example.com`;
    await addCustomDomain(a.id, domain);

    await expect(verifyCustomDomain(a.id, domain, async () => [['wrong-value']])).rejects.toThrow();
    await expect(addCustomDomain(b.id, domain)).rejects.toThrow(); // domain_taken
  });

  it('rejects invalid and platform-family domains', async () => {
    const t = await createTenant({ slug: `cdx${rand()}`, name: 'X' });
    await expect(addCustomDomain(t.id, 'not-a-domain')).rejects.toThrow();
    await expect(addCustomDomain(t.id, `x.${getBaseDomain()}`)).rejects.toThrow();
  });
});
