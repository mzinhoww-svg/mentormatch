# SLICE 7 — Notifications Foundation

**Date:** 2026-06-02
**Scope:** In-app notification foundation wired to the domain events already
implemented (mentorship, session, profile, auth, consent, capacity), with
per-user preferences and unread/read. **Out of scope (not implemented):** landing,
dashboard, billing, AI, real-time chat, library, full notification delivery.
**No product UI** (flow validated by API + tests).

---

## 1. Model created (tenant-scoped, RLS, audited-adjacent)

Migration `prisma/migrations/0006_notifications/migration.sql`:

| Object | Purpose |
|---|---|
| `notification` | one in-app notification for a target user |
| `notification_preference` | per-(user, type) channel toggles (`in_app` / `email`) |

`notification` columns: `id`, `tenant_id`, **`target_user_id`**, **`type`**,
**`payload`** (jsonb), **`status`** (`unread`/`read`), **`origin_event`**,
`origin_audit_id` (nullable provenance link), `email_status` (`none`/`pending`/`sent`),
**`created_at`**, `read_at`. Same-tenant composite FK to `tenant_user(tenant_id,id)`;
CHECKs on status/email_status; RLS `ENABLE`+`FORCE` + isolation policies on both
tables; grants to `mm_app`. Prisma mirror updated; `prisma validate` passes.

All required model fields present: **notification type, payload, target user,
status unread/read, timestamp, origin event, tenantId**.

## 2. Notification types (one per domain event)

```
mentorship.requested · mentorship.accepted · mentorship.rejected · mentorship.cancelled
session.requested · session.confirmed · session.completed · session.cancelled
auth.login · auth.logout · consent.recorded · profile.updated · profile.capacity_changed
```

A notification's `type` mirrors its originating event (also stored as `origin_event`),
keeping notifications aligned with audit actions.

## 3. Integration with domain events (no duplication of audit)

Notifications are emitted **alongside** the existing audit calls, via
`safeNotify` (best-effort: a notification failure is logged and never breaks the
core operation). Audit remains the system-of-record; notifications only reference
`origin_event` for provenance — they do not replace `audit_event`.

| Event | Emitted in | Target user | Payload (non-sensitive) |
|---|---|---|---|
| `mentorship.requested` | `mentorshipService.requestMentorship` | mentor | `{requestId, status}` |
| `mentorship.accepted` | `acceptRequest` | mentee | `{requestId, mentorshipId}` |
| `mentorship.rejected` | `rejectRequest` | mentee | `{requestId}` |
| `session.requested/confirmed/completed/cancelled` | `sessionService.*` | counterpart | `{sessionId}` |
| `auth.login` / `auth.logout` | `authService.login/logout` | the user | `{}` |
| `consent.recorded` | `authService.signup` | the user | `{termsVersion}` |
| `profile.updated` | `profileService.upsertProfile` | the user | `{}` |
| `profile.capacity_changed` | `mentorshipService.setMentorCapacity` | the mentor | `{capacity}` |

**Safety:** every payload passes `assertNoSensitive` — keys like
`contact_email/phone/whatsapp/email/password/token` (any depth/case) are refused.
Emitters only ever pass internal ids, so ContactInfo can never enter a payload.

## 4. unread/read + preferences

- `listNotifications` (filterable by status), `unreadCount`, `markRead` (own-only,
  idempotent), `markAllRead`.
- `getPreferences` / `setPreference` (`in_app`, `email`). Absence of a row = defaults
  (in_app on, email off). When `in_app=false` for a type, emission is **suppressed**.
- **Email foundation:** when `email=true`, the notification is stored with
  `email_status='pending'` — the hook for a future transactional-email worker
  (no sender implemented in this slice).

## 5. Routes / handlers (requireSession-protected, tenant-scoped)

| Route | Method | Purpose |
|---|---|---|
| `/api/notifications` | GET | list mine (`?status=unread\|read`) + unread count |
| `/api/notifications/read` | POST | mark read `{notificationId}` or `{all:true}` |
| `/api/notifications/preferences` | GET / POST | list / upsert `{type, inApp?, email?}` |

UI: not implemented — not required to validate (covered by API + integration).

## 6. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run prisma:validate  → PASS
npm run build            → PASS (3 new notification API routes)
npm run test:unit        → 103 passed (adds sanitize/type-coverage tests)
npm run test:integration → 54 passed (5 tenancy + 8 auth + 8 profile + 8 search +
                            8 mentorship + 9 session + 8 notifications; real Postgres 16)
```

### Required proofs (8) — all passing (integration)
1. **Tenant A ≠ B** — A's notifications invisible to B.
2. **Request → notification** — mentor notified on `mentorship.requested`.
3. **Accept → notification** — mentee notified on `mentorship.accepted`.
4. **Reject → notification** — mentee notified on `mentorship.rejected`.
5. **Session → notification** — counterpart notified on `session.requested`.
6. **Mark as read works** — unread count decrements; status/read_at consistent.
7. **Query without tenantId still fails** — raw count → 0; raw insert → rejected.
8. **ContactInfo never in payload** — no contact string in any payload; emit guard refuses a sensitive payload.

Pre-existing slices (auth/profile/mentorship/session) integration suites still green —
the emit wiring introduced no regressions.

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| N1 | No delivery channel beyond in-app (email is `pending` only) | Low (V1) | Worker reads `email_status='pending'` later. |
| N2 | `origin_audit_id` not populated (audit fns don't return id) | Low | `origin_event` gives provenance; link later by returning audit ids. |
| N3 | `safeNotify` swallows emit errors at runtime | Low | Logged via `logger.warn`; tests assert presence so bugs surface. |
| N4 | No realtime push / no read receipts beyond status | Expected | Out of scope; polling via GET is sufficient. |
| N5 | Runtime uses `pg` (ADR-002 bounded deviation) | Low | RLS proven; carry-over. |

## 8. Recommendation: **GO** for Slice 8

All Definition-of-Done items met; the 8 required proofs pass against a real Postgres
with RLS, and no regressions in prior suites. Notifications are tenant-scoped, born
from valid domain events, preference-aware, unread/read-consistent, and structurally
unable to leak ContactInfo. typecheck/lint/prisma-validate/build green.

**Carry-over:** transactional-email worker, `origin_audit_id` linkage, realtime push,
optional notifications UI.
