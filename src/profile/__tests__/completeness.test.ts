import { describe, it, expect } from 'vitest';
import { profileCompleteness, type CompletenessInput } from '../completeness.js';

const EMPTY: CompletenessInput = {
  avatarUrl: null, title: null, bio: null, linkedinUrl: null,
  languages: [], contactWhatsapp: null, skillCount: 0, hasIntention: false,
};

describe('profileCompleteness', () => {
  it('is 0% with nothing filled and lists every criterion as missing', () => {
    const c = profileCompleteness(EMPTY);
    expect(c.percent).toBe(0);
    expect(c.missing.map((m) => m.key)).toContain('intention');
    expect(c.missing.length).toBe(7);
  });

  it('is 100% when everything is filled, with no missing items', () => {
    const c = profileCompleteness({
      avatarUrl: 'https://x/y.png', title: 'PM', bio: 'olá', linkedinUrl: 'https://l/in',
      languages: ['Português'], contactWhatsapp: '+55', skillCount: 2, hasIntention: true,
    });
    expect(c.percent).toBe(100);
    expect(c.missing).toEqual([]);
  });

  it('weights the high-value criteria (intention + skills = 40%)', () => {
    const c = profileCompleteness({ ...EMPTY, hasIntention: true, skillCount: 1 });
    expect(c.percent).toBe(40);
    expect(c.missing.map((m) => m.key)).not.toContain('intention');
    expect(c.missing.map((m) => m.key)).not.toContain('skills');
  });

  it('ignores whitespace-only text fields', () => {
    const c = profileCompleteness({ ...EMPTY, title: '   ', bio: '\n' });
    expect(c.missing.map((m) => m.key)).toEqual(expect.arrayContaining(['title', 'bio']));
  });
});
