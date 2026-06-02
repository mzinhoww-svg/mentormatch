import { describe, it, expect } from 'vitest';
import { buildDemoPlan, DEFAULT_DEMO_PASSWORD, DEMO_SKILLS } from '../plan.js';

describe('buildDemoPlan', () => {
  const plan = buildDemoPlan('acme', 'Acme Corp');

  it('is deterministic and demo-scoped', () => {
    expect(plan.host).toBe('acme.localhost');
    expect(plan.name).toBe('Acme Corp');
    expect(plan.admin.email).toBe('admin@acme.demo');
    for (const u of [...plan.mentors, ...plan.mentees]) {
      expect(u.email).toMatch(/@acme\.demo$/); // clearly demo, never production
    }
  });

  it('seeds 1 admin, 3 mentors, 4 mentees with correct roles', () => {
    expect(plan.admin.role).toBe('admin');
    expect(plan.mentors).toHaveLength(3);
    expect(plan.mentees).toHaveLength(4);
    expect(plan.mentors.every((m) => m.participantRole === 'mentor' && m.offered.length > 0)).toBe(true);
    expect(plan.mentees.every((m) => m.participantRole === 'mentee' && m.sought.length > 0)).toBe(true);
  });

  it('configures branding and a skill catalog', () => {
    expect(plan.branding.displayName).toBe('Acme Corp');
    expect(plan.branding.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(plan.skills).toEqual(DEMO_SKILLS);
  });

  it('uses a usable demo password (min length)', () => {
    expect(DEFAULT_DEMO_PASSWORD.length).toBeGreaterThanOrEqual(8);
  });

  it('does not reuse brand-kit prototype fiction names', () => {
    const blob = JSON.stringify(plan);
    for (const n of ['Marina Alves', 'Bruno Reis', 'Sofia Castro', 'Nordia', 'Ana Moraes', 'João Carvalho']) {
      expect(blob).not.toContain(n);
    }
  });
});
