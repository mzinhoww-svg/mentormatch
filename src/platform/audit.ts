/**
 * Audit for platform-operator actions that TARGET a tenant (provisioning,
 * susp/reactivate, branding/logo changes, setting a tenant admin, resending a
 * set-password link). These land in the tenant's own `audit_event` table with
 * actor_type='platform_admin', so a tenant's trail shows operator actions too.
 *
 * Best-effort by design: a failed audit write is logged and swallowed — it must
 * never break the operator action that already succeeded. Platform-GLOBAL actions
 * (managing platform admins, changing one's own password) have no tenant and are
 * structured-logged at the call site; a dedicated platform-audit table is a
 * follow-up (it would require a migration).
 */
import { withTenant } from '../tenancy/withTenant.js';
import { redact } from '../observability/redaction.js';
import { logger } from '../observability/logger.js';

export type PlatformAuditAction =
  | 'platform.tenant_provisioned'
  | 'platform.tenant_status_changed'
  | 'platform.tenant_branding_changed'
  | 'platform.tenant_logo_changed'
  | 'platform.tenant_admin_set'
  | 'platform.set_password_resent';

export async function recordPlatformEvent(
  tenantId: string,
  action: PlatformAuditAction,
  input: { adminId?: string; targetId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(redact(input.metadata)) : null;
  const targetType = input.targetId ? 'tenant_user' : null;
  try {
    await withTenant(tenantId, async (db) => {
      await db.query(
        `INSERT INTO audit_event
           (tenant_id, action, actor_id, actor_type, target_id, target_type, metadata)
         VALUES ($1, $2, $3, 'platform_admin', $4, $5, $6)`,
        [tenantId, action, input.adminId ?? null, input.targetId ?? null, targetType, metadata],
      );
    });
  } catch (err) {
    logger.warn('platform.audit_failed', {
      action,
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
