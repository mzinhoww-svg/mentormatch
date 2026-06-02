/**
 * Host-based tenant resolution (pure; no database).
 *
 * Makes the SECURITY-CRITICAL classification of what a host is allowed to do.
 * A DB lookup happens only AFTER this returns a TENANT candidate, to confirm
 * the slug is provisioned/active (see resolveActiveTenant in admin.ts).
 *
 * Guarantees:
 *  - mentormatch.app (institutional) never exposes tenant login.
 *  - admin.mentormatch.app is the platform console, never a TenantUser host.
 *  - Reserved subdomains never resolve to a tenant.
 *  - Unknown hosts never expose login.
 */

export const ROOT_DOMAIN = 'mentormatch.app';
export const ADMIN_HOST = `admin.${ROOT_DOMAIN}`;
export const LOCAL_ROOT = 'localhost'; // dev: {tenant}.localhost:3000

/** Subdomains that must NEVER be usable as a tenant slug. */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  'www',
  'admin',
  'api',
  'app',
  'support',
  'static',
  'assets',
  'demo',
  'staging',
  'preview',
  'vercel',
  '_next',
  'auth',
  'login',
  'signup',
  'billing',
  'console',
]);

export type TenantResolution =
  | { kind: 'INSTITUTIONAL' } // marketing site — no tenant auth
  | { kind: 'PLATFORM_ADMIN' } // admin console — platform admins only
  | { kind: 'RESERVED'; subdomain: string } // blocklisted — no login
  | { kind: 'UNKNOWN'; reason: string } // anything else — no login
  | { kind: 'TENANT'; slug: string }; // candidate tenant — DB must confirm

/** A tenant slug must be a clean DNS label and not reserved. */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function stripPort(host: string): string {
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end >= 0 ? host.slice(0, end + 1) : host;
  }
  const colon = host.indexOf(':');
  return colon >= 0 ? host.slice(0, colon) : host;
}

function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && !RESERVED_SUBDOMAINS.has(slug);
}

function classifyLabel(label: string): TenantResolution {
  if (label.includes('.')) return { kind: 'UNKNOWN', reason: 'multi_label_subdomain' };
  if (label === 'admin') return { kind: 'PLATFORM_ADMIN' };
  if (RESERVED_SUBDOMAINS.has(label)) return { kind: 'RESERVED', subdomain: label };
  if (!isValidSlug(label)) return { kind: 'UNKNOWN', reason: 'invalid_slug' };
  return { kind: 'TENANT', slug: label };
}

/** Pure structural classification of a request host. */
export function resolveTenantFromHost(rawHost: string | undefined | null): TenantResolution {
  if (!rawHost || typeof rawHost !== 'string') {
    return { kind: 'UNKNOWN', reason: 'missing_host' };
  }

  const host = stripPort(rawHost.trim().toLowerCase());
  if (host.length === 0) return { kind: 'UNKNOWN', reason: 'empty_host' };

  // Production family: *.mentormatch.app
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return { kind: 'INSTITUTIONAL' };
  if (host === ADMIN_HOST) return { kind: 'PLATFORM_ADMIN' };
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    return classifyLabel(host.slice(0, host.length - ROOT_DOMAIN.length - 1));
  }

  // Local dev: {tenant}.localhost
  if (host === LOCAL_ROOT) return { kind: 'INSTITUTIONAL' };
  if (host.endsWith(`.${LOCAL_ROOT}`)) {
    return classifyLabel(host.slice(0, host.length - LOCAL_ROOT.length - 1));
  }

  return { kind: 'UNKNOWN', reason: 'unrecognized_host' };
}

/** Is tenant-scoped login permitted for this host? Only for a TENANT host. */
export function hostPermitsTenantLogin(rawHost: string | undefined | null): boolean {
  return resolveTenantFromHost(rawHost).kind === 'TENANT';
}
