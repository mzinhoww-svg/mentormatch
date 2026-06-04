/**
 * Profile, mentoring availability, activation (consent-gated), development goals,
 * and the composed profile view (with dual-role derivation). All tenant-scoped
 * through withTenant (RLS) and bound to a TenantUser.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordProfileEvent } from './audit.js';
import { safeNotify } from '../notifications/notificationService.js';
import { deriveRoles, type DerivedRoles } from './roles.js';
import { listUserSkills, type UserSkillRecord } from './skillService.js';

export interface ProfileRecord {
  id: string;
  tenantUserId: string;
  bio: string | null;
  title: string | null;
  area: string | null;
  seniority: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  status: 'active' | 'inactive';
  mentorAvailable: boolean;
  mentorPaused: boolean;
}

export interface ProfileInput {
  bio?: string;
  title?: string;
  area?: string;
  seniority?: string;
  avatarUrl?: string | null;
  linkedinUrl?: string | null;
}

const SELECT_PROFILE = `
  SELECT id,
         tenant_user_id  AS "tenantUserId",
         bio, title, area, seniority,
         avatar_url       AS "avatarUrl",
         linkedin_url     AS "linkedinUrl",
         status,
         mentor_available AS "mentorAvailable",
         mentor_paused    AS "mentorPaused"
  FROM profile WHERE tenant_user_id = $1`;

const RETURNING_PROFILE = `
  RETURNING id, tenant_user_id AS "tenantUserId", bio, title, area, seniority,
            avatar_url AS "avatarUrl", linkedin_url AS "linkedinUrl", status,
            mentor_available AS "mentorAvailable", mentor_paused AS "mentorPaused"`;

export async function getProfile(tenantId: string, userId: string): Promise<ProfileRecord | null> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<ProfileRecord>(SELECT_PROFILE, [userId]);
    return res.rows[0] ?? null;
  });
}

/** Creates or updates the profile's descriptive fields (status unchanged). */
export async function upsertProfile(
  tenantId: string,
  userId: string,
  input: ProfileInput,
): Promise<ProfileRecord> {
  const profile = await withTenant(tenantId, async (db) => {
    const res = await db.query<ProfileRecord>(
      `INSERT INTO profile (tenant_id, tenant_user_id, bio, title, area, seniority, avatar_url, linkedin_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, tenant_user_id) DO UPDATE
         SET bio = EXCLUDED.bio, title = EXCLUDED.title, area = EXCLUDED.area,
             seniority = EXCLUDED.seniority,
             avatar_url = COALESCE($7, profile.avatar_url),
             linkedin_url = COALESCE($8, profile.linkedin_url),
             updated_at = now()
       ${RETURNING_PROFILE}`,
      [
        tenantId, userId,
        input.bio ?? null, input.title ?? null, input.area ?? null, input.seniority ?? null,
        input.avatarUrl ?? null, input.linkedinUrl ?? null,
      ],
    );
    return res.rows[0]!;
  });
  await recordProfileEvent(tenantId, 'profile.updated', { actorId: userId });
  await safeNotify(tenantId, {
    type: 'profile.updated',
    targetUserId: userId,
    originEvent: 'profile.updated',
    payload: {},
  });
  return profile;
}

/**
 * Activates the profile — but ONLY if the user has recorded consent. Without a
 * consent_record the profile cannot be activated (stays inactive).
 */
export async function activateProfile(tenantId: string, userId: string): Promise<ProfileRecord> {
  const profile = await withTenant(tenantId, async (db) => {
    const consent = await db.query(
      'SELECT 1 FROM consent_record WHERE tenant_user_id = $1 LIMIT 1',
      [userId],
    );
    if (consent.rowCount === 0) {
      throw expectedError(ErrorCode.VALIDATION, 'consent_required');
    }
    const res = await db.query<ProfileRecord>(
      `INSERT INTO profile (tenant_id, tenant_user_id, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (tenant_id, tenant_user_id) DO UPDATE SET status = 'active', updated_at = now()
       ${RETURNING_PROFILE}`,
      [tenantId, userId],
    );
    return res.rows[0]!;
  });
  await recordProfileEvent(tenantId, 'profile.activated', { actorId: userId });
  return profile;
}

async function setAvailabilityFields(
  tenantId: string,
  userId: string,
  fields: { mentorAvailable?: boolean; mentorPaused?: boolean },
): Promise<ProfileRecord> {
  const profile = await withTenant(tenantId, async (db) => {
    const res = await db.query<ProfileRecord>(
      `INSERT INTO profile (tenant_id, tenant_user_id, mentor_available, mentor_paused)
       VALUES ($1, $2, COALESCE($3, false), COALESCE($4, false))
       ON CONFLICT (tenant_id, tenant_user_id) DO UPDATE
         SET mentor_available = COALESCE($3, profile.mentor_available),
             mentor_paused    = COALESCE($4, profile.mentor_paused),
             updated_at = now()
       ${RETURNING_PROFILE}`,
      [tenantId, userId, fields.mentorAvailable ?? null, fields.mentorPaused ?? null],
    );
    return res.rows[0]!;
  });
  await recordProfileEvent(tenantId, 'profile.availability_changed', {
    actorId: userId,
    metadata: fields,
  });
  return profile;
}

/** Sets whether the user offers mentoring. */
export function setMentorAvailable(
  tenantId: string,
  userId: string,
  available: boolean,
): Promise<ProfileRecord> {
  return setAvailabilityFields(tenantId, userId, { mentorAvailable: available });
}

/** Pauses/unpauses mentoring availability without losing the offer flag. */
export function setMentorPaused(
  tenantId: string,
  userId: string,
  paused: boolean,
): Promise<ProfileRecord> {
  return setAvailabilityFields(tenantId, userId, { mentorPaused: paused });
}

export interface GoalRecord {
  id: string;
  description: string;
  status: 'open' | 'done';
}

export async function addGoal(
  tenantId: string,
  userId: string,
  description: string,
): Promise<GoalRecord> {
  const text = description.trim();
  if (!text) throw expectedError(ErrorCode.VALIDATION, 'goal_required');
  return withTenant(tenantId, async (db) => {
    const res = await db.query<GoalRecord>(
      `INSERT INTO development_goal (tenant_id, tenant_user_id, description)
       VALUES ($1, $2, $3) RETURNING id, description, status`,
      [tenantId, userId, text],
    );
    return res.rows[0]!;
  });
}

export async function listGoals(tenantId: string, userId: string): Promise<GoalRecord[]> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<GoalRecord>(
      'SELECT id, description, status FROM development_goal WHERE tenant_user_id = $1 ORDER BY created_at',
      [userId],
    );
    return res.rows;
  });
}

export interface ContactInfo {
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactPublic: boolean;
}

export interface ProfileView {
  profile: ProfileRecord | null;
  contact: ContactInfo;
  skills: { offered: UserSkillRecord[]; sought: UserSkillRecord[]; interest: UserSkillRecord[] };
  goals: GoalRecord[];
  roles: DerivedRoles;
}

async function getContactInfo(tenantId: string, userId: string): Promise<ContactInfo> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<ContactInfo>(
      `SELECT contact_email AS "contactEmail", contact_phone AS "contactPhone",
              contact_whatsapp AS "contactWhatsapp", contact_public AS "contactPublic"
       FROM tenant_user WHERE id = $1`,
      [userId],
    );
    return res.rows[0] ?? { contactEmail: null, contactPhone: null, contactWhatsapp: null, contactPublic: false };
  });
}

/** Updates the current user's own contact details and visibility flag. */
export async function updateContact(
  tenantId: string,
  userId: string,
  input: { contactEmail?: string | null; contactPhone?: string | null; contactWhatsapp?: string | null; contactPublic?: boolean },
): Promise<ContactInfo> {
  const contact = await withTenant(tenantId, async (db) => {
    const res = await db.query<ContactInfo>(
      `UPDATE tenant_user SET
         contact_email    = COALESCE($2, contact_email),
         contact_phone    = COALESCE($3, contact_phone),
         contact_whatsapp = COALESCE($4, contact_whatsapp),
         contact_public   = COALESCE($5, contact_public),
         updated_at = now()
       WHERE id = $1
       RETURNING contact_email AS "contactEmail", contact_phone AS "contactPhone",
                 contact_whatsapp AS "contactWhatsapp", contact_public AS "contactPublic"`,
      [userId, input.contactEmail ?? null, input.contactPhone ?? null, input.contactWhatsapp ?? null, input.contactPublic ?? null],
    );
    return res.rows[0]!;
  });
  await recordProfileEvent(tenantId, 'profile.updated', { actorId: userId });
  return contact;
}

/** Composed view used by the UI; derives dual-role flags. */
export async function getProfileView(tenantId: string, userId: string): Promise<ProfileView> {
  const [profile, contact, allSkills, goals] = await Promise.all([
    getProfile(tenantId, userId),
    getContactInfo(tenantId, userId),
    listUserSkills(tenantId, userId),
    listGoals(tenantId, userId),
  ]);
  const skills = {
    offered: allSkills.filter((s) => s.relation === 'offered'),
    sought: allSkills.filter((s) => s.relation === 'sought'),
    interest: allSkills.filter((s) => s.relation === 'interest'),
  };
  const roles = deriveRoles({
    mentorAvailable: profile?.mentorAvailable ?? false,
    mentorPaused: profile?.mentorPaused ?? false,
    hasSoughtSkills: skills.sought.length > 0,
  });
  return { profile, contact, skills, goals, roles };
}
