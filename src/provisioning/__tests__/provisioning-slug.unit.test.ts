import { describe, it, expect } from 'vitest';
import { provisionRealTenant } from '../provisioningService.js';

// Slug validation happens BEFORE any DB access (it's the first guard), so these
// rejections are pure unit tests — no database required. A slug that is invalid
// even AFTER normalization (trim + lowercase) is rejected here; an uppercase but
// otherwise-clean slug like "Sicredi" is NOT rejected — it is normalized to
// "sicredi" and proceeds (that normalization is covered by the integration test,
// and is the actual fix for the broken-uppercase-tenant bug).

const provider = { name: 'unused', send: async () => ({ ok: false as const }) };
const base = { name: 'Co', adminEmail: 'a@b.com' };

describe('provisionRealTenant — slug guard (no DB)', () => {
  it('rejects slugs with spaces, underscores or edge hyphens', async () => {
    await expect(provisionRealTenant({ ...base, slug: 'acme corp' }, provider)).rejects.toThrow('invalid_slug');
    await expect(provisionRealTenant({ ...base, slug: 'acme_corp' }, provider)).rejects.toThrow('invalid_slug');
    await expect(provisionRealTenant({ ...base, slug: '-acme' }, provider)).rejects.toThrow('invalid_slug');
    await expect(provisionRealTenant({ ...base, slug: 'acme-' }, provider)).rejects.toThrow('invalid_slug');
  });

  it('rejects slugs that are non-DNS even after lowercasing', async () => {
    await expect(provisionRealTenant({ ...base, slug: 'Acme Corp' }, provider)).rejects.toThrow('invalid_slug');
    await expect(provisionRealTenant({ ...base, slug: 'Açaí' }, provider)).rejects.toThrow('invalid_slug');
  });

  it('rejects an empty slug', async () => {
    await expect(provisionRealTenant({ ...base, slug: '   ' }, provider)).rejects.toThrow('invalid_slug');
  });

  it('rejects a reserved slug after normalization', async () => {
    // "Admin" lowercases to the reserved "admin" — must not be accepted.
    await expect(provisionRealTenant({ ...base, slug: 'Admin' }, provider)).rejects.toThrow(/reserved_slug/);
  });
});
