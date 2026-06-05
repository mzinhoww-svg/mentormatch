/**
 * Persists profile audit events to the tenant-scoped `audit_event` table via
 * withTenant (RLS). Metadata is redacted.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { redact } from '../observability/redaction.js';

export type ProfileAction =
  | 'profile.updated'
  | 'profile.activated'
  | 'profile.deactivated'
  | 'profile.availability_changed'
  | 'profile.onboarded';

export async function recordProfileEvent(
  tenantId: string,
  action: ProfileAction,
  input: { actorId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(redact(input.metadata)) : null;
  await withTenant(tenantId, async (db) => {
    await db.query(
      `INSERT INTO audit_event (tenant_id, action, actor_id, actor_type, target_id, target_type, metadata)
       VALUES ($1, $2, $3, 'tenant_user', $3, 'profile', $4)`,
      [tenantId, action, input.actorId ?? null, metadata],
    );
  });
}
