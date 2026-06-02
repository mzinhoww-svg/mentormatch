import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { revealContact } from '../../../../mentorship/contactReveal.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reveals another user's ContactInfo — only if an active mentorship links them
 * (after an accepted match). Query: ?userId=<otherUserId>.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const otherUserId = new URL(request.url).searchParams.get('userId') ?? '';
    const contact = await revealContact(s.tenantId, s.userId, otherUserId);
    return json({ contact });
  } catch (err) {
    return respondError(err);
  }
}
