import { describe, it, expect } from 'vitest';
import { signup, login } from '../authService.js';
import { isAppError } from '../../observability/errors.js';
import { ErrorCode } from '../../observability/error-codes.js';

// These cases never touch the database: consent is checked first, and non-tenant
// hosts are rejected by resolveTenantFromHost before any DB lookup.

async function expectAppError(p: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await p;
    throw new Error('expected rejection');
  } catch (err) {
    expect(isAppError(err)).toBe(true);
    if (isAppError(err)) expect(err.code).toBe(code);
  }
}

describe('authService — consent + global-login block (no DB)', () => {
  it('signup without consent is rejected', async () => {
    await expectAppError(
      signup({ host: 'acme.mentormatch.app', email: 'a@b.com', password: 'longenough', consent: false }),
      ErrorCode.VALIDATION,
    );
  });

  it('signup on the institutional apex is rejected (no global login)', async () => {
    await expectAppError(
      signup({ host: 'mentormatch.app', email: 'a@b.com', password: 'longenough', consent: true }),
      ErrorCode.TENANT_NOT_RESOLVED,
    );
  });

  it('login on the apex / admin host is rejected (no global login)', async () => {
    await expectAppError(
      login({ host: 'mentormatch.app', email: 'a@b.com', password: 'x' }),
      ErrorCode.TENANT_NOT_RESOLVED,
    );
    await expectAppError(
      login({ host: 'admin.mentormatch.app', email: 'a@b.com', password: 'x' }),
      ErrorCode.TENANT_NOT_RESOLVED,
    );
  });
});
