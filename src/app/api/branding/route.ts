import { resolveActiveTenant } from '../../../tenancy/admin.js';
import { json, respondError } from '../../../auth/http.js';
import { getSettings } from '../../../settings/settingsService.js';
import { resolveBranding } from '../../../settings/branding.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public branding for the host's tenant — used to theme the login page before a
 * session exists. Tenant resolved by host; returns only safe branding tokens
 * (never operational settings or sensitive data). Unknown host → brand-kit
 * defaults, so the white-label contract always holds.
 */
// Public, per-host branding — safe to cache briefly at the browser/edge. Varies
// by host (the CDN keys on host+path), and writers can only make it at most this
// stale. Cuts the branding round trip on the login screen.
const CACHE = { 'cache-control': 'public, max-age=30, stale-while-revalidate=120' };

export async function GET(request: Request): Promise<Response> {
  try {
    const resolution = await resolveActiveTenant(request.headers.get('host'));
    if (resolution.kind !== 'TENANT') {
      return json({ branding: resolveBranding(null), allowSelfSignup: false }, 200, CACHE);
    }
    const settings = await getSettings(resolution.tenant.id);
    return json(
      { branding: settings.branding, allowSelfSignup: settings.allowSelfSignup },
      200,
      CACHE,
    );
  } catch (err) {
    return respondError(err);
  }
}
