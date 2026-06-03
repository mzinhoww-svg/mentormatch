# SLICE 14 — Email Delivery Foundation

**Date:** 2026-06-02
**Scope:** Real transactional-email foundation wired to existing domain events
(auth/mentorship/session/notification/feedback). **Out of scope (not implemented):**
landing, billing, AI, chat, full library, mobile. No UI added (email preferences UI
already exists from Slices 6/11).

---

## 1. Architecture (why it's safe by construction)

Email is driven **out-of-band** by the existing notification pipeline:

```
domain event → emitNotification() [respects in_app + email preference]
            → notification.email_status = 'pending' (only if user opted in)
email worker → enqueuePendingEmails() → email_message (pending, rendered template)
            → sendPendingEmails(provider) → sent | failed (+retry)
```

Because the worker runs **separately** from the domain operation, **a provider
failure can never break the core flow** — it only marks `email_message.failed`.
This required **zero changes** to tenancy, auth, RLS, notifications, or domain code
(the `email_status='pending'` signal already existed on `notification`).

## 2. Provider chosen

`EmailProvider` abstraction with pluggable transports, selected by `EMAIL_PROVIDER`:
- **`console`** (default) — logs metadata only (never the body), succeeds. Dev/CI.
- **`noop`** — disabled (reports success, sends nothing).
- Test doubles (`CaptureProvider`, `FailingProvider`) live in tests only.

A real transport (SMTP/Resend/SES) plugs in behind the same interface later with no
caller changes. `EMAIL_FROM` configures the sender. (Added to `.env.example`.)

## 3. Model (migration 0010_email)

`email_message` (tenant-scoped, RLS enable+force+policy, grant `mm_app`):
`template_key`, `subject`, `body`, `recipient`, `tenant_id`, `notification_id`
(unique, partial), `origin_event`, `status` (`pending|sent|failed`), `provider`,
`attempts`, `last_error`, timestamps. Indexes: `(tenant_id, status)` and a partial
unique on `notification_id` (one email per source notification). Prisma mirror added
(`EmailMessage` + back-relation on `Notification`); `prisma validate` passes.

## 4. Templates created

Pure renderers keyed by notification type (the **template key**), using a
**whitelisted context only** (recipient's own name, tenant name, app link) — never
the raw payload, so ContactInfo cannot leak. Covered events:
`mentorship.requested|accepted|rejected|cancelled`,
`session.requested|confirmed|completed|cancelled`. Non-emailable events
(`auth.*`, `profile.*`, `consent.*`) render `null` → no email is created.

## 5. Integration with domain events

No new event wiring needed: every domain service already calls `safeNotify` →
`emitNotification`, which sets `email_status='pending'` **iff** the user enabled the
email channel for that type. The worker turns those into emails. Email is therefore
**only ever born from a valid domain event** the user opted into.

## 6. APIs / handlers

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/admin/email/process` | POST | admin | run the worker (queue + send) — for cron/manual |
| `/api/admin/email` | GET | admin | list email_messages (`?status=pending|sent|failed`) |

Email preferences are managed by the **existing** notification-preferences API/UI
(`notification_preference.email`).

## 7. Tests executed & results

```
typecheck            → PASS
lint                 → PASS
prisma:validate      → PASS
build                → PASS (adds /api/admin/email, /api/admin/email/process)
test:unit            → 156 passed (templates + providers)
test:integration     → 99 passed (adds 8 email; real Postgres 16) — no regression
```

### Required proofs (8) — all passing (integration)
1. **Tenant A never emails B** — A's emails only to A's recipient; B has 0, queues 0.
2. **request/accept/reject produce email** — driven through the real mentorship service; `sent` rows for all three origin events.
3. **Session event emails when configured** — real `requestSession` → `session.requested` email.
4. **ContactInfo never appears** — seeded `contact_email` absent from every email; recipient is the user's **account** email, not their hidden ContactInfo.
5. **Query without tenantId still fails** — raw `email_message` count → 0; raw insert rejected.
6. **Email preferences respected** — opted-in user gets an email; default (off) user gets none.
7. **pending → failed → (retry) → sent** — failure sets `failed` + `last_error` + `attempts`; retry with a working provider flips to `sent`.
8. **Provider failure doesn't break the core flow** — the mentorship request succeeds; the worker with a failing provider does not throw; domain rows intact.

## 8. Risks

| Pri | Risk | Mitigation |
|---|---|---|
| P2 | No real transport yet (console/noop) | Abstraction in place; add SMTP/Resend/SES behind `EmailProvider` (a later, isolated change). |
| P2 | Worker is trigger-based (`/api/admin/email/process`) — needs a scheduler in prod | Wire a Vercel Cron / queue to call it; idempotent + batched + retry-safe. |
| P3 | Retry is at-least-once within `MAX_ATTEMPTS=3`; no dead-letter UI | `failed` rows + `last_error` are queryable; add DLQ view later. |
| P3 | Recipient = account email (correct) | By design; ContactInfo stays isolated. |
| P3 | `pg` runtime (ADR-002) | carry-over. |

## 9. Recommendation: **GO** for Slice 15

Email is real, tenant-scoped, RLS-protected, preference-gated, born only from valid
domain events, structurally unable to leak ContactInfo, with pending/sent/failed +
retry and a provider failure that never breaks the core flow. Gates green
(156 unit + 99 integration, no regression). The only operational follow-up is
plugging a production transport + scheduler — both isolated, non-breaking additions.
