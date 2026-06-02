# SLICE 11 — Product UI Foundation

**Date:** 2026-06-02
**Scope:** First navigable MentorMatch experience over the Slices 1–10 backend.
**Interface & navigation only** — no new business rules, entities, tenancy, auth,
RLS, or domain changes; no commercial landing. Branding uses the approved brand kit
and per-tenant tenant settings.

---

## 1. Pages created (App Router)

| Route | Type | Purpose |
|---|---|---|
| `/login` | client | tenant-scoped login, white-labeled by host branding |
| `/app` | shell + client | home (quick counts: unread / mentorships / pending) |
| `/app/profile` | client | view/edit profile, skills offered/sought, goals, availability + pause, activate |
| `/app/mentors` | client | mentor directory: search/filter, cards, empty state, request mentorship |
| `/app/requests` | client | requests as mentor (accept/reject) and mentee (cancel) |
| `/app/mentorships` | server+client | active mentorships + post-acceptance contact reveal |
| `/app/sessions` | client | list/create/confirm/complete/cancel sessions |
| `/app/notifications` | client | list, unread counter, mark read / mark all |
| `/app/admin` | client | operational overview metrics + user list + suspend/reactivate |
| `/app/settings` | client | notification preferences (all) + tenant branding form (admin) |

`src/app/app/layout.tsx` (server) is the **auth gate**: it resolves the session with
`requireSession(host, cookie)` and `redirect('/login')` on failure — every `/app/*`
page is gated. The shell is themed server-side with the tenant's branding.

## 2. Components created (`src/ui`)

- **Mark / Lockup** — the approved "A Corrente" symbol (brand spec §5.3) + wordmark; the spinning Corrente is the loader. No new identity invented.
- **AppShell** — branded sidebar nav (role-filtered), header, content; applies tenant brand CSS vars.
- **LoginForm** — branded login, posts same-origin.
- **components** — `Loading`, `EmptyState`, `Banner`, `useResource` (load + reload), `initials`.
- **views/** — `HomeView`, `ProfileView`, `MentorsView`, `RequestsView`, `MentorshipsView`, `SessionsView`, `NotificationsView`, `AdminView`, `SettingsView`.
- **api** — same-origin-only fetch client (`assertSameOrigin` blocks cross-origin/cross-tenant URLs); `ApiError`.
- **nav** — pure nav config + role filtering (`navForRole`, `activeHref`).
- **branding** — `Branding` type + `brandingToCssVars`.
- **globals.css** — design system ported from the approved `brand.css` (tokens, buttons, shell, cards, forms, empty/loading), with `--brand-primary`/`--brand-secondary` overridable per tenant.

## 3. Navigation created

Sidebar shell with role-aware items (Admin hidden for non-admins, mirroring backend
`requireAdmin`), active-route highlighting, logout, and responsive collapse to a top
bar under 860px. Loading and empty states throughout.

## 4. Integrations used (existing backend, unchanged)

auth (`/api/auth/login|logout`, `/api/me`), `/api/branding`, profile (`/api/profile`,
`/skills`, `/goals`, `/availability`, `/activate`), `/api/mentors`, mentorship
requests (`/requests`, `/accept`, `/reject`, `/cancel`), `/mentorships`, `/contact`,
sessions (`/sessions`, `/confirm`, `/complete`, `/cancel`), notifications
(`/notifications`, `/read`, `/preferences`), admin (`/overview`, `/users`,
`/users/status`), settings (`/admin/settings`). All requests are **same-origin
relative** → bound to the host's tenant; the `mm_session` cookie carries auth.

## 5. Tooling added (tests only — no runtime/business change)

`happy-dom`, `@testing-library/react`, `@testing-library/dom`, `@vitejs/plugin-react`
(devDependencies). `vitest.config.ts` now uses the React plugin, includes `.tsx`, and
routes `*.dom.test.tsx` to a `happy-dom` environment (node stays the default).

## 6. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run build            → PASS (compiles /login + all /app/* + existing APIs)
npm run test:unit        → 132 passed (incl. 8 DOM component tests in happy-dom)
npm run test:integration → 79 passed (no regression — backend untouched)
```

### Required proofs (10) — all covered
1. **Login renders & respects tenant** — `login.dom`: branding (display name) from host shown; posts same-origin `/api/auth/login`.
2. **Authenticated user reaches the right shell** — `ui-units`: `navForRole` builds the correct nav (admin items only for admin/program_manager); shell consumes it.
3. **Profile loads & saves** — `profile.dom`: loads profile, edits a field, `PUT /api/profile` called.
4. **Directory renders filters & cards** — `mentors.dom`: filter inputs + mentor cards rendered.
5. **Request via UI works** — `mentors.dom`: "Solicitar mentoria" calls `POST /api/mentorship/requests` with `mentorId`.
6. **Sessions appear & change status** — `sessions.dom`: session listed; confirm flips `requested → confirmed`; create posts a session.
7. **Notifications list & mark read** — `notifications.dom`: unread counter, list, mark-read call, counter clears.
8. **Admin overview renders tenant-scoped metrics** — `admin.dom`: metrics + user list from the tenant's API response.
9. **Pages block access without auth** — server layout redirects to `/login` (build-verified); `profile.dom`: a 401 renders an error, never the protected form.
10. **Tenant A doesn't see B in the UI** — `ui-units`: `assertSameOrigin` rejects cross-origin/cross-tenant URLs (UI can only ever call its own host); rendered data is exactly the host-scoped API response (backend RLS proven in prior slices).

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| U1 | Component tests mock `fetch` (no live server/E2E) | Medium | Build + integration cover server/API; mocked tests prove UI wiring/field names; add Playwright E2E later. |
| U2 | `/app/admin` accessible to non-admins client-side (APIs 403 → error banner), nav item hidden | Low | Admin nav hidden; APIs enforce; add server role-guard on the admin route later. |
| U3 | Branding applied via CSS vars only (logo via URL, no upload) | Low (V1) | Matches Slice 10; asset pipeline later. |
| U4 | Google Fonts via CSS `@import` (network) | Low | Falls back to system-ui/Georgia; self-host later. |
| U5 | New devDeps add audit warnings | Low | Test-only; not shipped to runtime bundle. |
| U6 | Runtime uses `pg` (ADR-002) | Low | Carry-over. |

## 8. Recommendation: **GO** for Slice 12

A coherent, tenant-scoped, white-labeled product UI now sits on the existing backend:
authenticated shell + nav, login/logout, profile, mentor directory, requests,
mentorships (with gated contact reveal), sessions, notifications, and admin overview —
all wired to the real APIs, with the auth gate, role-aware nav, and same-origin
isolation. typecheck/lint/build green; 132 unit (incl. DOM) + 79 integration pass with
no backend regression.

**Carry-over:** Playwright E2E against a live tenant host, server-side admin route
guard, logo upload, self-hosted fonts, richer admin management screens (programs UI),
and visual polish/motion from the brand kit.
