# SLICE 4 — Mentor Search Foundation

**Date:** 2026-06-02
**Branch:** `main`
**Scope:** Manual mentor search over the Slice 3 data (profile, skills, interests,
goals, availability, dual role). **No product surface, no AI matching, no chat:** no
landing, dashboard, sessions, ratings, notifications, billing. **No UI** (the search
is fully validated by the API + tests).

---

## 1. Search model created

A read-only, tenant-scoped mentor directory built from existing tables — **no new
migration**. It joins `profile` + `tenant_user` (+ `user_skill`/`skill`) and runs
entirely through `withTenant` (RLS), so results can never cross a tenant boundary.

**Eligibility (always enforced):** `profile.status = 'active'` **AND**
`mentor_available = true` **AND** `mentor_paused = false`. Decision: a **paused**
(or inactive) mentor is **hidden** from the directory — only effectively-available
mentors appear.

**Mentor card (projection):** `tenantUserId`, `displayName`, `title`, `area`,
`seniority`, `bio`, `offeredSkills[]`, `available`. **ContactInfo
(contact_email/phone/whatsapp) is never selected** → hidden until an accepted match
(future slice). Empty state = `{ items: [], total: 0 }`.

**Result:** `{ items: MentorCard[], total, limit, offset }` — paginated, ordered by
`display_name` then id (stable). `limit` clamped to 1..100 (default 20), `offset ≥ 0`.

## 2. Filters implemented

| Filter | Behaviour |
|---|---|
| `skill` | offered skill name (ILIKE substring) via `EXISTS(user_skill … relation='offered')` |
| `skillId` | offered skill id (exact) |
| `area` | `profile.area` ILIKE |
| `title` (cargo) | `profile.title` ILIKE |
| `seniority` | case-insensitive exact |
| `q` (keyword) | name / title / area / bio / offered-skill name (single reused param) |
| `limit` / `offset` | pagination (clamped) |
| `excludeUserId` | excludes the viewer |

`buildMentorWhere()` builds parameterized SQL (pure, unit-tested). Everything is
parameterized — no string interpolation of user input.

## 3. Routes / handlers

| Route | Method | Purpose |
|---|---|---|
| `/api/mentors` | GET | tenant-scoped mentor search; query params above; viewer excluded |

`requireSession(host, cookie)` (Slice 2) resolves tenant + auth, then
`searchMentors(session.tenantId, filters)` runs via `withTenant` (Slice 1 RLS).

## 4. Code

`src/search/`: `filters.ts` (pure: `clampLimit/clampOffset`, `buildMentorWhere`),
`mentorSearch.ts` (`searchMentors` — count + paginated list, ContactInfo-free
projection), `index.ts`.

## 5. Mandatory rules — compliance

no global User ✓ · always tenant-scoped ✓ · bound to TenantUser ✓ · no cross-tenant
✓ · respects RLS + withTenant ✓ · ContactInfo hidden (not in projection) ✓ · only
available mentors appear ✓ · paused mentors hidden (decision) ✓ · person can be
mentor and mentee ✓ · search resolves tenant by host (requireSession) ✓.

## 6. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run build            → PASS (/ static; 14 dynamic API routes + /health)
npm run test:unit        → 93 passed (adds 6 search filter/pagination unit tests)
npm run test:integration → 29 passed (5 tenancy + 8 auth + 8 profile + 8 search; real Postgres 16)
npm test (no DB)         → 93 passed | 29 skipped
```

### Required proofs (8) — all passing (integration)
1. **A does not see B's mentors** — A's results exclude B's mentor; B's include it.
2. **Skill filter works** — `skill=React` includes the React mentor, excludes the Go one.
3. **Title & area filters work** — `title=Manager`/`area=Backend` each return only the matching mentor.
4. **Paused/inactive not listed** — a paused mentor and an inactive-profile mentor never appear.
5. **Same TenantUser is mentor and mentee** — appears in the mentor directory AND `getProfileView().roles` is `{isMentor:true, isMentee:true}`.
6. **Query without tenantId still fails** — raw count over `profile` with no context → 0 (default-deny).
7. **ContactInfo stays hidden** — the seeded contact email never appears in results; cards have no contact field.
8. **Pagination/ordering without crossing tenants** — `total` counts only tenant A (3), pages are ordered (`Alice, Bob` then `Zoe`); tenant B's mentor never counted.

Bug fixed during the slice: `createSkill` now uses `ON CONFLICT DO UPDATE` (a failed
INSERT inside the `withTenant` transaction would have aborted it).

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| S1 | No UI yet | Expected | Search validated via API + tests; UI is a later slice. |
| S2 | Paused mentors hidden (not shown-as-unavailable) | Low (by design) | Documented decision; a "show unavailable" mode can be added later. |
| S3 | Keyword/area use ILIKE substring (no full-text/index tuning) | Low | Fine at current scale; add GIN/trigram indexes when needed. |
| S4 | Runtime uses `pg` (ADR-002 bounded deviation) | Low | RLS proven; carry-over. |
| S5 | `npm audit` dev-dep advisories | Low | Toolchain only. |

## 8. Recommendation: **GO** for Slice 5

All Definition-of-Done items met; the 8 required proofs pass against a real Postgres
with RLS. The mentor directory is tenant-scoped, ContactInfo-safe, shows only
effectively-available mentors (paused hidden), supports skill/area/title/seniority/
keyword filters and pagination, and respects dual role. typecheck/lint/build green;
the app build is unaffected.

**Carry-over:** the mentorship request flow (request → accept/decline) and the
ContactInfo reveal **after an accepted match**; optional UI for the directory.

> Not pushed and Slice 5 not started — awaiting acceptance.
