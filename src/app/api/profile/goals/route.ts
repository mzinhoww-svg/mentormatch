import { requireSession } from '../../../../auth/requireSession.js';
import { json, respondError } from '../../../../auth/http.js';
import { addGoal, listGoals } from '../../../../profile/profileService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    return json({ goals: await listGoals(s.tenantId, s.userId) });
  } catch (err) {
    return respondError(err);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const goal = await addGoal(s.tenantId, s.userId, String(body.description ?? ''));
    return json({ ok: true, goal }, 201);
  } catch (err) {
    return respondError(err);
  }
}
