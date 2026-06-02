import { describe, it, expect } from 'vitest';
import { participationRate, countsByStatus } from '../metrics.js';

describe('participationRate', () => {
  it('is 0 when there are no active users', () => {
    expect(participationRate(0, 0)).toBe(0);
    expect(participationRate(5, 0)).toBe(0);
  });

  it('is the rounded participants/activeUsers ratio', () => {
    expect(participationRate(2, 4)).toBe(0.5);
    expect(participationRate(1, 3)).toBe(0.3333);
    expect(participationRate(4, 4)).toBe(1);
  });
});

describe('countsByStatus', () => {
  const STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const;

  it('defaults every known status to 0 (stable empty state)', () => {
    expect(countsByStatus([], STATUSES)).toEqual({
      requested: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    });
  });

  it('folds grouped rows and ignores unknown statuses', () => {
    const rows = [
      { status: 'requested', count: 3 },
      { status: 'completed', count: 2 },
      { status: 'bogus', count: 9 },
    ];
    expect(countsByStatus(rows, STATUSES)).toEqual({
      requested: 3,
      confirmed: 0,
      completed: 2,
      cancelled: 0,
    });
  });
});
