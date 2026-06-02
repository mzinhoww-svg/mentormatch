import { resetPassword } from '../../../../../auth/authService.js';
import { json, respondError } from '../../../../../auth/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const host = request.headers.get('host');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await resetPassword({
      host,
      token: String(body.token ?? ''),
      newPassword: String(body.password ?? ''),
      ip: request.headers.get('x-forwarded-for') ?? undefined,
    });
    return json({ ok: true }, 200);
  } catch (err) {
    return respondError(err);
  }
}
