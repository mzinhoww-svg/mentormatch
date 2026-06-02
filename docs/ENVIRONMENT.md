# ENVIRONMENT — MentorMatch

> Authoritative reference for every environment variable used by the app and its
> infrastructure (Vercel, Supabase/Postgres, Vercel Blob).
>
> **No real secret values appear in this document.** Real values live only in
> Vercel (Project → Settings → Environment Variables) and in local, git-ignored
> `.env.local` files. The committed template is [`.env.example`](../.env.example).

## How to read this document

- **Required** — the app will not boot / a feature breaks without it.
- **Public vs Secret** — *Public* (`NEXT_PUBLIC_*`) is shipped to the browser and
  must never carry a secret. *Secret* must stay server-side only.
- **Source** — who provides the value:
  - `[APP]` you set it manually,
  - `[AUTO]` injected by the Vercel↔Supabase integration,
  - `[BLOB]` injected by the Vercel Blob integration.
- **Scope** — which Vercel environments it should be set in.

---

## 1. App-managed variables (you set these)

| Variable | Required | Visibility | Scope (P/Prev/Dev) | Where to obtain | Usage in system | Security notes |
|---|---|---|---|---|---|---|
| `APP_ENV` | Required | Secret* | All | You choose: `development`/`preview`/`production` | Logical environment switch for app behavior/logging | Not sensitive, but keep server-side to avoid drift with `NODE_ENV`. |
| `APP_BASE_DOMAIN` | Required | Secret* | All | You choose (e.g. `mentormatch.app`) | Root domain used to compose tenant URLs | Not secret; must match DNS/Vercel domains. |
| `TENANT_DOMAIN_MODE` | Required | Secret* | All | You choose: `subdomain`/`path`/`custom` | Controls how a tenant is resolved from the request host | Must agree with routing + DNS config. |
| `NEXT_PUBLIC_APP_URL` | Required | **Public** | All | Your deployed URL (e.g. `https://mentormatch.app`) | Absolute base URL for links, callbacks, OG | Public by design; never put secrets in `NEXT_PUBLIC_*`. |
| `AUTH_SECRET` | Required | Secret | All | Generate: `openssl rand -base64 32` | Signs/encrypts Auth.js session tokens | High-impact secret. Rotate carefully (invalidates sessions). |
| `AUTH_TRUST_HOST` | Required | Secret* | Prod/Preview (`true`) | Set to `true` on Vercel | Lets Auth.js trust the proxied Host header | Keep `true` only behind a trusted proxy (Vercel). |
| `ENCRYPTION_KEY` | Required | Secret | All | Generate: `openssl rand -base64 32` (32 bytes) | App-level encryption of sensitive fields at rest | Critical. Losing/rotating it can make encrypted data unreadable. |
| `PLATFORM_ADMIN_EMAIL` | Required (bootstrap) | Secret | Prod/Preview | You choose | Initial platform super-admin identity | Treat as sensitive PII. |
| `PLATFORM_ADMIN_NAME` | Required (bootstrap) | Secret* | Prod/Preview | You choose | Display name of initial super-admin | Low sensitivity. |
| `PLATFORM_ADMIN_BOOTSTRAP_TOKEN` | Required (bootstrap) | Secret | Prod/Preview | Generate: `openssl rand -base64 32` | One-time token gating the admin-bootstrap route | Remove/rotate immediately after first bootstrap. |

\* Marked Secret* = not strictly confidential, but keep server-side (no `NEXT_PUBLIC_` prefix) to avoid leaking config and to prevent client/server drift.

---

## 2. Database — Prisma aliases (Required)

| Variable | Required | Visibility | Scope | Where to obtain | Usage | Security notes |
|---|---|---|---|---|---|---|
| `DATABASE_URL` | Required | Secret | All | **Copy of `POSTGRES_PRISMA_URL`** | Prisma runtime queries (pooled / pgbouncer) | Full DB credentials embedded. Never expose. |
| `DIRECT_URL` | Required | Secret | All | **Copy of `POSTGRES_URL_NON_POOLING`** | Prisma migrations / introspection (direct connection) | Full DB credentials embedded. Never expose. |

### 2.1 Prisma alias rule (must follow)

Supabase/Vercel inject `POSTGRES_*` names, but Prisma's schema expects
`DATABASE_URL` and `DIRECT_URL`. Wire them as **exact copies**:

```
DATABASE_URL = POSTGRES_PRISMA_URL        # pooled (pgbouncer) — runtime
DIRECT_URL   = POSTGRES_URL_NON_POOLING   # direct (no pooler) — migrations
```

Rationale: pooled (pgbouncer) connections do not support all statements used
during migration; Prisma needs a direct connection via `DIRECT_URL` for
`migrate`/`db push`, and the pooled URL via `DATABASE_URL` for serverless runtime.

In Vercel you can either reference the integration values or paste copies; keep
them in sync whenever the Supabase connection strings rotate.

---

## 3. Vercel / Supabase auto-injected (`[AUTO]` — do not set by hand)

Provided automatically once the Supabase/Postgres integration is connected.
Documented for visibility; the app should read from the Prisma aliases above
and the Supabase clients below.

| Variable | Required | Visibility | Scope | Where to obtain | Usage | Security notes |
|---|---|---|---|---|---|---|
| `POSTGRES_URL` | Auto | Secret | All | Integration | Generic Postgres connection string | Credentials embedded. |
| `POSTGRES_PRISMA_URL` | Auto | Secret | All | Integration | Pooled URL → source for `DATABASE_URL` | Credentials embedded. |
| `POSTGRES_URL_NON_POOLING` | Auto | Secret | All | Integration | Direct URL → source for `DIRECT_URL` | Credentials embedded. |
| `POSTGRES_USER` | Auto | Secret | All | Integration | DB user | Sensitive. |
| `POSTGRES_HOST` | Auto | Secret | All | Integration | DB host | Sensitive-ish. |
| `POSTGRES_PASSWORD` | Auto | Secret | All | Integration | DB password | **Highly sensitive.** |
| `POSTGRES_DATABASE` | Auto | Secret | All | Integration | DB name | Low sensitivity. |
| `SUPABASE_URL` | Auto | Secret* | All | Integration | Supabase project URL (server) | Not secret, keep server-side. |
| `SUPABASE_PUBLISHABLE_KEY` | Auto | Secret* | All | Integration | Newer publishable key | Public-tier key; still keep scoped. |
| `SUPABASE_SECRET_KEY` | Auto | Secret | All | Integration | Newer secret key | **Highly sensitive.** Server only. |
| `SUPABASE_ANON_KEY` | Auto | Secret* | All | Integration | Anonymous client key | Public-tier; RLS must be enforced. |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Secret | All | Integration | Service-role key (bypasses RLS) | **Highly sensitive.** Never client-side. |
| `SUPABASE_JWT_SECRET` | Auto | Secret | All | Integration | Verifies Supabase JWTs | **Highly sensitive.** |
| `NEXT_PUBLIC_SUPABASE_URL` | Auto | **Public** | All | Integration | Browser Supabase client URL | Public by design. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auto | **Public** | All | Integration | Browser anon key | Public; relies on RLS for safety. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Auto | **Public** | All | Integration | Browser publishable key | Public; relies on RLS. |

---

## 4. Vercel Blob (`[BLOB]`)

| Variable | Required | Visibility | Scope | Where to obtain | Usage | Security notes |
|---|---|---|---|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Required | Secret | All | Vercel Blob integration | Read/write access to the Blob store | **Sensitive.** Server-side uploads/signing only. |
| `BLOB_STORE_ID` | Auto | Secret* | All | Vercel Blob integration | Identifies the Blob store | Low sensitivity. |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Optional | Secret* | All | Vercel Blob integration | Verifies Blob webhook signatures | Public key; safe but keep server-side. |

---

## 5. Local development quickstart

1. Copy the template: `cp .env.example .env.local`
2. Fill `[APP]` values and generate secrets:
   - `AUTH_SECRET`, `ENCRYPTION_KEY`, `PLATFORM_ADMIN_BOOTSTRAP_TOKEN` →
     `openssl rand -base64 32`
3. Pull DB/Supabase/Blob values from the Vercel project (or
   `vercel env pull .env.local` once the Vercel CLI is set up).
4. Set the Prisma aliases:
   `DATABASE_URL = POSTGRES_PRISMA_URL`, `DIRECT_URL = POSTGRES_URL_NON_POOLING`.
5. Never commit `.env.local`.

---

## 6. Security reminders

- Secrets live only in Vercel + git-ignored `.env.local`. This repo stores **no**
  real values.
- Anything prefixed `NEXT_PUBLIC_` is shipped to the browser — never put a secret
  behind that prefix.
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `POSTGRES_PASSWORD`,
  `AUTH_SECRET`, `ENCRYPTION_KEY` and `BLOB_READ_WRITE_TOKEN` are the
  highest-impact secrets — server-side only, rotate on suspicion of exposure.
- Rotate/remove `PLATFORM_ADMIN_BOOTSTRAP_TOKEN` right after the first bootstrap.
