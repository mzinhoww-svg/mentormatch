import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { resolveActiveTenant } from '../../tenancy/admin.js';
import { getPublicBranding } from '../../settings/settingsService.js';
import { MentorMatchHome } from '../../marketing/MentorMatchHome.js';
import { TenantLanding } from '../../marketing/TenantLanding.js';
import { INSTITUTIONAL_METADATA } from '../../marketing/homeMetadata.js';

// Host-aware: the same root renders the MentorMatch institutional home on the
// base domain, and the white-label employee landing on a tenant host. Reading
// the host forces dynamic rendering.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host');
  const resolution = await resolveActiveTenant(host);
  if (resolution.kind !== 'TENANT') return INSTITUTIONAL_METADATA;

  // White-label: on a tenant host the page presents itself as the tenant's own
  // benefit — no MentorMatch in the title (absolute bypasses the layout's
  // "%s · MentorMatch" template), and it stays out of public search indexes.
  const branding = await getPublicBranding(resolution.tenant.id);
  const company = branding.displayName ?? resolution.tenant.name;
  return {
    title: { absolute: `${company} · ${branding.programName}` },
    description: `${branding.programName} é um benefício que a ${company} oferece a você: mentoria com quem já trilhou o caminho, sem custo. Acesse e comece a evoluir.`,
    applicationName: company,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${company} · ${branding.programName}`,
      description: `Seu programa de mentoria, um benefício da ${company}.`,
      siteName: company,
    },
  };
}

export default async function HomePage() {
  const host = (await headers()).get('host');
  const resolution = await resolveActiveTenant(host);
  if (resolution.kind !== 'TENANT') return <MentorMatchHome />;

  const branding = await getPublicBranding(resolution.tenant.id);
  // Always carry a company name for the copy: fall back to the registry tenant
  // name when the admin hasn't set a branding display name.
  return (
    <TenantLanding branding={{ ...branding, displayName: branding.displayName ?? resolution.tenant.name }} />
  );
}
