import { requireSession } from '../../../auth/requireSession.js';
import { json, respondError } from '../../../auth/http.js';
import { getProfileView, upsertProfile } from '../../../profile/profileService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    return json(await getProfileView(s.tenantId, s.userId));
  } catch (err) {
    return respondError(err);
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const profile = await upsertProfile(s.tenantId, s.userId, {
      bio: body.bio !== undefined ? String(body.bio) : undefined,
      title: body.title !== undefined ? String(body.title) : undefined,
      area: body.area !== undefined ? String(body.area) : undefined,
      seniority: body.seniority !== undefined ? String(body.seniority) : undefined,
    });
    return json({ ok: true, profile });
  } catch (err) {
    return respondError(err);
  }
}
