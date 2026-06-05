import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireSession } from '../../auth/requireSession.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { resolveActiveTenant } from '../../tenancy/admin.js';
import { getServerBranding } from '../../ui/server-branding.js';
import { getProfileView } from '../../profile/profileService.js';
import { getOnboardingStatus } from '../../onboarding/onboardingService.js';
import { brandingStyle } from '../../ui/branding.js';
import { FontLoader } from '../../ui/FontLoader.js';
import { OnboardingWizard, type OnboardingContext } from '../../ui/views/OnboardingWizard.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const h = await headers();
  const host = h.get('host');

  let session: { userId: string; tenantId: string; role: string };
  try {
    session = await requireSession(host, h.get('cookie'));
  } catch {
    redirect('/login');
  }

  // Already done? Don't let users re-run the wizard.
  const status = await getOnboardingStatus(session.tenantId, session.userId);
  if (status.onboarded) redirect('/app');

  const [branding, resolution, identity, view] = await Promise.all([
    getServerBranding(host),
    resolveActiveTenant(host),
    withTenant(session.tenantId, async (db) => {
      const r = await db.query<{ display_name: string | null; email: string }>(
        'SELECT display_name, email FROM tenant_user WHERE id = $1',
        [session.userId],
      );
      return r.rows[0] ?? { display_name: null, email: '' };
    }),
    getProfileView(session.tenantId, session.userId),
  ]);

  const company =
    branding.displayName ?? (resolution.kind === 'TENANT' ? resolution.tenant.name : 'sua empresa');
  const displayName = identity.display_name?.trim() || identity.email.split('@')[0] || 'Colaborador(a)';
  const firstName = displayName.split(/\s+/)[0] || displayName;

  const context: OnboardingContext = {
    displayName,
    firstName,
    email: identity.email,
    company,
    avatarUrl: view.profile?.avatarUrl ?? null,
    title: view.profile?.title ?? null,
    bio: view.profile?.bio ?? null,
    linkedinUrl: view.profile?.linkedinUrl ?? null,
    languages: view.profile?.languages ?? [],
    contactWhatsapp: view.contact.contactWhatsapp,
    whatsappPublic: view.contact.contactPublic,
  };

  return (
    <div className="ob-root" style={brandingStyle(branding)}>
      <FontLoader fontFamily={branding.fontFamily} />
      <OnboardingWizard context={context} />
    </div>
  );
}
