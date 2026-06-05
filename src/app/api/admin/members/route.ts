import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { getSettings } from '../../../../settings/settingsService.js';
import { inviteMember } from '../../../../admin/memberInvite.js';
import { emailBrandFromBranding } from '../../../../email/emailBrand.js';
import { json, respondError } from '../../../../auth/http.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Invites a member to the admin's tenant (creates the account + emails the
 *  set-password link). Admin only; tenant-scoped via requireAdmin. */
export async function POST(request: Request): Promise<Response> {
  try {
    const host = request.headers.get('host');
    const s = await requireAdmin(host, request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) throw expectedError(ErrorCode.VALIDATION, 'email_required');
    const branding = (await getSettings(s.tenantId)).branding;
    const tenantName = branding.displayName ?? 'MentorMatch';
    const r = await inviteMember({
      host,
      tenantName,
      email,
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      role: typeof body.role === 'string' ? body.role : undefined,
      brand: emailBrandFromBranding(branding),
    });
    return json({ ok: true, setPasswordUrl: r.setPasswordUrl, emailSent: r.emailSent, role: r.role }, 201);
  } catch (err) {
    return respondError(err);
  }
}
