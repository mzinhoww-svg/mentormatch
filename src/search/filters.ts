/**
 * Mentor search filters + pagination (pure; builds parameterized SQL fragments).
 *
 * Eligibility (always applied): profile active, mentor_available, NOT paused —
 * paused/inactive mentors never appear in the directory. ContactInfo is never
 * referenced here (the projection excludes it).
 */

export interface MentorFilters {
  skill?: string; // offered skill name (substring match)
  skillId?: string; // offered skill id (exact)
  area?: string;
  title?: string; // cargo
  seniority?: string;
  q?: string; // free keyword
  limit?: number;
  offset?: number;
  excludeUserId?: string; // e.g. the viewer
}

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function clampLimit(n?: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

export function clampOffset(n?: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export interface WhereResult {
  sql: string;
  params: unknown[];
}

const OFFERED_EXISTS = (cond: string) =>
  `EXISTS (SELECT 1 FROM user_skill us JOIN skill s ON s.id = us.skill_id
           WHERE us.tenant_user_id = p.tenant_user_id AND us.relation = 'offered' AND ${cond})`;

/** Builds the WHERE clause + ordered params for a mentor search. */
export function buildMentorWhere(filters: MentorFilters): WhereResult {
  const clauses = [
    "p.status = 'active'",
    'p.mentor_available = true',
    'p.mentor_paused = false',
  ];
  const params: unknown[] = [];
  const p = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.excludeUserId) clauses.push(`p.tenant_user_id <> ${p(filters.excludeUserId)}`);
  if (filters.skillId) clauses.push(OFFERED_EXISTS(`s.id = ${p(filters.skillId)}`));
  if (filters.skill) clauses.push(OFFERED_EXISTS(`s.name ILIKE ${p(`%${filters.skill}%`)}`));
  if (filters.area) clauses.push(`p.area ILIKE ${p(`%${filters.area}%`)}`);
  if (filters.title) clauses.push(`p.title ILIKE ${p(`%${filters.title}%`)}`);
  if (filters.seniority) clauses.push(`lower(p.seniority) = lower(${p(filters.seniority)})`);
  if (filters.q) {
    const ph = p(`%${filters.q}%`);
    clauses.push(
      `(tu.display_name ILIKE ${ph} OR p.title ILIKE ${ph} OR p.area ILIKE ${ph} OR p.bio ILIKE ${ph} OR ${OFFERED_EXISTS(
        `s.name ILIKE ${ph}`,
      )})`,
    );
  }

  return { sql: clauses.join(' AND '), params };
}
