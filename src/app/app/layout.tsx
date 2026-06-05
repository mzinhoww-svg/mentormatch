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

  // Independent reads — fetch the branding and the user's identity + onboarding
  // state concurrently (the tenant resolution inside getServerBranding is already
  // cached by the requireSession call above, so this is a clean overlap).
  const [branding, userRow] = await Promise.all([
    getServerBranding(host),
    withTenant(session.tenantId, async (db) => {
      const r = await db.query<{ display_name: string | null; email: string; onboarded_at: Date | null }>(
        `SELECT u.display_name, u.email, p.onboarded_at
           FROM tenant_user u LEFT JOIN profile p ON p.tenant_user_id = u.id
          WHERE u.id = $1`,
        [session.userId],
      );
      return r.rows[0] ?? null;
    }),
  ]);

  // First login: route the collaborator through the full-screen onboarding
  // wizard before they reach the app. onboarded_at is stamped on completion.
  if (!userRow?.onboarded_at) {
    redirect('/onboarding');
  }

  const displayName = userRow.display_name ?? userRow.email ?? 'Usuário';

  return (
    <AppShell role={session.role} displayName={displayName} branding={branding}>
      {children}
    </AppShell>
  );
}
