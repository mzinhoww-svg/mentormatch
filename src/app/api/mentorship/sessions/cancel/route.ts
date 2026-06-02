import { requireSession } from '../../../../../auth/requireSession.js';
import { json, respondError } from '../../../../../auth/http.js';
import { cancelSession } from '../../../../../session/sessionService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Participant cancels an open session: body { sessionId, reason? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await cancelSession(
      s.tenantId,
      s.userId,
      String(body.sessionId ?? ''),
      body.reason !== undefined ? String(body.reason) : undefined,
    );
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
