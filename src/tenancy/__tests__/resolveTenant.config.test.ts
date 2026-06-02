import { describe, it, expect, afterEach } from 'vitest';
import {
  resolveTenantFromHost,
  getBaseDomain,
  getTenantDomainMode,
  DEFAULT_BASE_DOMAIN,
} from '../resolveTenant.js';

const ORIGINAL = process.env.APP_BASE_DOMAIN;
const ORIGINAL_MODE = process.env.TENANT_DOMAIN_MODE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.APP_BASE_DOMAIN;
  else process.env.APP_BASE_DOMAIN = ORIGINAL;
  if (ORIGINAL_MODE === undefined) delete process.env.TENANT_DOMAIN_MODE;
  else process.env.TENANT_DOMAIN_MODE = ORIGINAL_MODE;
});

describe('configurable base domain (APP_BASE_DOMAIN)', () => {
  it('defaults safely when unset', () => {
    delete process.env.APP_BASE_DOMAIN;
    expect(getBaseDomain()).toBe(DEFAULT_BASE_DOMAIN);
    expect(resolveTenantFromHost('acme.mentormatch.app')).toEqual({ kind: 'TENANT', slug: 'acme' });
  });

  it('resolves a tenant on {slug}.APP_BASE_DOMAIN', () => {
    process.env.APP_BASE_DOMAIN = 'mentorxmatch.xyz';
    expect(getBaseDomain()).toBe('mentorxmatch.xyz');
    expect(resolveTenantFromHost('acme.mentorxmatch.xyz')).toEqual({ kind: 'TENANT', slug: 'acme' });
    expect(resolveTenantFromHost('ACME.MentorXmatch.XYZ:443')).toEqual({ kind: 'TENANT', slug: 'acme' });
  });

  it('does not expose tenant login on the institutional / www host', () => {
    process.env.APP_BASE_DOMAIN = 'mentorxmatch.xyz';
    expect(resolveTenantFromHost('mentorxmatch.xyz')).toEqual({ kind: 'INSTITUTIONAL' });
    expect(resolveTenantFromHost('www.mentorxmatch.xyz')).toEqual({ kind: 'INSTITUTIONAL' });
  });

  it('keeps platform-admin and reserved behaviour on the configured domain', () => {
    process.env.APP_BASE_DOMAIN = 'mentorxmatch.xyz';
    expect(resolveTenantFromHost('admin.mentorxmatch.xyz')).toEqual({ kind: 'PLATFORM_ADMIN' });
    expect(resolveTenantFromHost('api.mentorxmatch.xyz').kind).toBe('RESERVED');
    expect(resolveTenantFromHost('-bad.mentorxmatch.xyz').kind).toBe('UNKNOWN');
  });

  it('proves the production domain is NO LONGER hardcoded', () => {
    process.env.APP_BASE_DOMAIN = 'mentorxmatch.xyz';
    // The old hardcoded domain must no longer resolve as a tenant host.
    expect(resolveTenantFromHost('acme.mentormatch.app').kind).toBe('UNKNOWN');
    expect(resolveTenantFromHost('mentormatch.app').kind).toBe('UNKNOWN');
  });

  it('never breaks localhost regardless of the configured domain', () => {
    process.env.APP_BASE_DOMAIN = 'mentorxmatch.xyz';
    expect(resolveTenantFromHost('localhost').kind).toBe('INSTITUTIONAL');
    expect(resolveTenantFromHost('acme.localhost:3000')).toEqual({ kind: 'TENANT', slug: 'acme' });
    expect(resolveTenantFromHost('admin.localhost').kind).toBe('PLATFORM_ADMIN');
  });

  it('tolerates messy APP_BASE_DOMAIN values (port, dots, case)', () => {
    process.env.APP_BASE_DOMAIN = '  .MentorXmatch.XYZ.  ';
    expect(getBaseDomain()).toBe('mentorxmatch.xyz');
    expect(resolveTenantFromHost('acme.mentorxmatch.xyz')).toEqual({ kind: 'TENANT', slug: 'acme' });
  });

  it('reads TENANT_DOMAIN_MODE (defaults to subdomain)', () => {
    delete process.env.TENANT_DOMAIN_MODE;
    expect(getTenantDomainMode()).toBe('subdomain');
    process.env.TENANT_DOMAIN_MODE = 'custom';
    expect(getTenantDomainMode()).toBe('custom');
    process.env.TENANT_DOMAIN_MODE = 'garbage';
    expect(getTenantDomainMode()).toBe('subdomain');
  });
});
