# SLICE 0C — Vercel Readiness

**Date:** 2026-06-02
**Branch:** `claude/elegant-archimedes-wY5y5`
**Scope:** Verify Vercel readiness. No deploy, no sensitive-config changes, no
secret values printed, Slice 0.2 NOT started.

---

## 1. Vercel CLI available?

| Check | Result |
|---|---|
| `command -v vercel` | **Not found** — Vercel CLI is **not installed** in this environment |
| Local `node_modules/.bin/vercel` | absent (no project / no deps) |

**Consequence:** the safe inspection commands could **not** be run from here:
- `vercel whoami` → not run (no CLI)
- `vercel project ls` → not run (no CLI)
- `vercel env ls` → not run (no CLI)

These must be run from your machine (or a CI step) where the Vercel CLI is
authenticated.

---

## 2. Project linked?

| Check | Result |
|---|---|
| `.vercel/` directory present | **No** — project is **not linked** locally |

### How to link (run locally, where Vercel CLI is authenticated)

```bash
npm i -g vercel            # or: pnpm add -g vercel
vercel login
vercel link                # choose scope mzinhoww-gmailcoms-projects → project "mentormatch"
# verify:
vercel whoami
vercel project ls
```

This creates a git-ignored `.vercel/` folder linking the local repo to the
`mentormatch` project.

---

## 3. Environments (intended)

| Environment | Trigger | `APP_ENV` | URL |
|---|---|---|---|
| Production | production branch | `production` | `https://<APP_BASE_DOMAIN>` |
| Preview | each PR / branch | `preview` | `https://<deployment>.vercel.app` |
| Development | local `next dev` | `development` | `http://localhost:3000` |

Detailed strategy in [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md).

---

## 4. Environment variables — verification by NAME

> **Could not be verified from this environment** because the Vercel CLI is absent
> (`vercel env ls` not runnable here). The table below lists the **expected names**
> and how to confirm them. No values were requested or shown.

Run locally to confirm presence (names only, never values):

```bash
vercel env ls                      # lists names + target scopes (no values)
```

| Variable | Expected source | Confirm in Vercel? |
|---|---|---|
| `DATABASE_URL` | [APP] copy of `POSTGRES_PRISMA_URL` | ⬜ to verify |
| `DIRECT_URL` | [APP] copy of `POSTGRES_URL_NON_POOLING` | ⬜ to verify |
| `AUTH_SECRET` | [APP] | ⬜ to verify |
| `AUTH_TRUST_HOST` | [APP] (`true`) | ⬜ to verify |
| `APP_ENV` | [APP] | ⬜ to verify |
| `APP_BASE_DOMAIN` | [APP] | ⬜ to verify |
| `TENANT_DOMAIN_MODE` | [APP] | ⬜ to verify |
| `NEXT_PUBLIC_APP_URL` | [APP] public | ⬜ to verify |
| `ENCRYPTION_KEY` | [APP] | ⬜ to verify |
| `PLATFORM_ADMIN_EMAIL` | [APP] | ⬜ to verify |
| `PLATFORM_ADMIN_NAME` | [APP] | ⬜ to verify |
| `PLATFORM_ADMIN_BOOTSTRAP_TOKEN` | [APP] | ⬜ to verify |
| `BLOB_READ_WRITE_TOKEN` | [BLOB] | ⬜ to verify |
| `POSTGRES_PRISMA_URL` | [AUTO] Supabase integration | ⬜ to verify |
| `POSTGRES_URL_NON_POOLING` | [AUTO] Supabase integration | ⬜ to verify |

All 15 names are documented in `docs/ENVIRONMENT.md` and present (as placeholders)
in `.env.example`.

---

## 5. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| V1 | Vercel CLI absent here → readiness cannot be confirmed automatically | High | Run `vercel whoami/project ls/env ls` locally and record results. |
| V2 | Project not linked locally | Medium | `vercel link` to `mentormatch` (§2). |
| V3 | Env var possibly missing/typo in a scope | High | `vercel env ls`; reconcile against the 15 expected names. |
| V4 | Prisma aliases not actually wired in Vercel | High | Confirm `DATABASE_URL`/`DIRECT_URL` map to the correct Postgres URLs. |
| V5 | No app to deploy yet | High | Scaffold before first real deploy. |
| V6 | Secrets in wrong scope or public prefix | High | Ensure only `NEXT_PUBLIC_*` are public; verify scopes. |

---

## 6. Next steps

1. On your machine: install + login + `vercel link` to project `mentormatch`.
2. Run `vercel env ls` and tick the 15 names in §4 across Production/Preview/Dev.
3. Confirm Supabase + Blob integration vars are injected in all scopes.
4. Confirm Prisma aliases are wired (`DATABASE_URL`, `DIRECT_URL`).
5. Scaffold the app so a real build/deploy can be exercised.

---

## 7. Recommendation: **NO GO** for Slice 0.2 (deploy readiness not yet provable)

Vercel readiness **cannot be confirmed from this environment** (no CLI, project not
linked) and, more fundamentally, **there is no app to deploy**. The integrations are
reportedly connected, but their variables remain unverified by name here.

Proceed only after: (a) the project is scaffolded, (b) `vercel link` + `vercel env
ls` confirm the 15 expected variable names across all scopes, and (c) the local
technical gate (see `SLICE-0C-TECHNICAL-GATE.md`) is green. Re-evaluate to **GO**
once those hold.
