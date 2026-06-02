# docs/brand/source — preserved Claude Design source (verbatim)

This tree preserves the **Claude Design** brand source-of-truth and related
planning artifacts **exactly as delivered**. Nothing here is compiled or shipped
by the app build (`tsconfig.json` does not include `docs/`; ESLint ignores
`docs/brand/source/**`). Treat these files as read-only reference.

| Folder | Contents | Classification |
|---|---|---|
| `assets/` | Brand book + tokens: `brand.css`, `book.css`, `marks.js`, `brand-book.js`, `brand-book.html` | brand source of truth |
| `produto/` | Product prototypes: `Landing.html`, `Dashboard.html`, `App.html` (+ css) | product UX reference |
| `spec/` | `SPEC-LLM-original.md` — full brand/product spec | brand source of truth |
| `design-system/` | Partial DS source: `color.ts`, `theme.ts`, `whiteLabel.ts`, `marks.ts` | brand source (not wired — see note) |
| `generated/` | `app-icon-512.png` (512×512), `og-base.png` (1200×630) | production-eligible asset (generated brand graphics; not photos, not LATAM) |
| `slice-0a-planning/` | Reference implementations from the Claude.ai phase | reference only — see its README |

## Notes
- `design-system/*.ts` import sibling modules (`../tokens/*`, `../utils/contrast`)
  that were **not** delivered, so they do not compile standalone. They are kept as
  source for the future design-system slice, **not** as active code.
- The `generated/` PNGs are brand graphics derived from the "A Corrente" symbol —
  no real photographs, no LATAM identity. They may be promoted to `public/` when the
  app needs them.
- **No LATAM identity, logo, colors, or real photos are present.** Any future LATAM+
  reference is `reference only, not for production` (see
  `../ASSET_INVENTORY.md` and `../LATAM_PLUS_REFERENCE_ANALYSIS.md`).
