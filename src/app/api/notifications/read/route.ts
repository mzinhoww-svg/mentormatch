import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { markRead, markAllRead } from '../../../../notifications/notificationService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Marks notifications read: body { notificationId } or { all: true }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.all === true) {
      const count = await markAllRead(s.tenantId, s.userId);
      return json({ ok: true, marked: count });
    }
    await markRead(s.tenantId, s.userId, String(body.notificationId ?? ''));
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
