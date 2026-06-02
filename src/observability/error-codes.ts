/**
 * Stable application error codes and their default HTTP status mapping.
 * Codes are part of the API contract — add, do not repurpose.
 */

export const ErrorCode = {
  /** Fallback for truly unknown failures. */
  UNKNOWN: 'UNKNOWN',
  /** Unexpected internal failure (a bug / unhandled condition). */
  INTERNAL: 'INTERNAL',
  /** Input failed validation. */
  VALIDATION: 'VALIDATION',
  /** Caller is not authenticated. */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** Caller is authenticated but not allowed. */
  FORBIDDEN: 'FORBIDDEN',
  /** Resource not found. */
  NOT_FOUND: 'NOT_FOUND',
  /** Conflict with current state (e.g. duplicate). */
  CONFLICT: 'CONFLICT',
  /** Too many requests. */
  RATE_LIMITED: 'RATE_LIMITED',
  /** Tenant could not be resolved from the request. */
  TENANT_NOT_RESOLVED: 'TENANT_NOT_RESOLVED',
  /** Misconfiguration (e.g. missing env var). */
  CONFIG: 'CONFIG',
  /** A downstream dependency failed (DB, storage, etc.). */
  DEPENDENCY: 'DEPENDENCY',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const HTTP_STATUS_BY_CODE: Record<ErrorCode, number> = {
  [ErrorCode.UNKNOWN]: 500,
  [ErrorCode.INTERNAL]: 500,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.TENANT_NOT_RESOLVED]: 400,
  [ErrorCode.CONFIG]: 500,
  [ErrorCode.DEPENDENCY]: 502,
};

/** Default HTTP status for an error code. */
export function httpStatusForCode(code: ErrorCode): number {
  return HTTP_STATUS_BY_CODE[code] ?? 500;
}
