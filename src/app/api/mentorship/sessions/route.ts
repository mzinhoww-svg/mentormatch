import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { requestSession, listSessions } from '../../../../session/sessionService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Participant requests a session: body { mentorshipId, scheduledAt, objective? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const created = await requestSession(s.tenantId, s.userId, {
      mentorshipId: String(body.mentorshipId ?? ''),
      scheduledAt: String(body.scheduledAt ?? ''),
      objective: body.objective !== undefined ? String(body.objective) : undefined,
    });
    return json({ ok: true, session: created }, 201);
  } catch (err) {
    return respondError(err);
  }
}

/** Lists the current user's sessions (across their mentorships). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    return json({ sessions: await listSessions(s.tenantId, s.userId) });
  } catch (err) {
    return respondError(err);
  }
}
