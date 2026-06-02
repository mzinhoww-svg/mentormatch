# SLICE 5 — Mentorship Request & Approval

**Date:** 2026-06-02
**Branch:** `main`
**Scope:** Mentorship request flow, mentor accept/reject, mentorship link creation,
and controlled ContactInfo reveal after an accepted match. **No** landing, dashboard,
sessions, ratings, full notifications, billing, or AI. **No UI** (validated by API +
tests).

---

## 1. Model created (tenant-scoped, RLS, audited)

Migration `prisma/migrations/0004_mentorship/migration.sql`:

| Object | Purpose |
|---|---|
| `profile.mentor_capacity` (new column) | max concurrent active mentees (default 3) → waitlist when full |
| `mentorship_request` | mentee → mentor request; states below; same-tenant composite FKs; partial unique index `(mentee, mentor)` for open requests; `CHECK (mentee <> mentor)` |
| `mentorship` | the link created on accept; states below; unique active per `(mentor, mentee)` |

RLS `ENABLE`+`FORCE` + isolation policies on both tables; grants to `mm_app`.
Prisma schema mirror updated (named relations for the dual FK to TenantUser);
`prisma validate` passes.

## 2. Request states

`pending` → (mentor) `accepted` | `rejected` · (mentee) `cancelled` ·
when mentor is full at request time → `waitlisted` · past expiry → `expired`
(`expireRequests()` housekeeping). Only `pending`/`waitlisted` are open for a
decision; `unique` index allows a single open request per mentee→mentor.

## 3. Mentorship states

`active` (created on accept) → `ended`. One active mentorship per `(mentor, mentee)`.

## 4. Flow & rules

- **Request** (`requestMentorship`): rejects self-request; mentor must be
  **effectively available** (profile active + `mentor_available` + **not paused**) —
  a **paused mentor cannot receive new requests** (`mentor_unavailable`); blocks a
  duplicate open request; if mentor at capacity → **`waitlisted`**, else `pending`.
- **Accept** (`acceptRequest`): mentor-only; re-checks capacity; creates an `active`
  mentorship and marks the request `accepted` (one transaction).
- **Reject / Cancel**: mentor rejects; mentee cancels their own open request.
- **ContactInfo reveal** (`revealContact`): returns the other user's contact **only**
  when an `active` mentorship links them; otherwise `contact_not_revealed`
  (403). Every reveal is audited (`contact_info.revealed`).
- **Audit**: `mentorship.requested` / `.accepted` / `.rejected` / `.cancelled` and
  `contact_info.revealed` → `audit_event` (redacted metadata).

## 5. Routes / handlers (requireSession-protected, tenant-scoped)

| Route | Method | Purpose |
|---|---|---|
| `/api/mentorship/requests` | POST / GET | create request / list mine (as mentor + mentee) |
| `/api/mentorship/requests/accept` | POST | mentor accepts `{requestId}` |
| `/api/mentorship/requests/reject` | POST | mentor rejects `{requestId}` |
| `/api/mentorship/requests/cancel` | POST | mentee cancels `{requestId}` |
| `/api/mentorship/mentorships` | GET | list my mentorships |
| `/api/mentorship/contact?userId=` | GET | reveal contact (only after accepted match) |

## 6. Mandatory rules — compliance

no global User ✓ · always tenant-scoped ✓ · bound to TenantUser ✓ · no cross-tenant ✓ ·
RLS + withTenant ✓ · ContactInfo hidden until accepted match ✓ · paused mentor gets no
new requests ✓ · mentor & mentee coexist ✓ · tenant resolved by host ✓ · consent still
mandatory (profiles activated via Slice 3 consent gate) ✓ · every relevant action
audited ✓.

## 7. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run prisma:validate  → PASS
npm run build            → PASS (/ static; 20 dynamic API routes + /health)
npm run test:unit        → 96 passed (adds 3 mentorship rule tests)
npm run test:integration → 37 passed (5 tenancy + 8 auth + 8 profile + 8 search + 8 mentorship; real Postgres 16)
npm test (no DB)         → 96 passed | 37 skipped
```

### Required proofs (8) — all passing (integration)
1. **Request in A does not affect B** — A's request invisible/absent in B.
2. **Accept → active mentorship** — accepting creates an `active` mentorship; request `accepted`.
3. **Reject** — request `rejected`, no mentorship.
4. **ContactInfo only after acceptance** — reveal is `contact_not_revealed` before, returns the contact after.
5. **Full mentor → waitlist** — capacity 1, slot filled → next request `waitlisted`.
6. **Paused mentor → no new requests** — `requestMentorship` throws `mentor_unavailable`.
7. **Query without tenantId still fails** — raw count → 0; raw insert → rejected.
8. **Audit for request/accept/reject** — all three actions present in `audit_event`.

## 8. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| M1 | Waitlist is a status only (no auto-promotion when a slot frees) | Low (V1) | Promotion can be added when mentorships gain an `ended` flow. |
| M2 | Expiry is lazy (`expireRequests()` must be invoked) | Low | Call from a scheduled job later; `expires_at` is stored. |
| M3 | No UI yet | Expected | Flow validated by API + tests. |
| M4 | Reveal audit records the event, not consent-to-reveal nuance | Low | Sufficient for LGPD trail; refine in LGPD slice. |
| M5 | Runtime uses `pg` (ADR-002 bounded deviation) | Low | RLS proven; carry-over. |

## 9. Recommendation: **GO** for Slice 6

All Definition-of-Done items met; the 8 required proofs pass against a real Postgres
with RLS. The request→accept/reject flow, waitlist on capacity, paused-mentor block,
mentorship creation, and the **post-acceptance ContactInfo reveal** are implemented,
tenant-scoped, and audited. typecheck/lint/prisma-validate/build green.

**Carry-over:** mentorship lifecycle (`end`/complete), waitlist auto-promotion,
notifications, and optional UI for requests/mentorships.

> Not pushed and Slice 6 not started — awaiting acceptance.
