import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { updateProgram } from '../../../../../program/programService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Edits a program: body { programId, name?, description?, capacity? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const program = await updateProgram(s.tenantId, s.userId, String(body.programId ?? ''), {
      name: body.name !== undefined ? String(body.name) : undefined,
      description: body.description !== undefined ? String(body.description) : undefined,
      capacity:
        body.capacity === null
          ? null
          : typeof body.capacity === 'number'
            ? body.capacity
            : undefined,
    });
    return json({ ok: true, program });
  } catch (err) {
    return respondError(err);
  }
}
