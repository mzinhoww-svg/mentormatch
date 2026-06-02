import { requireSession } from '../../../../../auth/requireSession.js';
import { json, respondError } from '../../../../../auth/http.js';
import { cancelRequest } from '../../../../../mentorship/mentorshipService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mentee cancels their own open request: body { requestId }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await cancelRequest(s.tenantId, s.userId, String(body.requestId ?? ''));
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
