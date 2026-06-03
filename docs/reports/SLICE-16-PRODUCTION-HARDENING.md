# SLICE 16 — Production Hardening

**Date:** 2026-06-03
**Scope:** Operational/reliability/observability hardening for real production.
**Additive only** — no change to tenancy, auth, RLS, domain, or the main product
flow. Out of scope: new landing.

---

## 1. What was hardened

### Observability
- **requestId/tenantId correlation** confirmed already built into the logger
  (pulls from `runWithRequestContext`) with **redaction** of sensitive fields — no
  change needed; verified.
- **`alertCritical(event, fields)`** (`observability/alert.ts`): emits a structured
  `error` log flagged `alert:true` + `alertEvent` — the single integration point for
  paging/webhooks. Wired into the email cron's per-tenant failure path. Never throws.

### Jobs & workers
- **Real cross-tenant email worker** (`email/cron.ts`): `processAllTenants()` iterates
  active tenants and runs `processTenantEmails` **in each tenant's own context**
  (withTenant/RLS); a per-tenant failure is alerted and skipped (never aborts the run).
- **Schedule**: `vercel.json` Cron `*/5 * * * *` → `GET /api/cron/email`.
- **Auth**: `/api/cron/email` requires `CRON_SECRET` (Bearer). Unset → **503 disabled**;
  wrong → **401**. Constant-time-ish compare.
- **Retries with limit / controlled dead-letter**: `sendPendingEmails` retries
  `pending` + `failed` while `attempts < 3`; exhausted messages stay `failed` with
  `last_error` (queryable via `GET /api/admin/email?status=failed`).

### Cache & performance
- **Missing hot-path indexes** (`0011_perf`): partial `idx_notification_email_pending`
  (email worker scan) and `idx_request_expiry` (request-expiry job). Existing indexes
  already cover mentorship/request/session/notification/feedback reads; pagination &
  ordering on the mentor directory were already in place (`ORDER BY`, `LIMIT/OFFSET`).

### Security
- **Baseline security headers on every response** (`securityHeaders.ts` + `next.config`):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`,
  `Strict-Transport-Security` (2y, preload), `Permissions-Policy`. **Verified live** on
  a running server.
- **Rate limit on the public demo form** (`/api/demo-request`): 5/min/client (reuses
  `createRateLimiter`, fail-closed) → 429 on abuse.
- **Secrets/exposure review**: cron endpoint disabled without secret; `robots.txt`
  disallows `/app/` and `/api/`; ContactInfo isolation and payload redaction unchanged
  (existing guards + tests still green).

### Backup & recovery
- See `docs/BACKUP-RECOVERY.md` — strategy + operational checklist (Supabase PITR /
  daily backups, restore drill, migration replay via `db:bootstrap`).

### E2E / smoke
- **`scripts/smoke.mjs`** (`npm run smoke`, `BASE_URL=...`): real HTTP smoke against a
  deployment — `/health`, landing pages, `/robots.txt`, `/sitemap.xml`,
  `/api/branding` (200) and `/api/me` (401). **Ran green against a live server.**
- **Integration smoke journey**: provision → admin login → real admin metrics →
  non-empty directory → cross-tenant isolation, in one path.

## 2. What was consolidated

- Single **`vercel.json`** with the cron (one source of truth for scheduling).
- `.env.example` documents `CRON_SECRET`.
- Vercel project consolidation (4 → 1) is documented as an operational step (cannot be
  done from the repo) in `docs/BACKUP-RECOVERY.md` / runbook.

## 3. Tests & results (observable)

```
typecheck            → PASS
lint                 → PASS
prisma:validate      → PASS
build                → PASS (adds /api/cron/email)
test:unit            → 175 passed (headers, alert, cron-auth, demo route incl. 429)
test:integration     → 102 passed (per-tenant email worker + isolation, hot-path
                        indexes exist, smoke journey; product suites — no regression)
live server          → security headers present on responses; `npm run smoke` 9/9 OK
```

### Required proofs (8)
1. **Critical flows still green** — all product suites pass (102 integration).
2. **Pending emails process without breaking the domain** — per-tenant worker sends; provider failure path is out-of-band (Slice 14) + cron skips/alerts on tenant error.
3. **Errors are observable** — `alertCritical` emits `alert:true` structured error (unit-verified); logger carries requestId/tenantId + redaction.
4. **Critical-query performance didn't regress** — additive indexes only; suites green; hot-path indexes asserted present.
5. **Header & redaction security correct** — headers verified live; redaction/sanitize suites green.
6. **Real smoke passes** — `npm run smoke` 9/9 against a running server.
7. **No tenant crosses another** — per-tenant email isolation + smoke isolation asserted.
8. **Production stays stable** — additive-only changes; full suite green; main flow untouched.

## 4. Still a risk

| Pri | Risk | Note |
|---|---|---|
| P2 | **Real email transport** still pending (console/noop) | Cron + queue + retry are ready; plug SMTP/Resend/SES behind `EmailProvider`. |
| P2 | **Vercel project consolidation** (4→1) is manual | Operational; documented. Point one project at `*.APP_BASE_DOMAIN`. |
| P3 | **No strict CSP** (Next inline + Google Fonts need nonces) | Other security headers in place; CSP is a focused follow-up. |
| P3 | Rate limiter is **in-process** (per instance) | Fine for now; move to shared store (Redis) at higher scale. |
| P3 | Demo leads logged, not stored; no OG image | From Slice 15; non-blocking. |
| P3 | `tenant_domain` table still orphan (custom domain) | Decide implement/remove (from audit). |

## 5. Ready for production

- Multi-tenant + RLS isolation, auth, profile, search, mentorship, sessions,
  notifications, feedback, admin (backend), programs, branding, provisioning, and
  email **queue/worker/cron** are real, tested, and tenant-scoped.
- Security headers, public-form rate limit, structured/correlated logs + critical
  alerts, hot-path indexes, scheduled worker, and a runnable smoke test are in place.
- Operational prerequisites remain (env + DNS + provision + **real email transport** +
  project consolidation) — none require code.

## 6. GO / NO GO for commercial launch

**GO for a controlled commercial launch (production-limited), conditioned on the
operational steps below** — not a blocker in code, but required before unattended GA:

1. Configure prod env (`APP_BASE_DOMAIN`, `DATABASE_URL`/`DIRECT_URL`, `AUTH_SECRET`,
   `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`) + wildcard DNS.
2. Plug a **real email provider** behind `EmailProvider` and confirm the cron delivers.
3. `npm run provision` against prod, then `BASE_URL=… npm run smoke` green in the browser.
4. Consolidate to a single Vercel project.

With those done, the platform is ready for **production-limited / first paying
customers**. Full unattended GA additionally wants self-serve onboarding (from the
audit). Code-side hardening for this slice is **complete and green**.
