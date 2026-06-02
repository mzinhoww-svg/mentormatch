/**
 * Notifications foundation. In-app notifications born from valid domain events,
 * tenant-scoped via withTenant (RLS), bound to TenantUser. Per-user preferences
 * are respected (in_app off → suppressed). unread/read is kept consistent.
 * Payloads are sanitized so ContactInfo / secrets can never leak.
 *
 * Audit stays a separate concern: notifications record `origin_event` (the
 * domain action) for provenance, they do not replace audit_event.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { logger } from '../observability/logger.js';
import { assertNoSensitive } from './sanitize.js';
import {
  type NotificationRecord,
  type NotificationStatus,
  type NotificationType,
} from './types.js';

const SELECT_NOTIFICATION = `
  id, type, target_user_id AS "targetUserId", payload, status,
  origin_event AS "originEvent", email_status AS "emailStatus",
  created_at AS "createdAt", read_at AS "readAt"`;

export interface EmitInput {
  type: NotificationType;
  targetUserId: string;
  originEvent: string;
  payload?: Record<string, unknown>;
}

/**
 * Emits a notification for a domain event. Returns the row, or null when the
 * target user has muted this type (in_app = false). Throws on a sensitive
 * payload (defensive). Use safeNotify from domain services so a notification
 * failure can never break the core operation.
 */
export async function emitNotification(
  tenantId: string,
  input: EmitInput,
): Promise<NotificationRecord | null> {
  const payload = input.payload ?? {};
  assertNoSensitive(payload);

  return withTenant(tenantId, async (db) => {
    const pref = await db.query<{ in_app: boolean; email: boolean }>(
      'SELECT in_app, email FROM notification_preference WHERE tenant_user_id = $1 AND type = $2',
      [input.targetUserId, input.type],
    );
    const p = pref.rows[0];
    if (p && !p.in_app) return null; // user muted this type
    const emailStatus = p?.email ? 'pending' : 'none';

    const res = await db.query<NotificationRecord>(
      `INSERT INTO notification
         (tenant_id, target_user_id, type, payload, origin_event, email_status)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING ${SELECT_NOTIFICATION}`,
      [tenantId, input.targetUserId, input.type, JSON.stringify(payload), input.originEvent, emailStatus],
    );
    return res.rows[0]!;
  });
}

/** Best-effort emit: logs and swallows errors so core flows never break. */
export async function safeNotify(tenantId: string, input: EmitInput): Promise<void> {
  try {
    await emitNotification(tenantId, input);
  } catch (err) {
    logger.warn('notification emit failed', {
      type: input.type,
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function listNotifications(
  tenantId: string,
  userId: string,
  opts: { status?: NotificationStatus; limit?: number } = {},
): Promise<NotificationRecord[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  return withTenant(tenantId, async (db) => {
    const res = await db.query<NotificationRecord>(
      `SELECT ${SELECT_NOTIFICATION} FROM notification
       WHERE target_user_id = $1 ${opts.status ? 'AND status = $2' : ''}
       ORDER BY created_at DESC LIMIT ${limit}`,
      opts.status ? [userId, opts.status] : [userId],
    );
    return res.rows;
  });
}

export async function unreadCount(tenantId: string, userId: string): Promise<number> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<{ c: number }>(
      "SELECT count(*)::int AS c FROM notification WHERE target_user_id = $1 AND status = 'unread'",
      [userId],
    );
    return res.rows[0]?.c ?? 0;
  });
}

/** Marks one of the user's own notifications read (idempotent). */
export async function markRead(
  tenantId: string,
  userId: string,
  notificationId: string,
): Promise<void> {
  const res = await withTenant(tenantId, (db) =>
    db.query(
      `UPDATE notification SET status = 'read', read_at = now()
       WHERE id = $1 AND target_user_id = $2 AND status = 'unread'`,
      [notificationId, userId],
    ),
  );
  if (res.rowCount === 0) {
    // Either not found / not owned, or already read — distinguish ownership.
    const exists = await withTenant(tenantId, (db) =>
      db.query('SELECT 1 FROM notification WHERE id = $1 AND target_user_id = $2', [
        notificationId,
        userId,
      ]),
    );
    if (exists.rowCount === 0) {
      throw expectedError(ErrorCode.NOT_FOUND, 'notification_not_found');
    }
  }
}

export async function markAllRead(tenantId: string, userId: string): Promise<number> {
  const res = await withTenant(tenantId, (db) =>
    db.query(
      `UPDATE notification SET status = 'read', read_at = now()
       WHERE target_user_id = $1 AND status = 'unread'`,
      [userId],
    ),
  );
  return res.rowCount;
}

export interface PreferenceRecord {
  type: string;
  inApp: boolean;
  email: boolean;
}

export async function getPreferences(
  tenantId: string,
  userId: string,
): Promise<PreferenceRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<PreferenceRecord>(
      `SELECT type, in_app AS "inApp", email FROM notification_preference
       WHERE tenant_user_id = $1 ORDER BY type`,
      [userId],
    );
    return res.rows;
  });
}

/** Upserts a per-type preference. Absent fields keep their current/default value. */
export async function setPreference(
  tenantId: string,
  userId: string,
  type: NotificationType,
  prefs: { inApp?: boolean; email?: boolean },
): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.query(
      `INSERT INTO notification_preference (tenant_id, tenant_user_id, type, in_app, email)
       VALUES ($1, $2, $3, COALESCE($4, true), COALESCE($5, false))
       ON CONFLICT (tenant_id, tenant_user_id, type) DO UPDATE
         SET in_app = COALESCE($4, notification_preference.in_app),
             email  = COALESCE($5, notification_preference.email),
             updated_at = now()`,
      [tenantId, userId, type, prefs.inApp ?? null, prefs.email ?? null],
    ),
  );
}
