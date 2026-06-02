# CHECKPOINT A — Product Reality & Anti-Mock Validation

**Date:** 2026-06-02 · **Scope:** Slices 1–12 (no new code; inspection/measurement only)
**Method:** static inspection (grep), service/route reading, full gate suite (typecheck,
lint, build, 138 unit + 87 integration), and live DB/RLS probing on Postgres 16.

---

## Verdict: **PASS WITH RISKS**

The product is **real** — every critical flow reads/writes a real, tenant-scoped,
RLS-protected database; there is **no mock, fake, hardcoded, or simulated data in
product code**. The risks are about **reach**, not authenticity: a company cannot yet
**self-onboard** without manual tenant/host provisioning, some backend capabilities
are **not yet surfaced in the UI**, and **browser click-through** of authenticated
flows is not yet possible from this environment (explained in §10).

---

## 0. Headline questions

| Question | Answer | Basis |
|---|---|---|
| A company can use it **without developer help**? | **Not for onboarding; yes for daily use after setup.** A tenant + first admin must be provisioned in the DB and a tenant host configured. Once that exists, members self-serve (signup+consent, login, full flows). | No provisioning/onboarding UI; host gating requires `{slug}.mentormatch.app`/`{slug}.localhost`. |
| If I **delete the DB data**, does the UI still look functional? | **No (correct).** Empty/zero data → honest empty states & zero metrics. | `mm_app` with no tenant context returns **0 rows** for `feedback`/`tenant_user`/`mentorship`; views render `EmptyState`/`Loading`, not fake content. |

---

## 1. Anti-mock classification per flow

| Flow | Class | Evidence |
|---|---|---|
| Login (tenant-scoped) | **REAL** | `/api/auth/login` → `authService` (argon2id), signed `mm_session` w/ tenantId; auth integration (8) incl. tenant-mismatch rejection. |
| Profile (view/edit/skills/goals/availability) | **REAL** | `/api/profile*` → `profileService` SQL; profile integration (8). |
| Mentor directory (search/filter) | **REAL** | `/api/mentors` → `mentorSearch` SQL (joins user_skill/profile); search integration (8). |
| Mentorship request | **REAL** | `/api/mentorship/requests` → real row + state; mentorship integration (8). |
| Accept / reject | **REAL** | creates `mentorship` / transitions request; capacity enforced. |
| Sessions (create/confirm/complete/cancel) | **REAL** | `/api/mentorship/sessions*` → `sessionService`; session integration (9); only with valid mentorship. |
| Notifications (list/read/prefs) | **REAL** | event-driven rows from real actions; notifications integration (8). |
| Admin overview/users | **REAL** | `/api/admin/*` → `adminService` **SQL aggregation** (`count() FROM tenant_user/mentorship/...`); admin integration (9). |
| Programs | **REAL backend / UI not surfaced** | `/api/admin/programs*` + program integration (8); **no `/app` screen** beyond APIs. |
| Branding / settings | **REAL** | `/api/branding` + `/api/admin/settings` → `TenantSettings`; settings integration (8). |
| Feedback / ratings | **REAL** | `/api/feedback/*` → `feedbackService`; feedback integration (8). UI surfaces session rating only. |

**No flow is MOCK.** No flow is NÃO IMPLEMENTADO at the backend level. Two are
**PARCIAL only at the UI surface** (Programs management; mentorship/program feedback) —
the backend + APIs are real and tested, just not yet exposed as dedicated screens.

## 2. Anti-mock proof (explicit)

- **Token scan** (`src`, excl. tests) for `MOCK|FAKE|PLACEHOLDER|HARDCODED|STUB|TEMP|TODO|FIXME|dummy|lorem`: **0 occurrences** in product code.
- **Prototype fiction scan** (`Nordia`, `Marina Alves`, `312 conexões`, …) from the brand-kit `Dashboard.html`: **0 occurrences** — none leaked into the app.
- **No hardcoded arrays** in `src/ui/views/**` — every view calls `api.get/post/put('/api/…')` (25 call sites enumerated; all same-origin relative).
- **Every API route imports a domain service** — none returns static literal data (only `/health` and `/api/branding` are intentionally service-light; branding still resolves `TenantSettings`/brand-kit defaults).
- **No hardcoded credentials / no seed-as-production** — secrets come from `process.env` (`AUTH_SECRET`); no `INSERT … VALUES('user@…')` production seed.
- **Test mocks are test-only** — `fetchMock`/`installFetch` live under `__tests__/` and are excluded from the bundle; the DOM tests assert against the **real API contract** (paths, field names).

## 3. Database & real data

- **17 domain tables** have `ROW LEVEL SECURITY` + `FORCE`: audit_event, consent_record, development_goal, feedback, mentorship, mentorship_request, mentorship_session, notification, notification_preference, profile, program, program_participant, skill, tenant_domain, tenant_settings, tenant_user, user_skill.
- **Default-deny verified live:** `mm_app` (no `app_current_tenant`) → `SELECT count(*)` returns **0** for feedback/tenant_user/mentorship. Data is invisible without a tenant context.
- **Metrics are computed**, not stored/faked: `adminService` aggregates with SQL `count()`/joins per tenant.
- **Branding from `TenantSettings`** with safe brand-kit defaults; **notifications from real events**; **feedback from the `feedback` table**; **admin reads real tenant rows**.

## 4. UI honesty

- Pages fetch real data on mount (`useResource` → `api`), show **`Loading`** while pending and **`EmptyState`** when empty — loading never masks missing integration (it wraps a real fetch).
- No route renders sample/example data as if real. Brand **copy** ("O conhecimento circula.", slogans) is static marketing text, not data.
- A 401 renders an **error**, not the protected view (proven by `profile.dom`).

## 5. Auth & tenancy

- Login tenant-scoped; session carries `tenantId`; a session minted for A is rejected on B's host (auth integration). Host gating via `resolveTenant`/`resolveActiveTenant`. RLS effective in real flows (every integration suite asserts cross-tenant = 0). **ContactInfo isolated** — revealed only via `/api/mentorship/contact` with an active mentorship; never returned by search/feedback/admin. Admin reads are tenant-scoped (admin integration asserts no cross-tenant accounts).

## 6. Sessions / requests / notifications

REAL end-to-end: request creates a real link; accept/reject transition real state and create a `mentorship`; a session requires a valid mentorship; notifications are born from real actions; mark-as-read updates real rows; feedback creates real records. Nothing is simulated client-side (the client only renders API responses).

## 7. Administration

Metrics from DB; lists tenant-scoped; admin actions audited (`audit_event`); `requireAdmin` enforced; no account from one tenant appears in another (RLS + integration).

## 8. Branding & settings

Branding resolves from `TenantSettings`; logo/colors real; **defaults do not hide misconfiguration** — they are the approved brand-kit contract and `customized:false` is reported distinctly; branding changes persist and re-resolve (settings integration).

## 9. Code & environment scan classification

| Pattern | Count (product) | Class |
|---|---|---|
| MOCK / FAKE / PLACEHOLDER / HARDCODED / STUB / TEMP | 0 | — |
| TODO / FIXME | 0 | — |
| Prototype fiction (Nordia/etc.) | 0 | — |
| Test-only `fetchMock`/`installFetch` | under `__tests__/` | **acceptable** (not shipped) |
| `/app` `page.tsx` (root institutional) = "baseline is running" | 1 | **risk (low)** — placeholder public face; landing is out of scope. |

## 10. Manual browser checks — status & blockers

Browser click-through **could not be executed from this environment**; reasons, precisely:
1. **Egress policy** blocks the sandbox from reaching `*.vercel.app` — I cannot fetch `/health` or any page from here (the user must confirm in their browser).
2. **Tenant host required** — authenticated flows only resolve on `{slug}.mentormatch.app` or `{slug}.localhost`. The current public deploy host (`mentormatch-git-main-….vercel.app`) is **not a tenant host** → resolves as institutional, so `/login`→`/app` cannot complete there.
3. **Provisioning required** — even on a tenant host, login needs a **provisioned tenant + user** in the production DB (no production seed exists).

**What stands in for browser validation today:** integration tests exercise the real
DB + RLS + services server-side for every flow, and DOM tests drive the actual UI
components against the real API contract. The gap is specifically the *click-through on
a live tenant host*, not the correctness of the flows.

`/health`, `/login` (default branding), and `/` **will** render on the bare deploy
host; only tenant login/app require the host+seed above.

## 11. Risks (PASS WITH RISKS — prioritized)

| Pri | Risk | Why | Suggested fix |
|---|---|---|---|
| **P1** | No tenant **onboarding/provisioning** flow | A company cannot self-start; dev must create tenant + first admin + host | Provisioning/admin-console slice + **seed script** for demo tenant |
| **P1** | Authenticated flows **not browser-validated** on a live tenant host | egress + host + empty prod DB | Configure a tenant host (`acme.mentormatch.app`) + seed; then click-through / add Playwright E2E |
| **P2** | UI **surface gaps** vs backend (Programs mgmt; mentorship/program feedback) | backend REAL but no dedicated screens | Add program-admin and feedback screens |
| **P2** | Institutional `/` is a **static placeholder** | "baseline is running" page | Replace before any public exposure (landing is out of scope now) |
| **P3** | **4 redundant Vercel projects** | same repo deployed 4× | Consolidate to one with `*.mentormatch.app` wildcard |
| **P3** | `pg` runtime (ADR-002); Google Fonts via `@import`; one transient DOM-test timing flake | minor | self-host fonts; raise waitFor; revisit driver |

## 12. Items still dependent on mock

**None in product code.** Mocks exist **only** in `__tests__/` (`fetchMock`) and are not
shipped. The only non-real surface is the **institutional `/` placeholder** (cosmetic,
out-of-scope landing) — not a mock of a real flow.

## 13. Recommendation: **GO** for Slice 13

Foundations are authentic and tenant-isolated; gates green (typecheck/lint/build, 138
unit + 87 integration). Proceed — but Slice 13 (or an interleaved enabler) should
prioritize **P1**: a **provisioning + seed** path and a **live tenant-host browser
validation**, so the "a company can use it unaided" answer becomes an unqualified yes.
