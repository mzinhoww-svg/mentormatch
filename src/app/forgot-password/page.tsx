import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveTenantFromHost } from '../../tenancy/resolveTenant.js';
import { ForgotPasswordForm } from '../../ui/ForgotPasswordForm.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Forgot-password — only on a tenant host (reset is tenant-scoped). */
export default async function ForgotPasswordPage() {
  const h = await headers();
  if (resolveTenantFromHost(h.get('host')).kind !== 'TENANT') notFound();
  return <ForgotPasswordForm />;
}
