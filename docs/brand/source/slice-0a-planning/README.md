# slice-0a-planning — reference implementations (NOT wired)

These files are the **Slice 0A** reference implementations produced during the
Claude.ai planning phase (tenant resolution, the `withTenant` guard, minimal auth,
and the RLS migration). They are preserved here **verbatim as reference** and are
**not** part of the compiled application.

| File | Purpose |
|---|---|
| `resolveTenant.ts` | Pure, DB-free host → tenant classification (institutional / admin / reserved / tenant). |
| `withTenant.ts` | Mandatory transactional guard setting `app.tenant_id` (SET LOCAL); default-deny. |
| `authService.ts` | Tenant-scoped signup/login primitives, mandatory consent, scrypt, fail-closed rate limit. |
| `migration.sql` | Raw-SQL RLS migration (`ENABLE` + `FORCE`), isolation policies, non-superuser app role. |

## Why not wired into `src/` yet
They depend on the data layer (Postgres connection, the `pg`/Prisma adapter, the
roles `mm_owner`/`mm_app`, and an integration test harness against a real Postgres)
that the **baseline deliberately defers** so the repo builds and deploys without a
database. Wiring them now would break `typecheck`/`build`.

## When they come back
A dedicated **data-layer / tenancy slice** will:
1. Add `@prisma/client` + `@prisma/adapter-pg` and the real `prisma/schema.prisma`
   models + raw-SQL RLS migrations.
2. Re-introduce `resolveTenant` / `withTenant` / auth under `src/` (behind
   `withTenantPrisma()` per ADR-002).
3. Add cross-tenant + RLS integration tests against a real Postgres 16.

See `docs/ADR.md`, `docs/adr/ADR-002-slice-0a-stack.md`, `docs/TENANCY.md`, and
`docs/reports/SLICE-0A-RESULT.md` (planning record).
