import { describe, it, expect } from 'vitest';
import { decideInitialStatus, isOpenForDecision } from '../rules.js';

describe('decideInitialStatus', () => {
  it('is pending when the mentor has free capacity', () => {
    expect(decideInitialStatus(0, 3)).toBe('pending');
    expect(decideInitialStatus(2, 3)).toBe('pending');
  });

  it('is waitlisted when the mentor is at (or over) capacity', () => {
    expect(decideInitialStatus(3, 3)).toBe('waitlisted');
    expect(decideInitialStatus(1, 1)).toBe('waitlisted');
    expect(decideInitialStatus(5, 3)).toBe('waitlisted');
  });
});

describe('isOpenForDecision', () => {
  it('is true only for pending/waitlisted', () => {
    expect(isOpenForDecision('pending')).toBe(true);
    expect(isOpenForDecision('waitlisted')).toBe(true);
    expect(isOpenForDecision('accepted')).toBe(false);
    expect(isOpenForDecision('rejected')).toBe(false);
    expect(isOpenForDecision('cancelled')).toBe(false);
    expect(isOpenForDecision('expired')).toBe(false);
  });
});
