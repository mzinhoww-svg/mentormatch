# SLICE 15 — Commercial Landing Foundation

**Date:** 2026-06-03
**Scope:** Official commercial landing for customer acquisition, as an institutional
app **on top of** the existing product. **No change** to product/tenancy/auth/RLS/
notifications/email/product branding. Out of scope: billing, IA, chat, library, mobile.

---

## 1. Pages created (route group `(marketing)`, institutional host)

| Route | Render | Purpose |
|---|---|---|
| `/` | static | Home — value prop, problema, como funciona (teaser), benefícios, CTA |
| `/como-funciona` | static | mentor → mentorado → busca → request → sessão → feedback |
| `/beneficios` | static | retenção, sucessão, desenvolvimento, onboarding, expertise |
| `/planos` | static | Starter / Growth / Enterprise (apresentação, **sem billing**) |
| `/demo` | static + client form | Solicitar Demonstração (formulário) |
| `/contato` | static | contato + CTA |

The placeholder `src/app/page.tsx` was replaced by the marketing Home. Product routes
(`/login`, `/app/*`) and APIs are untouched and keep their own layout.

## 2. Components created

- `marketing/MarketingNav.tsx`, `MarketingFooter.tsx` — institutional chrome (server).
- `marketing/DemoForm.tsx` — client form posting to `/api/demo-request`.
- `marketing/content.ts` — pure copy/data (steps, benefits, **3 tiers**, headcount).
- `marketing/seo.ts` — `siteUrl()` + `MARKETING_ROUTES`.
- `marketing/demoRequest.ts` — pure validation.
- `app/(marketing)/layout.tsx` + `marketing.css` — additive `mk-` styles reusing the
  approved tokens (no product CSS changed).
- Reuses the approved **"A Corrente"** symbol via `ui/Mark` (`Mark`/`Lockup`).

## 3. Branding (approved brandkit, no new identity)

Uses the canonical tokens (Brasa/Tinta/Jade/Argila), Instrument Serif / Hanken Grotesk
/ Space Mono, the **A Corrente** symbol and the Mentormatch wordmark, plus the voice
("O conhecimento circula", "Passe adiante", "Ninguém cresce sozinho"). **No** LATAM
identity/logo, **no** MM monogram, **no** invented identity. Copy describes only
existing capabilities (no overpromising).

## 4. SEO implemented

- Per-page `metadata`: `title` (+ template `%s · MentorMatch`), `description`, `openGraph`, Twitter card.
- `metadataBase` + `robots` (index/follow) in the marketing layout.
- `app/robots.ts` → allow `/`, disallow `/app/` and `/api/`, links sitemap, host.
- `app/sitemap.ts` → all marketing routes + `/demo`. Build emits `/robots.txt` and `/sitemap.xml`.
- Home and content pages are **statically rendered** (`○`) — ideal for crawling.

## 5. Form implemented

`POST /api/demo-request` (public, institutional). Validates name/company/role/email/
headcount (`marketing/demoRequest.ts`) and **registers interest** via structured log —
**no CRM dependency**, no product/tenant coupling, no ContactInfo of product users
involved. Durable storage / CRM integration is a deliberate future step.

## 6. Tests & results

```
typecheck            → PASS
lint                 → PASS
build                → PASS (/, /como-funciona, /beneficios, /planos, /demo, /contato,
                              /robots.txt, /sitemap.xml, /api/demo-request)
test:unit            → 167 passed (marketing units + 3 DOM)
test:integration     → 99 passed (product — no regression)
```

Validated: (1) pages render; (2) branding applied (A Corrente symbol + tokens, no
monogram); (3) navigation works (nav links + CTAs); (4) form works (submit → success,
correct payload) + server-side validation; (5) SEO present (per-page metadata + robots
+ sitemap); (6) build green.

## 7. Risks

| Pri | Risk | Mitigation |
|---|---|---|
| P2 | Demo leads are **logged, not durably stored** | Add a `demo_request` store / CRM integration in a later slice |
| P3 | No anti-spam on the public form | Add rate-limit/captcha before heavy promotion |
| P3 | OG image not provided (text card only) | Add an OG image asset |
| P3 | Landing served on tenant hosts too (no host-gating) | Acceptable; product lives at `/app` + `/login` |
| P3 | `siteUrl` from `NEXT_PUBLIC_APP_URL` (fallback `mentormatch.app`) | Set the env to the real marketing domain in Vercel |

## 8. Recommendation: **GO** for Slice 16

The commercial landing is real, on-brand (approved brandkit, no new/forbidden
identity), SEO-ready, with a working demo-request form — and it **did not touch** the
product, tenancy, auth, RLS, notifications, email, or product branding. Gates green
(167 unit + 99 integration, no regression). Follow-ups (durable lead storage, anti-spam,
OG image) are additive and non-blocking.
