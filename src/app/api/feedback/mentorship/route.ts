import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { submitMentorshipFeedback } from '../../../../feedback/feedbackService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Rate your mentorship counterpart: body { mentorshipId, score, comment? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const fb = await submitMentorshipFeedback(
      s.tenantId,
      s.userId,
      String(body.mentorshipId ?? ''),
      Number(body.score),
      body.comment !== undefined ? String(body.comment) : undefined,
    );
    return json({ ok: true, feedback: fb }, 201);
  } catch (err) {
    return respondError(err);
  }
}
