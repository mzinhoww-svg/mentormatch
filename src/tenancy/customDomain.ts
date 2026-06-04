/**
 * Pure helpers for tenant custom domains: hostname normalization, format
 * validation, and the DNS-TXT verification record spec. No I/O — unit-testable.
 *
 * Verification: the tenant publishes a TXT record at `_mentormatch-verify.<domain>`
 * whose value embeds a per-domain token. Proving control of DNS is what lets a
 * domain resolve to the tenant; an unverified domain never resolves.
 */

// FQDN: dot-separated DNS labels (alphanumeric, internal hyphens), TLD >= 2 alpha.
const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/** Lowercase, strip scheme/path/port and trailing dots. */
export function normalizeDomain(raw: string | null | undefined): string {
  if (!raw) return '';
  let h = raw.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const colon = h.lastIndexOf(':');
  if (colon > 0 && /^\d+$/.test(h.slice(colon + 1))) h = h.slice(0, colon);
  return h.replace(/\.+$/, '');
}

/** True for a syntactically valid, multi-label custom domain. */
export function isValidCustomDomain(raw: string): boolean {
  const d = normalizeDomain(raw);
  if (!d || d.length > 253 || d.includes('..')) return false;
  return DOMAIN_RE.test(d);
}

/** TXT record host the tenant must publish to prove control of the domain. */
export const VERIFY_RECORD_PREFIX = '_mentormatch-verify';
export function verifyRecordName(domain: string): string {
  return `${VERIFY_RECORD_PREFIX}.${normalizeDomain(domain)}`;
}
/** Expected TXT record value for a given verification token. */
export function verifyRecordValue(token: string): string {
  return `mentormatch-domain-verification=${token}`;
}
