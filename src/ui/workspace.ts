/**
 * Workspace entry helpers (root/institutional /login). There is NO global login;
 * on the root host we route the user to their tenant's host. Pure & testable.
 */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidWorkspaceSlug(input: string): boolean {
  return SLUG_RE.test(normalizeSlug(input));
}

/**
 * Builds the tenant login URL from the current institutional host. The current
 * host IS the base domain (e.g. `mentorxmatch.xyz` or `localhost:3000`); a
 * leading `www.` is stripped. Returns null for an invalid slug.
 */
export function buildWorkspaceLoginUrl(
  currentHost: string,
  protocol: string,
  slugInput: string,
): string | null {
  const slug = normalizeSlug(slugInput);
  if (!isValidWorkspaceSlug(slug)) return null;
  const base = currentHost.replace(/^www\./, '');
  if (!base) return null;
  const proto = protocol.endsWith(':') ? protocol : `${protocol}:`;
  return `${proto}//${slug}.${base}/login`;
}
