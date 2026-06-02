> ⚠️ **REGISTRO DE PLANEJAMENTO (fase Claude.ai) — importado no Slice 0R.**
> Este relatório descreve trabalho realizado na fase de planejamento no Claude.ai.
> **O código/testes que ele cita (RLS, Prisma, suíte de integração) NÃO estão
> implementados neste repositório baseline.** O que existe de fato no repo está em
> [`SLICE-0R-BASELINE-CONSOLIDATION.md`](./SLICE-0R-BASELINE-CONSOLIDATION.md). As
> implementações de referência do Slice 0A foram preservadas (não compiladas) em
> `docs/brand/source/slice-0a-planning/` e serão reintroduzidas numa fatia de dados
> dedicada. Mantido aqui como registro histórico das decisões e da evidência original.


# SLICE-0B-RESULT — Documentation & Brand Handoff

**Status:** concluído. Definition of Done atendida.
**Data:** 2026-06-02
**Escopo:** criar a base documental final inicial do projeto e incorporar o brandkit
aprovado (Claude Design) como fonte de verdade — **sem** implementar landing, dashboard,
componentes finais ou telas de produto.

---

## 1. O que foi entregue

### Documentação central (`docs/`)
`README.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `ADR.md`, `TENANCY.md`, `SECURITY.md`,
`LGPD.md`, `DESIGN_SYSTEM.md`, `BRANDKIT.md`, `COPY_GUIDE.md`, `DEPLOYMENT.md`,
`ENVIRONMENT.md`, `TESTING.md`, `RUNBOOK.md`.

### Handoff de marca (`docs/brand/`)
`BRAND_STRATEGY.md`, `LOGO_USAGE.md`, `COLOR_SYSTEM.md`, `TYPOGRAPHY.md`, `MOTION_SYSTEM.md`,
`VISUAL_LANGUAGE.md`, `APPLICATIONS.md`, `WEBSITE_DIRECTION.md`, `PRODUCT_UI_DIRECTION.md`.

### Fonte de marca preservada (`docs/brand/source/`)
Arquivos originais do Claude Design copiados **verbatim** como fonte de verdade:
`assets/brand.css`, `assets/book.css`, `assets/marks.js`, `assets/brand-book.js`,
`brand-book.html`, `produto/{Landing,Dashboard,App}.html` + CSS, e `SPEC-LLM-original.md`.

### Relatórios (`docs/reports/`)
`SLICE-0A-RESULT.md` (atualizado: pendência Prisma fechada) e este `SLICE-0B-BRAND-HANDOFF.md`.

### Pendência ADR-002 fechada (pré-0B)
Prisma Client (v7 + `@prisma/adapter-pg`) wired atrás de `withTenantPrisma()`; RLS em SQL
intacta; `tests/integration/prisma-rls.test.ts` prova default-deny, negação cross-tenant e
paridade com o caminho cru. Suíte: **43 testes passando**.

## 2. Decisões consolidadas

- **Marca = "Circulação" / "A Corrente"** é a fonte oficial. Nenhuma marca nova foi inventada;
  o trabalho do Claude Design não foi substituído. Sem monograma MM, sem azul SaaS, sem
  clichês (pessoas, balões, lâmpadas, aperto de mãos).
- **Cor:** Tinta `#14100D`, Brasa `#FF4A1C` (accent, com parcimônia), Jade `#1B5C4C`, Argila
  `#FBF7F0`/`#F4ECE0`. Tokens literais documentados.
- **Tipografia:** Instrument Serif (display) / Hanken Grotesk (UI) / Space Mono (dados).
- **Símbolo via `mm.*`**: `corrente` (logo/loader), `multiplicacao` (textura), `catalisador`
  (motion), `rede` (mapas de relação), `abertura` (exploração).
- **Motion:** corrente — entra, ganha energia, segue; curva `--ease-flow`; reveal só por
  `transform`, conteúdo visível por padrão; respeitar reduced-motion.
- **Copy base registrado:** slogan "Passe adiante."; finalistas; manifesto canônico; voz
  (faz/nunca faz); headline/subheadline; CTAs; mensagens de erro (genéricas, anti-enumeração);
  estados vazios; e-mails transacionais.
- **White-label tokenizado:** acento + logo por tenant (ink/paper limitado); tipografia e
  estrutura **não** são white-label na V1. Mapa de tokens pretendido em `DESIGN_SYSTEM.md` §4.
- **Reconciliações conscientes protótipo × V1:**
  - CTA institucional = **"Solicitar demonstração"** (V1 sem auto-provisionamento público),
    não "Começar agora".
  - "Entrar" institucional não abre login global; leva ao host do tenant.
  - "Matching com contexto" do protótipo = **busca + filtros manuais** na V1 (sem IA).
  - Slug `demo` é **reservado** (blocklist); o tenant de demonstração deve usar slug
    não-reservado (ex.: `demonstracao`).

## 3. Mapa de tokens pretendido (resumo)

Tokens de marca (`brand.css`) → camada única de design system no Slice 0. White-label
sobrepõe **`--accent`** (com validação de contraste AA) e **logo**; override limitado de
`--ink`/`--paper`; tipografia, espaço, raio, sombra e motion permanecem fixos. Detalhe em
[../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).

## 4. Relatório de lacunas do brandkit (assets faltantes)

A marca foi entregue como **código** (tokens CSS + SVG gerado por JS via `window.mm`), o que
é ótimo para consistência, mas **não inclui assets estáticos exportados**. Para produção,
faltam — a serem **gerados a partir de `mm.*`** (não recriados à mão):

| Lacuna | Necessário para | Origem |
|---|---|---|
| **Favicon** (`.ico`/`.svg` + PNGs 16/32/48) | Navegador/abas | exportar de `mm.corrente` |
| **App icons** (PNG 180/192/512, maskable) | PWA/mobile, atalhos | `mm.corrente` |
| **OG/social image** (1200×630) | Compartilhamento (LinkedIn, etc.) | composição com lockup + campo de corrente |
| **Lockup exportado** (SVG/PNG, claro+escuro) | E-mails, slides, parceiros | `mm.lockup` |
| **Fontes self-hosted** (woff2 de Instrument Serif / Hanken Grotesk / Space Mono) | Performance/privacidade (hoje via Google Fonts `@import`) | licenças + arquivos woff2 |
| **Arquivos de marca para terceiros** (zip de logo/cores) | Vendas/parcerias/imprensa | export consolidado |
| **Especificação de e-mail** (HTML transacional na marca) | Notificações | construir no slice de notificações |
| **Asset de demo tenant** (logo placeholder p/ white-label) | Demonstração | derivar de `mm.*` |

Nada disso bloqueia o Slice 0; são itens de produção a agendar. Observação: o brandkit não
trouxe versão exportada — é generativo. Isso é uma **escolha de design**, não um defeito; a
ação é gerar os exports a partir das funções `mm.*` mantendo-as como fonte única.

## 5. Definition of Done — checagem

- [x] Todos os documentos listados criados (`docs/*.md` + `docs/brand/*.md`).
- [x] ADR v1.1 referenciado como fonte de verdade (`docs/ADR.md`).
- [x] Brandkit incorporado (`BRANDKIT.md` + `docs/brand/` + fonte preservada).
- [x] Slogan e copy base registrados (`COPY_GUIDE.md`).
- [x] Cores e tipografia documentadas (`COLOR_SYSTEM.md`, `TYPOGRAPHY.md`, `DESIGN_SYSTEM.md`).
- [x] Aplicações de marca documentadas (`APPLICATIONS.md`, direções de site/produto).
- [x] Regras de uso do logo documentadas (`LOGO_USAGE.md`).
- [x] Design system pronto para implementação no Slice 0 (base + mapa de tokens + checklist).
- [x] Relatório `SLICE-0B-BRAND-HANDOFF.md` criado.
- [x] Sem feature de produto implementada.
- [x] Sem tela final implementada.
- [x] Sem componente final implementado.

## 6. Prontidão para o Slice 0 original

**Pronto para iniciar o Slice 0.** A fundação técnica (0A) está provada com CI verde e a
pendência de Prisma fechada; a fundação documental e de marca (0B) está completa, com mapa de
tokens, direção de site/produto e lista de lacunas. O Slice 0 pode começar por: (a)
materializar os tokens como camada única de design system com override white-label
(acento+logo) e validação de contraste; (b) observabilidade com `tenantId` em todo log; (c)
esqueleto de deploy/rollback na Vercel — tudo ainda sem features de mentoria.

---

## 7. Patch de completude do handoff

Após a entrega inicial do Slice 0B, foram fechadas duas lacunas objetivas do escopo aprovado:

- ✅ **`docs/brand/ASSET_INVENTORY.md` criado** — inventário de **todos** os arquivos
  recebidos de design (nome, tipo, origem, conteúdo, uso permitido, restrições, classificação)
  usando as seis classificações definidas. Inclui registro preventivo de referências LATAM+
  ainda não entregues e lista de `missing asset` de produção.
- ✅ **`docs/brand/LATAM_PLUS_REFERENCE_ANALYSIS.md` criado** — análise funcional do
  MentorMatch atual no LATAM+ cobrindo: seletor Mentor/Mentee, alternância de papel, grid de
  mentores, card de mentor, filtros, perfil do mentor, solicitação de mentoria,
  processo/status, biblioteca, modais, estados vazios, estados de aceite/recusa e fluxo
  pós-match — com separação clara **aprender com LATAM+** × **não copiar LATAM+**, e os
  requisitos que viram escopo do SaaS.

### Resumo das restrições de uso dos assets LATAM+

- Nenhum **asset de marca/identidade LATAM** foi recebido como arquivo. As menções a "LATAM+"
  na fonte são **textuais/de contexto** (produto-mãe e região), **não** material de marca.
- Qualquer arquivo com **marca LATAM, identidade LATAM, screenshots do LATAM+, fotos reais ou
  elementos proprietários LATAM** é classificado como **reference only, not for production**.
- Screenshots/exports do LATAM+ (se anexados depois) ficam como **legacy LATAM+ reference** /
  **reference only, not for production** — servem só para aprender fluxo/UX; **nenhum pixel
  vai a produção**. Componentes/CSS proprietários LATAM devem ser reescritos do zero com
  tokens MentorMatch.
- Avatares usam **iniciais**, não fotos.

### Confirmações

- ✅ **O brandkit do Claude Design continua sendo a fonte principal da marca MentorMatch**
  (`brand source of truth`). Nada foi reinventado ou substituído.
- ✅ **Nenhuma identidade LATAM será usada em produção.**

## 8. Evidência final (Slice 0A + 0B, após Prisma behind withTenant)

Comandos executados nesta etapa, contra **PostgreSQL 16 real** (instância local do ambiente):

| Comando | Resultado |
|---|---|
| `npx prisma generate` | OK — Prisma Client (v7) gerado |
| `npm run typecheck` (`tsc --noEmit`) | OK — sem erros |
| `npm run lint` (eslint) | OK — sem erros |
| `npm run test:unit` | **17 passed** (resolveTenant 11, auth-units 6) |
| `npm run test:integration` | **26 passed** (auth 11, rls-isolation 9, prisma-rls 6) |
| **Total** | **43 testes passando** |

Evidência de RLS reproduzível por `scripts/evidence.sql` (roles não-superuser/sem-bypassrls;
RLS habilitado **e** forçado; default-deny sem contexto) — documentada em
[SLICE-0A-RESULT.md](./SLICE-0A-RESULT.md) §5.

### Git

- HEAD antes deste patch: `06bcd43` (Slice 0B).
- Pendência Prisma fechada em: `dda9816`.
- Slice 0A inicial: `ffa141a`.
- Commit deste patch (0B completude): é o **HEAD atual** da branch
  `slice-0a-technical-risk-harness` (imediatamente posterior a `06bcd43`). O hash é impresso
  por `git rev-parse HEAD` ao final do patch e reportado na mensagem de conclusão.

### Limitações ambientais e risco

- **Postgres não é serviço persistente neste ambiente:** a instância é reiniciada a cada
  sessão (`pg_ctl start`) e o banco `mentormatch` é recriado/migrado pelo runner. **Risco:
  baixo** — os testes sobem o schema via migrations versionadas e provam RLS do zero; o mesmo
  ocorre no CI (serviço `postgres:16`). Nenhum teste depende de estado pré-existente.
- **E2E de navegador não roda aqui** (sem UI por design no 0A/0B). **Risco: baixo para esta
  fase** — coberto por testes de integração; o E2E (incl. gate cross-tenant) entra no Slice 0+.
- Todos os comandos do gate **rodaram com sucesso**; não houve comando bloqueado por
  dependência ambiental nesta etapa.
