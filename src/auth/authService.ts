/**
 * Tenant-scoped authentication service.
 *
 * - No global User / no global login: every operation resolves the tenant from
 *   the request host (resolveActiveTenant) and runs through withTenant (RLS).
 * - Consent is mandatory and atomic with account creation (same transaction).
 * - The same email may exist in different tenants (unique within a tenant).
 * - Login returns a generic, non-enumerating error.
 */
import { resolveActiveTenant } from '../tenancy/admin.js';
import { withTenant } from '../tenancy/withTenant.js';
import { hashPassword, verifyPassword } from './password.js';
import { recordAuthEvent } from './audit.js';
import { createResetToken, verifyResetToken } from './session.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';

export const CURRENT_TERMS_VERSION = '2026-06-01';
const MIN_PASSWORD_LENGTH = 8;

export interface AuthContext {
  host: string | null | undefined;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export interface AuthedUser {
  id: string;
  tenantId: string;
  role: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

async function requireTenantId(host: AuthContext['host']): Promise<string> {
  const resolution = await resolveActiveTenant(host);
  if (resolution.kind !== 'TENANT') {
    // No global login: any non-tenant host is rejected here.
    throw expectedError(ErrorCode.TENANT_NOT_RESOLVED, 'no_tenant_login');
  }
  return resolution.tenant.id;
}

export interface SignupInput extends AuthContext {
  email: string;
  password: string;
  displayName?: string;
  role?: string;
  consent: boolean;
}

export async function signup(input: SignupInput): Promise<AuthedUser> {
  // Consent is checked BEFORE any DB work — no consent, no account.
  if (input.consent !== true) {
    throw expectedError(ErrorCode.VALIDATION, 'consent_required');
  }
  if (!input.email || !input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_credentials_format');
  }

  const tenantId = await requireTenantId(input.host);
  const email = input.email.trim();
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await withTenant(tenantId, async (db) => {
      const inserted = await db.query<{ id: string; role: string }>(
        `INSERT INTO tenant_user (tenant_id, email, normalized_email, display_name, role, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, role`,
        [tenantId, email, normalizedEmail, input.displayName ?? null, input.role ?? 'member', passwordHash],
      );
      const row = inserted.rows[0];
      if (!row) throw expectedError(ErrorCode.INTERNAL, 'signup_failed');
      // Consent is atomic with creation: if this fails the whole tx rolls back.
      await db.query(
        `INSERT INTO consent_record (tenant_id, tenant_user_id, terms_version, ip)
         VALUES ($1, $2, $3, $4)`,
        [tenantId, row.id, CURRENT_TERMS_VERSION, input.ip ?? null],
      );
      return row;
    });

    await recordAuthEvent(tenantId, 'auth.signup', {
      actorId: user.id,
      ip: input.ip,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });
    return { id: user.id, tenantId, role: user.role };
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw expectedError(ErrorCode.CONFLICT, 'email_taken');
    }
    throw err;
  }
}

export interface LoginInput extends AuthContext {
  email: string;
  password: string;
}

export async function login(input: LoginInput): Promise<AuthedUser> {
  const tenantId = await requireTenantId(input.host);
  const normalizedEmail = normalizeEmail(input.email ?? '');

  const found = await withTenant(tenantId, (db) =>
    db.query<{ id: string; role: string; password_hash: string | null; status: string }>(
      'SELECT id, role, password_hash, status FROM tenant_user WHERE normalized_email = $1',
      [normalizedEmail],
    ),
  );
  const row = found.rows[0];

  const invalid = () => expectedError(ErrorCode.UNAUTHORIZED, 'invalid_credentials');
  if (!row || !row.password_hash || row.status !== 'active') {
    throw invalid();
  }
  const ok = await verifyPassword(input.password ?? '', row.password_hash);
  if (!ok) throw invalid();

  await recordAuthEvent(tenantId, 'auth.login', {
    actorId: row.id,
    ip: input.ip,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });
  return { id: row.id, tenantId, role: row.role };
}

export async function logout(
  tenantId: string,
  userId: string,
  ctx: Omit<AuthContext, 'host'> = {},
): Promise<void> {
  await recordAuthEvent(tenantId, 'auth.logout', {
    actorId: userId,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  });
}

/**
 * Issues a password-reset token for a host+email, if that user exists.
 * Non-enumerating: callers should always respond 200; the token would normally
 * be emailed. Returns undefined when no matching active user exists.
 */
export async function requestPasswordReset(
  input: AuthContext & { email: string },
): Promise<string | undefined> {
  const tenantId = await requireTenantId(input.host);
  const normalizedEmail = normalizeEmail(input.email ?? '');
  const found = await withTenant(tenantId, (db) =>
    db.query<{ id: string }>(
      "SELECT id FROM tenant_user WHERE normalized_email = $1 AND status = 'active'",
      [normalizedEmail],
    ),
  );
  const row = found.rows[0];
  if (!row) return undefined;
  return createResetToken({ sub: row.id, tenantId });
}

export async function resetPassword(
  input: AuthContext & { token: string; newPassword: string },
): Promise<void> {
  const tenantId = await requireTenantId(input.host);
  if (!input.newPassword || input.newPassword.length < MIN_PASSWORD_LENGTH) {
    throw expectedError(ErrorCode.VALIDATION, 'invalid_password_format');
  }
  const claims = verifyResetToken(input.token ?? '');
  if (!claims || claims.tenantId !== tenantId) {
    throw expectedError(ErrorCode.UNAUTHORIZED, 'invalid_reset_token');
  }
  const passwordHash = await hashPassword(input.newPassword);
  const updated = await withTenant(tenantId, (db) =>
    db.query('UPDATE tenant_user SET password_hash = $1, updated_at = now() WHERE id = $2', [
      passwordHash,
      claims.sub,
    ]),
  );
  if (updated.rowCount === 0) {
    throw expectedError(ErrorCode.UNAUTHORIZED, 'invalid_reset_token');
  }
  await recordAuthEvent(tenantId, 'auth.password_reset', {
    actorId: claims.sub,
    ip: input.ip,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });
}
