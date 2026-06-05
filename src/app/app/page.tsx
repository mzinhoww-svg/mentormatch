import { headers } from 'next/headers';
import { requireSession } from '../../auth/requireSession.js';
import { withTenant } from '../../tenancy/withTenant.js';
import { HomeView } from '../../ui/views/HomeView.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Page() {
  const h = await headers();
  const session = await requireSession(h.get('host'), h.get('cookie'));
  const displayName = await withTenant(session.tenantId, async (db) => {
    const r = await db.query<{ display_name: string | null; email: string }>(
      'SELECT display_name, email FROM tenant_user WHERE id = $1',
      [session.userId],
    );
    return r.rows[0]?.display_name?.trim() || r.rows[0]?.email?.split('@')[0] || 'Colaborador(a)';
  });
  return <HomeView displayName={displayName} />;
}
