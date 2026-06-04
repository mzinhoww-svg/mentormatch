/**
 * Skill / KnowledgeArea catalog and user↔skill associations. All tenant-scoped
 * through withTenant (RLS); skills of one tenant never appear in another.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';

export type SkillRelation = 'offered' | 'sought' | 'interest';
const RELATIONS: readonly SkillRelation[] = ['offered', 'sought', 'interest'];

export interface SkillRecord {
  id: string;
  name: string;
  category: string | null;
}

export interface UserSkillRecord {
  id: string;
  skillId: string;
  name: string;
  relation: SkillRelation;
  level: string | null;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Creates (or returns the existing) skill for the tenant. Idempotent via
 * ON CONFLICT DO UPDATE so a repeated name in the same transaction does not abort
 * it (a failed INSERT would poison the surrounding withTenant transaction).
 */
export async function createSkill(
  tenantId: string,
  input: { name: string; category?: string },
): Promise<SkillRecord> {
  const name = input.name.trim();
  if (!name) throw expectedError(ErrorCode.VALIDATION, 'skill_name_required');
  const normalized = normalizeName(name);
  return withTenant(tenantId, async (db) => {
    const res = await db.query<SkillRecord>(
      `INSERT INTO skill (tenant_id, name, normalized_name, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, normalized_name)
       DO UPDATE SET category = COALESCE(EXCLUDED.category, skill.category)
       RETURNING id, name, category`,
      [tenantId, name, normalized, input.category ?? null],
    );
    return res.rows[0]!;
  });
}

export async function listSkills(tenantId: string): Promise<SkillRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<SkillRecord>(
      'SELECT id, name, category FROM skill ORDER BY name',
    );
    return res.rows;
  });
}

/** Associates a skill with a user under a relation (offered/sought/interest). */
export async function addUserSkill(
  tenantId: string,
  userId: string,
  input: { skillId: string; relation: SkillRelation; level?: string },
): Promise<UserSkillRecord> {
  if (!RELATIONS.includes(input.relation)) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_relation');
  }
  return withTenant(tenantId, async (db) => {
    const ins = await db.query<{ id: string }>(
      `INSERT INTO user_skill (tenant_id, tenant_user_id, skill_id, relation, level)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, tenant_user_id, skill_id, relation)
       DO UPDATE SET level = EXCLUDED.level
       RETURNING id`,
      [tenantId, userId, input.skillId, input.relation, input.level ?? null],
    );
    const row = ins.rows[0]!;
    const joined = await db.query<UserSkillRecord>(
      `SELECT us.id, us.skill_id AS "skillId", s.name, us.relation, us.level
       FROM user_skill us JOIN skill s ON s.id = us.skill_id
       WHERE us.id = $1`,
      [row.id],
    );
    return joined.rows[0]!;
  });
}

export async function removeUserSkill(
  tenantId: string,
  userId: string,
  userSkillId: string,
): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.query('DELETE FROM user_skill WHERE id = $1 AND tenant_user_id = $2', [userSkillId, userId]),
  );
}

export async function listUserSkills(
  tenantId: string,
  userId: string,
): Promise<UserSkillRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<UserSkillRecord>(
      `SELECT us.id, us.skill_id AS "skillId", s.name, us.relation, us.level
       FROM user_skill us JOIN skill s ON s.id = us.skill_id
       WHERE us.tenant_user_id = $1
       ORDER BY us.relation, s.name`,
      [userId],
    );
    return res.rows;
  });
}

/**
 * Adds a skill by free-text name: finds or creates the catalog skill (idempotent
 * via normalized_name), then associates it with the user. Powers the type-and-
 * comma skill input on the profile screen.
 */
export async function addUserSkillByName(
  tenantId: string,
  userId: string,
  input: { name: string; relation: SkillRelation; level?: string },
): Promise<UserSkillRecord> {
  if (!RELATIONS.includes(input.relation)) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_relation');
  }
  const name = input.name.trim();
  if (!name) throw expectedError(ErrorCode.VALIDATION, 'skill_name_required');
  const skill = await createSkill(tenantId, { name });
  return addUserSkill(tenantId, userId, { skillId: skill.id, relation: input.relation, level: input.level });
}
