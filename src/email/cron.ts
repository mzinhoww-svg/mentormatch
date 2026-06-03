/**
 * Cross-tenant email worker (for a scheduler/cron). Iterates active tenants and
 * processes each tenant's pending emails IN ITS OWN tenant context (withTenant /
 * RLS) — never mixing data across tenants. A failure in one tenant is alerted
 * and skipped; it never aborts the run. Retries/limits are handled by
 * sendPendingEmails (attempts < MAX_ATTEMPTS); exhausted messages stay 'failed'
 * (controlled dead-letter, queryable via listEmails).
 */
import { ownerPool } from '../tenancy/pool.js';
import { alertCritical } from '../observability/alert.js';
import { logger } from '../observability/logger.js';
import { processTenantEmails } from './emailService.js';
import { getEmailProvider, type EmailProvider } from './provider.js';

/** Active tenants from the registry (owner pool). */
export async function listActiveTenantIds(): Promise<string[]> {
  const res = await ownerPool().query<{ id: string }>(
    "SELECT id FROM tenant WHERE status = 'active' ORDER BY created_at",
  );
  return res.rows.map((r) => r.id);
}

export interface CronEmailResult {
  tenants: number;
  queued: number;
  sent: number;
  failed: number;
  errored: number;
}

export async function processAllTenants(
  provider: EmailProvider = getEmailProvider(),
): Promise<CronEmailResult> {
  const ids = await listActiveTenantIds();
  const totals: CronEmailResult = { tenants: ids.length, queued: 0, sent: 0, failed: 0, errored: 0 };
  for (const tenantId of ids) {
    try {
      const r = await processTenantEmails(tenantId, provider);
      totals.queued += r.queued;
      totals.sent += r.sent;
      totals.failed += r.failed;
    } catch (err) {
      totals.errored += 1;
      alertCritical('email.cron_tenant_failed', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  logger.info('email.cron_run', { ...totals });
  return totals;
}

/** Constant-time-ish bearer check for the cron endpoint. */
export function isAuthorizedCron(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false; // disabled when unset (endpoint returns 503)
  const expected = `Bearer ${secret}`;
  const got = authHeader ?? '';
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
