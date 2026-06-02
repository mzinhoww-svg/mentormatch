# DEPLOYMENT — MentorMatch

> How MentorMatch is built, deployed, and operated across environments.
> Companion to [`docs/ENVIRONMENT.md`](./ENVIRONMENT.md). **No secret values appear
> in this document.**

> **Status (2026-06-02):** The repository has **no application code yet** (only
> Slice 0C docs). This document describes the *intended* deployment topology and
> the integrations already connected, so the future app can slot into it. Sections
> marked _(planned)_ become active once the app is scaffolded.

---

## 1. Connected infrastructure

| Integration | Status | Notes |
|---|---|---|
| **GitHub** | Connected | Repo `mzinhoww-svg/mentormatch`. Source of truth; Vercel deploys from it. Remote currently empty except branch `claude/elegant-archimedes-wY5y5`. |
| **Vercel** | Connected | Project `mentormatch` (per task context). Build/host platform. Local CLI **not** available in this environment (see Vercel readiness report). |
| **Supabase / Postgres** | Connected | Provides `POSTGRES_*` + `SUPABASE_*` env vars via integration. Database for the app (Prisma). |
| **Vercel Blob** | Connected | File storage. Provides `BLOB_READ_WRITE_TOKEN` (+ `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`). |

---

## 2. Environments

| Environment | Branch / trigger | `APP_ENV` | URL pattern | Database |
|---|---|---|---|---|
| **Production** | Production branch (e.g. `main`) → Vercel Production | `production` | `https://<APP_BASE_DOMAIN>` | Supabase primary (pooled via `DATABASE_URL`) |
| **Preview** | Every PR / non-prod branch → Vercel Preview | `preview` | `https://<deployment>-<scope>.vercel.app` | Supabase (shared, or a preview/branch DB) |
| **Development** | Local `next dev` | `development` | `http://localhost:3000` | Local Postgres or Supabase dev creds via `.env.local` |

Env-var scoping for each is defined in `docs/ENVIRONMENT.md`. Every variable should
be present in **all three** scopes unless explicitly Production-only.

---

## 3. Preview strategy

- Each pull request gets an automatic **Vercel Preview Deployment**.
- Preview must use **non-production** secrets where they differ (separate
  `AUTH_SECRET` acceptable; never reuse production-only admin bootstrap token).
- Database for previews: prefer a dedicated preview/branch database to avoid
  mutating production data. If sharing the primary DB, **never** run destructive
  migrations from a preview.
- Smoke-test the preview URL before merging (see §6).

---

## 4. Production strategy

- Production deploys from the production branch only, after PR review + green gate.
- Promotion: merge to production branch → Vercel builds → Production deployment.
- Build runs `prisma generate`; it must **not** auto-apply migrations against
  production (migrations are a deliberate, gated step — see §5).
- Keep `AUTH_TRUST_HOST=true` (behind Vercel proxy) and correct `NEXT_PUBLIC_APP_URL`.

---

## 5. Migrations

- Tooling: **Prisma**. Aliases (mandatory):
  - `DATABASE_URL = POSTGRES_PRISMA_URL` (pooled / pgbouncer) — runtime.
  - `DIRECT_URL  = POSTGRES_URL_NON_POOLING` (direct) — migrations.
- Local/dev: `prisma migrate dev` against a dev database.
- Production: apply with `prisma migrate deploy` as an explicit, reviewed step
  (CI job or manual run), **never** silently during a request.
- Never point `prisma migrate` at the pooled URL — use `DIRECT_URL`.
- Back up / snapshot before applying production migrations.

---

## 6. Smoke test (post-deploy)

After each Production deploy (and ideally each Preview):

1. App root loads (`/`) → 200, no console errors.
2. Auth flow reachable (sign-in page renders; session cookie set on login).
3. Tenant resolution works for the configured `TENANT_DOMAIN_MODE`.
4. DB connectivity: a read-only health endpoint succeeds (Prisma can query).
5. Blob: a signed read/upload path responds (once implemented).
6. No 5xx in Vercel logs for the first minutes.

_(Endpoints are placeholders until the app exists.)_

---

## 7. Rollback

- **Vercel:** use **Instant Rollback** / promote a previous successful deployment
  from the Vercel dashboard (no rebuild needed).
- **Database:** rollback is **not** automatic with code rollback. For reversible
  migrations, prepare a down-migration or a restore-from-snapshot plan **before**
  applying. Prefer backward-compatible (expand/contract) migrations so a code
  rollback does not break the schema.
- Document each production migration with its rollback step.

---

## 8. Current risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| D1 | No app code yet → nothing actually deploys | High | Scaffold app before relying on this pipeline. |
| D2 | No `.gitignore` → risk of committing `.env.local`/secrets | High | Add `.gitignore` before any local env file is created. |
| D3 | Migrations could run against pooled URL | High | Enforce `DIRECT_URL` for migrations (§5). |
| D4 | Preview sharing production DB | Medium | Use a separate preview/branch database. |
| D5 | Env var missing in one scope (e.g. Preview) | Medium | Verify all vars across P/Prev/Dev in Vercel. |
| D6 | DB rollback not paired with code rollback | Medium | Use expand/contract migrations + snapshots. |
| D7 | Vercel CLI unavailable in this environment | Low | Manage via dashboard, or install CLI where needed (see readiness report). |
