# ARCHITECTURE — MentorMatch

> Living document. Describes the technical foundation **as actually built in this
> repository**, plus the approved target architecture (ADR v1.1 / ADR-002) that the
> next slices will implement. Where the two differ, this document says so explicitly.

## 1. Stack (current, in repo)

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | `tsconfig.json`, `strict` + `noUncheckedIndexedAccess` |
| Runtime | Node.js 22 | ESM (`"type": "module"`) |
| Web | **Next.js (App Router)** | minimal neutral scaffold (`/` + `/health`) — no product |
| Package manager | npm | single `package-lock.json` |
| Tests | Vitest | `src/**/*.test.ts`, `tests/**/*.test.ts` |
| Lint | ESLint (flat) + typescript-eslint | `eslint.config.js` |
| Observability | in-repo (`src/observability/`) | logger, context, errors, audit, redaction |

### Target stack (planned, ADR-002 — not yet wired)
PostgreSQL 16 with **real RLS**; Prisma 7 + `@prisma/adapter-pg` **behind**
`withTenantPrisma()`; non-superuser roles `mm_owner`/`mm_app`. See
[ADR.md](./ADR.md), [adr/ADR-002-slice-0a-stack.md](./adr/ADR-002-slice-0a-stack.md),
[TENANCY.md](./TENANCY.md), and `prisma/README.md`. Reference implementations are
preserved (not compiled) in `brand/source/slice-0a-planning/`.

## 2. Repository map (current)

```
src/
├── app/                      # Next.js App Router (baseline only)
│   ├── layout.tsx            # root layout
│   ├── page.tsx              # neutral baseline placeholder
│   └── health/route.ts       # GET /health → {status:'ok'} (smoke test)
└── observability/            # framework-agnostic foundation
    ├── redaction.ts          # masking of secrets + ContactInfo (security core)
    ├── request-context.ts    # AsyncLocalStorage: requestId + optional tenantId
    ├── error-codes.ts        # stable ErrorCode + HTTP status mapping
    ├── errors.ts             # AppError model, factories, serializer, Sentry hook
    ├── logger.ts             # structured JSON logger (context-aware, redacting)
    ├── audit.ts              # AuditEvent + pluggable AuditLogger (base only)
    └── index.ts
prisma/                       # placeholder schema + plan (no models yet)
tests/                        # health route test
docs/                         # source of truth (this tree)
public/
```

## 3. Observability (built — Slice 0.2)

The cross-cutting foundation, framework-agnostic and free of feature coupling.

- **Central logger** (`logger.ts`): one JSON object per entry; injectable transport.
- **`requestId`**: always present inside a request; from `x-request-id` header or
  `crypto.randomUUID()`.
- **`tenantId` (optional)**: set only when a tenant is resolved; carried in the
  request context and auto-attached to logs/audit.
- **Request context** (`request-context.ts`): Node `AsyncLocalStorage`; explicit
  fields override context values.
- **Audit logger** (`audit.ts`): canonical `AuditEvent` + pluggable sink; base only
  (no UI/persistence). Pre-declared actions: login, logout, consent, tenant created,
  role change, ContactInfo reveal, export, deletion.
- **Redaction** (`redaction.ts`): single source of truth for masking secrets and
  ContactInfo, applied to every log field, message, error payload, and audit
  metadata. See [SECURITY.md](./SECURITY.md).

## 4. Target product architecture (planned)

- **Tenancy:** identity isolated per tenant (`TenantUser`, no global `User`/login);
  host-based tenant resolution with an **env-configurable base domain**
  (`APP_BASE_DOMAIN`, not hardcoded; fallback `mentormatch.app`); RLS + application
  guard (`withTenant`), default-deny. Full detail in [TENANCY.md](./TENANCY.md).
- **Privacy/LGPD:** mandatory consent, ContactInfo hidden until accepted match,
  per-tenant deletion. See [LGPD.md](./LGPD.md).
- **Domain (V1):** one default `Program` per tenant; manual matching (search +
  filters); request → accept/decline → active mentoring; manual billing. See
  [PRODUCT.md](./PRODUCT.md).

## 5. Future bridges (prepared, intentionally not implemented yet)

- **Next.js middleware ↔ request context:** a middleware/handler will build a
  `RequestContext` per request — resolve `requestId` (header/uuid) and `tenantId`
  (from host, per TENANCY) — and wrap handling in `runWithRequestContext`, so logs
  and audit events are correlated automatically. The context API is ready; the
  middleware is **not** wired in the baseline.
- **Sentry:** the error model exposes `setErrorReporter(reporter)` /
  `reportError(err, ctx)` as a **no-op hook**. A Sentry adapter is registered at
  startup in a later slice; until then nothing leaves the process. Context is
  redacted before reporting.
- **Prisma behind `withTenant`:** the data layer wires Prisma under
  `withTenantPrisma()` keeping RLS in raw SQL (ADR-002 Decision 3).

## 6. Principles

- **Foundation before features.** Observability/audit/security/baseline before any
  product surface.
- **Redaction is centralized.** One module is the single source of truth.
- **No feature coupling.** Context and audit are generic; mentoring concepts absent.
- **Decisions are versioned.** New architectural decisions → a new ADR.

## 7. See also
[ADR.md](./ADR.md) · [TENANCY.md](./TENANCY.md) · [SECURITY.md](./SECURITY.md) ·
[LGPD.md](./LGPD.md) · [TESTING.md](./TESTING.md) · [DEPLOYMENT.md](./DEPLOYMENT.md) ·
[ENVIRONMENT.md](./ENVIRONMENT.md)
