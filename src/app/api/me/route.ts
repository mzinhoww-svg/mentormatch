import { requireSession } from '../../../auth/requireSession.js';
import { json, respondError } from '../../../auth/http.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Protected route: returns the current session, or 401 without a valid one. */
export async function GET(request: Request): Promise<Response> {
  try {
    const session = await requireSession(
      request.headers.get('host'),
      request.headers.get('cookie'),
    );
    return json({ userId: session.userId, tenantId: session.tenantId, role: session.role });
  } catch (err) {
    return respondError(err);
  }
}
