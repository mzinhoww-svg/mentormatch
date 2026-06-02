import { describe, it, expect } from 'vitest';
import { canConfirm, canComplete, canCancel } from '../rules.js';

describe('session transition rules', () => {
  it('canConfirm only from requested', () => {
    expect(canConfirm('requested')).toBe(true);
    expect(canConfirm('confirmed')).toBe(false);
    expect(canConfirm('completed')).toBe(false);
    expect(canConfirm('cancelled')).toBe(false);
  });

  it('canComplete only from confirmed', () => {
    expect(canComplete('confirmed')).toBe(true);
    expect(canComplete('requested')).toBe(false);
    expect(canComplete('completed')).toBe(false);
    expect(canComplete('cancelled')).toBe(false);
  });

  it('canCancel from requested or confirmed', () => {
    expect(canCancel('requested')).toBe(true);
    expect(canCancel('confirmed')).toBe(true);
    expect(canCancel('completed')).toBe(false);
    expect(canCancel('cancelled')).toBe(false);
  });
});
