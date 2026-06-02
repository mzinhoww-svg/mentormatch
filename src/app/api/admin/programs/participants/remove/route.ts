import { requireAdmin } from '../../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../../auth/http.js';
import { removeParticipant } from '../../../../../../program/programService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Removes (marks left) a participant: body { programId, userId }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await removeParticipant(
      s.tenantId,
      s.userId,
      String(body.programId ?? ''),
      String(body.userId ?? ''),
    );
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
