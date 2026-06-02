import { describe, it, expect } from 'vitest';
import { assertNoSensitive } from '../sanitize.js';
import { isAppError } from '../../observability/errors.js';
import { NOTIFICATION_TYPES } from '../types.js';

describe('assertNoSensitive', () => {
  it('allows non-sensitive payloads', () => {
    expect(() => assertNoSensitive({ requestId: 'r1', status: 'pending' })).not.toThrow();
    expect(() => assertNoSensitive({ nested: { sessionId: 's1', count: 3 } })).not.toThrow();
    expect(() => assertNoSensitive({})).not.toThrow();
  });

  it('rejects ContactInfo keys (any depth, any case)', () => {
    for (const bad of [
      { contact_email: 'x@y.com' },
      { contactEmail: 'x@y.com' },
      { phone: '123' },
      { whatsapp: '123' },
      { nested: { deep: { contact_phone: '123' } } },
      { list: [{ email: 'x@y.com' }] },
    ]) {
      let threw = false;
      try {
        assertNoSensitive(bad as Record<string, unknown>);
      } catch (err) {
        threw = true;
        expect(isAppError(err)).toBe(true);
        if (isAppError(err)) expect(err.message).toBe('sensitive_payload');
      }
      expect(threw).toBe(true);
    }
  });

  it('rejects credential-ish keys', () => {
    expect(() => assertNoSensitive({ password: 'x' })).toThrow();
    expect(() => assertNoSensitive({ token: 'x' })).toThrow();
  });
});

describe('notification types', () => {
  it('covers the required domain events', () => {
    for (const t of [
      'mentorship.requested',
      'mentorship.accepted',
      'mentorship.rejected',
      'session.requested',
      'auth.login',
      'auth.logout',
      'consent.recorded',
      'profile.updated',
      'profile.capacity_changed',
    ]) {
      expect(NOTIFICATION_TYPES).toContain(t);
    }
  });
});
