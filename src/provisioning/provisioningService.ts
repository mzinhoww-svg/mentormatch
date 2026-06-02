/**
 * Tenant provisioning & demo seeding. Builds a fully usable tenant from a single
 * call — tenant + default program (via createTenant) + branding + admin + mentors
 * + mentees + program participants + a sample mentorship/session — so a company
 * can start WITHOUT developer intervention. Everything goes through the real
 * domain services (consent, RLS, audit, notifications), so seeded data is
 * indistinguishable from data created by real usage. Idempotent on slug.
 */
import { createTenant, findTenantBySlug, type TenantRecord } from '../tenancy/admin.js';
import { RESERVED_SUBDOMAINS } from '../tenancy/resolveTenant.js';
import { signup, login } from '../auth/authService.js';
import { upsertProfile, activateProfile, setMentorAvailable } from '../profile/profileService.js';
import { createSkill, addUserSkill } from '../profile/skillService.js';
import { getDefaultProgram, addParticipant } from '../program/programService.js';
import { updateSettings } from '../settings/settingsService.js';
import { requestMentorship, acceptRequest } from '../mentorship/mentorshipService.js';
import { requestSession, confirmSession, completeSession } from '../session/sessionService.js';
import { buildDemoPlan, DEFAULT_DEMO_PASSWORD, type SeedUser } from './plan.js';

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
    loginUrlProd: `https://${tenant.slug}.mentormatch.app/login`,
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
