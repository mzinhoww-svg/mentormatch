import { describe, it, expect } from 'vitest';
import {
  AuditAction,
  buildAuditEvent,
  createAuditLogger,
  type AuditEvent,
} from '../audit.js';
import { runWithRequestContext } from '../request-context.js';

describe('buildAuditEvent', () => {
  it('produces the expected payload with generated id and timestamp', () => {
    const event = buildAuditEvent({ action: AuditAction.LOGIN, actor: { id: 'u-1', type: 'user' } });
    expect(event.action).toBe('auth.login');
    expect(event.id).toMatch(/[0-9a-f-]{36}/i);
    expect(() => new Date(event.occurredAt).toISOString()).not.toThrow();
    expect(event.actor).toEqual({ id: 'u-1', type: 'user' });
  });

  it('pulls tenantId and requestId from request context', () => {
    let event: AuditEvent | undefined;
    runWithRequestContext({ requestId: 'req-1', tenantId: 'tenant-1' }, () => {
      event = buildAuditEvent({ action: AuditAction.TENANT_CREATED });
    });
    expect(event?.requestId).toBe('req-1');
    expect(event?.tenantId).toBe('tenant-1');
  });

  it('prefers explicit ids over context', () => {
    let event: AuditEvent | undefined;
    runWithRequestContext({ requestId: 'ctx', tenantId: 'ctx-t' }, () => {
      event = buildAuditEvent({ action: AuditAction.LOGOUT, requestId: 'explicit', tenantId: 'tt' });
    });
    expect(event?.requestId).toBe('explicit');
    expect(event?.tenantId).toBe('tt');
  });

  it('redacts metadata (no ContactInfo / secrets leak)', () => {
    const event = buildAuditEvent({
      action: AuditAction.CONTACT_INFO_REVEALED,
      metadata: { email: 'leak@example.com', token: 'abc', revealedField: 'phone' },
    });
    expect(event.metadata?.email).toBe('[REDACTED]');
    expect(event.metadata?.token).toBe('[REDACTED]');
    expect(event.metadata?.revealedField).toBe('phone');
    expect(JSON.stringify(event)).not.toContain('leak@example.com');
  });

  it('declares the full action taxonomy', () => {
    expect(Object.values(AuditAction)).toEqual([
      'auth.login',
      'auth.logout',
      'consent.recorded',
      'tenant.created',
      'role.changed',
      'contact_info.revealed',
      'data.exported',
      'data.deleted',
    ]);
  });
});

describe('createAuditLogger', () => {
  it('records the built event to the sink and returns it', () => {
    const recorded: AuditEvent[] = [];
    const audit = createAuditLogger({ sink: { record: (e) => void recorded.push(e) } });
    const event = audit.record({ action: AuditAction.EXPORT, actor: { id: 'admin', type: 'platform_admin' } });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toBe(event);
    expect(event.action).toBe('data.exported');
  });

  it('default sink emits through the provided logger without leaking secrets', () => {
    const lines: string[] = [];
    const logger = {
      debug() {},
      info: (_msg: string, fields?: Record<string, unknown>) =>
        void lines.push(JSON.stringify(fields)),
      warn() {},
      error() {},
      child() {
        return this;
      },
    };
    const audit = createAuditLogger({ logger });
    audit.record({ action: AuditAction.DELETION, metadata: { email: 'x@y.com' } });
    expect(lines[0]).toContain('"audit":true');
    expect(lines[0]).not.toContain('x@y.com');
  });
});
