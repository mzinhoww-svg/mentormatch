import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveTenantFromHost } from '../../../tenancy/resolveTenant.js';
import { PlatformLoginForm } from '../../../ui/PlatformLoginForm.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Platform console login — only served on the platform host (admin.<base>). */
export default async function ConsoleLoginPage() {
  const h = await headers();
  if (resolveTenantFromHost(h.get('host')).kind !== 'PLATFORM_ADMIN') notFound();
  return <PlatformLoginForm />;
}
