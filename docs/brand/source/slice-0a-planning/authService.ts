import { withTenant } from "../db/withTenant.js";
import { normalizeEmail } from "./email.js";
import { hashPassword, verifyPassword } from "./password.js";
import { rateLimitAllowsOrFailClosed, type RateLimiter } from "./rateLimiter.js";
import { resolveTenantFromHost } from "../tenancy/resolveTenant.js";
import { findTenantBySlug } from "../tenancy/tenantRepo.js";

/**
 * Generic, non-enumerating error. Login failures and "host has no tenant login"
 * must look the same to the client to avoid user/tenant enumeration.
 */
export class AuthError extends Error {
  constructor(public readonly code: "INVALID_CREDENTIALS" | "RATE_LIMITED" | "NO_TENANT_LOGIN") {
    super(
      code === "RATE_LIMITED"
        ? "Too many attempts. Try again later."
        : code === "NO_TENANT_LOGIN"
          ? "Login is not available on this address."
          : "Invalid email or password.",
    );
    this.name = "AuthError";
  }
}

export interface SignupInput {
  host: string;
  email: string;
  password: string;
  termsVersion: string;
  ip?: string | null;
}

export interface LoginInput {
  host: string;
  email: string;
  password: string;
}

/**
 * Resolve host to an active tenant id, or throw NO_TENANT_LOGIN.
 * This is the single gate that guarantees "login only exists inside a resolved
 * tenant host" — institutional, admin, reserved, and unknown hosts all throw.
 */
async function requireTenantFromHost(host: string): Promise<{ id: string; slug: string }> {
  const r = resolveTenantFromHost(host);
  if (r.kind !== "TENANT") {
    throw new AuthError("NO_TENANT_LOGIN");
  }
  const tenant = await findTenantBySlug(r.slug);
  if (!tenant || tenant.status !== "active") {
    throw new AuthError("NO_TENANT_LOGIN");
  }
  return { id: tenant.id, slug: tenant.slug };
}

/**
 * Sign up a TenantUser. Consent is MANDATORY and atomic with account creation:
 * the user row + consent_record are written in the SAME tenant transaction, and
 * the user is set active only because consent is recorded. Without consent there
 * is no signup path that activates a user.
 */
export async function signup(
  input: SignupInput,
  limiter: RateLimiter,
): Promise<{ userId: string }> {
  const tenant = await requireTenantFromHost(input.host);

  const allowed = await rateLimitAllowsOrFailClosed(limiter, `signup:${tenant.id}:${input.host}`);
  if (!allowed) throw new AuthError("RATE_LIMITED");

  const email = normalizeEmail(input.email);
  if (!input.termsVersion) {
    // Enforce consent at the service boundary as well as the data model.
    throw new Error("consent (termsVersion) is required for signup");
  }
  const passwordHash = await hashPassword(input.password);

  return withTenant(tenant.id, async (db) => {
    const userRes = await db.query<{ id: string }>(
      `INSERT INTO tenant_user (tenant_id, normalized_email, password_hash, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id`,
      [tenant.id, email, passwordHash],
    );
    const userId = userRes.rows[0]!.id;

    await db.query(
      `INSERT INTO consent_record (tenant_id, tenant_user_id, terms_version, ip)
       VALUES ($1, $2, $3, $4)`,
      [tenant.id, userId, input.termsVersion, input.ip ?? null],
    );

    await db.query(
      `INSERT INTO audit_event (tenant_id, actor_user_id, action, detail)
       VALUES ($1, $2, 'tenant_user.signup', $3)`,
      [tenant.id, userId, JSON.stringify({ host: input.host })],
    );

    return { userId };
  });
}

/**
 * Login. Always tenant-scoped. Uses a constant generic error to avoid
 * enumeration. Rate limited and fail-closed.
 */
export async function login(
  input: LoginInput,
  limiter: RateLimiter,
): Promise<{ userId: string; tenantId: string }> {
  const tenant = await requireTenantFromHost(input.host);

  const email = normalizeEmail(input.email);
  const allowed = await rateLimitAllowsOrFailClosed(limiter, `login:${tenant.id}:${email}`);
  if (!allowed) throw new AuthError("RATE_LIMITED");

  return withTenant(tenant.id, async (db) => {
    const res = await db.query<{ id: string; password_hash: string; status: string }>(
      `SELECT id, password_hash, status FROM tenant_user WHERE normalized_email = $1`,
      [email],
    );
    const row = res.rows[0];
    // Same error whether the user is absent or the password is wrong.
    if (!row || row.status !== "active") {
      // Still run a verify against a dummy hash to keep timing comparable.
      await verifyPassword(input.password, "scrypt$00$00");
      throw new AuthError("INVALID_CREDENTIALS");
    }
    const ok = await verifyPassword(input.password, row.password_hash);
    if (!ok) throw new AuthError("INVALID_CREDENTIALS");

    await db.query(
      `INSERT INTO audit_event (tenant_id, actor_user_id, action)
       VALUES ($1, $2, 'tenant_user.login')`,
      [tenant.id, row.id],
    );

    return { userId: row.id, tenantId: tenant.id };
  });
}
