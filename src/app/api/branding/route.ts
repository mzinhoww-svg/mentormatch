import { resolveActiveTenant } from '../../../tenancy/admin.js';
import { json, respondError } from '../../../auth/http.js';
import { getPublicBranding } from '../../../settings/settingsService.js';
import { resolveBranding } from '../../../settings/branding.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public branding for the host's tenant — used to theme the login page before a
 * session exists. Tenant resolved by host; returns only safe branding tokens
 * (never operational settings or sensitive data). Unknown host → brand-kit
 * defaults, so the white-label contract always holds.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const resolution = await resolveActiveTenant(request.headers.get('host'));
    if (resolution.kind !== 'TENANT') {
      return json({ branding: resolveBranding(null) });
    }
    return json({ branding: await getPublicBranding(resolution.tenant.id) });
  } catch (err) {
    return respondError(err);
  }
}
