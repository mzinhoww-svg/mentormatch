/**
 * Audit for tenant settings / branding changes. Tenant-scoped via withTenant
 * (RLS), redacted metadata.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { redact } from '../observability/redaction.js';

export type SettingsAction =
  | 'settings.updated'
  | 'settings.branding_updated'
  | 'settings.status_changed';

export async function recordSettingsEvent(
  tenantId: string,
  action: SettingsAction,
  input: { actorId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(redact(input.metadata)) : null;
  await withTenant(tenantId, async (db) => {
    await db.query(
      `INSERT INTO audit_event
         (tenant_id, action, actor_id, actor_type, target_type, metadata)
       VALUES ($1, $2, $3, 'tenant_user', 'tenant_settings', $4)`,
      [tenantId, action, input.actorId ?? null, metadata],
    );
  });
}
