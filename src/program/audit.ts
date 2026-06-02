/**
 * Audit for program management actions. Tenant-scoped via withTenant (RLS),
 * redacted metadata.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { redact } from '../observability/redaction.js';

export type ProgramAction =
  | 'program.created'
  | 'program.updated'
  | 'program.status_changed'
  | 'program.participant_added'
  | 'program.participant_removed';

export async function recordProgramEvent(
  tenantId: string,
  action: ProgramAction,
  input: { actorId?: string; targetId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  const metadata = input.metadata ? JSON.stringify(redact(input.metadata)) : null;
  await withTenant(tenantId, async (db) => {
    await db.query(
      `INSERT INTO audit_event
         (tenant_id, action, actor_id, actor_type, target_id, target_type, metadata)
       VALUES ($1, $2, $3, 'tenant_user', $4, 'program', $5)`,
      [tenantId, action, input.actorId ?? null, input.targetId ?? null, metadata],
    );
  });
}
