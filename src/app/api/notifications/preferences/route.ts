import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { getPreferences, setPreference } from '../../../../notifications/notificationService.js';
import { NOTIFICATION_TYPES, type NotificationType } from '../../../../notifications/types.js';
import { expectedError } from '../../../../observability/errors.js';
import { ErrorCode } from '../../../../observability/error-codes.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists the current user's notification preferences. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    return json({ preferences: await getPreferences(s.tenantId, s.userId) });
  } catch (err) {
    return respondError(err);
  }
}

/** Upserts one preference: body { type, inApp?, email? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const type = String(body.type ?? '');
    if (!NOTIFICATION_TYPES.includes(type as NotificationType)) {
      throw expectedError(ErrorCode.VALIDATION, 'invalid_notification_type');
    }
    await setPreference(s.tenantId, s.userId, type as NotificationType, {
      inApp: typeof body.inApp === 'boolean' ? body.inApp : undefined,
      email: typeof body.email === 'boolean' ? body.email : undefined,
    });
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
