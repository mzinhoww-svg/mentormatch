import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { addUserSkill, addUserSkillByName, listUserSkills, removeUserSkill, type SkillRelation } from '../../../../profile/skillService.js';

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

/** Body: { skillId | name, relation: offered|sought|interest, level? } */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const relation = String(body.relation ?? '') as SkillRelation;
    const level = body.level !== undefined ? String(body.level) : undefined;
    // Free-text name (create-or-reuse) takes precedence; falls back to an explicit skillId.
    const userSkill = body.name !== undefined && String(body.name).trim()
      ? await addUserSkillByName(s.tenantId, s.userId, { name: String(body.name), relation, level })
      : await addUserSkill(s.tenantId, s.userId, { skillId: String(body.skillId ?? ''), relation, level });
    return json({ ok: true, userSkill }, 201);
  } catch (err) {
    return respondError(err);
  }
}

/** Removes one of the current user's skills. Body or query: { userSkillId }. */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const fromQuery = new URL(request.url).searchParams.get('userSkillId');
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userSkillId = fromQuery ?? (body.userSkillId !== undefined ? String(body.userSkillId) : '');
    await removeUserSkill(s.tenantId, s.userId, userSkillId);
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
