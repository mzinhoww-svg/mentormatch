/**
 * Email delivery worker. Out-of-band processor that turns email-eligible domain
 * notifications into transactional emails and sends them via the configured
 * provider. Tenant-scoped via withTenant (RLS). Because it runs separately from
 * the domain operation, a provider failure can never break the core flow — it
 * only marks the email_message 'failed' (with last_error) for retry.
 *
 * Email is only ever created from a valid domain event (a notification whose
 * type has a template) AND only when the user opted in (notification.email_status
 * is 'pending' — which emitNotification sets solely when the email preference is
 * on). ContactInfo cannot leak: templates use a whitelisted context only.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { ownerPool } from '../tenancy/pool.js';
import { logger } from '../observability/logger.js';
import { getBaseDomain } from '../tenancy/resolveTenant.js';
import { renderTemplate, EMAILABLE_TYPES, type TemplateContext } from './templates.js';
import { getEmailProvider, type EmailProvider } from './provider.js';

const MAX_ATTEMPTS = 3;
const DEFAULT_BATCH = 100;

export interface EmailMessageRecord {
  id: string;
  recipient: string;
  templateKey: string;
  subject: string;
  originEvent: string;
  status: 'pending' | 'sent' | 'failed';
  provider: string | null;
  attempts: number;
  lastError: string | null;
}

const SELECT_EMAIL = `
  id, recipient, template_key AS "templateKey", subject, origin_event AS "originEvent",
  status, provider, attempts, last_error AS "lastError"`;

async function tenantContext(tenantId: string): Promise<{ tenantName: string; appUrl: string }> {
  const res = await ownerPool().query<{ slug: string; name: string }>(
    'SELECT slug, name FROM tenant WHERE id = $1',
    [tenantId],
  );
  const row = res.rows[0];
  const slug = row?.slug ?? 'app';
  return { tenantName: row?.name ?? 'MentorMatch', appUrl: `https://${slug}.${getBaseDomain()}` };
}

/**
 * Queues an email_message (status 'pending') for every email-eligible pending
 * notification that doesn't have one yet. Returns the number queued.
 */
export async function enqueuePendingEmails(tenantId: string, limit = DEFAULT_BATCH): Promise<number> {
  const ctxBase = await tenantContext(tenantId);
  return withTenant(tenantId, async (db) => {
    const pending = await db.query<{
      id: string;
      type: string;
      origin_event: string;
      email: string | null;
      display_name: string | null;
    }>(
      `SELECT n.id, n.type, n.origin_event, u.email, u.display_name
         FROM notification n
         JOIN tenant_user u ON u.id = n.target_user_id
        WHERE n.email_status = 'pending'
          AND n.type = ANY($1)
          AND NOT EXISTS (SELECT 1 FROM email_message em WHERE em.notification_id = n.id)
        ORDER BY n.created_at
        LIMIT $2`,
      [EMAILABLE_TYPES, limit],
    );

    let queued = 0;
    for (const n of pending.rows) {
      if (!n.email) continue; // no recipient address → nothing to send
      const ctx: TemplateContext = { recipientName: n.display_name, ...ctxBase };
      const tpl = renderTemplate(n.type, ctx);
      if (!tpl) continue; // not emailable (defensive)
      await db.query(
        `INSERT INTO email_message
           (tenant_id, notification_id, recipient, template_key, subject, body, origin_event, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         ON CONFLICT (notification_id) WHERE notification_id IS NOT NULL DO NOTHING`,
        [tenantId, n.id, n.email, tpl.templateKey, tpl.subject, tpl.body, n.origin_event],
      );
      queued++;
    }
    return queued;
  });
}

/**
 * Sends queued emails (pending, or failed with attempts left) via the provider.
 * Updates status pending → sent | failed and bumps the source notification to
 * 'sent' on success. Never throws on a provider error.
 */
export async function sendPendingEmails(
  tenantId: string,
  provider: EmailProvider = getEmailProvider(),
  limit = DEFAULT_BATCH,
): Promise<{ sent: number; failed: number }> {
  const batch = await withTenant(tenantId, async (db) => {
    const res = await db.query<{
      id: string;
      recipient: string;
      template_key: string;
      subject: string;
      body: string;
      origin_event: string;
      notification_id: string | null;
    }>(
      `SELECT id, recipient, template_key, subject, body, origin_event, notification_id
         FROM email_message
        WHERE status = 'pending' OR (status = 'failed' AND attempts < $1)
        ORDER BY created_at
        LIMIT $2`,
      [MAX_ATTEMPTS, limit],
    );
    return res.rows;
  });

  let sent = 0;
  let failed = 0;
  for (const m of batch) {
    let result;
    try {
      result = await provider.send({
        to: m.recipient,
        subject: m.subject,
        body: m.body,
        templateKey: m.template_key,
        tenantId,
        originEvent: m.origin_event,
      });
    } catch (err) {
      // A throwing provider is treated as a normal failure — never propagates.
      result = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    await withTenant(tenantId, async (db) => {
      if (result.ok) {
        await db.query(
          `UPDATE email_message
             SET status = 'sent', provider = $2, attempts = attempts + 1,
                 last_error = NULL, updated_at = now()
           WHERE id = $1`,
          [m.id, provider.name],
        );
        if (m.notification_id) {
          await db.query("UPDATE notification SET email_status = 'sent' WHERE id = $1", [
            m.notification_id,
          ]);
        }
      } else {
        await db.query(
          `UPDATE email_message
             SET status = 'failed', provider = $2, attempts = attempts + 1,
                 last_error = $3, updated_at = now()
           WHERE id = $1`,
          [m.id, provider.name, (result.error ?? 'send_failed').slice(0, 500)],
        );
        await db.query(
          `INSERT INTO audit_event (tenant_id, action, actor_type, target_id, target_type, metadata)
           VALUES ($1, 'email.failed', 'system', $2, 'email_message', $3)`,
          [tenantId, m.id, JSON.stringify({ originEvent: m.origin_event, error: result.error ?? null })],
        );
      }
    });

    if (result.ok) sent++;
    else failed++;
  }

  if (failed > 0) logger.warn('email.batch_failures', { tenantId, failed, sent });
  return { sent, failed };
}

/** Convenience: queue then send. Returns counts. */
export async function processTenantEmails(
  tenantId: string,
  provider: EmailProvider = getEmailProvider(),
  limit = DEFAULT_BATCH,
): Promise<{ queued: number; sent: number; failed: number }> {
  const queued = await enqueuePendingEmails(tenantId, limit);
  const { sent, failed } = await sendPendingEmails(tenantId, provider, limit);
  return { queued, sent, failed };
}

/** Lists email_message rows for the tenant (admin view). */
export async function listEmails(
  tenantId: string,
  opts: { status?: string; limit?: number } = {},
): Promise<EmailMessageRecord[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return withTenant(tenantId, async (db) => {
    const res = await db.query<EmailMessageRecord>(
      `SELECT ${SELECT_EMAIL} FROM email_message
       ${opts.status ? 'WHERE status = $1' : ''}
       ORDER BY created_at DESC LIMIT ${limit}`,
      opts.status ? [opts.status] : [],
    );
    return res.rows;
  });
}
