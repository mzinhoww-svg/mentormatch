import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { withdrawFeedback } from '../../../../feedback/feedbackService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Withdraws the author's own feedback: body { feedbackId }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await withdrawFeedback(s.tenantId, s.userId, String(body.feedbackId ?? ''));
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
