/**
 * MANDATORY tenant-scoped data access.
 *
 * Every tenant-scoped query MUST run inside withTenant(). It:
 *   1. Checks out a dedicated client from the app pool (role: mm_app).
 *   2. BEGINs a transaction.
 *   3. SET LOCAL app.tenant_id = <tenantId>  (transaction-scoped GUC).
 *   4. Runs the callback.
 *   5. COMMITs (or ROLLBACKs on error) and releases the client.
 *
 * SET LOCAL keeps the GUC scoped to the transaction, so tenant context cannot
 * leak to the next query on the same pooled connection. A query run WITHOUT
 * this helper has no app.tenant_id => RLS default-deny.
 */

import type { PoolClient, QueryResultRow } from 'pg';
import { appPool } from './pool.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TenantDb {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
}

export async function withTenant<R>(
  tenantId: string,
  callback: (db: TenantDb) => Promise<R>,
): Promise<R> {
  if (!tenantId || typeof tenantId !== 'string' || !UUID_RE.test(tenantId)) {
    throw new Error('withTenant: a valid tenantId (uuid) is required');
  }

  const client: PoolClient = await appPool().connect();
  try {
    // One round trip instead of two: BEGIN + the transaction-scoped GUC are sent
    // as a single simple-query batch. tenantId is a strict UUID (validated above),
    // so inlining it carries no injection risk and avoids the extended-protocol
    // round trip a parameterized set_config would cost.
    await client.query(`BEGIN; SELECT set_config('app.tenant_id', '${tenantId}', true);`);

    const db: TenantDb = {
      async query(text, params) {
        const res = await client.query(text, params as unknown[] | undefined);
        return { rows: res.rows as never[], rowCount: res.rowCount ?? 0 };
      },
    };

    const result = await callback(db);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback failure; surface the original error
    }
    throw err;
  } finally {
    client.release();
  }
}
