/**
 * Host-based tenant resolution (pure; no database).
 *
 * Makes the SECURITY-CRITICAL classification of what a host is allowed to do.
 * A DB lookup happens only AFTER this returns a TENANT candidate, to confirm
 * the slug is provisioned/active (see resolveActiveTenant in admin.ts).
 *
 * The production base domain is CONFIGURABLE via `APP_BASE_DOMAIN` (no longer
 * hardcoded), so the same build serves any domain (e.g. mentorxmatch.xyz).
 * It is read at call time so deployment env changes take effect without a
 * rebuild. `localhost` always works for local dev regardless of the setting.
 *
 * Guarantees (for base domain D = APP_BASE_DOMAIN, default mentormatch.app):
 *  - D and www.D (institutional) never expose tenant login.
 *  - admin.D is the platform console, never a TenantUser host.
 *  - Reserved subdomains never resolve to a tenant.
 *  - Unknown hosts never expose login.
 */

/** Safe fallback when APP_BASE_DOMAIN is unset (keeps dev/tests stable). */
export const DEFAULT_BASE_DOMAIN = 'mentormatch.app';
export const LOCAL_ROOT = 'localhost'; // dev: {tenant}.localhost:3000

export type TenantDomainMode = 'subdomain' | 'path' | 'custom';

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

function normalizeDomain(raw: string): string {
  return stripPort(raw.trim().toLowerCase()).replace(/^\.+/, '').replace(/\.+$/, '');
}

/** Production base domain from env, falling back to the safe default. */
export function getBaseDomain(): string {
  const raw = process.env.APP_BASE_DOMAIN;
  const normalized = raw ? normalizeDomain(raw) : '';
  return normalized || DEFAULT_BASE_DOMAIN;
}

/**
 * Tenant resolution mode. Only 'subdomain' is implemented today; the value is
 * read and surfaced so deployments/docs stay honest. 'path'/'custom' are
 * reserved for future work and currently behave as 'subdomain'.
 */
export function getTenantDomainMode(): TenantDomainMode {
  const m = process.env.TENANT_DOMAIN_MODE?.trim().toLowerCase();
  return m === 'path' || m === 'custom' ? (m as TenantDomainMode) : 'subdomain';
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

  // Production family: *.{APP_BASE_DOMAIN}
  const baseDomain = getBaseDomain();
  if (host === baseDomain || host === `www.${baseDomain}`) return { kind: 'INSTITUTIONAL' };
  if (host === `admin.${baseDomain}`) return { kind: 'PLATFORM_ADMIN' };
  if (host.endsWith(`.${baseDomain}`)) {
    return classifyLabel(host.slice(0, host.length - baseDomain.length - 1));
  }

  // Local dev: {tenant}.localhost — always available, regardless of base domain.
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
