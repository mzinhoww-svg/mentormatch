import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '../../platform/requirePlatformAdmin.js';
import { PlatformConsole } from '../../ui/views/PlatformConsole.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Platform console — requires platform host + a valid platform session. */
export default async function ConsolePage() {
  const h = await headers();
  const admin = await requirePlatformAdmin(h.get('host'), h.get('cookie')).catch(() => null);
  if (!admin) redirect('/console/login');
  return <PlatformConsole adminEmail={admin.email} />;
}
