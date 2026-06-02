import { describe, it, expect } from 'vitest';
import { hasRole, isRole, requireRole } from '../rbac.js';
import { isAppError } from '../../observability/errors.js';

describe('RBAC', () => {
  it('isRole recognises known roles', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('mentor')).toBe(true);
    expect(isRole('superuser')).toBe(false);
  });

  it('hasRole checks membership', () => {
    expect(hasRole('admin', ['admin', 'program_manager'])).toBe(true);
    expect(hasRole('mentee', ['admin'])).toBe(false);
  });

  it('requireRole passes for allowed roles', () => {
    expect(() => requireRole({ role: 'admin' }, ['admin'])).not.toThrow();
  });

  it('requireRole throws FORBIDDEN otherwise', () => {
    try {
      requireRole({ role: 'mentee' }, ['admin']);
      throw new Error('should have thrown');
    } catch (err) {
      expect(isAppError(err)).toBe(true);
      if (isAppError(err)) expect(err.httpStatus).toBe(403);
    }
  });
});
