import { requireSession } from '../../../../../auth/requireSession.js';
import { json, respondError } from '../../../../../auth/http.js';
import { confirmSession } from '../../../../../session/sessionService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Participant confirms a requested session: body { sessionId }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await confirmSession(s.tenantId, s.userId, String(body.sessionId ?? ''));
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
