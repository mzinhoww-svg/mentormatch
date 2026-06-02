/**
 * Audit logger — base layer only.
 *
 * Defines the canonical `AuditEvent` shape and a pluggable logger. There is NO
 * audit UI and NO persistence yet: the default sink writes a redacted, structured
 * line through the central logger. A future slice can swap in a database sink.
 *
 * The event taxonomy intentionally pre-declares the actions the product will emit:
 * login, logout, consent, tenant creation, role change, ContactInfo reveal,
 * export, deletion.
 */

import { randomUUID } from 'node:crypto';
import { getRequestContext } from './request-context.js';
import { redact } from './redaction.js';
import { logger as defaultLogger, type Logger } from './logger.js';

export const AuditAction = {
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  CONSENT: 'consent.recorded',
  TENANT_CREATED: 'tenant.created',
  ROLE_CHANGED: 'role.changed',
  CONTACT_INFO_REVEALED: 'contact_info.revealed',
  EXPORT: 'data.exported',
  DELETION: 'data.deleted',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export type AuditActorType = 'user' | 'system' | 'platform_admin';

export interface AuditActor {
  id?: string;
  type?: AuditActorType;
}

export interface AuditTarget {
  id?: string;
  type?: string;
}

export interface AuditEvent {
  /** Unique event id. */
  id: string;
  /** What happened. */
  action: AuditAction;
  /** ISO-8601 timestamp. */
  occurredAt: string;
  /** Tenant the event belongs to, when applicable. */
  tenantId?: string;
  /** Correlation id of the originating request. */
  requestId?: string;
  /** Who performed the action. */
  actor?: AuditActor;
  /** What the action acted upon. */
  target?: AuditTarget;
  /** Additional structured detail (redacted). */
  metadata?: Record<string, unknown>;
  /** Source IP, when known. */
  ip?: string;
  /** Source user agent, when known. */
  userAgent?: string;
}

export interface AuditEventInput {
  action: AuditAction;
  tenantId?: string;
  requestId?: string;
  actor?: AuditActor;
  target?: AuditTarget;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  /** Overrides (mostly for tests). */
  id?: string;
  occurredAt?: string;
}

/**
 * Builds a normalized `AuditEvent`, filling `id`/`occurredAt` and pulling
 * `requestId`/`tenantId` from the active request context when not supplied.
 * `metadata` is redacted so a record can never carry a secret or raw ContactInfo.
 */
export function buildAuditEvent(input: AuditEventInput): AuditEvent {
  const ctx = getRequestContext();

  const event: AuditEvent = {
    id: input.id ?? randomUUID(),
    action: input.action,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };

  const tenantId = input.tenantId ?? ctx?.tenantId;
  const requestId = input.requestId ?? ctx?.requestId;
  if (tenantId !== undefined) event.tenantId = tenantId;
  if (requestId !== undefined) event.requestId = requestId;
  if (input.actor) event.actor = input.actor;
  if (input.target) event.target = input.target;
  if (input.ip !== undefined) event.ip = input.ip;
  if (input.userAgent !== undefined) event.userAgent = input.userAgent;
  if (input.metadata) {
    event.metadata = redact(input.metadata) as Record<string, unknown>;
  }

  return event;
}

/** Where audit events are delivered. Swap for a DB sink in a later slice. */
export interface AuditSink {
  record(event: AuditEvent): void | Promise<void>;
}

export interface AuditLogger {
  /** Builds, delivers, and returns the normalized event. */
  record(input: AuditEventInput): AuditEvent;
}

export interface AuditLoggerOptions {
  sink?: AuditSink;
  logger?: Logger;
}

export function createAuditLogger(options: AuditLoggerOptions = {}): AuditLogger {
  const log = options.logger ?? defaultLogger;
  const sink: AuditSink =
    options.sink ?? {
      record(event) {
        log.info('audit_event', { audit: true, ...event });
      },
    };

  return {
    record(input) {
      const event = buildAuditEvent(input);
      void sink.record(event);
      return event;
    },
  };
}

/** Default audit logger (logs via the central structured logger). */
export const auditLogger = createAuditLogger();
