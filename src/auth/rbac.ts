/**
 * Tenant-scoped RBAC. Roles live on TenantUser and are meaningful only within a
 * tenant. This module decides authorization given a session's role.
 */
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';

export const ROLES = ['admin', 'program_manager', 'mentor', 'mentee', 'member'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function hasRole(role: string, allowed: readonly Role[]): boolean {
  return allowed.includes(role as Role);
}

/** Throws FORBIDDEN if the session's role is not in `allowed`. */
export function requireRole(session: { role: string }, allowed: readonly Role[]): void {
  if (!hasRole(session.role, allowed)) {
    throw expectedError(ErrorCode.FORBIDDEN, 'insufficient_role');
  }
}
