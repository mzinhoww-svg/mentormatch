import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import {
  requestMentorship,
  listRequestsForMentor,
  listRequestsForMentee,
} from '../../../../mentorship/mentorshipService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mentee creates a request: body { mentorId, skillId?, message? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const created = await requestMentorship(s.tenantId, s.userId, {
      mentorId: String(body.mentorId ?? ''),
      skillId: body.skillId !== undefined ? String(body.skillId) : undefined,
      message: body.message !== undefined ? String(body.message) : undefined,
    });
    return json({ ok: true, request: created }, 201);
  } catch (err) {
    return respondError(err);
  }
}

/** Lists the current user's requests, both as mentor and as mentee. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const [asMentor, asMentee] = await Promise.all([
      listRequestsForMentor(s.tenantId, s.userId),
      listRequestsForMentee(s.tenantId, s.userId),
    ]);
    return json({ asMentor, asMentee });
  } catch (err) {
    return respondError(err);
  }
}
