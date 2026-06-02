# SECURITY — MentorMatch

> Living document. As of Slice 0.2 the security surface delivered is the
> **redaction / masking layer** that protects logs, error payloads, and audit
> events. Application-level authz, RLS, and crypto land in later slices.

## 1. Logging & redaction guarantees

The central logger, error serializer, and audit logger all pass data through
`src/observability/redaction.ts` before it leaves the process. This is the single
source of truth for "must never be printed".

### 1.1 Always masked — by key
Any field whose key matches (exactly or by substring, case-insensitive) is replaced
with `[REDACTED]`:

- **Credentials/secrets:** `password`, `passwd`, `pwd`, `secret`, `token`,
  `authorization`, `cookie`, `set-cookie`, `*apikey*`, `*api_key*`, `*accesskey*`,
  `*privatekey*`, `*session_secret*`, `*jwt*`, `credentials`.
- **Project env secrets:** `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`,
  `ENCRYPTION_KEY`, `BLOB_READ_WRITE_TOKEN`, `POSTGRES_PASSWORD`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`,
  `PLATFORM_ADMIN_BOOTSTRAP_TOKEN`.
- **ContactInfo (LGPD):** `email`, `phone`, `telefone`, `celular`, `whatsapp`,
  `cpf`, `cnpj`, `rg`, `endereco`, `address`, `contactInfo`/`contact_info`.

### 1.2 Always masked — by value pattern
Free-form strings (including the log message itself) are scrubbed for:

- Postgres/Supabase connection strings (`postgres://…`) → scheme kept, rest masked.
- `Bearer <token>` authorization values.
- JWT-shaped tokens (`eyJ…`).
- Inline secret env assignments (`AUTH_SECRET=…`, `ENCRYPTION_KEY=…`, …).
- Emails → `[REDACTED_EMAIL]`, CPF → `[REDACTED_CPF]`, phone → `[REDACTED_PHONE]`.

### 1.3 Properties
- **Deep:** nested objects and arrays are traversed (bounded depth, circular-safe).
- **Errors:** `Error` values are reduced to `{ name, message }` with the message
  scrubbed; **stack traces are never serialized** into payloads.
- **Default-safe:** the logger redacts on every call; you cannot opt out per-call.

> ⚠️ The reveal of ContactInfo is an **auditable business action**
> (`contact_info.revealed`); the audit event records *that it happened*
> (actor, target, request) — never the raw contact value (metadata is redacted).

## 2. Error handling & exposure
- Deliberate failures use `AppError` with a stable `ErrorCode`.
- Only **expected** errors are intended to map to client-facing messages; their
  serialized form is redacted and stack-free.
- Unexpected errors are treated as internal (HTTP 500) and reported via the
  pluggable reporter (future Sentry) — with redacted context.

## 3. Secrets handling (recap from ENVIRONMENT.md)
- Real secrets live only in Vercel + git-ignored `.env.local`. The repo ships
  `.env.example` (placeholders) and `.gitignore` excludes `.env*` except the
  template.
- Highest-impact secrets: `AUTH_SECRET`, `ENCRYPTION_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `POSTGRES_PASSWORD`,
  `BLOB_READ_WRITE_TOKEN`. Server-side only; rotate on suspected exposure.
- `PLATFORM_ADMIN_BOOTSTRAP_TOKEN` must be rotated/removed after first bootstrap.

## 4. Verification
The redaction guarantees above are enforced by automated tests
(`src/observability/__tests__/`): logger-never-prints-secret, ContactInfo masking,
deep/array/circular redaction, and audit metadata redaction. See `docs/TESTING.md`.

## 5. Tenancy, auth & isolation (approved design — ADR v1.1 / ADR-002)

These are **decided** but **not yet wired** in the baseline (reference code in
`brand/source/slice-0a-planning/`). See [TENANCY.md](./TENANCY.md).

- **Identity isolated per tenant:** `TenantUser`, `unique(tenantId, normalizedEmail)`;
  **no global `User`, no global login**. `platform_admin` is a separate identity.
- **Host-gated auth:** login/signup only reachable for a resolved + active tenant
  host. No `/login` global, no `/:slug/login`. Institutional/admin/reserved/unknown
  hosts → no tenant login.
- **RLS default-deny:** `ENABLE` + `FORCE` row-level security in versioned SQL;
  app role `mm_app` is `NOSUPERUSER NOBYPASSRLS`; queries without tenant context
  return zero rows / are rejected. Context via `withTenant` (`SET LOCAL`), no leak
  across pooled queries.
- **Auth hardening:** scrypt password hashing; **fail-closed** rate limiting;
  non-enumerating generic errors; consent atomic with account creation.

## 6. LGPD & ContactInfo
ContactInfo (WhatsApp/contact email) is revealed **only after an accepted match**;
its reveal is an auditable event recording *that it happened*, never the raw value.
Auth email is a credential, not public contact. See [LGPD.md](./LGPD.md).

## 7. Not yet in scope (tracked for later slices)
- Session management, password reset, tokens (tenant-scoped).
- Field-level encryption with `ENCRYPTION_KEY`.
- CSRF, security headers, shared-store rate limiter (Redis/Upstash).
- Sentry wiring (hook prepared, not connected).
- Wiring the tenancy/RLS/auth reference code into `src/` (data-layer slice).
