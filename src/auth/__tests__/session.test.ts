import { describe, it, expect, beforeAll } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  createResetToken,
  verifyResetToken,
} from '../session.js';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-do-not-use-in-prod';
});

describe('session token', () => {
  it('creates and verifies a valid token carrying tenantId', () => {
    const token = createSessionToken({ sub: 'u1', tenantId: 't1', role: 'mentor' });
    const claims = verifySessionToken(token);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe('u1');
    expect(claims?.tenantId).toBe('t1');
    expect(claims?.role).toBe('mentor');
  });

  it('rejects a tampered token', () => {
    const token = createSessionToken({ sub: 'u1', tenantId: 't1', role: 'mentor' });
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = createSessionToken({ sub: 'u1', tenantId: 't1', role: 'm', ttlSeconds: -10 });
    expect(verifySessionToken(token)).toBeNull();
  });

  it('does not accept a reset token as a session token (typ check)', () => {
    const reset = createResetToken({ sub: 'u1', tenantId: 't1' });
    expect(verifySessionToken(reset)).toBeNull();
    expect(verifyResetToken(reset)).toEqual({ sub: 'u1', tenantId: 't1' });
    expect(verifyResetToken(createSessionToken({ sub: 'u1', tenantId: 't1', role: 'm' }))).toBeNull();
  });
});
