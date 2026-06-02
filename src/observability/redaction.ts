/**
 * Redaction / masking utilities.
 *
 * Single source of truth for "what must never appear in a log, error payload, or
 * audit event". Used by the logger, the error serializer, and the audit logger.
 *
 * Two layers of protection:
 *  1. Key-based: any field whose key matches a sensitive name/substring is masked.
 *  2. Value-based: free-form strings are scanned for secret-shaped or
 *     ContactInfo-shaped patterns (connection strings, bearer tokens, JWTs,
 *     emails, CPF, phone numbers) and masked in place.
 */

export const REDACTED = '[REDACTED]';
export const REDACTED_EMAIL = '[REDACTED_EMAIL]';
export const REDACTED_PHONE = '[REDACTED_PHONE]';
export const REDACTED_CPF = '[REDACTED_CPF]';

/** Exact key names (lower-cased) that must always be masked. */
const SENSITIVE_KEYS = new Set<string>([
  // generic secrets
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'authorization',
  'cookie',
  'set-cookie',
  'credentials',
  'credential',
  // contact info (LGPD-sensitive)
  'email',
  'e-mail',
  'phone',
  'telefone',
  'celular',
  'whatsapp',
  'cpf',
  'cnpj',
  'rg',
  'contactinfo',
  'contact_info',
  'endereco',
  'address',
  // project-specific env secrets
  'database_url',
  'direct_url',
  'auth_secret',
  'encryption_key',
  'blob_read_write_token',
  'postgres_password',
  'supabase_service_role_key',
  'supabase_secret_key',
  'supabase_jwt_secret',
  'platform_admin_bootstrap_token',
]);

/** Substrings (lower-cased) that, if present in a key, force masking. */
const SENSITIVE_KEY_SUBSTRINGS = [
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'accesskey',
  'access_key',
  'privatekey',
  'private_key',
  'authorization',
  'cookie',
  'encryption_key',
  'auth_secret',
  'database_url',
  'direct_url',
  'connectionstring',
  'connection_string',
  'session_secret',
  'jwt',
];

/** Returns true when a field key should be fully masked regardless of its value. */
export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lower)) return true;
  return SENSITIVE_KEY_SUBSTRINGS.some((s) => lower.includes(s));
}

// Value patterns. Order matters (most specific first).
const PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  // Postgres/Supabase connection strings → keep scheme, drop the rest.
  [/\b(postgres(?:ql)?:\/\/)\S+/gi, `$1${REDACTED}`],
  // Bearer tokens in Authorization-style strings.
  [/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, `Bearer ${REDACTED}`],
  // JWT-shaped tokens.
  [/\beyJ[A-Za-z0-9._-]{10,}/g, REDACTED],
  // Known secret env assignments embedded in a string (KEY=value).
  [
    /\b(AUTH_SECRET|ENCRYPTION_KEY|DATABASE_URL|DIRECT_URL|BLOB_READ_WRITE_TOKEN|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|SUPABASE_JWT_SECRET|POSTGRES_PASSWORD|PLATFORM_ADMIN_BOOTSTRAP_TOKEN)\s*=\s*\S+/gi,
    `$1=${REDACTED}`,
  ],
  // Emails (ContactInfo).
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, REDACTED_EMAIL],
  // CPF (Brazilian tax id), formatted or not.
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, REDACTED_CPF],
  // Phone numbers (BR-friendly, with optional country/area code).
  [/\b(?:\+?55\s?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}\b/g, REDACTED_PHONE],
];

/** Masks secret/ContactInfo-shaped substrings inside a free-form string. */
export function redactString(input: string): string {
  let out = input;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

const MAX_DEPTH = 8;

/**
 * Deep-redacts an arbitrary value, returning a new structure safe to log.
 * - Sensitive keys are replaced wholesale.
 * - Strings are pattern-scrubbed.
 * - Circular references are handled; depth is bounded.
 */
export function redact(value: unknown): unknown {
  return redactValue(value, 0, new WeakSet<object>());
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;

  const type = typeof value;
  if (type === 'string') return redactString(value as string);
  if (type === 'number' || type === 'boolean' || type === 'bigint') return value;
  if (type === 'function' || type === 'symbol') return `[${type}]`;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
    };
  }

  if (depth >= MAX_DEPTH) return '[Truncated]';

  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const result = value.map((v) => redactValue(v, depth + 1, seen));
    seen.delete(value);
    return result;
  }

  if (type === 'object') {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = isSensitiveKey(key) ? REDACTED : redactValue(val, depth + 1, seen);
    }
    seen.delete(obj);
    return result;
  }

  return String(value);
}
