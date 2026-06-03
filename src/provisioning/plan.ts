/**
 * Demo provisioning plan (pure & deterministic). Describes the users, skills and
 * branding a demo tenant is seeded with — no DB access here, so it can be unit
 * tested and reasoned about. Names/emails are clearly demo-scoped (`@{slug}.demo`)
 * so seed data is never mistaken for production data.
 */
export const DEFAULT_DEMO_PASSWORD = 'mentormatch-demo';

export interface SeedSkill {
  name: string;
  relations: { offered?: string[]; sought?: string[] };
}

export interface SeedUser {
  key: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  participantRole: 'mentor' | 'mentee' | 'member';
  title: string;
  area: string;
  seniority: string;
  bio: string;
  offered: string[];
  sought: string[];
}

export interface DemoPlan {
  slug: string;
  name: string;
  host: string;
  branding: { displayName: string; programName: string; primaryColor: string; secondaryColor: string; locale: string };
  skills: string[];
  admin: SeedUser;
  mentors: SeedUser[];
  mentees: SeedUser[];
}

export const DEMO_SKILLS = ['Liderança', 'Produto', 'Carreira', 'Engenharia', 'Dados', 'Comunicação'];

function email(slug: string, local: string): string {
  return `${local}@${slug}.demo`;
}

export function buildDemoPlan(slug: string, name?: string): DemoPlan {
  const display = name ?? `Demo ${slug}`;
  const admin: SeedUser = {
    key: 'admin',
    email: email(slug, 'admin'),
    displayName: 'Admin Demo',
    role: 'admin',
    participantRole: 'member',
    title: 'Pessoas & Cultura',
    area: 'Operações',
    seniority: 'Lead',
    bio: 'Administra o programa de mentoria.',
    offered: [],
    sought: [],
  };

  const mentors: SeedUser[] = [
    { key: 'mentor1', displayName: 'Camila Nogueira', title: 'Eng. de Software', area: 'Engenharia', seniority: 'Staff', offered: ['Engenharia', 'Carreira'] },
    { key: 'mentor2', displayName: 'Diego Ferraz', title: 'Product Manager', area: 'Produto', seniority: 'Senior', offered: ['Produto', 'Liderança'] },
    { key: 'mentor3', displayName: 'Helena Prado', title: 'Data Lead', area: 'Dados', seniority: 'Lead', offered: ['Dados', 'Comunicação'] },
  ].map((m) => ({
    key: m.key,
    email: email(slug, m.key),
    displayName: m.displayName,
    role: 'member' as const,
    participantRole: 'mentor' as const,
    title: m.title,
    area: m.area,
    seniority: m.seniority,
    bio: `Mentor(a) em ${m.area}.`,
    offered: m.offered,
    sought: [],
  }));

  const mentees: SeedUser[] = [
    { key: 'mentee1', displayName: 'Igor Salles', title: 'Dev Júnior', area: 'Engenharia', sought: ['Engenharia', 'Carreira'] },
    { key: 'mentee2', displayName: 'Bianca Rocha', title: 'Analista de Produto', area: 'Produto', sought: ['Produto'] },
    { key: 'mentee3', displayName: 'Tomás Vieira', title: 'Analista de Dados', area: 'Dados', sought: ['Dados'] },
    { key: 'mentee4', displayName: 'Nina Couto', title: 'Estagiária', area: 'Operações', sought: ['Comunicação', 'Carreira'] },
  ].map((m) => ({
    key: m.key,
    email: email(slug, m.key),
    displayName: m.displayName,
    role: 'member' as const,
    participantRole: 'mentee' as const,
    title: m.title,
    area: m.area,
    seniority: 'Júnior',
    bio: `Em busca de mentoria em ${m.area}.`,
    offered: [],
    sought: m.sought,
  }));

  return {
    slug,
    name: display,
    host: `${slug}.localhost`,
    branding: {
      displayName: display,
      programName: 'Programa de Mentoria',
      primaryColor: '#FF4A1C',
      secondaryColor: '#1B5C4C',
      locale: 'pt-BR',
    },
    skills: DEMO_SKILLS,
    admin,
    mentors,
    mentees,
  };
}

// ---------------------------------------------------------------------------
// Real (production) provisioning plan — pure & deterministic, NO demo data.
// ---------------------------------------------------------------------------

/** Default mentoring program name for a freshly provisioned production tenant. */
export const DEFAULT_PROGRAM_NAME = 'Programa de Mentoria';

export interface RealBrandingInput {
  programName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  locale?: string;
  logoUrl?: string;
}

export interface RealPlanInput {
  slug: string;
  name: string;
  adminEmail: string;
  adminName?: string;
  branding?: RealBrandingInput;
}

export interface RealPlan {
  slug: string;
  name: string;
  host: string;
  admin: { email: string; displayName: string };
  branding: {
    displayName: string;
    programName: string;
    locale: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  };
}

/**
 * Plan for a REAL tenant: exactly one admin (the client's own email) plus a
 * default program + branding. Deliberately has NO mentors, mentees, skills or
 * sample activity — unlike buildDemoPlan — so a production tenant starts empty
 * and is filled only by real usage. Colors are left undefined unless explicitly
 * provided, so the brand-kit defaults apply.
 */
export function buildRealPlan(input: RealPlanInput): RealPlan {
  const name = input.name.trim();
  const branding = input.branding ?? {};
  return {
    slug: input.slug,
    name,
    host: `${input.slug}.localhost`,
    admin: {
      email: input.adminEmail.trim(),
      displayName: input.adminName?.trim() || 'Administrador',
    },
    branding: {
      displayName: name,
      programName: branding.programName?.trim() || DEFAULT_PROGRAM_NAME,
      locale: branding.locale?.trim() || 'pt-BR',
      primaryColor: branding.primaryColor?.trim() || undefined,
      secondaryColor: branding.secondaryColor?.trim() || undefined,
      logoUrl: branding.logoUrl?.trim() || undefined,
    },
  };
}
