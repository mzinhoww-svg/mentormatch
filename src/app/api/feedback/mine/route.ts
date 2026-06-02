import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { listMyFeedback } from '../../../../feedback/feedbackService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists feedback authored by the current user. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    return json({ feedback: await listMyFeedback(s.tenantId, s.userId) });
  } catch (err) {
    return respondError(err);
  }
}
