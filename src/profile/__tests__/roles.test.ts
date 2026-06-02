import { describe, it, expect } from 'vitest';
import { deriveRoles, isEffectivelyAvailable } from '../roles.js';

describe('deriveRoles (dual role)', () => {
  it('is a mentor when offering and not paused', () => {
    expect(deriveRoles({ mentorAvailable: true, mentorPaused: false, hasSoughtSkills: false })).toEqual({
      isMentor: true,
      isMentee: false,
    });
  });

  it('is not a mentor when paused', () => {
    expect(
      deriveRoles({ mentorAvailable: true, mentorPaused: true, hasSoughtSkills: false }).isMentor,
    ).toBe(false);
  });

  it('is a mentee when seeking skills', () => {
    expect(
      deriveRoles({ mentorAvailable: false, mentorPaused: false, hasSoughtSkills: true }).isMentee,
    ).toBe(true);
  });

  it('can be both mentor and mentee at once', () => {
    expect(deriveRoles({ mentorAvailable: true, mentorPaused: false, hasSoughtSkills: true })).toEqual({
      isMentor: true,
      isMentee: true,
    });
  });

  it('isEffectivelyAvailable reflects offer minus pause', () => {
    expect(isEffectivelyAvailable(true, false)).toBe(true);
    expect(isEffectivelyAvailable(true, true)).toBe(false);
    expect(isEffectivelyAvailable(false, false)).toBe(false);
  });
});
