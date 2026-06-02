> ⚠️ **REGISTRO DE PLANEJAMENTO (fase Claude.ai) — importado no Slice 0R.**
> Este relatório descreve trabalho realizado na fase de planejamento no Claude.ai.
> **O código/testes que ele cita (RLS, Prisma, suíte de integração) NÃO estão
> implementados neste repositório baseline.** O que existe de fato no repo está em
> [`SLICE-0R-BASELINE-CONSOLIDATION.md`](./SLICE-0R-BASELINE-CONSOLIDATION.md). As
> implementações de referência do Slice 0A foram preservadas (não compiladas) em
> `docs/brand/source/slice-0a-planning/` e serão reintroduzidas numa fatia de dados
> dedicada. Mantido aqui como registro histórico das decisões e da evidência original.


# SLICE-0.1-RESULT — Design System Foundation

**Status:** concluído. Definition of Done atendida.
**Data:** 2026-06-02
**Escopo:** transformar o brandkit aprovado (Claude Design, "Circulação"/"A Corrente") em
**fundação técnica de design system** — tokens, white-label, assets mínimos, estrutura,
documentação e validação. **Sem** landing final, dashboard, telas, componentes de produto ou
features de mentoria.

Fontes de verdade usadas: `docs/BRANDKIT.md`, `docs/DESIGN_SYSTEM.md`,
`docs/brand/{COLOR_SYSTEM,TYPOGRAPHY,LOGO_USAGE,MOTION_SYSTEM,VISUAL_LANGUAGE,ASSET_INVENTORY,
LATAM_PLUS_REFERENCE_ANALYSIS}.md`, `docs/reports/SLICE-0B-BRAND-HANDOFF.md` e o brandkit
preservado em `docs/brand/source/`.

---

## 1. O que foi entregue

### 1.1 Tokens de design (`src/design-system/tokens/`)
- `color.ts` — escalas **Tinta / Brasa / Jade / Argila**, semântico, **escala neutra**
  ordenada, **roleColors** (aliases de papel). Valores VERBATIM do brandkit.
- `typography.ts` — famílias (Instrument Serif / Hanken Grotesk / Space Mono), pesos, escala
  display/heading/body/eyebrow, `fontImportUrl`.
- `layout.ts` — **espaçamento** (escala 4px), **raios**, **sombras**, container.
- `motion.ts` — **motion tokens** (easing `flow`/`out`, durações, spin do loader).
- `dark.ts` — **dark mode** por remapeamento de papéis (mesmo conjunto de escalas; sem tema
  paralelo).
- `index.ts` — barrel único.

### 1.2 White-label foundation (`src/design-system/brand/whiteLabel.ts`)
- Suporte técnico a **accent de marca por tenant** e **logo (lockup) por tenant**.
- **Validação de contraste AA** no aceite do accent (texto AA-large para CTA + contraste de UI
  ≥3 sobre paper); escolhe o melhor foreground da paleta.
- **Fallback seguro** para a marca MentorMatch quando o tenant não tem branding (ou quando o
  accent é inválido/reprovado) — com `warnings`.
- **Nenhuma cor de marca hardcoded em código** fora dos tokens (garantido por teste).

### 1.3 Tema (`src/design-system/theme/`)
- `theme.ts` — gera **CSS custom properties** (`--mm-*` + aliases curtos `--ink/--paper/
  --accent/...`) para **light e dark**, injetando o accent do tenant.
- `base.css` — tema base: `:root` (light), `[data-theme="dark"]`, `@media
  (prefers-color-scheme: dark)`, **reduced-motion**, `.mm-reveal` (somente transform, visível
  por padrão) e `.mm-live` (loader "A Corrente").

### 1.4 Assets mínimos da marca (`src/design-system/assets/`)
Gerados a partir do brandkit via `npm run assets:generate` (port de `mm.*` em `brand/marks.ts`):
- `favicon.svg`, `favicon-16/32/48.png`
- `app-icon-180/192/512.png`
- `maskable-512.png`
- `og-base.png` (1200×630) + `og-base.svg`
- `lockup-light.svg`, `lockup-dark.svg`
- `symbol.svg`, `symbol-compact.svg` (versão compacta do símbolo)

Nenhum logo novo, **nenhum monograma MM**, nenhuma identidade genérica, **nenhum asset LATAM**.

### 1.5 Utilitários e testes
- `utils/contrast.ts` — WCAG relative luminance, contrast ratio, `meetsAA`, `bestForeground`.
- `__tests__/` — 30 testes: contraste/paleta AA, white-label (gate + fallback), tema
  (light/dark + injeção de accent) e **guard de "nenhum token duplicado / nenhum tema
  paralelo"**.

## 2. Estrutura técnica criada

```
src/design-system/
  tokens/   color.ts typography.ts layout.ts motion.ts dark.ts index.ts
  theme/    theme.ts base.css
  brand/    whiteLabel.ts marks.ts
  utils/    contrast.ts
  assets/   (gerados) favicon* app-icon* maskable* og-base* lockup-* symbol*
  __tests__/ contrast.test.ts whiteLabel.test.ts theme.test.ts
  index.ts
scripts/assets/generate-brand-assets.ts
```

## 3. Testes e validação

| Comando | Resultado |
|---|---|
| `npm run typecheck` | OK — sem erros |
| `npm run lint` | OK — sem erros |
| `npx vitest run src/design-system` | **30 passed** |
| `npm test` (suite completa) | **73 passed** (43 de 0A + 30 de 0.1) |
| `npm run assets:generate` | OK — 14 arquivos gerados/validados |

### Validação de contraste (automatizada)
- `ink`, `ink-2`, `muted` sobre `paper` → AA normal (light e dark). ✔
- on-accent (CTA) → AA-large. ✔
- accent distinguível como UI sobre paper (≥3). ✔
- white-label: qualquer accent resolvido garante on-accent AA-large; accent reprovado cai no
  default com warning. ✔

### Descobertas de a11y (documentadas, não mascaradas)
- **on-accent = AA-large**: CTA é texto grande/semibold. Branco sobre brasa-500 ≈ 3.36:1
  (passa large); tinta-900 sobre brasa ≈ 5.63:1 (passa normal).
- **warning `#E8A317`**: ≈ 2.03:1 sobre paper — **não** serve como texto/ícone sobre paper.
  Uso correto = **fill** com texto escuro (tinta) por cima (≈ 8.73:1). Limitação registrada e
  coberta por teste.

### Verificação de "tema único"
Teste `theme.test.ts` garante: (a) nenhum hex de cor de marca hardcoded em **código** fora de
`tokens/` (comentários ignorados); (b) existe **exatamente um** CSS base (`base.css`). Dark
mode é remapeamento de papéis sobre as **mesmas** escalas — não há tema paralelo.

## 4. Definition of Done — checagem

- [x] Design tokens implementados (cor, neutra, semântico, tipografia, espaço, raio, sombra,
  motion, dark mode).
- [x] White-label funcionando em nível de token (accent + logo por tenant).
- [x] Contraste AA validado (automatizado + documentado).
- [x] Dark mode previsto no sistema (tokens + tema + auto por `prefers-color-scheme`).
- [x] Assets mínimos exportados (favicon, app icon, maskable, OG base, lockup claro/escuro,
  símbolo compacto).
- [x] Documentação atualizada (`DESIGN_SYSTEM.md` + brand docs + este relatório).
- [x] Nenhum componente final de produto criado.
- [x] Nenhuma feature de mentoria criada.
- [x] Nenhum asset LATAM usado.
- [x] Nenhum tema paralelo criado (garantido por teste).
- [x] Relatório do Slice 0.1 criado.

## 5. Riscos restantes

- **Fontes via Google Fonts `@import`** (não self-hosted ainda) — `missing asset` registrado;
  performance/privacidade a endereçar no Slice 0+.
- **Injeção de tema por tenant no runtime web** ainda não existe (não há app web/SSR neste
  ponto); `theme.ts` já produz o CSS, falta o ponto de injeção quando houver UI.
- **OG dinâmico por tenant** (com logo do tenant) não implementado — só a base MentorMatch.
- **Validação de contraste é WCAG 2.x relativa**; não cobre APCA nem daltonismo — fora de
  escopo do slice.
- Nenhum risco de isolamento/tenancy afetado (slice não tocou em dados/RLS); suite 0A segue
  verde (43/43).

## 6. Recomendação: **GO** para o Slice 0.2 (Observabilidade)

A fundação de design system está implementada, validada (AA + tema único) e documentada, com
assets gerados fielmente do brandkit e white-label seguro por token. Nada de produto/tela foi
criado. Recomendo seguir para **Slice 0.2 — Observabilidade** (logs estruturados com
`tenantId`, métricas, tracing), conforme o roadmap, **após aprovação explícita**.
