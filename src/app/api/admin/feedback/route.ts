import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { listFeedback } from '../../../../feedback/feedbackService.js';
import type { FeedbackType } from '../../../../feedback/rules.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin listing of tenant feedback. Query: ?type=session|mentor|mentee|program. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const type = new URL(request.url).searchParams.get('type') ?? undefined;
    return json({ feedback: await listFeedback(s.tenantId, { feedbackType: type as FeedbackType | undefined }) });
  } catch (err) {
    return respondError(err);
  }
}
