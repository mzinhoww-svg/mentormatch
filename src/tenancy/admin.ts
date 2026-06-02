/**
 * Tenant registry operations.
 *
 * The `tenant` table is NOT tenant-scoped (it is the registry used to resolve a
 * host before any tenant context exists). Creating a tenant is a privileged,
 * platform-level operation and runs as `mm_owner` (ownerPool). Reading a tenant
 * by slug (to confirm a resolved host) is allowed for the app role (mm_app).
 */

import { appPool, ownerPool } from './pool.js';
import { resolveTenantFromHost, type TenantResolution } from './resolveTenant.js';

export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  status: string;
}

/** Creates a tenant (platform-level; runs as mm_owner). */
export async function createTenant(input: { slug: string; name: string }): Promise<TenantRecord> {
  const res = await ownerPool().query<TenantRecord>(
    'INSERT INTO tenant (slug, name) VALUES ($1, $2) RETURNING id, slug, name, status',
    [input.slug, input.name],
  );
  const row = res.rows[0];
  if (!row) throw new Error('createTenant: insert returned no row');
  return row;
}

/** Looks up a tenant by slug (app role; registry read). */
export async function findTenantBySlug(slug: string): Promise<TenantRecord | null> {
  const res = await appPool().query<TenantRecord>(
    'SELECT id, slug, name, status FROM tenant WHERE slug = $1',
    [slug],
  );
  return res.rows[0] ?? null;
}

export type ActiveTenantResolution =
  | { kind: 'TENANT'; tenant: TenantRecord }
  | { kind: 'NO_TENANT'; resolution: TenantResolution; reason: string };

/**
 * Full resolution: pure host classification, then DB confirmation that the slug
 * is provisioned and active. Returns NO_TENANT for every non-tenant host or an
 * unprovisioned/suspended slug.
 */
export async function resolveActiveTenant(
  rawHost: string | undefined | null,
): Promise<ActiveTenantResolution> {
  const resolution = resolveTenantFromHost(rawHost);
  if (resolution.kind !== 'TENANT') {
    return { kind: 'NO_TENANT', resolution, reason: 'host_not_tenant' };
  }
  const tenant = await findTenantBySlug(resolution.slug);
  if (!tenant) return { kind: 'NO_TENANT', resolution, reason: 'slug_not_provisioned' };
  if (tenant.status !== 'active') {
    return { kind: 'NO_TENANT', resolution, reason: 'tenant_not_active' };
  }
  return { kind: 'TENANT', tenant };
}
