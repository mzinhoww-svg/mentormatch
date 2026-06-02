import { describe, it, expect } from 'vitest';
import {
  redact,
  redactString,
  isSensitiveKey,
  REDACTED,
  REDACTED_EMAIL,
} from '../redaction.js';

describe('isSensitiveKey', () => {
  it('flags exact sensitive keys (case-insensitive)', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('Authorization')).toBe(true);
    expect(isSensitiveKey('AUTH_SECRET')).toBe(true);
    expect(isSensitiveKey('DATABASE_URL')).toBe(true);
    expect(isSensitiveKey('ENCRYPTION_KEY')).toBe(true);
    expect(isSensitiveKey('email')).toBe(true);
  });

  it('flags keys by substring', () => {
    expect(isSensitiveKey('userPassword')).toBe(true);
    expect(isSensitiveKey('accessToken')).toBe(true);
    expect(isSensitiveKey('x-api-key'.replace(/-/g, '_'))).toBe(true);
  });

  it('does not flag innocuous keys', () => {
    expect(isSensitiveKey('tenantId')).toBe(false);
    expect(isSensitiveKey('requestId')).toBe(false);
    expect(isSensitiveKey('message')).toBe(false);
  });
});

describe('redactString', () => {
  it('masks postgres connection strings but keeps the scheme', () => {
    const out = redactString('db at postgres://user:pw@host:5432/db now');
    expect(out).toContain('postgres://');
    expect(out).not.toContain('user:pw@host');
    expect(out).toContain(REDACTED);
  });

  it('masks bearer tokens and JWTs', () => {
    expect(redactString('Authorization: Bearer abc.def-123')).toContain(`Bearer ${REDACTED}`);
    expect(redactString('token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toContain(REDACTED);
  });

  it('masks emails, CPF and phone (ContactInfo)', () => {
    expect(redactString('reach me at john.doe@example.com')).toContain(REDACTED_EMAIL);
    expect(redactString('cpf 123.456.789-09')).not.toContain('123.456.789-09');
    expect(redactString('call +55 11 98765-4321')).not.toContain('98765-4321');
  });

  it('masks inline secret env assignments', () => {
    expect(redactString('AUTH_SECRET=supersecretvalue')).toBe(`AUTH_SECRET=${REDACTED}`);
  });
});

describe('redact (deep)', () => {
  it('masks sensitive keys wholesale', () => {
    const out = redact({
      password: 'hunter2',
      token: 'abc',
      DATABASE_URL: 'postgres://u:p@h/db',
      tenantId: 't-1',
      nested: { AUTH_SECRET: 'x', ok: 'value' },
    }) as Record<string, unknown>;

    expect(out.password).toBe(REDACTED);
    expect(out.token).toBe(REDACTED);
    expect(out.DATABASE_URL).toBe(REDACTED);
    expect(out.tenantId).toBe('t-1');
    expect((out.nested as Record<string, unknown>).AUTH_SECRET).toBe(REDACTED);
    expect((out.nested as Record<string, unknown>).ok).toBe('value');
  });

  it('scrubs secret-shaped values inside arrays and strings', () => {
    const out = redact(['Bearer abc.def', 'postgres://u:p@h/db']) as string[];
    expect(out[0]).toContain(REDACTED);
    expect(out[1]).not.toContain('u:p@h');
  });

  it('handles circular references without throwing', () => {
    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;
    expect(() => redact(a)).not.toThrow();
    const out = redact(a) as Record<string, unknown>;
    expect(out.self).toBe('[Circular]');
  });

  it('reduces Error objects to a redacted name/message', () => {
    const out = redact(new Error('email leak john@example.com')) as Record<string, unknown>;
    expect(out.name).toBe('Error');
    expect(out.message).toContain(REDACTED_EMAIL);
  });
});
