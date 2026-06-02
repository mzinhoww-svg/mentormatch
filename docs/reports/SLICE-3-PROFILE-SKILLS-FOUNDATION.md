# SLICE 3 — Profile + Skills Foundation

**Date:** 2026-06-02
**Branch:** `main`
**Scope:** User profile, skills/knowledge areas, interests, development goals, and
mentoring availability — preparing mentor search and the mentee flow. **No product
surface:** no landing, dashboard, library, sessions, ratings, notifications, billing.
**No UI** was needed to validate the domain (services + APIs + tests cover it).

---

## 1. Entities created (all tenant-scoped, RLS, bound to TenantUser)

| Table | Purpose | Key fields |
|---|---|---|
| `profile` | 1:1 with `tenant_user` | bio, title (cargo), area, seniority, status (active/inactive), `mentor_available`, `mentor_paused` |
| `skill` | tenant catalog (skill / knowledge area) | name, normalized_name, category; `unique(tenant_id, normalized_name)` |
| `user_skill` | TenantUser ↔ Skill | relation `offered \| sought \| interest`, level; `unique(tenant_id, user, skill, relation)` |
| `development_goal` | development objectives | description, status (open/done) |

Required attributes modeled: bio ✓, cargo (`title`) ✓, área ✓, senioridade ✓, skills
oferecidas (`relation='offered'`) ✓, skills buscadas (`'sought'`) ✓, objetivos de
desenvolvimento ✓, disponibilidade como mentor (`mentor_available`) ✓, pausa de
disponibilidade (`mentor_paused`) ✓, status ativo/inativo ✓. Áreas de interesse =
`user_skill.relation='interest'`.

## 2. Relations modeled

- `profile.tenant_user_id` 1:1 → `tenant_user`.
- `user_skill` N:1 → `tenant_user` and N:1 → `skill`.
- `development_goal` N:1 → `tenant_user`.
- **Same-tenant composite FKs** (`(tenant_id, …)` → `tenant_user(tenant_id,id)` /
  `skill(tenant_id,id)`): a relation can never point at another tenant's row
  (defense in depth, on top of RLS).
- **Dual role:** a TenantUser may hold `offered` skills + `mentor_available` (mentor)
  **and** `sought` skills (mentee) simultaneously. `deriveRoles()` computes
  `{ isMentor: available && !paused, isMentee: hasSought }`.

Migration: `prisma/migrations/0003_profile_skills/migration.sql` (tables, composite
FKs, `ENABLE`+`FORCE` RLS + isolation policies on all 4 tables, grants to `mm_app`).
Prisma schema mirror updated and `prisma validate` passes.

## 3. Routes / handlers created (protected by requireSession → tenant-scoped)

| Route | Methods | Purpose |
|---|---|---|
| `/api/profile` | GET, PUT | composed profile view (with roles) / upsert bio·title·area·seniority |
| `/api/profile/activate` | POST | activate profile (consent-gated) |
| `/api/profile/availability` | POST | set mentor available / pause |
| `/api/profile/skills` | GET, POST | list / add user skill (offered·sought·interest) |
| `/api/profile/goals` | GET, POST | list / add development goal |
| `/api/skills` | GET, POST | list / create tenant skill catalog |

Every handler calls `requireSession(host, cookie)` (Slice 2) then services that run
through `withTenant` (Slice 1 RLS). No access path outside the tenant.

## 4. Services

`src/profile/`: `roles.ts` (pure dual-role), `skillService.ts` (catalog + user
skills), `profileService.ts` (profile, availability, **consent-gated activation**,
goals, composed view), `audit.ts` (`profile.*` events → `audit_event`, redacted).

## 5. Mandatory rules — compliance

no global User ✓ · always tenant-scoped ✓ · always bound to TenantUser ✓ · no
cross-tenant ✓ · respects RLS + withTenant ✓ · consent still mandatory (activation
gated) ✓ · ContactInfo still isolated ✓ · no access outside tenant ✓ · mentor & mentee
coexist on the same TenantUser ✓.

## 6. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run prisma:validate  → PASS (schema valid)
npm run build            → PASS (/ static; 13 dynamic API routes + /health)
npm run test:unit        → 86 passed (adds 5 dual-role unit tests)
npm run test:integration → 21 passed (5 tenancy + 8 auth + 8 profile; real Postgres 16)
npm test (no DB)         → 86 passed | 21 skipped
```

### Required proofs (8) — all passing (integration)
1. **A does not read B's profile** — `getProfile(B, A's user)` → null; cross query → 0.
2. **Skills of A do not appear in B** — `listSkills(B)` excludes A's skills (RLS).
3. **Same TenantUser is mentor AND mentee** — offered+sought skills + available →
   `roles = { isMentor: true, isMentee: true }`.
4. **Mentor availability can be paused** — available → mentor; paused → not; unpaused → mentor.
5. **Profile without consent does not activate** — `activateProfile` throws
   `consent_required`, profile stays absent/inactive; after consent → `active`.
6. **Query without tenantId still fails** — raw read → 0; raw insert → rejected.
7. **Sensitive data stays isolated** — B cannot read A's profile bio/title (0 rows).
8. **Audit event on profile change** — `profile.updated` recorded in `audit_event`.

## 7. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| P1 | No UI yet to exercise dual role visually | Expected | Domain validated via services/APIs/tests; UI is a later slice. |
| P2 | Interests modeled as `user_skill.relation='interest'` (reuses catalog) | Low | Clear enum + check constraint; can split later if needed. |
| P3 | Activation consent check uses presence of any consent_record (not version match) | Low | Terms-version enforcement can tighten in LGPD slice. |
| P4 | Runtime still uses `pg` (ADR-002 bounded deviation) | Low | RLS proven; carry-over. |
| P5 | `npm audit` dev-dep advisories | Low | Toolchain only. |

## 8. Recommendation: **GO** for Slice 4

All Definition-of-Done items met; the 8 required proofs pass against a real Postgres
with RLS, plus dual-role unit coverage. typecheck/lint/prisma-validate/build green.
The foundation for mentor search and the mentee flow (profiles, offered/sought
skills, interests, goals, availability with pause, dual role) is in place — fully
tenant-scoped, consent-gated, with auditing, and no cross-tenant access.

**Carry-over:** mentor search/matching (Slice 4) over offered skills + availability;
optional UI; terms-version-aware consent.

> Not pushed and Slice 4 not started — awaiting acceptance.
