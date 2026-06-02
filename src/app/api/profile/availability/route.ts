import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { setMentorAvailable, setMentorPaused } from '../../../../profile/profileService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Body: { available?: boolean, paused?: boolean }. Updates mentoring availability. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    let profile;
    if (typeof body.available === 'boolean') {
      profile = await setMentorAvailable(s.tenantId, s.userId, body.available);
    }
    if (typeof body.paused === 'boolean') {
      profile = await setMentorPaused(s.tenantId, s.userId, body.paused);
    }
    return json({ ok: true, profile: profile ?? null });
  } catch (err) {
    return respondError(err);
  }
}
