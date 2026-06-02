import { requireSession } from '../../../auth/requireSession.js';
import { json, respondError } from '../../../auth/http.js';
import { createSkill, listSkills } from '../../../profile/skillService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    return json({ skills: await listSkills(s.tenantId) });
  } catch (err) {
    return respondError(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const skill = await createSkill(s.tenantId, {
      name: String(body.name ?? ''),
      category: body.category !== undefined ? String(body.category) : undefined,
    });
    return json({ ok: true, skill }, 201);
  } catch (err) {
    return respondError(err);
  }
}
