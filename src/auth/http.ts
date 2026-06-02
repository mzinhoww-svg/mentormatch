/**
 * Minimal JSON response helpers for route handlers, with safe error mapping.
 * AppErrors map to their httpStatus + code; anything else is a generic 500
 * (and is reported via the error reporter hook).
 */
import { isAppError, reportError } from '../observability/errors.js';
import { redactString } from '../observability/redaction.js';

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export function jsonWithCookie(body: unknown, setCookie: string, status = 200): Response {
  return json(body, status, { 'set-cookie': setCookie });
}

export function respondError(err: unknown): Response {
  if (isAppError(err)) {
    return json({ error: err.code, message: redactString(err.message) }, err.httpStatus);
  }
  reportError(err);
  return json({ error: 'INTERNAL', message: 'internal_error' }, 500);
}
