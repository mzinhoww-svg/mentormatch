/**
 * Application error model.
 *
 * - `AppError` is the single error type the app throws deliberately.
 * - "Expected" errors are operational (validation, not-found, …) and safe to map
 *   to a client response. "Unexpected" errors are bugs / unhandled conditions.
 * - Serialization is always redacted (no secrets, no ContactInfo, no stack by
 *   default) so error payloads are safe to log or return.
 * - A pluggable `ErrorReporter` hook prepares future Sentry integration without
 *   coupling to it.
 */

import { ErrorCode, httpStatusForCode } from './error-codes.js';
import { redact, redactString } from './redaction.js';

export interface AppErrorOptions {
  code?: ErrorCode;
  httpStatus?: number;
  /** Operational (true) vs programmer-error/bug (false). */
  expected?: boolean;
  /** Extra structured context. Redacted on serialization. */
  context?: Record<string, unknown>;
  /** Underlying cause. */
  cause?: unknown;
}

export interface SerializedError {
  name: string;
  code: ErrorCode;
  message: string;
  httpStatus: number;
  expected: boolean;
  context?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly expected: boolean;
  readonly context?: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = options.code ?? ErrorCode.INTERNAL;
    this.httpStatus = options.httpStatus ?? httpStatusForCode(this.code);
    this.expected = options.expected ?? false;
    this.context = options.context;
    // Maintain prototype chain when targeting ES5-ish runtimes / transpilers.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Redacted, stable JSON form. Never includes secrets or stack. */
  toJSON(): SerializedError {
    const json: SerializedError = {
      name: this.name,
      code: this.code,
      message: redactString(this.message),
      httpStatus: this.httpStatus,
      expected: this.expected,
    };
    if (this.context) {
      json.context = redact(this.context) as Record<string, unknown>;
    }
    return json;
  }
}

/** Type guard for `AppError`. */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Creates an operational (expected) error. */
export function expectedError(
  code: ErrorCode,
  message: string,
  options: Omit<AppErrorOptions, 'code' | 'expected'> = {},
): AppError {
  return new AppError(message, { ...options, code, expected: true });
}

/** Creates an unexpected (bug / internal) error. */
export function unexpectedError(
  message: string,
  options: Omit<AppErrorOptions, 'expected'> = {},
): AppError {
  return new AppError(message, {
    ...options,
    code: options.code ?? ErrorCode.INTERNAL,
    expected: false,
  });
}

/** Normalizes any thrown value into an `AppError`. */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value;
  if (value instanceof Error) {
    return new AppError(value.message, { code: ErrorCode.INTERNAL, expected: false, cause: value });
  }
  return new AppError('Unknown error', {
    code: ErrorCode.UNKNOWN,
    expected: false,
    cause: value,
  });
}

/** Redacted serialization for any thrown value. */
export function serializeError(value: unknown): SerializedError {
  return toAppError(value).toJSON();
}

// ---------------------------------------------------------------------------
// Error reporter hook (future Sentry integration).
// ---------------------------------------------------------------------------

export type ErrorReporter = (error: unknown, context?: Record<string, unknown>) => void;

let reporter: ErrorReporter | undefined;

/**
 * Registers a reporter (e.g. a Sentry adapter). Wiring is intentionally deferred:
 * by default reporting is a no-op so nothing leaves the process until configured.
 */
export function setErrorReporter(next: ErrorReporter | undefined): void {
  reporter = next;
}

/** Reports an error through the configured reporter, with redacted context. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!reporter) return;
  try {
    reporter(error, context ? (redact(context) as Record<string, unknown>) : undefined);
  } catch {
    // Never let reporting failures bubble up.
  }
}
