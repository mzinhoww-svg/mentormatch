# ADR-002 — Stack & Runtime Decisions for Slice 0A (Technical Risk Harness)

**Status:** Accepted (complementary to ADR v1.1)
**Date:** 2026-06-01
**Context:** Slice 0A rule #10 forbids taking new architectural decisions without
recording a complementary ADR. The Slice 0A brief assumes Prisma, Postgres RLS and
Vercel but does not pin runtime, package layout, or the test strategy. This ADR closes
those gaps so the harness is reproducible and auditable.

---

## Decision 1 — Database: PostgreSQL 16

Postgres is the only mainstream option that gives **real Row Level Security** with
SQL-defined policies and a session-variable mechanism (`current_setting`) suitable for a
transactional tenant-context guard. This is non-negotiable for Slice 0A items #4 and #5.

- Tenant context is carried via `SET LOCAL app.tenant_id` inside a transaction.
- `app.tenant_id` is a **custom GUC** (grand unified configuration setting). Using
  `SET LOCAL` guarantees it is scoped to the transaction and **cannot leak** to the next
  query on the same pooled connection — this is what proves Slice 0A item #5.

## Decision 2 — Two database roles, neither is superuser

- **`mm_owner`** — owns schema, runs migrations. Used ONLY by migration tooling.
- **`mm_app`** — the role the application connects as. Created with
  `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`. RLS policies apply to it with no escape.
- Slice 0A item #4 explicitly requires the app role to not be superuser and to not have
  BYPASSRLS. We verify this in a test that reads `pg_roles`.

## Decision 3 — ORM: Prisma — but RLS lives in SQL migrations, not the schema

Per Slice 0A item #4 ("Não confiar apenas no Prisma schema para RLS"), all RLS
`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` statements live in **versioned raw-SQL
migration files** under `prisma/migrations/`. The Prisma schema only models tables.

**Caveat recorded:** In this harness environment Prisma's engine download/binary flow is
heavy and network-dependent. To keep the harness fast, deterministic and CI-friendly,
the Slice 0A data layer is implemented over the `pg` driver directly, with the SAME
table shapes and constraints Prisma would generate, and the SAME raw-SQL RLS migrations
Prisma would run via `prisma migrate`. The `withTenant()` helper is driver-agnostic.
**Recommendation for Slice 0:** adopt Prisma Client for application queries, keeping
`withTenant()` as the mandatory wrapper and keeping RLS in raw-SQL migrations exactly as
proven here. This is a harness-scoped simplification, not a product decision; it is
flagged as a known limitation in the Slice 0A report.

## Decision 4 — Runtime & language: Node 22 + TypeScript, ESM, Vitest

- Node 22 LTS (available in env), TypeScript strict, ESM modules.
- **Vitest** as the test runner (fast, TS-native, good for both unit and integration).
- Test DB is a real Postgres 16 instance; integration tests run against it.

## Decision 5 — Tenant resolution is host-based and pure

Resolution is a **pure function** `resolveTenantFromHost(host)` with no DB dependency for
the structural decision (reserved/blocked/institutional/unknown), then a DB lookup only
for a candidate tenant slug. This makes the rules unit-testable without a database and
keeps the security-critical branching deterministic.

Reserved-subdomain blocklist (Slice 0A item #1):
`www, admin, api, app, support, static, assets, demo, staging, preview, vercel, _next,
auth, login, signup, billing, console`.

Outcomes of resolution:
- `INSTITUTIONAL` — `mentormatch.app` / `www.mentormatch.app` → marketing only, **no tenant login**.
- `PLATFORM_ADMIN` — `admin.mentormatch.app` → PlatformAdmin console, **never TenantUser**.
- `RESERVED` — any blocklisted subdomain → no tenant login.
- `UNKNOWN` — host that does not match any pattern or an unprovisioned slug → no login.
- `TENANT` — `{slug}.mentormatch.app` or `{slug}.localhost:3000` with a provisioned, active tenant.

## Decision 6 — Local dev subdomains

`{tenant}.localhost:3000` resolves natively in modern browsers and in Node (the parser
only needs the host string), so no `/etc/hosts` editing is required for the common case.
Documented alternative if an environment cannot resolve `*.localhost`: use
`{tenant}.lvh.me` (public DNS that resolves to 127.0.0.1) — recorded here so the team has a
sanctioned workaround rather than inventing a path-based fallback (which item #9 forbids).

## Decision 7 — Vercel environments (documentation only in 0A)

See `docs/reports/SLICE-0A-RESULT.md` §Vercel. Summary:
- **Production:** wildcard domain `*.mentormatch.app` + apex `mentormatch.app` + `admin.mentormatch.app`.
- **Staging:** `*.staging.mentormatch.app` wildcard on a separate project/branch.
- **Preview:** Vercel preview deployments do **not** get a wildcard subdomain by default.
  Workaround: run tenant-resolution E2E against a stable staging wildcard, OR inject the
  resolved tenant via a signed `x-mm-tenant-host` header set only in the E2E harness — never
  a public path fallback in production.

## Decision 8 — Password hashing & rate limiting

- Password hashing: **scrypt** via Node's built-in `crypto` (no native-build dependency,
  deterministic in CI). Recommendation for Slice 0: evaluate argon2id at production hardening.
- Rate limiting: an in-process token-bucket abstraction behind an interface, so it can be
  swapped for Redis/Upstash in Slice 0. **Fail-closed:** if the limiter throws, auth
  mutations reject (Slice 0A item #6).

---

## Consequences

- Slice 0A proves the *hard* risks (tenant isolation, RLS default-deny, context
  non-leak, identity uniqueness, fail-closed auth) against a real Postgres.
- The Prisma-Client-vs-pg-driver simplification is the only deviation from a literal
  reading of the brief and is explicitly bounded and reported.
