import { requireAdmin } from '../../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../../auth/http.js';
import { setProgramStatus } from '../../../../../program/programService.js';
import type { ProgramStatus } from '../../../../../program/rules.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sets a program's status: body { programId, status: 'active'|'inactive' }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await setProgramStatus(
      s.tenantId,
      s.userId,
      String(body.programId ?? ''),
      String(body.status ?? '') as ProgramStatus,
    );
    return json({ ok: true });
  } catch (err) {
    return respondError(err);
  }
}
