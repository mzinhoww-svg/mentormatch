# SLICE 8 — Tenant Admin Foundation

**Date:** 2026-06-02
**Scope:** Tenant administration foundation for HR / program managers — operational
overview, basic usage metrics, operational lists, capacity/queues, and a minimal
audited admin action. **Out of scope (not implemented):** landing, billing, AI, chat,
full library, mobile app. **No product UI** (validated by API + tests).

---

## 1. Admin areas created

A new `src/admin` module + `/api/admin/*` routes, all behind **`requireAdmin`**
(= `requireSession` + role ∈ `{admin, program_manager}`), tenant resolved by host,
RLS-scoped. No new tables — everything is derived from the tables built in Slices 1–7.

| Area | Route | Service |
|---|---|---|
| Operational overview / metrics | `GET /api/admin/overview` | `getOverview` |
| User management (list) | `GET /api/admin/users` | `listUsers` |
| User management (action) | `POST /api/admin/users/status` | `setUserStatus` |
| Mentors (capacity & load) | `GET /api/admin/mentors` | `listMentors` |
| Mentorships | `GET /api/admin/mentorships` | `listMentorships` |
| Sessions | `GET /api/admin/sessions` | `listSessions` |

## 2. Metrics exposed (`getOverview`)

Derived live from the real tables, all tenant-scoped:

- **users.active** — active tenant users
- **mentors.active** — distinct mentors in active mentorships · **mentors.available** — profiles active & available & not paused
- **mentees.active** — distinct mentees in active mentorships
- **mentorships.active** — active mentorships
- **sessions.total** + **byStatus** (`requested/confirmed/completed/cancelled`)
- **requests.byStatus** (`pending/waitlisted/accepted/rejected/cancelled/expired`)
- **capacity** — `{ total (Σ mentor_capacity of available mentors), used (active mentorships), waitlisted }` → **capacidade e filas**
- **participationRate** — distinct active-mentorship participants ÷ active users (0..1)

Empty tenants return all-zero metrics (stable empty state via pure `countsByStatus`).

## 3. Privacy & isolation (enforced)

- **ContactInfo isolated**: admin queries never select `contact_email/phone/whatsapp`.
- **Private content withheld**: session list excludes `objective` and `notes`
  (private to participants); only operational fields (status, scheduled_at, ids).
- **Tenant-scoped / no cross-tenant / no global User**: every read/write goes
  through `withTenant` (RLS); session pinned to the host's tenant.
- **Consent unchanged**: admin foundation adds no path that bypasses consent.
- **Minimal admin action**: `setUserStatus` (active/suspended) — refuses self-change
  (anti-lockout) and missing users; **audited** as `admin.user_status_changed`.
  Read-only views are intentionally not audited.

## 4. Operational lists

`listUsers` (id, displayName, account email, role, status, profileStatus — no contact),
`listMentors` (capacity, paused, activeMentees load), `listMentorships` (participant
display names + status), `listSessions` (status + schedule + ids, no private content).
All paginated/bounded.

## 5. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run prisma:validate  → PASS
npm run build            → PASS (6 new /api/admin routes)
npm run test:unit        → 107 passed (adds metrics: participationRate, countsByStatus)
npm run test:integration → 63 passed (5 tenancy + 8 auth + 8 profile + 8 search +
                            8 mentorship + 9 session + 8 notifications + 9 admin; real Postgres 16)
```

### Required proofs (8) + 1 extra — all passing (integration)
1. **Admin A ≠ B** — A's mentorships list reflects only A; B's ids excluded.
2. **Metrics tenant-scoped** — overview(A).mentorships.active=2, overview(B)=1.
3. **Only permitted data** — session rows have no `objective`/`notes`; user rows no `contact*`.
4. **ContactInfo isolated** — seeded contact never appears in any admin view (overview/users/mentors/mentorships/sessions).
5. **Query without tenantId still fails** — raw `tenant_user` count → 0 (RLS default-deny).
6. **Reflects underlying tables** — 3 active mentorships ⇒ metric=3 & list length=3; waitlisted request ⇒ capacity.waitlisted=1.
7. **Admin action audited** — `setUserStatus` suspends user and writes `admin.user_status_changed`.
8. **Empty states + permissions** — fresh tenant returns zeros/empty lists; `requireRole` denies `member`, allows `admin`.
9. *(extra)* self status-change refused.

No regressions: all Slice 1–7 integration suites still green.

## 6. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| A1 | Metrics computed on-demand (no caching) | Low | Fine at current scale; add materialized rollups if needed. |
| A2 | `setUserStatus` is the only mutation; richer admin actions deferred | Low (V1) | Add invite/role-change/pause as separate audited actions later. |
| A3 | Account email shown to admin (identity), contact_* never | Low | Intended for HR user management; ContactInfo stays isolated. |
| A4 | No admin UI yet | Expected | API + tests validate; thin UI later. |
| A5 | Runtime uses `pg` (ADR-002 bounded deviation) | Low | RLS proven; carry-over. |

## 7. Recommendation: **GO** for Slice 9

All Definition-of-Done items met; the 8 required proofs (+1 extra) pass against a real
Postgres with RLS, with no regressions. The admin foundation is tenant-scoped, derives
metrics from real tables, withholds ContactInfo and private session content, gates
access by admin role, and audits its mutating action.
typecheck/lint/prisma-validate/build green.

**Carry-over:** admin UI, metric caching/rollups, richer admin actions (invites,
role changes, queue management), administrative alerts.
