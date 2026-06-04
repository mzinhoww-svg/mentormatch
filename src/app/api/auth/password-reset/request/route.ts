import { requestPasswordReset } from '../../../../../auth/authService.js';
import { resolveActiveTenant } from '../../../../../tenancy/admin.js';
import { getSettings } from '../../../../../settings/settingsService.js';
import { sendResetPasswordEmail } from '../../../../../email/transactional.js';
import { json, respondError } from '../../../../../auth/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Issues a password-reset token and emails the reset link. Non-enumerating:
 * always responds 200 regardless of whether the email exists (so it can't probe
 * accounts). Outside production the token is also returned for testability.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const host = request.headers.get('host');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const email = String(body.email ?? '');
    const token = await requestPasswordReset({ host, email });

    if (token) {
      const resolution = await resolveActiveTenant(host);
      if (resolution.kind === 'TENANT') {
        const tenantName =
          (await getSettings(resolution.tenant.id)).branding.displayName ?? 'MentorMatch';
        const cleanHost = (host ?? '').split(':')[0];
        await sendResetPasswordEmail(
          {
            to: email,
            recipientName: null,
            tenantName,
            setPasswordUrl: `https://${cleanHost}/set-password?token=${encodeURIComponent(token)}`,
            validDays: 1,
          },
          resolution.tenant.id,
        );
      }
    }

    const exposeToken = process.env.APP_ENV !== 'production';
    return json({ ok: true, ...(exposeToken && token ? { token } : {}) }, 200);
  } catch (err) {
    return respondError(err);
  }
}
