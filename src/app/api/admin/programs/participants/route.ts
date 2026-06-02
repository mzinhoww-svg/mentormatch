import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { listParticipants, addParticipant } from '../../../../../program/programService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists a program's participants. Query: ?programId=. */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const programId = new URL(request.url).searchParams.get('programId') ?? '';
    return json({ participants: await listParticipants(s.tenantId, programId) });
  } catch (err) {
    return respondError(err);
  }
}

/** Adds a participant: body { programId, userId, roleInProgram? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const participant = await addParticipant(
      s.tenantId,
      s.userId,
      String(body.programId ?? ''),
      String(body.userId ?? ''),
      body.roleInProgram !== undefined ? String(body.roleInProgram) : undefined,
    );
    return json({ ok: true, participant }, 201);
  } catch (err) {
    return respondError(err);
  }
}
