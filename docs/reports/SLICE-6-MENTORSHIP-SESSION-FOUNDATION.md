# SLICE 6 — Mentorship Session Foundation

**Date:** 2026-06-02
**Scope:** Foundation for mentorship sessions — simple scheduling, session status,
meeting record, and closure. Built **only** inside an active mentorship.
**Out of scope (not implemented):** landing, dashboard, billing, AI, chat, full
notifications, library. **No product UI** (flow validated by API + tests).

---

## 1. Model created (tenant-scoped, RLS, audited)

Migration `prisma/migrations/0005_mentorship_session/migration.sql`:

| Object | Purpose |
|---|---|
| `mentorship.UNIQUE(tenant_id, id)` (added) | composite-unique target so sessions can FK same-tenant |
| `mentorship_session` | a scheduled meeting inside a mentorship |

`mentorship_session` columns: `id`, `tenant_id`, `mentorship_id`, `requested_by`,
`scheduled_at` (data/hora), `objective`, `notes` (basic notes, set on completion),
`status`, `created_at`, `confirmed_at`, `completed_at`, `cancelled_at`, `cancel_reason`.
Same-tenant composite FKs to `mentorship(tenant_id, id)` and `tenant_user(tenant_id, id)`;
`CHECK` on status; RLS `ENABLE`+`FORCE` + isolation policy; grants to `mm_app`.
Prisma mirror updated; `prisma validate` passes.

## 2. Session status (state machine)

```
requested ──confirm──▶ confirmed ──complete──▶ completed
    │                      │
    └──────cancel──────────┴────────▶ cancelled
```

- **requested** — created by a participant (modela *sessão solicitada*).
- **confirmed** — a participant confirms (*sessão confirmada*); `confirmed_at` set.
- **completed** — closes the cycle (*sessão concluída*); `completed_at` + `notes` set.
- **cancelled** — from requested or confirmed (*sessão cancelada*); `cancelled_at` set.

Pure rules in `src/session/rules.ts` (`canConfirm`/`canComplete`/`canCancel`).

## 3. Rules enforced

- **Vínculo com Mentorship**: a session FKs a mentorship; creation loads it.
- **Só mentorship ativa**: `requestSession` refuses unless `mentorship.status = 'active'`
  (`mentorship_not_active`) and the mentorship exists (`mentorship_not_found`).
- **Só participantes agem**: every action asserts the actor is the mentor or mentee of
  the mentorship (`not_a_participant` / `FORBIDDEN`).
- **Mentor pausado não entra em sessão nova**: blocked at request (`mentor_paused`).
- **ContactInfo inalterado**: reveal still gated by an active mentorship; sessions open
  no new path (proven by test 8).
- **Tenant pelo host / RLS / withTenant / sem cross-tenant / sem User global**: all
  queries run inside `withTenant`; routes resolve tenant from host via `requireSession`.
- **Auditoria**: `session.requested` / `.confirmed` / `.completed` / `.cancelled`.

## 4. Routes / handlers (requireSession-protected, tenant-scoped)

| Route | Method | Purpose |
|---|---|---|
| `/api/mentorship/sessions` | POST / GET | request a session / list mine |
| `/api/mentorship/sessions/confirm` | POST | confirm `{sessionId}` |
| `/api/mentorship/sessions/complete` | POST | complete `{sessionId, notes?}` |
| `/api/mentorship/sessions/cancel` | POST | cancel `{sessionId, reason?}` |

UI: not implemented — not required to validate the flow (covered by API + integration).

## 5. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run prisma:validate  → PASS
npm run build            → PASS (4 new session API routes)
npm run test:unit        → 99 passed (adds 3 session-rule tests)
npm run test:integration → 46 passed (5 tenancy + 8 auth + 8 profile + 8 search +
                            8 mentorship + 9 session; real Postgres 16)
```

### Required proofs (8) + 1 bonus — all passing (integration)
1. **Session in A not visible in B** — cross-tenant select in B → 0.
2. **Session only for active mentorship** — ended mentorship → `mentorship_not_active`; missing → `mentorship_not_found`.
3. **Confirm changes status** — requested → confirmed.
4. **Complete closes the cycle** — confirmed → completed (+notes); double-complete refused.
5. **Cancel works** — open → cancelled.
6. **Query without tenantId still fails** — raw count → 0; raw insert → rejected.
7. **Audit for create & closure** — `session.requested` + `session.completed` present.
8. **ContactInfo stays isolated** — participant still sees contact; outsider → `contact_not_revealed`.
9. *(bonus)* **Paused mentor cannot start a new session** — `mentor_paused`.

## 6. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| S1 | No reschedule flow (cancel + re-request only) | Low (V1) | Add `reschedule` later. |
| S2 | No conflict/overlap detection on `scheduled_at` | Low | Add availability checks in a scheduling slice. |
| S3 | Either participant may confirm (no "counterpart-only" rule) | Low | Acceptable for V1; tighten if product requires. |
| S4 | No reminders/notifications (out of scope) | Expected | Notifications slice later. |
| S5 | Runtime uses `pg` (ADR-002 bounded deviation) | Low | RLS proven; carry-over. |

## 7. Recommendation: **GO** for Slice 7

All Definition-of-Done items met; the 8 required proofs (+1 bonus) pass against a real
Postgres with RLS. Session lifecycle (request → confirm → complete / cancel), the
active-mentorship gate, participant-only actions, paused-mentor block, and ContactInfo
isolation are implemented, tenant-scoped, and audited. typecheck/lint/prisma-validate/build green.

**Carry-over:** reschedule, scheduling/availability & overlap checks, reminders,
optional session UI.
