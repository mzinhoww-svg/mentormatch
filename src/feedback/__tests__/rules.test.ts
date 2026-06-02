import { describe, it, expect } from 'vitest';
import { isValidScore, averageScore, FEEDBACK_TYPES, SCORE_MIN, SCORE_MAX } from '../rules.js';

describe('isValidScore', () => {
  it('accepts integers 1..5', () => {
    for (let n = SCORE_MIN; n <= SCORE_MAX; n++) expect(isValidScore(n)).toBe(true);
  });
  it('rejects out-of-range, non-integer, and non-number', () => {
    for (const bad of [0, 6, -1, 2.5, NaN, '3', null, undefined]) {
      expect(isValidScore(bad as unknown)).toBe(false);
    }
  });
});

describe('averageScore', () => {
  it('is 0 for no scores', () => {
    expect(averageScore([])).toBe(0);
  });
  it('rounds to 2 decimals', () => {
    expect(averageScore([5, 4, 3])).toBe(4);
    expect(averageScore([5, 4])).toBe(4.5);
    expect(averageScore([5, 4, 4])).toBe(4.33);
  });
});

describe('feedback types', () => {
  it('covers session/mentor/mentee/program', () => {
    expect(FEEDBACK_TYPES).toEqual(['session', 'mentor', 'mentee', 'program']);
  });
});
