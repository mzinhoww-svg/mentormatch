/**
 * Guards notification payloads against leaking sensitive data — above all
 * ContactInfo (email / phone / whatsapp), which must stay hidden until a match
 * is accepted and is NEVER appropriate inside a notification payload. Also
 * blocks credential-ish keys. This is defensive: callers already pass only
 * non-sensitive ids, but the guard makes a leak structurally impossible.
 */
import { expectedError } from '../observability/errors.js';
import { ErrorCode } from '../observability/error-codes.js';

const FORBIDDEN_KEYS = new Set(
  [
    'contact_email',
    'contactemail',
    'contact_phone',
    'contactphone',
    'contact_whatsapp',
    'contactwhatsapp',
    'email',
    'phone',
    'whatsapp',
    'password',
    'password_hash',
    'passwordhash',
    'token',
  ].map((k) => k.toLowerCase()),
);

/** Throws if the payload (recursively) contains any forbidden/sensitive key. */
export function assertNoSensitive(payload: Record<string, unknown>): void {
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
          throw expectedError(ErrorCode.VALIDATION, 'sensitive_payload');
        }
        visit(child);
      }
    }
  };
  visit(payload);
}
