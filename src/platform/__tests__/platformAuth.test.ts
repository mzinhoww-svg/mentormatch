import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyBootstrapToken } from '../platformAuthService.js';
import { requirePlatformAdmin } from '../requirePlatformAdmin.js';
import {
  createPlatformToken,
  verifyPlatformToken,
  createSessionToken,
  verifySessionToken,
  verifyResetToken,
} from '../../auth/session.js';

const SAVED_TOKEN = process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN;
const SAVED_SECRET = process.env.AUTH_SECRET;

beforeEach(() => {
  process.env.AUTH_SECRET = 'test-secret-000000000000000000000000';
});
afterEach(() => {
  if (SAVED_TOKEN === undefined) delete process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN;
  else process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN = SAVED_TOKEN;
  if (SAVED_SECRET === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = SAVED_SECRET;
});

describe('verifyBootstrapToken', () => {
  it('is false when the env secret is unset', () => {
    delete process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN;
    expect(verifyBootstrapToken('anything')).toBe(false);
  });
  it('matches only the exact token', () => {
    process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN = 'super-secret-token';
    expect(verifyBootstrapToken('super-secret-token')).toBe(true);
    expect(verifyBootstrapToken('super-secret-toke')).toBe(false); // length differs
    expect(verifyBootstrapToken('wrong-but-same-len')).toBe(false);
    expect(verifyBootstrapToken('')).toBe(false);
    expect(verifyBootstrapToken(null)).toBe(false);
    expect(verifyBootstrapToken(undefined)).toBe(false);
  });
});

describe('platform token isolation (security)', () => {
  it('round-trips a platform token', () => {
    const t = createPlatformToken({ sub: 'admin-1' });
    expect(verifyPlatformToken(t)).toEqual({ sub: 'admin-1' });
  });
  it('a tenant session token is not a platform token, and vice versa', () => {
    const session = createSessionToken({ sub: 'u1', tenantId: 't1', role: 'admin' });
    const platform = createPlatformToken({ sub: 'admin-1' });
    expect(verifyPlatformToken(session)).toBeNull();
    expect(verifySessionToken(platform)).toBeNull();
    expect(verifyResetToken(platform)).toBeNull();
  });
});

describe('requirePlatformAdmin gate (pre-DB rejections)', () => {
  it('rejects a non-platform host', async () => {
    await expect(requirePlatformAdmin('acme.localhost', '')).rejects.toThrow();
  });
  it('rejects the platform host without a session cookie', async () => {
    await expect(requirePlatformAdmin('admin.localhost', '')).rejects.toThrow();
  });
  it('rejects an invalid platform cookie', async () => {
    await expect(
      requirePlatformAdmin('admin.localhost', 'mm_platform=not-a-valid-token'),
    ).rejects.toThrow();
  });
});
