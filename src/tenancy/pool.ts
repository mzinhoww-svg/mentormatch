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

/**
 * Pool sizing/timeouts tuned for serverless behind a transaction pooler
 * (Supabase pgBouncer). Each warm function instance keeps a SMALL pool — the
 * real connection multiplexing happens in pgBouncer, so a large per-instance
 * `max` only risks exhausting the upstream. Timeouts fail fast instead of
 * hanging a request, and a statement timeout caps any runaway query. All are
 * env-overridable.
 */
function commonOptions(): PoolConfig {
  const num = (name: string, dflt: number): number => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n > 0 ? n : dflt;
  };
  return {
    max: num('PG_POOL_MAX', 5),
    connectionTimeoutMillis: num('PG_CONNECT_TIMEOUT_MS', 10_000),
    idleTimeoutMillis: num('PG_IDLE_TIMEOUT_MS', 10_000),
    statement_timeout: num('PG_STATEMENT_TIMEOUT_MS', 15_000),
    query_timeout: num('PG_QUERY_TIMEOUT_MS', 15_000),
    keepAlive: true,
  };
}

function poolConfig(connectionString: string): PoolConfig {
  const common = commonOptions();
  if (process.env.PGSSL === 'disable' || isLocalConnection(connectionString)) {
    return { connectionString, ...common };
  }
  // Managed Postgres (Supabase/Neon/RDS) presents a private/self-signed CA chain
  // via the pooler. A `sslmode=require` in the URL forces certificate VERIFICATION
  // (→ SELF_SIGNED_CERT_IN_CHAIN) and overrides our ssl config, so strip it and
  // set SSL explicitly WITHOUT chain verification (we trust the host via the
  // secret URL, not the CA).
  return { connectionString: stripSslmode(connectionString), ssl: { rejectUnauthorized: false }, ...common };
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
