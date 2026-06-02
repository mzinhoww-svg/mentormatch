import { requestPasswordReset } from '../../../../../auth/authService.js';
import { json, respondError } from '../../../../../auth/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Issues a password-reset token. Non-enumerating: always responds 200 regardless
 * of whether the email exists. The token is normally emailed; outside production
 * it is returned in the body so the flow is testable (no email system yet).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const host = request.headers.get('host');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const token = await requestPasswordReset({ host, email: String(body.email ?? '') });
    const exposeToken = process.env.APP_ENV !== 'production';
    return json({ ok: true, ...(exposeToken && token ? { token } : {}) }, 200);
  } catch (err) {
    return respondError(err);
  }
}
