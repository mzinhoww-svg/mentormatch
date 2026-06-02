import { logout } from '../../../../auth/authService.js';
import { requireSession } from '../../../../auth/requireSession.js';
import { clearSessionCookie } from '../../../../auth/cookies.js';
import { jsonWithCookie } from '../../../../auth/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  // Best-effort audit if a valid session is present; always clear the cookie.
  try {
    const session = await requireSession(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    await logout(session.tenantId, session.userId, {
      ip: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });
  } catch {
    // no valid session — still clear the cookie
  }
  return jsonWithCookie({ ok: true }, clearSessionCookie(), 200);
}
