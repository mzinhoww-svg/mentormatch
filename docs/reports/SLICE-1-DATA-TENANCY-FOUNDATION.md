# SLICE 1 — Data & Tenancy Foundation

**Date:** 2026-06-02
**Branch:** `main`
**Scope:** Implement the real multi-tenant data foundation. **No product**: no
landing, no dashboard, no mentoring, no visual login.

---

## 1. What was implemented

The 5 required entities + the tenancy machinery (Prisma schema, raw-SQL migrations
with RLS, `withTenant()`, `resolveTenant()`), wired to enforce isolation at the
database level.

### Files
```
prisma/
├── schema.prisma                     # 5 models (source of truth)
└── migrations/
    ├── migration_lock.toml
    ├── 0001_init/migration.sql       # tables, constraints, indexes
    └── 0002_rls/migration.sql        # RLS: enable+force, policies, grants
src/tenancy/
├── resolveTenant.ts                  # pure host → tenant classification
├── withTenant.ts                     # MANDATORY transactional guard (SET LOCAL)
├── pool.ts                           # mm_app (DATABASE_URL) / mm_owner (DIRECT_URL)
├── admin.ts                          # tenant registry ops + resolveActiveTenant
├── index.ts
└── __tests__/
    ├── resolveTenant.test.ts             # unit (10)
    └── tenancy.integration.test.ts       # integration (5, real Postgres)
scripts/db-bootstrap.mjs              # roles + db + apply migrations (local/CI)
```

## 2. Migrations created

| Migration | Purpose |
|---|---|
| `0001_init` | Creates `tenant`, `tenant_domain`, `tenant_user`, `consent_record`, `audit_event` with constraints + indexes. |
| `0002_rls` | `app_current_tenant()`; `ENABLE` + `FORCE ROW LEVEL SECURITY` on the 4 tenant-scoped tables; isolation policies; grants to `mm_app`. |

Applied via `npm run db:bootstrap` (as `mm_owner`). Prisma schema validated:
`The schema at prisma/schema.prisma is valid 🚀`.

## 3. Tables created (5)

| Table | Tenant-scoped? | Notes |
|---|---|---|
| `tenant` | **No** (registry) | looked up by slug to resolve a host; `mm_app` has SELECT only |
| `tenant_domain` | Yes | RLS |
| `tenant_user` | Yes | identity; `unique(tenant_id, normalized_email)`; ContactInfo columns |
| `consent_record` | Yes | LGPD consent, terms version |
| `audit_event` | Yes | append-only audit trail |

## 4. RLS policies created

Live DB verification (`pg_class` / `pg_policies`):

```
rls  audit_event    relrowsecurity=t  relforcerowsecurity=t
rls  consent_record relrowsecurity=t  relforcerowsecurity=t
rls  tenant_domain  relrowsecurity=t  relforcerowsecurity=t
rls  tenant_user    relrowsecurity=t  relforcerowsecurity=t
rls  tenant         relrowsecurity=f  relforcerowsecurity=f   (registry, by design)

policy audit_event    p_audit_isolation
policy consent_record p_consent_isolation
policy tenant_domain  p_tenant_domain_isolation
policy tenant_user    p_tenant_user_isolation
```

Each policy: `USING (tenant_id = app_current_tenant()) WITH CHECK (...)`, where
`app_current_tenant()` is NULL-safe → **default-deny** with no context.

Roles (live `pg_roles`): `mm_app` and `mm_owner` are both
`rolsuper=f, rolbypassrls=f` (non-superuser, cannot bypass RLS).

## 5. Mandatory rules — compliance

| Rule | How it is met |
|---|---|
| no global User | only `TenantUser`; no `User`/`Membership` table |
| TenantUser is the identity | `tenant_user` is the only identity table |
| `unique(tenantId, normalizedEmail)` | `uq_tenant_user_email` constraint |
| no global login | `resolveTenant` + `hostPermitsTenantLogin` gate login to TENANT hosts only |
| tenant resolved by host | `resolveTenantFromHost()` (pure) + `resolveActiveTenant()` (DB-confirm) |
| tenantId mandatory | `withTenant()` requires a valid uuid; RLS denies queries with no context |
| RLS mandatory | `ENABLE` + `FORCE` on all 4 tenant-scoped tables |
| mandatory helper for tenant-scoped queries | `withTenant()` (SET LOCAL, transaction-scoped) |

## 6. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run build            → PASS (/, /_not-found, /health; tenancy code not bundled)
npm run prisma:validate  → PASS (schema valid)
npm run db:bootstrap     → applied 0001, 0002

npm run test:unit        → 62 passed (resolveTenant 10 + observability 51 + health 1)
npm run test:integration → 5 passed (real Postgres 16, role mm_app)
npm test (no DB)         → 62 passed | 5 skipped (integration self-gates on DATABASE_URL)
```

### Integration proofs (all passing)
1. **Tenant A cannot access Tenant B** — A sees only its rows; B querying `WHERE
   tenant_id = A` returns **0** rows (RLS filters first).
2. **Query without tenant context fails** — raw read → 0 rows (default-deny); raw
   insert with no context → rejected (WITH CHECK vs NULL); `withTenant('not-a-uuid')`
   → throws.
3. **Same email in two tenants works** — same `normalized_email` in A and B → two
   independent rows; duplicate within one tenant → unique violation.
4. **resolveTenant resolves by host** — provisioned slug → `TENANT`; unprovisioned →
   `NO_TENANT (slug_not_provisioned)`; institutional/admin/reserved → `NO_TENANT`.
5. **ContactInfo stays isolated** — B cannot read A's `contact_email`/`contact_phone`
   (0 rows); A reads its own.

## 7. Environment / how to reproduce

```bash
# start Postgres 16, then:
DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres \
DIRECT_URL=postgresql://mm_owner@127.0.0.1:5432/mentormatch \
npm run db:bootstrap

DATABASE_URL=postgresql://mm_app@127.0.0.1:5432/mentormatch \
DIRECT_URL=postgresql://mm_owner@127.0.0.1:5432/mentormatch \
npm run test:integration
```
`DATABASE_URL` = app role (mm_app); `DIRECT_URL` = owner role (mm_owner). Maps to
`POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` in production (docs/ENVIRONMENT.md).

## 8. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| T1 | Runtime path uses `pg` driver, not Prisma Client (ADR-002 bounded deviation) | Low | RLS proven with real tests; wiring Prisma behind `withTenant` tracked as follow-up. |
| T2 | Roles/db provisioning needs superuser (bootstrap) | Low | Production provisions roles out-of-band; only migrations run as owner. |
| T3 | In-process pools; no shared rate limiting / connection caps tuned | Low | Out of scope; revisit at scale. |
| T4 | `tenant` registry has no RLS (by design) | Low | Holds only tenant metadata; `mm_app` is SELECT-only; needed pre-context for resolution. |
| T5 | Custom-domain resolution (`tenant_domain`) not yet wired into resolveActiveTenant | Low | V1 resolves by subdomain; custom domains are future (Enterprise). |
| T6 | No session/auth flow yet | Expected | Auth is a later slice; Slice 1 is data+tenancy only. |
| T7 | `npm audit` dev-dep advisories | Low | Toolchain only; not shipped at runtime. |

## 9. Recommendation: **GO** for Slice 2

All Definition-of-Done items met. The hard isolation invariants — cross-tenant
default-deny, mandatory tenant context, per-tenant identity uniqueness, host-gated
resolution, ContactInfo isolation — are **proven against a real Postgres 16** with
RLS enabled+forced and a non-superuser, NOBYPASSRLS app role. typecheck/lint/build
green; the Next.js app build is unaffected (tenancy code is not bundled).

**Carry-over for next slices:** wire Prisma Client behind `withTenant()` (ADR-002),
add the platform-admin identity + auth/session flow, and custom-domain resolution.

> Not pushed and Slice 2 not started — awaiting acceptance.
