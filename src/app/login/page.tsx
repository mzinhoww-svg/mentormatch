import { headers } from 'next/headers';
import { resolveTenantFromHost } from '../../tenancy/resolveTenant.js';
import { LoginForm } from '../../ui/LoginForm.js';
import { WorkspaceEntry } from '../../ui/WorkspaceEntry.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Host-aware auth entry:
 *  - {slug}.<base>/login  → tenant-scoped login (LoginForm), auth as today.
 *  - <base>/login (root/institutional) → workspace chooser (no global login).
 * Only the *rendering decision* depends on resolveTenantFromHost; auth/RLS/
 * tenant resolution are unchanged.
 */
export default async function LoginPage() {
  const h = await headers();
  const resolution = resolveTenantFromHost(h.get('host'));
  return resolution.kind === 'TENANT' ? <LoginForm /> : <WorkspaceEntry />;
}
