# Prisma — data layer

As of **Slice 1 (Data & Tenancy Foundation)** the schema and migrations are real.

## Schema (`schema.prisma`)
Five models, source of truth for table shapes:
`Tenant`, `TenantDomain`, `TenantUser`, `ConsentRecord`, `AuditEvent`.

- `Tenant` is the **registry** (not tenant-scoped) — looked up by slug to resolve a
  host before any tenant context exists.
- The other four are **tenant-scoped** and protected by Row Level Security.
- `unique(tenantId, normalizedEmail)` on `TenantUser` → the same email can exist in
  two tenants, but is unique within one.

## Migrations (`migrations/`)
Raw-SQL migrations are **authoritative** (RLS cannot be expressed in the Prisma
schema — ADR-002):

- `0001_init/migration.sql` — tables, constraints, indexes.
- `0002_rls/migration.sql` — `app_current_tenant()`, `ENABLE` + `FORCE` RLS,
  isolation policies, and grants to the non-superuser `mm_app` role.

## Roles (two, no superuser)
- `mm_owner` — owns tables, runs migrations (`DIRECT_URL`).
- `mm_app` — application role, `NOSUPERUSER NOBYPASSRLS` (`DATABASE_URL`).

## Access pattern (mandatory)
The app **never** queries tenant-scoped tables directly. It uses
`withTenant(tenantId, db => …)` (`src/tenancy/withTenant.ts`), which opens a
transaction and sets `app.tenant_id` via `SET LOCAL`, so RLS enforces isolation and
a query without tenant context is default-denied.

> Per ADR-002, the RLS-enforced runtime path uses the `pg` driver (proven in
> Slice 0A). Wiring Prisma Client *behind* `withTenant()` (Prisma 7 + adapter-pg)
> remains the bounded follow-up; the Prisma schema here is the declarative mirror.

## Bootstrap (local/CI)
```bash
# requires a running Postgres + superuser for role/db creation
DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres \
DIRECT_URL=postgresql://mm_owner@127.0.0.1:5432/mentormatch \
npm run db:bootstrap
```
Then run integration tests with:
```bash
DATABASE_URL=postgresql://mm_app@127.0.0.1:5432/mentormatch \
DIRECT_URL=postgresql://mm_owner@127.0.0.1:5432/mentormatch \
npm run test:integration
```

## Prisma aliases (production)
`DATABASE_URL` = pooled `POSTGRES_PRISMA_URL`; `DIRECT_URL` = direct
`POSTGRES_URL_NON_POOLING`. See `docs/ENVIRONMENT.md`.
