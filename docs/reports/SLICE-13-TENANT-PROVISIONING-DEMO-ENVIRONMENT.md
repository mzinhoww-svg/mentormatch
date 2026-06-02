# SLICE 13 — Tenant Provisioning & Demo Environment

**Date:** 2026-06-02
**Goal:** Remove the developer dependency for creating a usable environment — one
command provisions a fully working, navigable tenant.

---

## What was delivered

| Deliverable | How |
|---|---|
| **Tenant bootstrap** | `createTenant({slug,name})` (also creates the default program) |
| **Admin seed** | `signup` role `admin` + consent + profile activated |
| **Mentor seed** | 3 members, profile + offered skills + `mentor_available`, program role `mentor` |
| **Mentee seed** | 4 members, profile + sought skills, program role `mentee` |
| **Default program** | `ensureDefaultProgram` (via `createTenant`); participants added |
| **Default branding** | explicit `updateSettings` (display name, program name, brand colors, locale) |
| **Demo seed (sample activity)** | 1 accepted mentorship + 1 completed session + 1 pending request → real notifications |
| **Single command** | `npm run provision -- --slug acme --name "Acme"` (and `npm run seed:demo`) |
| **Navigable validation** | command verifies admin login, prints login URLs + credentials; integration test asserts real data |

### Design notes
- **Everything goes through the real domain services** (`signup`/consent,
  `upsertProfile`/`activateProfile`, `createSkill`/`addUserSkill`, `addParticipant`,
  `requestMentorship`/`acceptRequest`, `requestSession`/`confirm`/`complete`,
  `updateSettings`). Seeded data is **indistinguishable from real usage** — it is not a
  fixture dump, and it is **not treated as production**: emails are demo-scoped
  (`@{slug}.demo`) and the shared password is clearly labeled DEMO ONLY.
- **Idempotent** on slug (re-run skips, no duplicates).
- **Guards reserved slugs** (`demo`, `admin`, …) which never resolve to a tenant host.
- Tooling: added `tsx` (devDep) to run the TS CLI; no runtime/business code added to the app bundle.

### Files
`src/provisioning/plan.ts` (pure plan), `provisioningService.ts` (`provisionDemoTenant`,
`verifyLogin`), `cli.ts` (single command), `index.ts`; tests under `__tests__/`.
`package.json` scripts `provision` / `seed:demo`.

## Evidence (executed)

**Single command, end to end** (`npm run provision -- --slug acmedemo --name "Acme Demo"`):
```
✓ Tenant provisioned: Acme Demo (acmedemo)
  Default program + branding configured.
  Seeded: 1 admin, 3 mentors, 4 mentees, 7 participants, 1 mentorship, 1 completed session.
  Admin login verified (role=admin).
  dev : http://acmedemo.localhost:3000/login   prod: https://acmedemo.mentormatch.app/login
```

**Real data in DB (tenant `acmedemo`):**
```
users=8 · available_mentors=3 · program_participants=7 · active_mentorships=1
completed_sessions=1 · notifications=23
default_program="Programa de Mentoria" (is_default=t) · branding="Acme Demo" primary=#FF4A1C
```

**Idempotency:** re-running the same slug → `already exists — skipped seeding`.

**Gates:** typecheck ✓ · lint ✓ · build ✓ · **unit 143** ✓ · **integration 91** ✓
(adds `plan` unit + `provisioning` integration: navigable tenant, admin login,
real metrics, mentor directory non-empty, participants, branding, notifications,
idempotency, reserved-slug rejection, tenant isolation). No regressions.

## "Uma empresa consegue usar sem ajuda?" — answer

**SIM — para criar e usar um ambiente funcional, com uma ressalva de plataforma (DNS), não de código.**

- **What is now self-served (no developer code):** a single command provisions a
  complete, real, tenant-isolated environment — admin + mentors + mentees + default
  program + branding + live sample activity — and **verifies the admin can log in**.
  After that, the whole product is navigable with real data: login → shell → profile →
  mentor directory → request → accept → sessions → notifications → admin metrics →
  branding → feedback. This directly closes Checkpoint A's **P1** (no provisioning path)
  and flips its headline answer from "not for onboarding" to **yes, via one command**.

- **The remaining caveat is operational, not developmental:** to reach that tenant in a
  browser it must be served on a **tenant host** — `http://{slug}.localhost:3000`
  works out of the box in dev; in production a wildcard `*.mentormatch.app` DNS/Vercel
  domain must point at the app (a one-time platform setup, not per-tenant dev work).
  Once the wildcard exists, every new tenant is **100% self-served** by the command.

- **Honest scope:** this is a **demo/bootstrap** provisioner (shared demo password,
  demo-scoped emails). A production onboarding UX (invite emails, password setup,
  self-service tenant signup) is a future slice — but the **developer is no longer in
  the loop** to stand up a usable environment.

## Risks

| Pri | Risk | Mitigation |
|---|---|---|
| P2 | Demo users share a known password | Clearly labeled DEMO ONLY; demo-scoped emails; not for production accounts |
| P2 | Production reachability needs wildcard DNS (`*.mentormatch.app`) | One-time platform setup; dev uses `{slug}.localhost` |
| P3 | No invite/email onboarding yet | Future slice (real onboarding UX) |
| P3 | `tsx` devDep / `pg` runtime (ADR-002) | dev-only / carry-over |

## Recommendation

Slice 13 complete and verified. The developer dependency to stand up a usable
environment is **eliminated** via `npm run provision`. **Stop here** — awaiting
acceptance before Slice 14.
