import { describe, it, expect } from 'vitest';
import { buildMentorWhere, clampLimit, clampOffset, DEFAULT_LIMIT, MAX_LIMIT } from '../filters.js';

describe('pagination clamping', () => {
  it('clampLimit defaults, floors, and caps', () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_LIMIT);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(5.9)).toBe(5);
    expect(clampLimit(9999)).toBe(MAX_LIMIT);
  });

  it('clampOffset defaults and floors at zero', () => {
    expect(clampOffset(undefined)).toBe(0);
    expect(clampOffset(-3)).toBe(0);
    expect(clampOffset(10.7)).toBe(10);
  });
});

describe('buildMentorWhere', () => {
  it('always enforces active + available + not paused', () => {
    const { sql, params } = buildMentorWhere({});
    expect(sql).toContain("p.status = 'active'");
    expect(sql).toContain('p.mentor_available = true');
    expect(sql).toContain('p.mentor_paused = false');
    expect(params).toHaveLength(0);
  });

  it('adds a skill EXISTS clause with a param', () => {
    const { sql, params } = buildMentorWhere({ skill: 'React' });
    expect(sql).toContain('user_skill');
    expect(sql).toContain("relation = 'offered'");
    expect(params).toEqual(['%React%']);
  });

  it('adds area/title/seniority clauses with correct params', () => {
    const { sql, params } = buildMentorWhere({ area: 'Front', title: 'Eng', seniority: 'senior' });
    expect(sql).toContain('p.area ILIKE');
    expect(sql).toContain('p.title ILIKE');
    expect(sql).toContain('lower(p.seniority) = lower(');
    expect(params).toEqual(['%Front%', '%Eng%', 'senior']);
  });

  it('keyword reuses a single param across columns', () => {
    const { sql, params } = buildMentorWhere({ q: 'data' });
    expect(params).toEqual(['%data%']);
    expect(sql).toContain('tu.display_name ILIKE $1');
    expect(sql).toContain('p.bio ILIKE $1');
  });

  it('numbers params in order across multiple filters', () => {
    const { params } = buildMentorWhere({ excludeUserId: 'u', skillId: 'sk', area: 'A' });
    expect(params).toEqual(['u', 'sk', '%A%']);
  });
});
