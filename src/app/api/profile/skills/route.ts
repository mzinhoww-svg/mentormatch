import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { addUserSkill, listUserSkills, type SkillRelation } from '../../../../profile/skillService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    return json({ skills: await listUserSkills(s.tenantId, s.userId) });
  } catch (err) {
    return respondError(err);
  }
}

/** Body: { skillId, relation: offered|sought|interest, level? } */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userSkill = await addUserSkill(s.tenantId, s.userId, {
      skillId: String(body.skillId ?? ''),
      relation: String(body.relation ?? '') as SkillRelation,
      level: body.level !== undefined ? String(body.level) : undefined,
    });
    return json({ ok: true, userSkill }, 201);
  } catch (err) {
    return respondError(err);
  }
}
