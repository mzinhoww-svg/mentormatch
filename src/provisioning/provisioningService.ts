/**
 * Tenant provisioning — demo seeding + real/production. Builds a usable tenant from a single
 * call — tenant + default program (via createTenant) + branding + admin + mentors
 * + mentees + program participants + a sample mentorship/session — so a company
 * can start WITHOUT developer intervention. Everything goes through the real
 * domain services (consent, RLS, audit, notifications), so seeded data is
 * indistinguishable from data created by real usage. Idempotent on slug.
 */
import { randomBytes } from 'node:crypto';

import { createTenant, findTenantBySlug, type TenantRecord } from '../tenancy/admin.js';
import { RESERVED_SUBDOMAINS, getBaseDomain } from '../tenancy/resolveTenant.js';
import { signup, login } from '../auth/authService.js';
import { createResetToken } from '../auth/session.js';
import { logger } from '../observability/logger.js';
import { getEmailProvider, type EmailProvider } from '../email/provider.js';
import { sendSetPasswordEmail } from '../email/transactional.js';
import { upsertProfile, activateProfile, setMentorAvailable } from '../profile/profileService.js';
import { createSkill, addUserSkill } from '../profile/skillService.js';
import { getDefaultProgram, addParticipant } from '../program/programService.js';
import { updateSettings } from '../settings/settingsService.js';
import { requestMentorship, acceptRequest } from '../mentorship/mentorshipService.js';
import { requestSession, confirmSession, completeSession } from '../session/sessionService.js';
import {
  buildDemoPlan,
  buildRealPlan,
  DEFAULT_DEMO_PASSWORD,
  type RealBrandingInput,
  type SeedUser,
} from './plan.js';

export interface ProvisionedUser {
  key: string;
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export interface ProvisionResult {
  alreadyExisted: boolean;
  tenant: TenantRecord;
  host: string;
  loginUrlDev: string;
  loginUrlProd: string;
  password: string;
  admin: ProvisionedUser;
  mentors: ProvisionedUser[];
  mentees: ProvisionedUser[];
  counts: { mentors: number; mentees: number; participants: number; mentorships: number; sessions: number };
}

export interface ProvisionInput {
  slug: string;
  name?: string;
  password?: string;
}

export async function provisionDemoTenant(input: ProvisionInput): Promise<ProvisionResult> {
  if (RESERVED_SUBDOMAINS.has(input.slug)) {
    // A reserved subdomain never resolves to a tenant host (login would fail).
    throw new Error(`reserved_slug: "${input.slug}" cannot be a tenant slug`);
  }
  const plan = buildDemoPlan(input.slug, input.name);
  const password = input.password ?? DEFAULT_DEMO_PASSWORD;
  const host = plan.host;

  const adminUser = (id: string): ProvisionedUser => ({
    key: 'admin',
    id,
    email: plan.admin.email,
    displayName: plan.admin.displayName,
    role: 'admin',
  });

  const existing = await findTenantBySlug(plan.slug);
  if (existing) {
    return summarize(existing, host, password, true, adminUser(''), [], [], {
      mentors: 0,
      mentees: 0,
      participants: 0,
      mentorships: 0,
      sessions: 0,
    });
  }

  const tenant = await createTenant({ slug: plan.slug, name: plan.name });

  // Admin (role=admin) — consent recorded atomically by signup.
  const adminId = await createSeedUser(host, plan.admin, password);
  await upsertProfile(tenant.id, adminId, plan.admin);
  await activateProfile(tenant.id, adminId);

  // Branding (explicit, so the tenant is configured — not relying on hidden defaults).
  await updateSettings(tenant.id, adminId, plan.branding);

  // Skill catalog.
  const skillIds = new Map<string, string>();
  for (const name of plan.skills) {
    const s = await createSkill(tenant.id, { name });
    skillIds.set(name, s.id);
  }

  const programId = (await getDefaultProgram(tenant.id)).id;

  const mentors = await seedCohort(tenant.id, host, password, plan.mentors, skillIds, programId, adminId, true);
  const mentees = await seedCohort(tenant.id, host, password, plan.mentees, skillIds, programId, adminId, false);

  // Sample activity so the product is non-empty and navigable end to end.
  let mentorships = 0;
  let sessions = 0;
  if (mentors[0] && mentees[0]) {
    const req = await requestMentorship(tenant.id, mentees[0].id, { mentorId: mentors[0].id });
    const accepted = await acceptRequest(tenant.id, mentors[0].id, req.id);
    mentorships++;
    const sess = await requestSession(tenant.id, mentees[0].id, {
      mentorshipId: accepted.mentorshipId,
      scheduledAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      objective: 'Primeira conversa de mentoria',
    });
    await confirmSession(tenant.id, mentors[0].id, sess.id);
    await completeSession(tenant.id, mentors[0].id, sess.id);
    sessions++;
  }
  // A second, still-pending request so the mentor has an actionable inbox.
  if (mentors[1] && mentees[1]) {
    await requestMentorship(tenant.id, mentees[1].id, { mentorId: mentors[1].id });
  }

  return summarize(tenant, host, password, false, adminUser(adminId), mentors, mentees, {
    mentors: mentors.length,
    mentees: mentees.length,
    participants: mentors.length + mentees.length,
    mentorships,
    sessions,
  });
}

async function createSeedUser(host: string, u: SeedUser, password: string): Promise<string> {
  const res = await signup({
    host,
    email: u.email,
    password,
    displayName: u.displayName,
    role: u.role,
    consent: true,
  });
  return res.id;
}

async function seedCohort(
  tenantId: string,
  host: string,
  password: string,
  users: SeedUser[],
  skillIds: Map<string, string>,
  programId: string,
  adminId: string,
  isMentor: boolean,
): Promise<ProvisionedUser[]> {
  const out: ProvisionedUser[] = [];
  for (const u of users) {
    const id = await createSeedUser(host, u, password);
    await upsertProfile(tenantId, id, u);
    await activateProfile(tenantId, id);
    if (isMentor) await setMentorAvailable(tenantId, id, true);
    for (const name of u.offered) {
      const sid = skillIds.get(name);
      if (sid) await addUserSkill(tenantId, id, { skillId: sid, relation: 'offered' });
    }
    for (const name of u.sought) {
      const sid = skillIds.get(name);
      if (sid) await addUserSkill(tenantId, id, { skillId: sid, relation: 'sought' });
    }
    await addParticipant(tenantId, adminId, programId, id, u.participantRole);
    out.push({ key: u.key, id, email: u.email, displayName: u.displayName, role: u.role });
  }
  return out;
}

function summarize(
  tenant: TenantRecord,
  host: string,
  password: string,
  alreadyExisted: boolean,
  admin: ProvisionedUser,
  mentors: ProvisionedUser[],
  mentees: ProvisionedUser[],
  counts: ProvisionResult['counts'],
): ProvisionResult {
  return {
    alreadyExisted,
    tenant,
    host,
    loginUrlDev: `http://${host}:3000/login`,
    loginUrlProd: `https://${tenant.slug}.${getBaseDomain()}/login`,
    password,
    admin,
    mentors,
    mentees,
    counts,
  };
}

/** Convenience used by tests/CLI to confirm a seeded account can authenticate. */
export async function verifyLogin(host: string, email: string, password: string) {
  return login({ host, email, password });
}

// ---------------------------------------------------------------------------
// REAL (production) tenant provisioning — no demo data, no shared password.
// ---------------------------------------------------------------------------

/** First-time onboarding window for the admin's set-password token. */
const SET_PASSWORD_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const ADMIN_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface ProvisionRealInput {
  slug: string;
  name: string;
  adminEmail: string;
  adminName?: string;
  branding?: RealBrandingInput;
  /** Override the set-password token TTL (seconds). Defaults to 7 days. */
  setPasswordTtlSeconds?: number;
}

export interface ProvisionRealResult {
  alreadyExisted: boolean;
  tenant: TenantRecord;
  host: string;
  admin: { id: string; email: string; displayName: string; role: 'admin' };
  /** One-time token the admin uses to set their first password (reset flow). */
  setPasswordToken: string;
  /** Friendly set-password PAGE (carries the token) — what the admin opens. */
  setPasswordUrlDev: string;
  setPasswordUrlProd: string;
  /** Raw confirm ENDPOINT the page posts to — kept for CLI/API fallback. */
  setPasswordConfirmUrlDev: string;
  setPasswordConfirmUrlProd: string;
  /** Whether the set-password email was delivered, and by which provider. */
  emailSent: boolean;
  emailProvider: string;
  loginUrlDev: string;
  loginUrlProd: string;
}

function summarizeReal(
  tenant: TenantRecord,
  host: string,
  alreadyExisted: boolean,
  admin: ProvisionRealResult['admin'],
  setPasswordToken: string,
  emailSent: boolean,
  emailProvider: string,
): ProvisionRealResult {
  const prodBase = `https://${tenant.slug}.${getBaseDomain()}`;
  const tokenQuery = setPasswordToken ? `?token=${encodeURIComponent(setPasswordToken)}` : '';
  return {
    alreadyExisted,
    tenant,
    host,
    admin,
    setPasswordToken,
    setPasswordUrlDev: `http://${host}:3000/set-password${tokenQuery}`,
    setPasswordUrlProd: `${prodBase}/set-password${tokenQuery}`,
    setPasswordConfirmUrlDev: `http://${host}:3000/api/auth/password-reset/confirm`,
    setPasswordConfirmUrlProd: `${prodBase}/api/auth/password-reset/confirm`,
    emailSent,
    emailProvider,
    loginUrlDev: `http://${host}:3000/login`,
    loginUrlProd: `${prodBase}/login`,
  };
}

/**
 * Provisions a REAL (production) tenant: tenant + default program + branding +
 * exactly one real admin. Unlike provisionDemoTenant it seeds NO demo cohorts,
 * skills or sample activity, and sets NO shared password — the admin receives a
 * one-time set-password token (the existing reset flow) and the random bootstrap
 * password is never revealed. Idempotent on slug.
 */
export async function provisionRealTenant(
  input: ProvisionRealInput,
  provider: EmailProvider = getEmailProvider(),
): Promise<ProvisionRealResult> {
  if (RESERVED_SUBDOMAINS.has(input.slug)) {
    throw new Error(`reserved_slug: "${input.slug}" cannot be a tenant slug`);
  }
  if (!input.name || !input.name.trim()) throw new Error('name_required');
  const adminEmail = (input.adminEmail || '').trim();
  if (!ADMIN_EMAIL_RE.test(adminEmail)) throw new Error('invalid_admin_email');

  const plan = buildRealPlan(input);
  const host = plan.host;
  const mkAdmin = (id: string): ProvisionRealResult['admin'] => ({
    id,
    email: plan.admin.email,
    displayName: plan.admin.displayName,
    role: 'admin',
  });

  const existing = await findTenantBySlug(plan.slug);
  if (existing) {
    return summarizeReal(existing, host, true, mkAdmin(''), '', false, provider.name);
  }

  const tenant = await createTenant({ slug: plan.slug, name: plan.name });

  // Admin account with a strong, discardable bootstrap password that is never
  // revealed; the admin gets in only via the one-time set-password token below.
  const bootstrapPassword = randomBytes(24).toString('base64url');
  const created = await signup({
    host,
    email: plan.admin.email,
    password: bootstrapPassword,
    displayName: plan.admin.displayName,
    role: 'admin',
    consent: true,
  });
  // Active profile (consent was recorded atomically by signup).
  await activateProfile(tenant.id, created.id);

  // Explicit branding so the tenant is configured; colors fall back to the
  // brand-kit defaults when not provided.
  await updateSettings(tenant.id, created.id, {
    displayName: plan.branding.displayName,
    programName: plan.branding.programName,
    locale: plan.branding.locale,
    primaryColor: plan.branding.primaryColor ?? null,
    secondaryColor: plan.branding.secondaryColor ?? null,
    logoUrl: plan.branding.logoUrl ?? null,
  });

  const ttlSeconds = input.setPasswordTtlSeconds ?? SET_PASSWORD_TTL_SECONDS;
  const setPasswordToken = createResetToken({ sub: created.id, tenantId: tenant.id, ttlSeconds });

  // Deliver the set-password link synchronously (the email-outbox cron was
  // removed on Hobby). Never fails provisioning — the token is also returned so
  // the CLI/operator can deliver it manually when email is unconfigured.
  const setPasswordUrlProd = `https://${tenant.slug}.${getBaseDomain()}/set-password?token=${encodeURIComponent(setPasswordToken)}`;
  const send = await sendSetPasswordEmail(
    {
      to: plan.admin.email,
      recipientName: plan.admin.displayName,
      tenantName: tenant.name,
      setPasswordUrl: setPasswordUrlProd,
      validDays: Math.max(1, Math.round(ttlSeconds / 86_400)),
    },
    tenant.id,
    provider,
  );
  if (!send.ok) {
    logger.warn('provisioning.set_password_email_failed', {
      tenantId: tenant.id,
      provider: provider.name,
      error: send.error,
    });
  }

  return summarizeReal(tenant, host, false, mkAdmin(created.id), setPasswordToken, send.ok, provider.name);
}
