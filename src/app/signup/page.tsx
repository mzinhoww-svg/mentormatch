import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveTenantFromHost } from '../../tenancy/resolveTenant.js';
import { SignupForm } from '../../ui/SignupForm.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Member self-signup — only served on a tenant host (the form + server gate
 *  also respect the tenant's allowSelfSignup flag). */
export default async function SignupPage() {
  const h = await headers();
  if (resolveTenantFromHost(h.get('host')).kind !== 'TENANT') notFound();
  return <SignupForm />;
}
