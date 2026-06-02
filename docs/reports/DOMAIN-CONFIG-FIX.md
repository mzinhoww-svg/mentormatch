# DOMAIN-CONFIG-FIX — env-configurable tenant base domain

**Date:** 2026-06-02 · **Context:** removes the production blocker from Checkpoint A.1.
**Constraint:** no new features; no change to tenancy semantics, auth, RLS, or the rest
of the product — only the **source** of the base domain becomes configurable.

---

## Problem

`src/tenancy/resolveTenant.ts` hardcoded `ROOT_DOMAIN = 'mentormatch.app'`, and the
documented env vars `APP_BASE_DOMAIN` / `TENANT_DOMAIN_MODE` were **never read**
(dead config). Result: no production domain other than `mentormatch.app` (e.g.
`mentorxmatch.xyz`) could ever resolve to a tenant, regardless of DNS/Vercel env.

## Fix

- `resolveTenant.ts` now derives the base domain from **`APP_BASE_DOMAIN`** via
  `getBaseDomain()` (read **at call time**, so a deploy env change takes effect with
  no rebuild). Safe fallback: `DEFAULT_BASE_DOMAIN = 'mentormatch.app'` when unset —
  keeping dev and the existing test suite stable.
- `getTenantDomainMode()` reads **`TENANT_DOMAIN_MODE`** (`subdomain` | `path` |
  `custom`); only `subdomain` is implemented today (others reserved, behave as
  `subdomain`). The value is surfaced so docs/deploys stay honest.
- Messy env values are tolerated (trim, lowercase, strip port, strip leading/trailing
  dots).
- **All behaviours preserved**: INSTITUTIONAL (`D` / `www.D`), PLATFORM_ADMIN
  (`admin.D`), RESERVED (blocklist), UNKNOWN, TENANT — now relative to the configured
  `D`. `localhost` (`{slug}.localhost`) is handled unconditionally and is never
  affected by `APP_BASE_DOMAIN`.
- `provisioningService` now composes the production login URL from `getBaseDomain()`
  instead of a hardcoded `mentormatch.app`.

Nothing else changed: same pure function signature (`resolveTenantFromHost(host)`),
same `TenantResolution` union, same reserved list, same slug rules. RLS, `withTenant`,
auth, and domain logic are untouched.

## New behaviour of resolveTenant (D = `APP_BASE_DOMAIN`, default `mentormatch.app`)

| Host | Result |
|---|---|
| `D`, `www.D` | `INSTITUTIONAL` |
| `admin.D` | `PLATFORM_ADMIN` |
| `{slug}.D` (valid, non-reserved) | `TENANT { slug }` |
| `{reserved}.D` (api, www, …) | `RESERVED` |
| `{bad}.D` (invalid label / multi-label) | `UNKNOWN` |
| `localhost`, `{slug}.localhost` | `INSTITUTIONAL` / `TENANT` (always) |
| any other host | `UNKNOWN` |

Example with `APP_BASE_DOMAIN=mentorxmatch.xyz`: `acme.mentorxmatch.xyz` → `TENANT acme`;
`mentorxmatch.xyz` → `INSTITUTIONAL`; `admin.mentorxmatch.xyz` → `PLATFORM_ADMIN`; and
crucially `acme.mentormatch.app` → `UNKNOWN` (the old domain is **no longer special**).

## Files changed

- `src/tenancy/resolveTenant.ts` — env-driven base domain + mode (the fix).
- `src/provisioning/provisioningService.ts` — prod URL uses `getBaseDomain()`.
- `src/tenancy/__tests__/resolveTenant.config.test.ts` — **new** (8 tests).
- `docs/TENANCY.md`, `docs/ENVIRONMENT.md`, `docs/ARCHITECTURE.md` — updated.
- `docs/reports/DOMAIN-CONFIG-FIX.md` — this report.

## Tests executed & results

```
typecheck            → PASS
lint                 → PASS
build                → PASS
test:unit            → PASS (151; +8 new config tests; 10 legacy resolveTenant tests still green)
test:integration     → PASS (91; no regression)
```

New tests prove: tenant resolves on `{slug}.APP_BASE_DOMAIN`; institutional/www does
not expose tenant login; platform-admin & reserved preserved on the configured domain;
**the production domain is no longer hardcoded** (`acme.mentormatch.app` → UNKNOWN when
a different domain is configured); `localhost` keeps working; messy env values
tolerated; `TENANT_DOMAIN_MODE` read with safe default.

## GO/NO GO for real production

**GO — for the code blocker.** Tenant resolution is now driven by `APP_BASE_DOMAIN`,
so the app can serve any production domain. To actually reach a usable production
tenant, the remaining steps are **operational** (outside this fix and this sandbox):

1. Set `APP_BASE_DOMAIN=<your domain>` (and keep `TENANT_DOMAIN_MODE=subdomain`) in
   Vercel, with `DATABASE_URL`/`DIRECT_URL` present.
2. Configure wildcard DNS/Vercel domain `*.<your domain>` → the app.
3. Run `npm run provision -- --slug acme` against the **production** `DATABASE_URL`.
4. Browser-validate `https://acme.<your domain>/login` end to end.

Those four are environment/credentials/DNS actions the platform owner performs; the
code no longer stands in the way.
