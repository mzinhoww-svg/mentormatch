import { requireSession } from '../../../../../auth/requireSession.js';
import { json, respondError } from '../../../../../auth/http.js';
import { completeSession } from '../../../../../session/sessionService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Participant completes a confirmed session: body { sessionId, notes? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await completeSession(
      s.tenantId,
      s.userId,
      String(body.sessionId ?? ''),
      body.notes !== undefined ? String(body.notes) : undefined,
    );
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
