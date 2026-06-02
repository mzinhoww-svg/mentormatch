import { requireSession } from '../../../auth/requireSession.js';
import { json, respondError } from '../../../auth/http.js';
import { listNotifications, unreadCount } from '../../../notifications/notificationService.js';
import type { NotificationStatus } from '../../../notifications/types.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists the current user's notifications. Query: ?status=unread|read. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const statusParam = new URL(request.url).searchParams.get('status');
    const status =
      statusParam === 'unread' || statusParam === 'read'
        ? (statusParam as NotificationStatus)
        : undefined;
    const [notifications, unread] = await Promise.all([
      listNotifications(s.tenantId, s.userId, { status }),
      unreadCount(s.tenantId, s.userId),
    ]);
    return json({ notifications, unread });
  } catch (err) {
    return respondError(err);
  }
}
