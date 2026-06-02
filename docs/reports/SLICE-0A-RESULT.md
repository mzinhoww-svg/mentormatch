> ⚠️ **REGISTRO DE PLANEJAMENTO (fase Claude.ai) — importado no Slice 0R.**
> Este relatório descreve trabalho realizado na fase de planejamento no Claude.ai.
> **O código/testes que ele cita (RLS, Prisma, suíte de integração) NÃO estão
> implementados neste repositório baseline.** O que existe de fato no repo está em
> [`SLICE-0R-BASELINE-CONSOLIDATION.md`](./SLICE-0R-BASELINE-CONSOLIDATION.md). As
> implementações de referência do Slice 0A foram preservadas (não compiladas) em
> `docs/brand/source/slice-0a-planning/` e serão reintroduzidas numa fatia de dados
> dedicada. Mantido aqui como registro histórico das decisões e da evidência original.


# SLICE-0A-RESULT — Technical Risk Harness

**Status:** Complete. All Definition of Done items met.
**Date:** 2026-06-01
**Scope:** Prove the hardest technical risks of MentorMatch SaaS v2 with minimal code,
real tests, and observable evidence — **before** any mentoring feature is built.

This slice deliberately builds **no** product features: no dashboard, no profiles, no
mentor search, no sessions, no notifications, no premium landing, no full design system.

---

## 1. What was implemented

| Area | Implementation |
|---|---|
| **Tenant resolution** | Pure, DB-free `resolveTenantFromHost(host)` classifying hosts into `INSTITUTIONAL` / `PLATFORM_ADMIN` / `RESERVED` / `UNKNOWN` / `TENANT`. Reserved-subdomain blocklist enforced. `hostPermitsTenantLogin()` returns true ONLY for a confirmed tenant host. |
| **Super Admin separation** | `admin.mentormatch.app` resolves to `PLATFORM_ADMIN`; `platform_admin` table is a separate identity from `tenant_user`. A TenantUser host can never resolve to the admin console and vice versa. |
| **Minimal data model** | `tenant`, `tenant_domain`, `tenant_user`, `consent_record`, `platform_admin`, `audit_event`. `unique(tenant_id, normalized_email)`. `normalized_email` = lowercase+trim. Auth email modeled as credential, not public contact. |
| **Real RLS** | `ENABLE` + `FORCE ROW LEVEL SECURITY` on all four tenant-scoped tables via versioned raw-SQL migrations (`prisma/migrations/0002_rls`). NULL-safe `app_current_tenant()` → default-deny. |
| **App role hardening** | `mm_app` created `NOSUPERUSER NOBYPASSRLS`. App connects as `mm_app`; migrations run as `mm_owner` (also non-superuser). Verified in `pg_roles`. |
| **`withTenant()` guard** | Mandatory transactional helper. Sets `app.tenant_id` via `set_config(..., is_local=true)` (SET LOCAL semantics) so context is transaction-scoped and cannot leak to the next pooled query. Rejects missing/invalid tenant id. |
| **Auth (minimal)** | Tenant-scoped signup + login. Consent mandatory and atomic with account creation. Generic non-enumerating error. scrypt password hashing. Rate limiting on signup + login, **fail-closed**. No `/login` global, no `/:slug/login` — login only reachable for a resolved+active tenant host. |
| **LGPD consent** | `consent_record` stores terms version, timestamp, IP (when available). No consent ⇒ no activated user (enforced in service + data flow). |
| **CI** | GitHub Actions runs Postgres 16, applies migrations, then typecheck + lint + unit + integration. Any failure fails the build. |

## 2. Commands executed

```
npm ci
npm run db:migrate        # bootstraps roles (non-superuser), db, schema, RLS
npm run typecheck         # tsc --noEmit  -> PASS
npm run lint              # eslint        -> PASS
npm run test:unit         # 17 tests      -> PASS
npm run test:integration  # 20 tests      -> PASS (against real Postgres 16)
psql -f scripts/evidence.sql   # live DB evidence (below)
```

## 3. Test results

```
Test Files  4 passed (4)
     Tests  37 passed (37)
  - resolveTenant.test.ts ...... 11  (host classification, blocklist, no-login cases)
  - auth-units.test.ts .......... 6  (email normalize, rate-limit fail-closed, scrypt)
  - rls-isolation.test.ts ....... 9  (isolation, default-deny, context non-leak, same-email-2-tenants)
  - auth.test.ts ............... 11  (host gating, consent-mandatory, no-enumeration, fail-closed)
```

## 4. Evidence — login without tenant does not exist

`requireTenantFromHost()` is the single gate for both signup and login. It throws
`NO_TENANT_LOGIN` for institutional, admin, reserved, unknown, and unprovisioned-slug
hosts. Proven by `auth.test.ts`:

- `login("mentormatch.app", ...)` → `NO_TENANT_LOGIN`
- `login("admin.mentormatch.app", ...)` → `NO_TENANT_LOGIN`
- `login("api.mentormatch.app", ...)` → `NO_TENANT_LOGIN`
- `login("evil.com", ...)` → `NO_TENANT_LOGIN`
- `login("ghosttenant.mentormatch.app", ...)` → `NO_TENANT_LOGIN` (slug not provisioned)

There is no code path that authenticates a user without first resolving an **active**
tenant from the host.

## 5. Evidence — cross-tenant access fails

Live DB output (`scripts/evidence.sql`):

```
== 1. App role is NOT superuser and NOT bypassrls ==
 rolname  | rolsuper | rolbypassrls | rolcanlogin
----------+----------+--------------+-------------
 mm_app   | f        | f            | t
 mm_owner | f        | f            | t

== 2. RLS enabled AND forced on all tenant-scoped tables ==
    relname     | rls_enabled | rls_forced
----------------+-------------+------------
 audit_event    | t           | t
 consent_record | t           | t
 tenant_domain  | t           | t
 tenant_user    | t           | t

== 3. Isolation policies present ==
 audit_event    | p_audit_isolation         | ALL
 consent_record | p_consent_isolation       | ALL
 tenant_domain  | p_tenant_domain_isolation | ALL
 tenant_user    | p_tenant_user_isolation   | ALL

== 4. DEFAULT DENY: as mm_app with no tenant context, tenant_user is empty ==
 rows_visible_without_context
------------------------------
                            0
```

Reinforced by `rls-isolation.test.ts`:
- Tenant A sees only its own users; never tenant B's.
- Tenant B querying `WHERE tenant_id = <A.id>` still gets **zero** rows (RLS filters first).
- Raw query with no context → 0 rows (default deny). Raw insert with no context → rejected.
- After a `withTenant(A)` transaction, the pooled connection's `app.tenant_id` is NULL on
  the next 5 raw queries (no leak).
- Same email in tenant A and tenant B → two independent rows; duplicate within one tenant → rejected.

## 6. Vercel & environments

- **Production:** wildcard `*.mentormatch.app` + apex `mentormatch.app` + `admin.mentormatch.app`.
- **Staging:** separate project/branch with `*.staging.mentormatch.app`.
- **Preview:** Vercel preview deployments do **not** receive a wildcard subdomain by default.
  Sanctioned workaround for E2E: run tenant-resolution E2E against the stable staging
  wildcard, or inject the resolved tenant host via a signed `x-mm-tenant-host` header set
  **only** in the E2E harness. **No public path-based fallback** is used in production
  (forbidden by the brief).
- Local dev: `{tenant}.localhost:3000` resolves natively. Documented alternative if an
  environment can't resolve `*.localhost`: `{tenant}.lvh.me` (public DNS → 127.0.0.1).

## 7. Known limitations

1. **Prisma Client not wired for app queries yet.** Per ADR-002 Decision 3, the data layer
   uses the `pg` driver with the exact table shapes/constraints Prisma would generate and
   the RLS in raw-SQL migrations (as the brief requires). Recommendation for Slice 0: adopt
   Prisma Client *behind* `withTenant()`, keeping RLS in raw SQL. This is the only deviation
   from a literal reading of the brief and is intentionally bounded.
2. **Rate limiter is in-process.** Correct fail-closed behavior is proven, but production
   needs a shared store (Redis/Upstash) behind the same `RateLimiter` interface.
3. **Sessions/tokens/password-reset** are specified as tenant-scoped but only the
   login/signup primitives are built in 0A. Full session + reset flows belong to Slice 0/auth slice.
4. **scrypt** chosen for zero native-build friction; evaluate argon2id at hardening.
5. **No E2E browser tests yet** (no UI in 0A by design). Resolution logic is covered by
   unit tests; browser E2E arrives with the first screens.

## 8. Recommendation

Proceed to **Slice 0 (original foundations)**. The hard risks — tenant isolation, RLS
default-deny, context non-leak, per-tenant identity uniqueness, host-gated auth, fail-closed
rate limiting, mandatory consent — are proven against a real Postgres with passing CI. The
single bounded deviation (Prisma Client vs pg driver) should be closed early in Slice 0 by
wiring Prisma behind the existing `withTenant()` helper without touching the RLS migrations.
