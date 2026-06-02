import { requireSession } from '../../../../../auth/requireSession.js';
import { json, respondError } from '../../../../../auth/http.js';
import { acceptRequest } from '../../../../../mentorship/mentorshipService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mentor accepts a request: body { requestId }. Creates an active mentorship. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await acceptRequest(s.tenantId, s.userId, String(body.requestId ?? ''));
    return json({ ok: true, ...result });
  } catch (err) {
    return respondError(err);
  }
}
