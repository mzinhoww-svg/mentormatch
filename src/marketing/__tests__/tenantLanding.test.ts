import { describe, it, expect } from 'vitest';
import { buildTenantLanding } from '../tenantLanding.js';

describe('buildTenantLanding', () => {
  it('produces the full 6-section copy with the company benefit framing', () => {
    const c = buildTenantLanding({
      programName: 'Trilhas de Liderança',
      companyName: 'Sicredi',
      hasCustomProgram: true,
    });

    // Every brief section is present and non-empty.
    expect(c.hero.headline).toContain('Sicredi');
    expect(c.hero.cta).toBeTruthy();
    expect(c.nextLevel.paragraphs.length).toBeGreaterThan(0);
    expect(c.experience.steps.length).toBeGreaterThanOrEqual(3);
    expect(c.skills.items.length).toBeGreaterThan(0);
    expect(c.community.paragraphs.length).toBeGreaterThan(0);
    expect(c.finalCta.cta).toBeTruthy();

    // 100% benefit framing: the company name recurs, the platform is never sold.
    const all = JSON.stringify(c);
    expect(all).toContain('Sicredi');
    expect(all).not.toMatch(/MentorMatch/i);
    // Free perk is made explicit somewhere in the copy.
    expect(all.toLowerCase()).toMatch(/custe|gratuit|sem (nenhum )?custo/);
  });

  it('references a custom program by name', () => {
    const c = buildTenantLanding({
      programName: 'Trilhas de Liderança',
      companyName: 'Sicredi',
      hasCustomProgram: true,
    });
    expect(c.hero.subheadline).toContain('Trilhas de Liderança');
    expect(c.skills.intro).toContain('Trilhas de Liderança');
  });

  it('falls back to generic program characteristics without a custom program', () => {
    const c = buildTenantLanding({
      programName: 'Programa de Mentoria',
      companyName: 'Sicredi',
      hasCustomProgram: false,
    });
    // No bespoke program name leaking into the generic copy.
    expect(c.skills.intro).not.toContain('Programa de Mentoria');
    // The generic skills are always offered as "what you can develop".
    expect(c.skills.items).toContain('Liderança e gestão de pessoas');
    expect(c.skills.title.toLowerCase()).toContain('desenvolver');
  });

  it('falls back to "sua empresa" when the company name is missing', () => {
    const c = buildTenantLanding({
      programName: 'Programa de Mentoria',
      companyName: null,
      hasCustomProgram: false,
    });
    const all = JSON.stringify(c);
    expect(all).toContain('sua empresa');
  });
});
