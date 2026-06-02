import type { PoolClient, QueryResultRow } from "pg";
import { appPool } from "./pool.js";

/**
 * MANDATORY tenant-scoped data access.
 *
 * Every tenant-scoped query MUST run inside withTenant(). It:
 *   1. Checks out a dedicated client.
 *   2. BEGINs a transaction.
 *   3. SET LOCAL app.tenant_id = <tenantId>  (transaction-scoped GUC).
 *   4. Runs the callback.
 *   5. COMMITs (or ROLLBACKs on error) and releases the client.
 *
 * Why SET LOCAL (not SET): SET LOCAL is scoped to the transaction, so the GUC
 * is automatically reset on COMMIT/ROLLBACK. This is what prevents tenant
 * context from leaking to the next query on the same pooled connection
 * (Slice 0A item #5).
 *
 * A query run WITHOUT this helper has no app.tenant_id set => RLS default-deny.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // Fail loudly if a caller tries to enter tenant scope without a real tenant id.
  if (!tenantId || typeof tenantId !== "string" || !UUID_RE.test(tenantId)) {
    throw new Error("withTenant: a valid tenantId (uuid) is required");
  }

  const client: PoolClient = await appPool().connect();
  try {
    await client.query("BEGIN");
    // Parameterized set_config; is_local = true => behaves like SET LOCAL.
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);

    const db: TenantDb = {
      async query(text, params) {
        const res = await client.query(text, params as unknown[] | undefined);
        return { rows: res.rows as never[], rowCount: res.rowCount ?? 0 };
      },
    };

    const result = await callback(db);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback error; surface original */
    }
    throw err;
  } finally {
    client.release();
  }
}
