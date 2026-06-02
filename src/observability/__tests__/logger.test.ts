import { describe, it, expect } from 'vitest';
import { createLogger, type LogEntry } from '../logger.js';
import { runWithRequestContext } from '../request-context.js';

function capturing() {
  const entries: LogEntry[] = [];
  const logger = createLogger({
    level: 'debug',
    transport: (e) => entries.push(e),
    now: () => '2026-06-02T00:00:00.000Z',
    base: { service: 'test' },
  });
  return { entries, logger };
}

describe('logger — secrets', () => {
  it('never prints secrets passed as fields', () => {
    const { entries, logger } = capturing();
    logger.info('login attempt', {
      password: 'hunter2',
      authorization: 'Bearer abc.def',
      DATABASE_URL: 'postgres://u:p@h/db',
    });

    const line = JSON.stringify(entries[0]);
    expect(line).not.toContain('hunter2');
    expect(line).not.toContain('u:p@h');
    expect(line).toContain('[REDACTED]');
  });

  it('scrubs secrets embedded in the message itself', () => {
    const { entries, logger } = capturing();
    logger.warn('connecting to postgres://user:pw@host/db');
    const line = JSON.stringify(entries[0]);
    expect(line).not.toContain('user:pw@host');
    expect(line).toContain('postgres://');
  });

  it('masks ContactInfo (email) in fields', () => {
    const { entries, logger } = capturing();
    logger.info('contact', { email: 'a@b.com', note: 'wrote to c@d.com' });
    const line = JSON.stringify(entries[0]);
    expect(line).not.toContain('a@b.com');
    expect(line).not.toContain('c@d.com');
  });
});

describe('logger — context', () => {
  it('accepts an explicit requestId field', () => {
    const { entries, logger } = capturing();
    logger.info('hi', { requestId: 'req-123' });
    expect(entries[0]?.requestId).toBe('req-123');
  });

  it('accepts an explicit tenantId field', () => {
    const { entries, logger } = capturing();
    logger.info('hi', { tenantId: 'tenant-9' });
    expect(entries[0]?.tenantId).toBe('tenant-9');
  });

  it('pulls requestId and tenantId from request context', () => {
    const { entries, logger } = capturing();
    runWithRequestContext({ requestId: 'ctx-req', tenantId: 'ctx-tenant' }, () => {
      logger.info('inside request');
    });
    expect(entries[0]?.requestId).toBe('ctx-req');
    expect(entries[0]?.tenantId).toBe('ctx-tenant');
  });

  it('lets an explicit field override the context value', () => {
    const { entries, logger } = capturing();
    runWithRequestContext({ requestId: 'ctx-req' }, () => {
      logger.info('override', { requestId: 'explicit-req' });
    });
    expect(entries[0]?.requestId).toBe('explicit-req');
  });
});

describe('logger — behavior', () => {
  it('respects the level threshold', () => {
    const entries: LogEntry[] = [];
    const logger = createLogger({ level: 'warn', transport: (e) => entries.push(e) });
    logger.debug('nope');
    logger.info('nope');
    logger.warn('yes');
    logger.error('yes');
    expect(entries.map((e) => e.level)).toEqual(['warn', 'error']);
  });

  it('child loggers carry bindings', () => {
    const entries: LogEntry[] = [];
    const logger = createLogger({ level: 'debug', transport: (e) => entries.push(e) }).child({
      module: 'auth',
    });
    logger.info('hello');
    expect(entries[0]?.module).toBe('auth');
  });

  it('emits a well-formed entry (timestamp, level, message)', () => {
    const { entries, logger } = capturing();
    logger.info('hello world');
    expect(entries[0]).toMatchObject({
      timestamp: '2026-06-02T00:00:00.000Z',
      level: 'info',
      message: 'hello world',
      service: 'test',
    });
  });
});
