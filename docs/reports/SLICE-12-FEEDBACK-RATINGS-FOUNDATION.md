# SLICE 12 — Feedback & Ratings Foundation

**Date:** 2026-06-02
**Scope:** Post-session feedback and mentorship/program ratings over the existing
Mentorship / Session / Program cycles. **Out of scope (not implemented):** landing,
billing, AI, chat, full library, mobile. Minimal UI added only to validate the flow.

---

## 1. Model created (tenant-scoped, RLS, audited)

Migration `prisma/migrations/0009_feedback/migration.sql` — table `feedback`:

| Field | Notes |
|---|---|
| `feedback_type` | `session` \| `mentor` \| `mentee` \| `program` |
| `target_type` | `session` \| `tenant_user` \| `program` (polymorphic `target_id`) |
| `target_id` | the rated entity |
| `mentorship_id` | context (nullable) for session/mentor/mentee feedback |
| `score` | int, `CHECK (1..5)` |
| `comment` | optional text |
| `status` | `submitted` \| `withdrawn` |
| `author_id`, `tenant_id`, `created_at`, `updated_at` | + same-tenant FK to `tenant_user` |

Partial unique index `uq_feedback_active` → one active feedback per
`(author, type, target)`. RLS `ENABLE`+`FORCE` + isolation policy; grant to `mm_app`.
Prisma mirror updated; `prisma validate` passes. All required model fields present
(type, score, optional comment, target entity, author, tenantId, createdAt, status).

## 2. Feedback types & flows

- **Session feedback** (`submitSessionFeedback`) — type `session`; only for a
  **completed** session the author participates in.
- **Mentor / Mentee rating** (`submitMentorshipFeedback`) — rates the counterpart in
  a mentorship; type derived (`mentee` if author is the mentor, else `mentor`).
- **Program feedback** (`submitProgramFeedback`) — type `program`; only for an
  **active participant** of the program.
- **Withdraw** (`withdrawFeedback`) — author-only, sets `withdrawn`.
- Reads: `listMyFeedback` (own), `getAverageRating` (aggregate `{average,count}` — **no
  comments**, safe to expose), `listFeedback` (admin, operational).

## 3. Rules enforced

- **Valid target only**: session must exist & be completed (`session_not_found` /
  `session_not_completed`); mentorship must exist & author be a participant; program
  must exist & author be an active participant (`not_a_participant`).
- **Score**: integer 1–5 (`invalid_score`); one active feedback per target
  (`feedback_already_exists`).
- **Privacy**: feedback stores/returns only ids, score, comment, status — **never
  ContactInfo**; aggregate ratings carry no comments; comment body is not audited.
- **Tenant-scoped / RLS / no cross-tenant / no global User**; consent unchanged;
  ContactInfo reveal unchanged.
- **Audited**: `feedback.submitted`, `feedback.withdrawn`.

## 4. APIs / handlers

| Route | Method | Auth |
|---|---|---|
| `/api/feedback/session` | POST | session |
| `/api/feedback/mentorship` | POST | session |
| `/api/feedback/program` | POST | session |
| `/api/feedback/mine` | GET | session |
| `/api/feedback/rating?targetType=&targetId=` | GET | session |
| `/api/feedback/withdraw` | POST | session |
| `/api/admin/feedback` | GET | admin |

**UI**: `SessionsView` now shows a 1–5 rating on completed sessions that posts session
feedback (minimal, to validate the flow).

## 5. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run prisma:validate  → PASS
npm run build            → PASS (7 new feedback routes)
npm run test:unit        → 138 passed (feedback rules + a DOM rating test)
npm run test:integration → 87 passed (… + 8 feedback; real Postgres 16)
```

### Required proofs (8) — all passing (integration)
1. **Tenant A ≠ B** — A's feedback invisible in B.
2. **Only valid (completed) sessions** — missing → `session_not_found`; not completed → `session_not_completed`.
3. **Rating works** — score stored + aggregate; out-of-range → `invalid_score`.
4. **Optional comment** — with and without comment both succeed (null when absent).
5. **Query without tenantId still fails** — raw `feedback` count → 0; raw insert rejected.
6. **ContactInfo isolated** — seeded contact never appears in `listMyFeedback` / `getAverageRating`.
7. **Audit on create** — `feedback.submitted` recorded.
8. **Lists tenant-scoped** — author's feedback only under its tenant; aggregate count 0 under another tenant.

No regressions: all Slice 1–11 suites green.

## 6. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| F1 | Comments visible to admin via `/api/admin/feedback` | Low | Operational need; comments never exposed to peers; aggregate is comment-free. |
| F2 | One DOM test showed a transient timing flake under heavy parallel load (passed on re-run) | Low | Logic correct; uses retrying `findBy/waitFor`; raise timeouts if it recurs in CI. |
| F3 | No moderation / reporting of abusive comments | Low (V1) | Add moderation later if needed. |
| F4 | Runtime uses `pg` (ADR-002) | Low | Carry-over. |

## 7. Recommendation: **GO** for Checkpoint A

All Definition-of-Done items met; the 8 required proofs pass against a real Postgres
with RLS, no regressions. Feedback is tenant-scoped, only for valid sessions /
mentorships / programs the author participates in, score-validated, audited, and
structurally unable to leak ContactInfo or private content.
typecheck/lint/prisma-validate/build green.

**Carry-over:** comment moderation/reporting, surfacing aggregate ratings on mentor
cards/admin dashboards, program feedback UI, response/acknowement flows.
