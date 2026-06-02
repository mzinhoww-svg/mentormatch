import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireSession } from '../../auth/requireSession.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { getServerBranding } from '../../ui/server-branding.js';
import { AppShell } from '../../ui/AppShell.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authenticated shell layout. Resolves the session server-side (tenant by host
 * + mm_session cookie). Without a valid session it redirects to /login, so
 * every /app/* page is gated. No cross-tenant: the session is pinned to host.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const host = h.get('host');
  let session: { userId: string; tenantId: string; role: string };
  try {
    session = await requireSession(host, h.get('cookie'));
  } catch {
    redirect('/login');
  }

  const branding = await getServerBranding(host);
  const displayName = await withTenant(session.tenantId, async (db) => {
    const r = await db.query<{ display_name: string | null; email: string }>(
      'SELECT display_name, email FROM tenant_user WHERE id = $1',
      [session.userId],
    );
    return r.rows[0]?.display_name ?? r.rows[0]?.email ?? 'Usuário';
  });

  return (
    <AppShell role={session.role} displayName={displayName} branding={branding}>
      {children}
    </AppShell>
  );
}
