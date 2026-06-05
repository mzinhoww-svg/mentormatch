/**
 * First-login onboarding. Turns the wizard's answers into the existing profile
 * model in one shot: it sets the descriptive fields, spoken languages, WhatsApp
 * + visibility, the chosen side (mentor offers mentoring; mentee seeks skills),
 * attaches the picked skills, activates the profile (consent permitting) and
 * stamps onboarded_at so the /app gate stops sending the user here.
 *
 * Intention is NOT a stored column — it maps onto the dual-role model: a "mentor"
 * sets mentor_available + offered skills; a "mentee" gets sought skills. A user
 * can later take on the other role from their profile, exactly as before.
 */
import { withTenant } from '../tenancy/withTenant.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { recordProfileEvent } from '../profile/audit.js';
import { safeNotify } from '../notifications/notificationService.js';
import { addUserSkillByName } from '../profile/skillService.js';
import { normalizeLanguages } from '../profile/languages.js';

export type OnboardingIntention = 'mentor' | 'mentee';

export interface OnboardingSkillInput {
  name: string;
  level?: string;
}

export interface OnboardingInput {
  intention: OnboardingIntention;
  displayName?: string | null;
  title?: string | null;
  bio?: string | null;
  linkedinUrl?: string | null;
  avatarUrl?: string | null;
  languages?: string[];
  contactWhatsapp?: string | null;
  whatsappPublic?: boolean;
  skills?: OnboardingSkillInput[];
}

const MAX_SKILLS = 15;

export async function getOnboardingStatus(
  tenantId: string,
  userId: string,
): Promise<{ onboarded: boolean }> {
  return withTenant(tenantId, async (db) => {
    const res = await db.query<{ onboarded: boolean }>(
      `SELECT (onboarded_at IS NOT NULL) AS onboarded FROM profile WHERE tenant_user_id = $1`,
      [userId],
    );
    return { onboarded: res.rows[0]?.onboarded ?? false };
  });
}

export async function completeOnboarding(
  tenantId: string,
  userId: string,
  input: OnboardingInput,
): Promise<void> {
  if (input.intention !== 'mentor' && input.intention !== 'mentee') {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_intention');
  }
  const mentorAvailable = input.intention === 'mentor';
  const relation = input.intention === 'mentor' ? 'offered' : 'sought';
  const languages = normalizeLanguages(input.languages ?? []);
  const displayName = input.displayName?.trim() || null;

  // Core, atomic: names, contact, profile fields + flags + onboarded_at.
  await withTenant(tenantId, async (db) => {
    await db.query(
      `UPDATE tenant_user SET
         display_name     = COALESCE($2, display_name),
         contact_whatsapp = COALESCE($3, contact_whatsapp),
         contact_public   = COALESCE($4, contact_public),
         updated_at = now()
       WHERE id = $1`,
      [userId, displayName, input.contactWhatsapp ?? null, input.whatsappPublic ?? null],
    );

    const consent = await db.query('SELECT 1 FROM consent_record WHERE tenant_user_id = $1 LIMIT 1', [userId]);
    const status = (consent.rowCount ?? 0) > 0 ? 'active' : 'inactive';

    await db.query(
      `INSERT INTO profile
         (tenant_id, tenant_user_id, title, bio, linkedin_url, avatar_url,
          languages, mentor_available, status, onboarded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
       ON CONFLICT (tenant_id, tenant_user_id) DO UPDATE SET
         title            = EXCLUDED.title,
         bio              = EXCLUDED.bio,
         linkedin_url     = COALESCE(EXCLUDED.linkedin_url, profile.linkedin_url),
         avatar_url       = COALESCE(EXCLUDED.avatar_url, profile.avatar_url),
         languages        = EXCLUDED.languages,
         mentor_available = EXCLUDED.mentor_available,
         status           = CASE WHEN $9 = 'active' THEN 'active' ELSE profile.status END,
         onboarded_at     = COALESCE(profile.onboarded_at, now()),
         updated_at       = now()`,
      [
        tenantId, userId,
        input.title?.trim() || null,
        input.bio?.trim() || null,
        input.linkedinUrl?.trim() || null,
        input.avatarUrl?.trim() || null,
        languages,
        mentorAvailable,
        status,
      ],
    );
  });

  // Skills: find-or-create + associate (each idempotent). Capped to avoid abuse.
  for (const s of (input.skills ?? []).slice(0, MAX_SKILLS)) {
    const name = s.name?.trim();
    if (!name) continue;
    await addUserSkillByName(tenantId, userId, {
      name,
      relation,
      level: relation === 'offered' ? s.level : undefined,
    });
  }

  await recordProfileEvent(tenantId, 'profile.onboarded', {
    actorId: userId,
    metadata: { intention: input.intention },
  });
  await safeNotify(tenantId, {
    type: 'profile.updated',
    targetUserId: userId,
    originEvent: 'profile.onboarded',
    payload: {},
  });
}
