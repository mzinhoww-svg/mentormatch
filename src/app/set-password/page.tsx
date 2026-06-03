import { SetPasswordForm } from '../../ui/SetPasswordForm.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Friendly set-password / reset page. The admin lands here from the link in the
 * provisioning email (…/set-password?token=…). The form posts the token to the
 * existing confirm endpoint — host-scoped, so the token only works on its own
 * tenant subdomain (RLS + token tenantId match enforce isolation server-side).
 */
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.token;
  const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw[0] ?? '') : '';
  return <SetPasswordForm token={token} />;
}
