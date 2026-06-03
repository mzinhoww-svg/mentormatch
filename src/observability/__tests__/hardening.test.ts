import { describe, it, expect, vi, afterEach } from 'vitest';
import { SECURITY_HEADERS } from '../securityHeaders.js';
import { alertCritical } from '../alert.js';
import { isAuthorizedCron } from '../../email/cron.js';
import nextConfig from '../../../next.config.js';

afterEach(() => vi.restoreAllMocks());

describe('security headers', () => {
  it('includes the baseline hardening headers', () => {
    const keys = SECURITY_HEADERS.map((h) => h.key);
    for (const k of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Strict-Transport-Security', 'Permissions-Policy']) {
      expect(keys).toContain(k);
    }
    expect(SECURITY_HEADERS.find((h) => h.key === 'X-Content-Type-Options')?.value).toBe('nosniff');
  });

  it('next.config applies them to every route', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const rules = await nextConfig.headers!();
    expect(rules[0]?.source).toBe('/:path*');
    expect(rules[0]?.headers.some((h) => h.key === 'X-Frame-Options')).toBe(true);
  });
});

describe('alertCritical (observable critical failures)', () => {
  it('emits a structured error flagged alert:true and never throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => alertCritical('email.cron_tenant_failed', { tenantId: 't1' })).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]![0]);
    expect(line).toContain('"alert":true');
    expect(line).toContain('"alertEvent":"email.cron_tenant_failed"');
    expect(line).toContain('"level":"error"');
  });
});

describe('isAuthorizedCron', () => {
  it('disabled (false) when secret unset', () => {
    expect(isAuthorizedCron('Bearer x', undefined)).toBe(false);
    expect(isAuthorizedCron('Bearer x', '')).toBe(false);
  });
  it('accepts the exact bearer, rejects others', () => {
    expect(isAuthorizedCron('Bearer s3cret', 's3cret')).toBe(true);
    expect(isAuthorizedCron('Bearer wrong', 's3cret')).toBe(false);
    expect(isAuthorizedCron('s3cret', 's3cret')).toBe(false);
    expect(isAuthorizedCron(null, 's3cret')).toBe(false);
  });
});
