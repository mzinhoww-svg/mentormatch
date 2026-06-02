/**
 * Server-side branding resolution for the authenticated shell. Resolves the
 * tenant from the request host and returns its branding (or brand-kit defaults
 * for a non-tenant host), so the shell is themed without a client flash.
 */
import { resolveActiveTenant } from '../tenancy/admin.js';
import { getPublicBranding } from '../settings/settingsService.js';
import { resolveBranding } from '../settings/branding.js';
import type { Branding } from './branding.js';

export async function getServerBranding(host: string | null | undefined): Promise<Branding> {
  const resolution = await resolveActiveTenant(host);
  if (resolution.kind !== 'TENANT') return resolveBranding(null);
  return getPublicBranding(resolution.tenant.id);
}
