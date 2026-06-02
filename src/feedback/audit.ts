/**
 * Audit for feedback actions. Tenant-scoped via withTenant (RLS), redacted
 * metadata. The comment body is NOT audited (only the fact + score).
 */
import { withTenant } from '../tenancy/withTenant.js';
import { redact } from '../observability/redaction.js';

export type FeedbackAction = 'feedback.submitted' | 'feedback.withdrawn';

export async function recordFeedbackEvent(
  tenantId: string,
  action: FeedbackAction,
  input: { actorId?: string; targetId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(redact(input.metadata)) : null;
  await withTenant(tenantId, async (db) => {
    await db.query(
      `INSERT INTO audit_event
         (tenant_id, action, actor_id, actor_type, target_id, target_type, metadata)
       VALUES ($1, $2, $3, 'tenant_user', $4, 'feedback', $5)`,
      [tenantId, action, input.actorId ?? null, input.targetId ?? null, metadata],
    );
  });
}
