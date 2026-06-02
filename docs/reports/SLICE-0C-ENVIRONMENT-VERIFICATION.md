# SLICE 0C — Environment Verification

**Date:** 2026-06-02
**Branch:** `claude/elegant-archimedes-wY5y5`
**Scope:** Validate the environment variables expected by the code and by Vercel,
without printing any real secret value. No feature, screen, or design-system work.

---

## 0. Critical context (reality check)

The repository is **empty** — it contains only `.git/` with **no commits and no
files**. There is no Next.js app, no `package.json`, no Prisma schema, and no
source code. Therefore:

- The code search (Task 1) found **zero** `process.env` usages — because there is
  no code yet to search.
- The light gate (Task 7) **cannot run** — there is no project to typecheck, lint,
  or test.

This Slice 0C therefore delivers the **documentation/config artifacts** that are
independent of code (`.env.example`, `docs/ENVIRONMENT.md`, this report), based on
the expected variable set provided in the task. These will become the contract the
future code must satisfy.

---

## 1. Variables found in the code

| Search pattern | Matches |
|---|---|
| `process.env`, `env(`, all named vars (`DATABASE_URL`, `AUTH_SECRET`, `SUPABASE`, `BLOB`, `POSTGRES`, …) | **0 matches** |

**Reason:** repository has no source files. (`find` shows only `.git/`.)

---

## 2. Variables expected (documented in this slice)

### 2.1 App-managed — you must set manually
- `APP_ENV`
- `APP_BASE_DOMAIN`
- `TENANT_DOMAIN_MODE`
- `NEXT_PUBLIC_APP_URL` *(public)*
- `AUTH_SECRET`
- `AUTH_TRUST_HOST`
- `ENCRYPTION_KEY`
- `PLATFORM_ADMIN_EMAIL`
- `PLATFORM_ADMIN_NAME`
- `PLATFORM_ADMIN_BOOTSTRAP_TOKEN`
- `DATABASE_URL` *(Prisma alias — copy of `POSTGRES_PRISMA_URL`)*
- `DIRECT_URL` *(Prisma alias — copy of `POSTGRES_URL_NON_POOLING`)*

### 2.2 Auto-injected by Vercel/Supabase integration
- `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` *(public)*

### 2.3 Vercel Blob
- `BLOB_READ_WRITE_TOKEN`
- `BLOB_STORE_ID`
- `BLOB_WEBHOOK_PUBLIC_KEY`

Full per-variable documentation (required/optional, public/secret, scope, where to
obtain, usage, security notes) lives in [`docs/ENVIRONMENT.md`](../ENVIRONMENT.md).

---

## 3. Variables YOU must register manually

These will **not** appear automatically; set them in Vercel (Production/Preview/
Development as appropriate) and in local `.env.local`:

| Variable | Notes |
|---|---|
| `APP_ENV` | `development` / `preview` / `production` |
| `APP_BASE_DOMAIN` | root domain for tenant URLs |
| `TENANT_DOMAIN_MODE` | `subdomain` / `path` / `custom` |
| `NEXT_PUBLIC_APP_URL` | absolute app URL |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` on Vercel |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `PLATFORM_ADMIN_EMAIL` | initial super-admin |
| `PLATFORM_ADMIN_NAME` | initial super-admin name |
| `PLATFORM_ADMIN_BOOTSTRAP_TOKEN` | one-time; rotate after use |
| `DATABASE_URL` | copy of `POSTGRES_PRISMA_URL` |
| `DIRECT_URL` | copy of `POSTGRES_URL_NON_POOLING` |

---

## 4. Variables that come from the Vercel/Supabase integration

Already connected per the task context — should appear automatically once the
integration is linked to the project/environment:

`POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`,
`POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`,
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

> Action required from you: confirm in the Vercel dashboard that these are present
> in **Production, Preview, and Development**, and that the Prisma aliases
> (`DATABASE_URL`, `DIRECT_URL`) are wired to the correct Postgres URLs.

---

## 5. Variables that come from Vercel Blob

`BLOB_READ_WRITE_TOKEN` (required), `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`.

> Action required from you: confirm the Blob store is connected and
> `BLOB_READ_WRITE_TOKEN` exists in all environments.

---

## 6. Prisma alias rule (recorded)

```
DATABASE_URL = POSTGRES_PRISMA_URL        # pooled (pgbouncer) — runtime queries
DIRECT_URL   = POSTGRES_URL_NON_POOLING   # direct connection — migrations
```

Keep them in sync whenever Supabase rotates connection strings.

---

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Repo is empty — no code consumes these vars yet; the expected set is unverified against real usage | High | Re-run the code search after the app scaffolding lands (Slice 0.2+) and reconcile. |
| R2 | Prisma aliases not wired → migrations fail / runtime uses wrong pool | High | Enforce the alias rule (§6) in Vercel; verify before first migration. |
| R3 | A secret accidentally placed behind `NEXT_PUBLIC_*` | High | `.env.example` + docs flag public vars explicitly; review before deploy. |
| R4 | `.env.local` committed by mistake | High | Ensure `.gitignore` excludes `.env*` except `.env.example` (no `.gitignore` exists yet — add in scaffolding). |
| R5 | `PLATFORM_ADMIN_BOOTSTRAP_TOKEN` left active after bootstrap | Medium | Rotate/remove post-bootstrap (documented). |
| R6 | Integration vars missing in one environment (e.g. Preview) | Medium | Verify presence across P/Prev/Dev in Vercel. |
| R7 | No `.gitignore` present — risk of leaking future local env files | High | Add `.gitignore` in the next slice before any real env file exists locally. |

---

## 8. Commands executed (no secret values printed)

```
find . -not -path './.git/*' -not -name '.git'        # → only repo root (empty)
grep -rnE '<env patterns>' --include=*.ts ... .       # → 0 matches (no code)
command -v node npm pnpm yarn npx tsc eslint vercel    # tooling probe
node -v                                                # v22.22.2
[ -f package.json ]                                    # absent
grep -nE '=(...secret-like...)' .env.example           # → no populated secrets
git status                                             # branch, no commits
```

No command read or printed any real environment-variable value.

---

## 9. Results

| Task | Result |
|---|---|
| 1. Code search | Done — **0** usages (empty repo) |
| 2. `.env.example` exists/created | **Created** (`.env.example`) |
| 3. Required vars present in template | **Yes** — app vars + auto + Blob documented |
| 4. `docs/ENVIRONMENT.md` updated | **Created** with full per-variable table |
| 5. Prisma aliases documented | **Yes** (§6 + ENVIRONMENT.md §2.1) |
| 6. No secrets printed | **Confirmed** |
| 7. Light gate (typecheck/lint/test) | **N/A** — no `package.json`/project to run against |
| 8. This report | **Created** |

Artifacts produced (uncommitted, working tree only):
- `.env.example`
- `docs/ENVIRONMENT.md`
- `docs/reports/SLICE-0C-ENVIRONMENT-VERIFICATION.md`

---

## 10. Recommendation: **CONDITIONAL GO** for Slice 0.2

The environment **contract** is now documented and the template exists, which is
the deliverable of Slice 0C. However, this was validated against an **empty repo**,
so it could not be reconciled with real code usage, and the typecheck/lint/test
gate could not run.

**GO to Slice 0.2 is acceptable** provided that, as the first steps of the next
slice:

1. The application scaffolding (`package.json`, Next.js, Prisma, `.gitignore`) is
   created so the gate can actually run.
2. `.gitignore` excludes `.env*` (keeping only `.env.example`) **before** any local
   `.env.local` is created. *(Risk R4/R7.)*
3. The Vercel dashboard is confirmed to hold the integration + Blob vars across
   Production/Preview/Development, with the Prisma aliases wired (§6).
4. After scaffolding, re-run the code search and reconcile actual `process.env`
   usage against this documented set.

If you prefer a stricter posture, this is a **NO GO until the repo is scaffolded**,
since "environment verification against the code" cannot be truly satisfied while
there is no code.
