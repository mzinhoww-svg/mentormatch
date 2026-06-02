import { requireSession } from '../../../auth/requireSession.js';
import { json, respondError } from '../../../auth/http.js';
import { searchMentors } from '../../../search/mentorSearch.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function num(value: string | null): number | undefined {
  if (value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Mentor directory search (tenant-scoped). Query params: skill, skillId, area,
 * title, seniority, q, limit, offset. The viewer is excluded from results.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const s = await requireSession(request.headers.get('host'), request.headers.get('cookie'));
    const params = new URL(request.url).searchParams;
    const result = await searchMentors(s.tenantId, {
      skill: params.get('skill') ?? undefined,
      skillId: params.get('skillId') ?? undefined,
      area: params.get('area') ?? undefined,
      title: params.get('title') ?? undefined,
      seniority: params.get('seniority') ?? undefined,
      q: params.get('q') ?? undefined,
      limit: num(params.get('limit')),
      offset: num(params.get('offset')),
      excludeUserId: s.userId,
    });
    return json(result);
  } catch (err) {
    return respondError(err);
  }
}
