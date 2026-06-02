import { describe, it, expect } from 'vitest';
import { hasCapacity, isValidRole, PROGRAM_STATUSES, DEFAULT_PROGRAM } from '../rules.js';

describe('hasCapacity', () => {
  it('is unlimited when capacity is null', () => {
    expect(hasCapacity(0, null)).toBe(true);
    expect(hasCapacity(9999, null)).toBe(true);
  });

  it('respects a finite capacity', () => {
    expect(hasCapacity(0, 2)).toBe(true);
    expect(hasCapacity(1, 2)).toBe(true);
    expect(hasCapacity(2, 2)).toBe(false);
    expect(hasCapacity(3, 2)).toBe(false);
  });
});

describe('isValidRole', () => {
  it('accepts known roles and rejects others', () => {
    expect(isValidRole('mentor')).toBe(true);
    expect(isValidRole('mentee')).toBe(true);
    expect(isValidRole('member')).toBe(true);
    expect(isValidRole('admin')).toBe(false);
    expect(isValidRole('')).toBe(false);
  });
});

describe('constants', () => {
  it('exposes program statuses and a default program', () => {
    expect(PROGRAM_STATUSES).toEqual(['active', 'inactive']);
    expect(DEFAULT_PROGRAM.name.length).toBeGreaterThan(0);
  });
});
