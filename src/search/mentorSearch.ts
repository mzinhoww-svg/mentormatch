/**
 * Manual mentor search — tenant-scoped through withTenant (RLS). Returns a
 * paginated directory of effectively-available mentors. The projection NEVER
 * includes ContactInfo (hidden until an accepted match — future slice).
 */
import { withTenant } from '../tenancy/withTenant.js';
import { buildMentorWhere, clampLimit, clampOffset, type MentorFilters } from './filters.js';

export interface MentorCard {
  tenantUserId: string;
  displayName: string | null;
  title: string | null;
  area: string | null;
  seniority: string | null;
  bio: string | null;
  avatarUrl: string | null;
  offeredSkills: string[];
  available: boolean;
}

export interface MentorSearchResult {
  items: MentorCard[];
  total: number;
  limit: number;
  offset: number;
}

interface MentorRow {
  tenantUserId: string;
  displayName: string | null;
  title: string | null;
  area: string | null;
  seniority: string | null;
  bio: string | null;
  avatarUrl: string | null;
  offeredSkills: string[] | null;
}

export async function searchMentors(
  tenantId: string,
  filters: MentorFilters = {},
): Promise<MentorSearchResult> {
  const { sql: whereSql, params } = buildMentorWhere(filters);
  const limit = clampLimit(filters.limit);
  const offset = clampOffset(filters.offset);

  return withTenant(tenantId, async (db) => {
    const countRes = await db.query<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM profile p JOIN tenant_user tu ON tu.id = p.tenant_user_id
       WHERE ${whereSql}`,
      params,
    );
    const total = countRes.rows[0]?.total ?? 0;

    const listRes = await db.query<MentorRow>(
      `SELECT p.tenant_user_id AS "tenantUserId",
              tu.display_name  AS "displayName",
              p.title, p.area, p.seniority, p.bio,
              p.avatar_url     AS "avatarUrl",
              COALESCE((
                SELECT array_agg(s.name ORDER BY s.name)
                FROM user_skill us JOIN skill s ON s.id = us.skill_id
                WHERE us.tenant_user_id = p.tenant_user_id AND us.relation = 'offered'
              ), '{}') AS "offeredSkills"
       FROM profile p JOIN tenant_user tu ON tu.id = p.tenant_user_id
       WHERE ${whereSql}
       ORDER BY tu.display_name NULLS LAST, p.tenant_user_id
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const items: MentorCard[] = listRes.rows.map((r) => ({
      tenantUserId: r.tenantUserId,
      displayName: r.displayName,
      title: r.title,
      area: r.area,
      seniority: r.seniority,
      bio: r.bio,
      avatarUrl: r.avatarUrl,
      offeredSkills: r.offeredSkills ?? [],
      available: true, // only effectively-available mentors are returned
    }));

    return { items, total, limit, offset };
  });
}
