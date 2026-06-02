# SLICE 2 — Auth tenant-scoped

**Date:** 2026-06-02
**Branch:** `main`
**Scope:** Real per-tenant authentication on top of the Slice 1 tenancy foundation.
**No product:** no landing, dashboard, mentoring, search, sessions(domain), billing.

---

## 1. Decisions implemented

| Area | Decision |
|---|---|
| **No global User / no global login** | Every auth op resolves the tenant from the host (`resolveActiveTenant`) and runs through `withTenant` (RLS). Non-tenant hosts (apex, `admin`, reserved, unknown) are rejected with `no_tenant_login`. There is **no** `/login` page and no `/:slug/login`. |
| **Identity** | `TenantUser` only. Same email may exist in different tenants (`unique(tenant_id, normalized_email)`). |
| **Password** | scrypt (Node core, no native deps): `scrypt$salt$hash`, constant-time compare. |
| **Session** | Stateless, HMAC-SHA256 signed token (AUTH_SECRET), **carries `tenantId`**, in an HttpOnly/SameSite=Lax cookie (`mm_session`; Secure in prod). Verified against the resolved host → a session from tenant A is rejected on B (`tenant_mismatch`). |
| **Consent** | Mandatory at signup and **atomic** with account creation (same `withTenant` transaction): no consent → no account. Terms version recorded in `consent_record`. |
| **RBAC** | Tenant-scoped roles (`admin`/`program_manager`/`mentor`/`mentee`/`member`); `requireRole()` → FORBIDDEN. |
| **Route protection** | `requireSession(host, cookie)` resolves tenant, verifies the session, and confirms `session.tenantId === host tenant`. `/api/me` is the protected example. |
| **Rate limit** | Fail-closed limiter on login (5/min/host+email) and signup (10/min); denies on store failure. |
| **Audit** | `auth.signup` / `auth.login` / `auth.logout` / `auth.password_reset` persisted to `audit_event` (tenant-scoped, RLS) with redacted metadata. |
| **Password reset** | Tenant-scoped, token-based (HMAC `typ=reset`, 1h, bound to `tenantId`) — no extra table. Non-enumerating; token emailed in prod (returned in body only outside production as an email stand-in). |

## 2. Routes created (App Router, `runtime=nodejs`, dynamic)

| Route | Method | Behaviour |
|---|---|---|
| `/api/auth/signup` | POST | host-gated; consent required; creates user+consent atomically; sets session cookie; 201 |
| `/api/auth/login` | POST | host-gated; rate-limited; generic non-enumerating error; sets session cookie; 200 |
| `/api/auth/logout` | POST | audits logout (if session); clears cookie; 200 |
| `/api/me` | GET | **protected**; returns `{userId, tenantId, role}` or 401 |
| `/api/auth/password-reset/request` | POST | non-enumerating; issues reset token |
| `/api/auth/password-reset/confirm` | POST | verifies token (tenant-bound); updates password |

Handlers read `host`/`cookie` from the `Request` and set `Set-Cookie` on the
`Response` (no `next/headers` dependency) → fully unit-testable.

Build note: `next.config.ts` adds `serverExternalPackages: ['pg']` and a webpack
`extensionAlias` (`.js`→`.ts`) so the routes build. App build stays green; `/` static.

## 3. Session & claims

Cookie `mm_session` = `base64url(claims).base64url(HMAC-SHA256)`:

```json
{ "typ": "session", "sub": "<tenantUserId>", "tenantId": "<uuid>",
  "role": "<role>", "iat": <unix>, "exp": <unix> }   // TTL 8h
```

- `tenantId` is mandatory in every session and re-checked against the host on each
  protected request.
- Reset tokens use `typ: "reset"` (1h) and are not accepted as sessions.

## 4. Mandatory rules — compliance

no global User ✓ · same email across tenants ✓ · tenant always resolved by host ✓ ·
no `/login` global ✓ · no `/:slug/login` ✓ · every session carries `tenantId` ✓ ·
ContactInfo/sensitive data isolated (RLS from Slice 1, unchanged) ✓ · consent
mandatory ✓ · login/logout audited ✓ · auth rate limit ✓ · uses
`resolveTenant`/`withTenant`/RLS ✓.

## 5. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run build            → PASS (/, /_not-found static; 6 auth/api routes + /health dynamic)
npm run test:unit        → 81 passed
npm run test:integration → 13 passed (5 tenancy + 8 auth; real Postgres 16, role mm_app)
npm test (no DB)         → 81 passed | 13 skipped (integration self-gates)
```

### Required proofs (8) — all passing (integration)
1. **Login of A does not authenticate B** — same creds on B's host → 401; A's session
   on B's host → 401 (`tenant_mismatch`); on A's host → 200 with A's `tenantId`.
2. **Same email in two tenants works** — signup of one email on A and B → both 201.
3. **Session carries tenantId** — decoded session claims `tenantId === A.id`.
4. **Protected route blocks without auth** — `GET /api/me` with no cookie → 401.
5. **Logout clears session** — `Set-Cookie` Max-Age=0; subsequent `/api/me` → 401.
6. **Consent blocks signup** — `consent:false` → 400; no account (login → 401).
7. **Login/logout audited** — `audit_event` has `auth.login` + `auth.logout` for the actor.
8. **Rate limit works** — 5 bad logins → 401, then → 429.

Unit suites add: scrypt round-trip, session sign/verify (tamper/expiry/typ),
fail-closed rate limiter, RBAC, and consent + global-login block without a DB.

## 6. How to reproduce

```bash
DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres \
DIRECT_URL=postgresql://mm_owner@127.0.0.1:5432/mentormatch npm run db:bootstrap

DATABASE_URL=postgresql://mm_app@127.0.0.1:5432/mentormatch \
DIRECT_URL=postgresql://mm_owner@127.0.0.1:5432/mentormatch \
AUTH_SECRET=<secret> npm run test:integration
```

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| A1 | Sessions are stateless (no server-side revocation list) | Medium | Short TTL (8h); add a revocation/rotation store when sessions table lands. |
| A2 | Rate limiter is in-process (per instance) | Medium | Fail-closed + behind an interface; swap for Redis/Upstash at scale. |
| A3 | Reset token returned in body outside production (no email yet) | Low | Gated to non-prod; real flow emails the token. |
| A4 | Host-gating enforced in handlers, not edge middleware | Low | `node:crypto`/`pg` aren't edge-safe; can hoist pure host checks to middleware later. |
| A5 | Runtime uses `pg` (ADR-002 bounded deviation; Prisma client not wired) | Low | RLS proven; carry-over from Slice 1. |
| A6 | scrypt cost not tuned / argon2id not used | Low | Acceptable; evaluate argon2id at hardening. |
| A7 | `npm audit` dev-dep advisories | Low | Toolchain only. |

## 8. Recommendation: **GO** for Slice 3

All Definition-of-Done items met; the 8 required proofs pass against a real Postgres
with RLS, and typecheck/lint/build are green. Auth is fully tenant-scoped: no global
user, no global login, every session bound to a tenant, consent mandatory and atomic,
login/logout audited, rate-limited. The Next.js app build is unaffected for static
content; new endpoints are dynamic Node routes.

**Carry-over:** server-side session revocation + rotation, shared-store rate limiter,
email delivery for reset, wiring Prisma client behind `withTenant` (ADR-002), and
hoisting pure host-gating to middleware.

> Not pushed and Slice 3 not started — awaiting acceptance.
