import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { updateContact } from '../../../../profile/profileService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Updates the current user's own contact info and public visibility flag. */
export async function PUT(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const str = (v: unknown) => (v === undefined ? undefined : v === null ? null : String(v));
    const contact = await updateContact(s.tenantId, s.userId, {
      contactEmail: str(body.contactEmail),
      contactPhone: str(body.contactPhone),
      contactWhatsapp: str(body.contactWhatsapp),
      contactPublic: body.contactPublic !== undefined ? Boolean(body.contactPublic) : undefined,
    });
    return json({ ok: true, contact });
  } catch (err) {
    return respondError(err);
  }
}
