# Prisma — data layer (deferred)

The baseline ships **only** a placeholder `schema.prisma` (generator + datasource,
no models). This is deliberate: the repository must build and deploy without a
database connection.

## What lands later (data-layer slice)
Per **ADR-002** (`docs/ADR.md`) and **TENANCY.md**:

- **PostgreSQL 16** with **real Row Level Security** (`ENABLE` + `FORCE`); policies
  live in **versioned SQL migrations**, not in `schema.prisma`.
- Two roles, **no superuser**: `mm_owner` (migrations) and `mm_app`
  (`NOSUPERUSER NOBYPASSRLS`) for the application.
- Tenant context injected transactionally via `SET LOCAL app.tenant_id`, behind the
  mandatory `withTenantPrisma()` helper. A query without tenant context **fails**
  (default-deny).
- `@prisma/client` + `@prisma/adapter-pg` added as dependencies at that point.
- Cross-tenant isolation tests from the first data slice.

## Prisma aliases (already documented)
- `DATABASE_URL` = copy of `POSTGRES_PRISMA_URL` (pooled / pgbouncer) — runtime.
- `DIRECT_URL`  = copy of `POSTGRES_URL_NON_POOLING` (direct) — migrations.

See `docs/ENVIRONMENT.md` and `docs/DEPLOYMENT.md`.
