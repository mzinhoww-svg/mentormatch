import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { submitSessionFeedback } from '../../../../feedback/feedbackService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Post-session feedback: body { sessionId, score, comment? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const fb = await submitSessionFeedback(
      s.tenantId,
      s.userId,
      String(body.sessionId ?? ''),
      Number(body.score),
      body.comment !== undefined ? String(body.comment) : undefined,
    );
    return json({ ok: true, feedback: fb }, 201);
  } catch (err) {
    return respondError(err);
  }
}
