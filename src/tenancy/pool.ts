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
 */

import { Pool } from 'pg';

let appPoolInstance: Pool | undefined;
let ownerPoolInstance: Pool | undefined;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Application pool (role: mm_app). RLS applies to everything it runs. */
export function appPool(): Pool {
  if (!appPoolInstance) {
    appPoolInstance = new Pool({ connectionString: requireEnv('DATABASE_URL') });
  }
  return appPoolInstance;
}

/** Owner pool (role: mm_owner) for non-tenant-scoped registry operations. */
export function ownerPool(): Pool {
  if (!ownerPoolInstance) {
    ownerPoolInstance = new Pool({ connectionString: requireEnv('DIRECT_URL') });
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
