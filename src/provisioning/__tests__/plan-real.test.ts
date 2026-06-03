import { describe, it, expect } from 'vitest';
import { buildRealPlan, DEFAULT_PROGRAM_NAME } from '../plan.js';

describe('buildRealPlan (real/production provisioning plan)', () => {
  it('builds a single-admin plan with no demo cohorts', () => {
    const plan = buildRealPlan({
      slug: 'acme',
      name: 'Acme Corp',
      adminEmail: 'ana@acme.com',
      adminName: 'Ana',
    });

    expect(plan.slug).toBe('acme');
    expect(plan.name).toBe('Acme Corp');
    expect(plan.host).toBe('acme.localhost');
    expect(plan.admin).toEqual({ email: 'ana@acme.com', displayName: 'Ana' });

    expect(plan.branding.displayName).toBe('Acme Corp');
    expect(plan.branding.programName).toBe(DEFAULT_PROGRAM_NAME);
    expect(plan.branding.locale).toBe('pt-BR');
    // Colors/logo left undefined → brand-kit defaults apply downstream.
    expect(plan.branding.primaryColor).toBeUndefined();
    expect(plan.branding.secondaryColor).toBeUndefined();
    expect(plan.branding.logoUrl).toBeUndefined();

    // The real plan must NOT carry any demo data shape.
    expect(plan).not.toHaveProperty('mentors');
    expect(plan).not.toHaveProperty('mentees');
    expect(plan).not.toHaveProperty('skills');
  });

  it('defaults the admin display name and trims inputs', () => {
    const plan = buildRealPlan({ slug: 'beta', name: '  Beta  ', adminEmail: '  boss@beta.io  ' });
    expect(plan.name).toBe('Beta');
    expect(plan.branding.displayName).toBe('Beta');
    expect(plan.admin.email).toBe('boss@beta.io');
    expect(plan.admin.displayName).toBe('Administrador');
  });

  it('applies explicit branding overrides', () => {
    const plan = buildRealPlan({
      slug: 'gamma',
      name: 'Gamma',
      adminEmail: 'a@gamma.com',
      branding: {
        programName: 'Mentoria Gamma',
        primaryColor: '#123456',
        secondaryColor: '#abcdef',
        locale: 'en-US',
        logoUrl: 'https://cdn.example/logo.png',
      },
    });
    expect(plan.branding.programName).toBe('Mentoria Gamma');
    expect(plan.branding.primaryColor).toBe('#123456');
    expect(plan.branding.secondaryColor).toBe('#abcdef');
    expect(plan.branding.locale).toBe('en-US');
    expect(plan.branding.logoUrl).toBe('https://cdn.example/logo.png');
  });
});
