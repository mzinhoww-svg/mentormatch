# SLICE 10 — Tenant Settings & Branding Foundation

**Date:** 2026-06-02
**Scope:** Foundation for per-tenant configuration — white-label branding (logo,
colors, display name, program name, locale), operational status, and basic
operational preferences — with safe defaults from the **approved MentorMatch brand
kit**. **Out of scope (not implemented):** landing/marketing, billing, AI, chat,
full library, mobile. **No product UI** (validated by API + tests).

---

## 1. Entities / configuration created

Migration `prisma/migrations/0008_tenant_settings/migration.sql`:

| Object | Purpose |
|---|---|
| `tenant_settings` (one row per tenant, `UNIQUE(tenant_id)`) | white-label + operational config |

Columns: `display_name`, `logo_url`, `primary_color`, `secondary_color`,
`program_name`, `locale` (default `pt-BR`), `status` (active/inactive — operational,
distinct from the platform registry status), `allow_self_signup`,
`default_mentor_capacity`, timestamps. CHECKs on status & capacity. RLS
`ENABLE`+`FORCE` + isolation policy; grant to `mm_app`. Prisma mirror updated;
`prisma validate` passes.

All required fields modeled: **display name, slug (tenant registry), logo, brand
color, secondary color, status active/inactive, basic operational settings, and safe
defaults when no branding exists.**

## 2. Branding applied (brand-kit compatible)

`src/settings/branding.ts` encodes the **approved brand tokens** (source: brand book /
"Especificação LLM" §6.1) as the safe defaults — guaranteeing the white-label contract
never breaks:

| Token | Default | Brand role |
|---|---|---|
| `primaryColor` | `#FF4A1C` | Brasa · primary/accent |
| `secondaryColor` | `#1B5C4C` | Jade · secondary |
| `inkColor` | `#14100D` | Tinta · foundation |
| `paperColor` | `#FBF7F0` | Argila · paper |
| `logoUrl` | `null` → built-in "A Corrente" mark | — |
| `programName` | "Programa de Mentoria" | — |
| `locale` | `pt-BR` | — |

`resolveBranding(stored)` merges valid overrides over these defaults; invalid colors
(non-hex) or unsupported locales fall back, and `inkColor`/`paperColor` are always
present — so the visual contract holds for any tenant, customized or not. Custom
colors are allowed (true white-label) but **must be valid hex** (`invalid_color`),
and locale must be supported (`unsupported_locale`).

## 3. APIs / handlers

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/admin/settings` | GET / POST | requireAdmin | read / update branding + operational settings |
| `/api/admin/settings/status` | POST | requireAdmin | set tenant operational status |
| `/api/branding` | GET | public (host-resolved) | safe branding tokens for white-label theming (login page); unknown host → brand-kit defaults |

`/api/branding` returns **only** branding tokens — never operational settings or any
sensitive data — and is tenant-scoped via the host resolution + `withTenant`.
Audited: `settings.updated`, `settings.status_changed`. UI: not implemented.

## 4. Tests executed & results

```
npm run typecheck        → PASS
npm run lint             → PASS
npm run prisma:validate  → PASS
npm run build            → PASS (3 new routes: admin/settings, admin/settings/status, branding)
npm run test:unit        → 117 passed (adds branding: defaults, hex/locale validation, resolveBranding merge)
npm run test:integration → 79 passed (5 tenancy + 8 auth + 8 profile + 8 search + 8 mentorship +
                            9 session + 8 notifications + 9 admin + 8 program + 8 settings; real Postgres 16)
```

### Required proofs (8) — all passing (integration)
1. **Tenant A ≠ B** — A's settings invisible to B; cross-select in B → 0.
2. **A's branding doesn't affect B** — A custom primary; B keeps brand-kit default.
3. **Defaults when no customization** — logo null, brand-kit colors, status active, capacity 3.
4. **Query without tenantId still fails** — raw `tenant_settings` count → 0; raw insert rejected.
5. **Tenant status works** — active → inactive → active persists, tenant-scoped.
6. **Settings tenant-scoped** — A capacity 7 / locale en-US; B keeps 3 / pt-BR.
7. **Defaults never break white-label** — all contract tokens valid hex + locale; invalid color rejected.
8. **Audit on relevant changes** — `settings.updated` + `settings.status_changed` recorded.

No regressions: all Slice 1–9 integration suites still green.

## 5. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| T1 | Operational `status` is settings-level, separate from platform `tenant.status` (host resolution) | Low | Intentional — avoids breaking host resolution; documented. |
| T2 | `logo_url` stored as URL (no upload/storage pipeline) | Low (V1) | Asset upload/CDN in a later slice; URL is sufficient now. |
| T3 | `/api/branding` is public (unauthenticated) | Low | Returns only public branding tokens; no sensitive data; host-scoped. |
| T4 | Custom colors not constrained to the palette (true white-label) | Low | Defaults are brand-kit; only validity (hex) enforced; contract tokens always present. |
| T5 | Runtime uses `pg` (ADR-002 bounded deviation) | Low | RLS proven; carry-over. |

## 6. Recommendation: **GO** for Slice 11

All Definition-of-Done items met; the 8 required proofs pass against a real Postgres
with RLS, with no regressions. Settings/branding are tenant-scoped, branding defaults
match the approved brand kit and never break the white-label contract, operational
status works, configuration changes are audited, and ContactInfo stays untouched.
typecheck/lint/prisma-validate/build green.

**Carry-over:** logo upload/storage pipeline, applying resolved branding to the
product UI/theme, palette-constrained presets, settings admin UI.
