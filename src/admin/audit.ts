/**
 * Audit for tenant-admin actions. Tenant-scoped via withTenant (RLS), redacted
 * metadata. Read-only admin views are NOT audited; only relevant mutations are.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { redact } from '../observability/redaction.js';

export type AdminAction = 'admin.user_status_changed';

export async function recordAdminEvent(
  tenantId: string,
  action: AdminAction,
  input: { actorId?: string; targetId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(redact(input.metadata)) : null;
  await withTenant(tenantId, async (db) => {
    await db.query(
      `INSERT INTO audit_event
         (tenant_id, action, actor_id, actor_type, target_id, target_type, metadata)
       VALUES ($1, $2, $3, 'tenant_user', $4, 'tenant_user', $5)`,
      [tenantId, action, input.actorId ?? null, input.targetId ?? null, metadata],
    );
  });
}
