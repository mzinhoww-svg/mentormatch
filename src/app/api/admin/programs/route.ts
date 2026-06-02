import { requireAdmin } from '../../../../admin/requireAdmin.js';
import { json, respondError } from '../../../../auth/http.js';
import { listPrograms, createProgram } from '../../../../program/programService.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Lists the tenant's programs (default first). */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    return json({ programs: await listPrograms(s.tenantId) });
  } catch (err) {
    return respondError(err);
  }
}

/** Creates a program: body { name, description?, capacity? }. */
export async function POST(request: Request): Promise<Response> {
  try {
    const s = await requireAdmin(request.headers.get('host'), request.headers.get('cookie'));
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const program = await createProgram(s.tenantId, s.userId, {
      name: String(body.name ?? ''),
      description: body.description !== undefined ? String(body.description) : undefined,
      capacity: typeof body.capacity === 'number' ? body.capacity : undefined,
    });
    return json({ ok: true, program }, 201);
  } catch (err) {
    return respondError(err);
  }
}
