/**
 * Persists auth audit events to the tenant-scoped `audit_event` table (Slice 1),
 * through withTenant so RLS applies. Metadata is redacted (no secrets/ContactInfo).
 */
import { withTenant } from '../tenancy/withTenant.js';
import { redact } from '../observability/redaction.js';

export type AuthAction = 'auth.signup' | 'auth.login' | 'auth.logout' | 'auth.password_reset';

export interface AuthAuditInput {
  actorId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuthEvent(
  tenantId: string,
  action: AuthAction,
  input: AuthAuditInput = {},
): Promise<void> {
  const metadata = input.metadata
    ? JSON.stringify(redact(input.metadata))
    : null;
  await withTenant(tenantId, async (db) => {
    await db.query(
      `INSERT INTO audit_event
         (tenant_id, action, actor_id, actor_type, ip, user_agent, request_id, metadata)
       VALUES ($1, $2, $3, 'tenant_user', $4, $5, $6, $7)`,
      [
        tenantId,
        action,
        input.actorId ?? null,
        input.ip ?? null,
        input.userAgent ?? null,
        input.requestId ?? null,
        metadata,
      ],
    );
  });
}
