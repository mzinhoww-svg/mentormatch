/**
 * Platform-admin authentication (cross-tenant operators). Backed by the
 * owner-only `platform_admin` registry (no RLS, no mm_app grant), so all access
 * goes through ownerPool — the app role can never read these password hashes.
 *
 * Bootstrapping: there is no admin to authorize the first admin, so creation is
 * gated by the PLATFORM_ADMIN_BOOTSTRAP_TOKEN env secret (constant-time check).
 */
import { timingSafeEqual } from 'node:crypto';
import { ownerPool } from '../tenancy/pool.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';
import { logger } from '../observability/logger.js';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface PlatformAdmin {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
}

interface AdminRow {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toAdmin(row: AdminRow): PlatformAdmin {
  return { id: row.id, email: row.email, displayName: row.display_name, status: row.status };
}

/** Constant-time comparison of a supplied bootstrap token to the env secret. */
export function verifyBootstrapToken(token: string | null | undefined): boolean {
  const expected = process.env.PLATFORM_ADMIN_BOOTSTRAP_TOKEN;
  if (!expected || !token) return false;
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Creates a platform admin (idempotent on email — re-running resets the password
 * and reactivates). Gated by the bootstrap token: this is how the first operator
 * is seeded before any admin exists to authorize others.
 */
export async function createPlatformAdmin(input: {
  token: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<PlatformAdmin> {
  if (!verifyBootstrapToken(input.token)) {
    throw expectedError(ErrorCode.UNAUTHORIZED, 'invalid_bootstrap_token');
  }
  const email = (input.email || '').trim();
  if (!EMAIL_RE.test(email)) throw expectedError(ErrorCode.VALIDATION, 'invalid_email');
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    throw expectedError(ErrorCode.VALIDATION, 'weak_password');
  }
  const passwordHash = await hashPassword(input.password);
  const res = await ownerPool().query<AdminRow>(
    `INSERT INTO platform_admin (email, normalized_email, display_name, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (normalized_email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       display_name = COALESCE(EXCLUDED.display_name, platform_admin.display_name),
       status = 'active',
       updated_at = now()
     RETURNING id, email, display_name, status`,
    [email, normalizeEmail(email), input.displayName ?? null, passwordHash],
  );
  const admin = toAdmin(res.rows[0]!);
  logger.info('platform.admin_upserted', { adminId: admin.id });
  return admin;
}

/** Verifies email + password against an ACTIVE platform admin (generic error). */
export async function loginPlatformAdmin(input: {
  email: string;
  password: string;
}): Promise<PlatformAdmin> {
  const res = await ownerPool().query<AdminRow & { password_hash: string }>(
    `SELECT id, email, display_name, status, password_hash
       FROM platform_admin WHERE normalized_email = $1`,
    [normalizeEmail(input.email ?? '')],
  );
  const row = res.rows[0];
  const invalid = () => expectedError(ErrorCode.UNAUTHORIZED, 'invalid_credentials');
  if (!row || row.status !== 'active' || !row.password_hash) throw invalid();
  const ok = await verifyPassword(input.password ?? '', row.password_hash);
  if (!ok) throw invalid();
  return toAdmin(row);
}

/** Loads an active platform admin by id — used to confirm a live session. */
export async function getActivePlatformAdmin(id: string): Promise<PlatformAdmin | null> {
  const res = await ownerPool().query<AdminRow>(
    `SELECT id, email, display_name, status FROM platform_admin WHERE id = $1 AND status = 'active'`,
    [id],
  );
  const row = res.rows[0];
  return row ? toAdmin(row) : null;
}

/** Changes an admin's password after verifying the current one (generic error). */
export async function changePlatformPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw expectedError(ErrorCode.VALIDATION, 'weak_password');
  }
  const res = await ownerPool().query<{ password_hash: string }>(
    `SELECT password_hash FROM platform_admin WHERE id = $1 AND status = 'active'`,
    [adminId],
  );
  const row = res.rows[0];
  if (!row || !(await verifyPassword(currentPassword ?? '', row.password_hash))) {
    throw expectedError(ErrorCode.UNAUTHORIZED, 'invalid_credentials');
  }
  const passwordHash = await hashPassword(newPassword);
  await ownerPool().query(
    'UPDATE platform_admin SET password_hash = $2, updated_at = now() WHERE id = $1',
    [adminId, passwordHash],
  );
  logger.info('platform.password_changed', { adminId });
}

/** Lists all platform admins (owner-only registry read). Newest first. */
export async function listPlatformAdmins(): Promise<PlatformAdmin[]> {
  const res = await ownerPool().query<AdminRow>(
    `SELECT id, email, display_name, status FROM platform_admin ORDER BY created_at DESC`,
  );
  return res.rows.map(toAdmin);
}

/**
 * Adds a NEW platform admin from the console (authenticated path — the calling
 * admin is gated by requirePlatformAdmin at the route). Unlike the bootstrap
 * `createPlatformAdmin`, this never upserts: a duplicate email throws `email_taken`
 * so an existing admin's password can't be silently reset. The new admin signs in
 * with the initial password and can change it via `changePlatformPassword`.
 */
export async function addPlatformAdmin(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<PlatformAdmin> {
  const email = (input.email || '').trim();
  if (!EMAIL_RE.test(email)) throw expectedError(ErrorCode.VALIDATION, 'invalid_email');
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    throw expectedError(ErrorCode.VALIDATION, 'weak_password');
  }
  const passwordHash = await hashPassword(input.password);
  try {
    const res = await ownerPool().query<AdminRow>(
      `INSERT INTO platform_admin (email, normalized_email, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, display_name, status`,
      [email, normalizeEmail(email), input.displayName ?? null, passwordHash],
    );
    const admin = toAdmin(res.rows[0]!);
    logger.info('platform.admin_added', { adminId: admin.id });
    return admin;
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
      throw expectedError(ErrorCode.CONFLICT, 'email_taken');
    }
    throw err;
  }
}

/**
 * Suspends or reactivates another platform admin. Guards against operator
 * lockout: an admin can't change their OWN status, and the LAST active admin
 * can't be suspended.
 */
export async function setPlatformAdminStatus(
  targetId: string,
  status: 'active' | 'suspended',
  actingAdminId: string,
): Promise<PlatformAdmin> {
  if (targetId === actingAdminId) {
    throw expectedError(ErrorCode.VALIDATION, 'cannot_change_own_status');
  }
  if (status === 'suspended') {
    const active = await ownerPool().query<{ n: number }>(
      `SELECT count(*)::int AS n FROM platform_admin WHERE status = 'active'`,
    );
    if ((active.rows[0]?.n ?? 0) <= 1) {
      throw expectedError(ErrorCode.VALIDATION, 'cannot_suspend_last_admin');
    }
  }
  const res = await ownerPool().query<AdminRow>(
    `UPDATE platform_admin SET status = $2, updated_at = now() WHERE id = $1
     RETURNING id, email, display_name, status`,
    [targetId, status],
  );
  const row = res.rows[0];
  if (!row) throw expectedError(ErrorCode.NOT_FOUND, 'platform_admin_not_found');
  logger.info('platform.admin_status_changed', { adminId: actingAdminId, targetId, status });
  return toAdmin(row);
}
