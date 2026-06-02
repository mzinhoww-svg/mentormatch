# SLICE 9 — Program Management Foundation

**Date:** 2026-06-02
**Scope:** Foundation for tenant mentoring programs, with the per-tenant **default
program** from the ADR. Basic admin management, program status, simple participation
rules, and program↔participant links. **Out of scope (not implemented):** landing,
billing, AI, chat, full library, mobile. **No product UI** (validated by API + tests).
No advanced CRUD in V1.

---

## 1. Model created (tenant-scoped, RLS, audited)

Migration `prisma/migrations/0007_program/migration.sql`:

| Object | Purpose |
|---|---|
| `program` | a mentoring program: `name`, `description`, `status` (active/inactive), `is_default`, `capacity?` |
| partial unique `uq_default_program` | **exactly one default program per tenant** |
| `program.UNIQUE(tenant_id,id)` | composite FK target for participants |
| `program_participant` | links a tenant user to a program: `role_in_program` (mentor/mentee/member), `status` (active/left), unique per (program,user) |

Same-tenant composite FKs; CHECKs on status/role/capacity; RLS `ENABLE`+`FORCE` +
isolation policies on both tables; grants to `mm_app`. Prisma mirror updated;
`prisma validate` passes.

All required fields modeled: **name, description, status active/inactive, default
flag, participants, capacity (optional), simple participation rules.**

## 2. Default-program rules

- **Existence guaranteed:** `createTenant` now calls `ensureDefaultProgram(tenantId)`,
  so every tenant has its default program from creation. `listPrograms` /
  `getDefaultProgram` also call it idempotently, so tenants created before this slice
  get one on first access.
- **Singleton:** the partial unique index allows only one `is_default` program per tenant.
- **Always usable:** the default program **cannot be deactivated**
  (`cannot_deactivate_default`) — it must always exist and stay active.
- Created `active`, unlimited capacity, name "Programa de Mentoria".

## 3. Participation rules (simple, V1)

`addParticipant` enforces, all within `withTenant` (RLS):
- program must exist and be **active** (`program_inactive`);
- user must exist and be **active** (`user_not_active`);
- **consent is mandatory** — a `consent_record` must exist (`consent_required`);
- **capacity** (if set) not exceeded (`program_full`);
- no duplicate active participation (`already_participant`).

`removeParticipant` marks a participant `left`. ContactInfo is never read or exposed.

## 4. Admin management & APIs (all behind `requireAdmin`)

| Route | Method | Action |
|---|---|---|
| `/api/admin/programs` | GET / POST | list / create |
| `/api/admin/programs/update` | POST | edit name/description/capacity |
| `/api/admin/programs/status` | POST | activate/deactivate |
| `/api/admin/programs/participants` | GET / POST | list / add participant |
| `/api/admin/programs/participants/remove` | POST | remove participant |

Audited: `program.created/updated/status_changed/participant_added/participant_removed`.
UI: not implemented — API + integration cover the flow.

## 5. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run prisma:validate  → PASS
npm run build            → PASS (5 new /api/admin/programs routes)
npm run test:unit        → 111 passed (adds program rules: hasCapacity, isValidRole)
npm run test:integration → 71 passed (5 tenancy + 8 auth + 8 profile + 8 search +
                            8 mentorship + 9 session + 8 notifications + 9 admin +
                            8 program; real Postgres 16)
```

### Required proofs (8) — all passing (integration)
1. **Tenant A ≠ B** — A's program not visible in B's list.
2. **Default program per tenant** — exists, is_default, active, exactly one.
3. **Admin creates & edits** — create (capacity 5) then update (name + capacity 10).
4. **Status works** — deactivate a normal program; default refuses deactivation.
5. **Participants tenant-scoped** — A's participant invisible to B.
6. **Query without tenantId still fails** — raw `program` count → 0; raw insert rejected.
7. **Admin never crosses tenants** — operating as B, A's program id → `program_not_found`.
8. **Reflects underlying tables** — capacity full → `program_full`; missing consent → `consent_required`; inactive program → `program_inactive`.

No regressions: all Slice 1–8 integration suites still green (incl. tenancy, which now
provisions the default program on tenant creation).

## 6. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| P1 | Default program ensured lazily for pre-existing tenants (on first access) | Low | `createTenant` provisions it for new tenants; listing back-fills old ones. |
| P2 | Programs not yet wired into matching/sessions (programs are standalone in V1) | Low (V1) | Link mentorship/sessions to a program in a later slice. |
| P3 | Participation role is informational (not enforced against profile roles) | Low | Tighten if product requires mentor/mentee consistency. |
| P4 | No admin UI yet | Expected | API + tests validate. |
| P5 | Runtime uses `pg` (ADR-002 bounded deviation) | Low | RLS proven; carry-over. |

## 7. Recommendation: **GO** for Slice 10

All Definition-of-Done items met; the 8 required proofs pass against a real Postgres
with RLS, with no regressions. Programs are tenant-scoped, the default program is
guaranteed and protected, participation enforces active-program + active-user +
consent + capacity, admin management is gated and audited, and ContactInfo stays
isolated. typecheck/lint/prisma-validate/build green.

**Carry-over:** link programs to matching/mentorships/sessions, program-scoped metrics
in the admin overview, richer participation roles, program admin UI.
