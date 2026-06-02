import { describe, it, expect } from 'vitest';
import {
  resolveTenantFromHost,
  hostPermitsTenantLogin,
  RESERVED_SUBDOMAINS,
} from '../resolveTenant.js';

describe('resolveTenantFromHost — production family', () => {
  it('classifies the institutional apex as INSTITUTIONAL (no tenant login)', () => {
    expect(resolveTenantFromHost('mentormatch.app')).toEqual({ kind: 'INSTITUTIONAL' });
    expect(resolveTenantFromHost('www.mentormatch.app')).toEqual({ kind: 'INSTITUTIONAL' });
  });

  it('classifies admin host as PLATFORM_ADMIN', () => {
    expect(resolveTenantFromHost('admin.mentormatch.app')).toEqual({ kind: 'PLATFORM_ADMIN' });
  });

  it('resolves a real tenant subdomain to TENANT with its slug', () => {
    expect(resolveTenantFromHost('acme.mentormatch.app')).toEqual({ kind: 'TENANT', slug: 'acme' });
    expect(resolveTenantFromHost('ACME.MentorMatch.App')).toEqual({ kind: 'TENANT', slug: 'acme' });
    expect(resolveTenantFromHost('acme.mentormatch.app:443')).toEqual({
      kind: 'TENANT',
      slug: 'acme',
    });
  });

  it('blocks reserved subdomains (never a tenant)', () => {
    for (const sub of RESERVED_SUBDOMAINS) {
      const r = resolveTenantFromHost(`${sub}.mentormatch.app`);
      expect(r.kind).not.toBe('TENANT');
    }
    expect(resolveTenantFromHost('api.mentormatch.app').kind).toBe('RESERVED');
  });

  it('rejects multi-label and invalid slugs', () => {
    expect(resolveTenantFromHost('a.b.mentormatch.app')).toEqual({
      kind: 'UNKNOWN',
      reason: 'multi_label_subdomain',
    });
    expect(resolveTenantFromHost('-bad.mentormatch.app')).toEqual({
      kind: 'UNKNOWN',
      reason: 'invalid_slug',
    });
  });
});

describe('resolveTenantFromHost — local dev', () => {
  it('treats bare localhost as institutional', () => {
    expect(resolveTenantFromHost('localhost').kind).toBe('INSTITUTIONAL');
    expect(resolveTenantFromHost('localhost:3000').kind).toBe('INSTITUTIONAL');
  });

  it('resolves {tenant}.localhost to TENANT', () => {
    expect(resolveTenantFromHost('acme.localhost:3000')).toEqual({ kind: 'TENANT', slug: 'acme' });
  });

  it('maps admin.localhost to PLATFORM_ADMIN', () => {
    expect(resolveTenantFromHost('admin.localhost').kind).toBe('PLATFORM_ADMIN');
  });
});

describe('resolveTenantFromHost — unknown / malformed', () => {
  it('returns UNKNOWN for missing/empty/foreign hosts', () => {
    expect(resolveTenantFromHost(undefined)).toEqual({ kind: 'UNKNOWN', reason: 'missing_host' });
    expect(resolveTenantFromHost('')).toEqual({ kind: 'UNKNOWN', reason: 'missing_host' });
    expect(resolveTenantFromHost('evil.com').kind).toBe('UNKNOWN');
  });
});

describe('hostPermitsTenantLogin', () => {
  it('is true ONLY for a tenant host', () => {
    expect(hostPermitsTenantLogin('acme.mentormatch.app')).toBe(true);
    expect(hostPermitsTenantLogin('mentormatch.app')).toBe(false);
    expect(hostPermitsTenantLogin('admin.mentormatch.app')).toBe(false);
    expect(hostPermitsTenantLogin('api.mentormatch.app')).toBe(false);
    expect(hostPermitsTenantLogin('evil.com')).toBe(false);
  });
});
