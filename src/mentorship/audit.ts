/**
 * Persists mentorship audit events to the tenant-scoped `audit_event` table via
 * withTenant (RLS). Metadata is redacted. ContactInfo reveal is auditable here.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { redact } from '../observability/redaction.js';

export type MentorshipAction =
  | 'mentorship.requested'
  | 'mentorship.accepted'
  | 'mentorship.rejected'
  | 'mentorship.cancelled'
  | 'contact_info.revealed'
  | 'profile.capacity_changed';

export async function recordMentorshipEvent(
  tenantId: string,
  action: MentorshipAction,
  input: {
    actorId?: string;
    targetId?: string;
    targetType?: string;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(redact(input.metadata)) : null;
  await withTenant(tenantId, async (db) => {
    await db.query(
      `INSERT INTO audit_event
         (tenant_id, action, actor_id, actor_type, target_id, target_type, metadata)
       VALUES ($1, $2, $3, 'tenant_user', $4, $5, $6)`,
      [tenantId, action, input.actorId ?? null, input.targetId ?? null, input.targetType ?? null, metadata],
    );
  });
}
