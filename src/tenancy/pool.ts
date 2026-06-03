/**
 * Postgres connection pools.
 *
 * - `appPool()` connects as the application role `mm_app` (NOSUPERUSER,
 *   NOBYPASSRLS) — every tenant-scoped query runs through it, subject to RLS.
 * - `ownerPool()` connects as `mm_owner` for privileged registry operations
 *   (e.g. creating a tenant) that are NOT tenant-scoped. Use sparingly.
 *
 * Connection strings come from the environment (see docs/ENVIRONMENT.md):
 *   DATABASE_URL → mm_app (pooled)        DIRECT_URL → mm_owner (direct)
 *
 * SSL: managed Postgres (Supabase/Neon/RDS) requires TLS. We enable SSL
 * automatically for non-local hosts (disable with PGSSL=disable). Local dev/CI
 * (localhost/127.0.0.1) connects without SSL.
 */

import { Pool, type PoolConfig } from 'pg';

let appPoolInstance: Pool | undefined;
let ownerPoolInstance: Pool | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** True when the connection string targets a local database. */
function isLocalConnection(connectionString: string): boolean {
  return /@(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:[/?]|$)/i.test(connectionString);
}

function poolConfig(connectionString: string): PoolConfig {
  if (process.env.PGSSL === 'disable' || isLocalConnection(connectionString)) {
    return { connectionString };
  }
  // Managed Postgres (Supabase/Neon/RDS) presents a private/self-signed CA chain
  // via the pooler. A `sslmode=require` in the URL forces certificate VERIFICATION
  // (→ SELF_SIGNED_CERT_IN_CHAIN) and overrides our ssl config, so strip it and
  // set SSL explicitly WITHOUT chain verification (we trust the host via the
  // secret URL, not the CA).
  return { connectionString: stripSslmode(connectionString), ssl: { rejectUnauthorized: false } };
}

/** Removes any `sslmode` query param so it can't override our explicit ssl config. */
function stripSslmode(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    u.searchParams.delete('sslmode');
    return u.toString();
  } catch {
    return connectionString;
  }
}

/** Application pool (role: mm_app). RLS applies to everything it runs. */
export function appPool(): Pool {
  if (!appPoolInstance) {
    appPoolInstance = new Pool(poolConfig(requireEnv('DATABASE_URL')));
  }
  return appPoolInstance;
}

/** Owner pool (role: mm_owner) for non-tenant-scoped registry operations. */
export function ownerPool(): Pool {
  if (!ownerPoolInstance) {
    ownerPoolInstance = new Pool(poolConfig(requireEnv('DIRECT_URL')));
  }
  return ownerPoolInstance;
}

/** Closes all open pools (call on shutdown / in test teardown). */
export async function closePools(): Promise<void> {
  const pending: Array<Promise<void>> = [];
  if (appPoolInstance) {
    pending.push(appPoolInstance.end());
    appPoolInstance = undefined;
  }
  if (ownerPoolInstance) {
    pending.push(ownerPoolInstance.end());
    ownerPoolInstance = undefined;
  }
  await Promise.all(pending);
}
