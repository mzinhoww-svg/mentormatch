import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { listMentorships } from '../../../../mentorship/mentorshipService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists the current user's mentorships (as mentor or mentee). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    return json({ mentorships: await listMentorships(s.tenantId, s.userId) });
  } catch (err) {
    return respondError(err);
  }
}
