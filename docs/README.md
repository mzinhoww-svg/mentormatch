# MentorMatch — Documentação do Projeto

> **O conhecimento não para. Ele circula.**
> MentorMatch é a infraestrutura que põe o conhecimento de uma empresa em movimento —
> conectando quem viveu a quem vai viver, em escala, com método e impacto medido.

Esta pasta `docs/` é a **fonte de verdade** do projeto MentorMatch SaaS. Toda decisão
de produto, arquitetura, segurança, LGPD e marca está aqui. Quando código e documentação
divergirem, abra um ADR para reconciliar — não deixe a divergência silenciosa.

## Mapa da documentação

| Documento | Conteúdo |
|---|---|
| [PRODUCT.md](./PRODUCT.md) | Visão, problema, comprador, usuários, proposta de valor, escopo V1 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitetura, módulos, observabilidade, fronteiras, deploy |
| [ADR.md](./ADR.md) | ADR v1.1 (fonte de verdade) + ADR-002 (stack); ver `adr/` |
| [TENANCY.md](./TENANCY.md) | Resolução por subdomínio, ausência de login global, RLS, `withTenant` |
| [SECURITY.md](./SECURITY.md) | Redaction/observabilidade, auth tenant-scoped, RLS, riscos e controles |
| [LGPD.md](./LGPD.md) | Consentimento, termos versionados, ContactInfo, exclusão, auditoria |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Tokens, princípios, acessibilidade, white-label |
| [BRANDKIT.md](./BRANDKIT.md) | Marca "Circulação" / "A Corrente" (fonte: Claude Design) |
| [COPY_GUIDE.md](./COPY_GUIDE.md) | Slogan, manifesto, tom de voz, headlines, CTAs |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel, domínios, previews, produção, migrations, rollback |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Variáveis de ambiente, segredos, ambientes |
| [TESTING.md](./TESTING.md) | Unitários, integração, RLS, cross-tenant, gates de CI |
| [RUNBOOK.md](./RUNBOOK.md) | Operar: logs, erros, auditoria, incidentes |
| [brand/](./brand/) | Handoff de marca (estratégia, logo, cor, tipo, motion…) + `source/` |
| [reports/](./reports/) | Relatórios de slice |

## Stack

- **Runtime:** Node 22 (LTS), TypeScript estrito, ESM.
- **Web:** Next.js (App Router) — scaffold mínimo neutro (sem produto).
- **Observabilidade:** logger estruturado, request context (`requestId`/`tenantId`),
  audit logger, redaction — framework-agnostic (`src/observability/`).
- **Banco (planejado):** PostgreSQL 16 com Row Level Security real; Prisma atrás de
  `withTenantPrisma()`. **Ainda não wired no baseline** (ver `prisma/README.md`).
- **Testes:** Vitest.
- **Deploy alvo:** Vercel.

## Comandos principais

```bash
npm install
npm run dev         # next dev
npm run build       # next build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
```

Variáveis de ambiente em [ENVIRONMENT.md](./ENVIRONMENT.md); ver `.env.example`.

## Status atual (real, neste repositório)

> Este repositório começou **vazio**. O baseline foi reconstruído no **Slice 0R** a
> partir do planejamento aprovado no Claude.ai. O estado real é:

- ✅ **Baseline (Slice 0R):** documentação consolidada, scaffold Next.js mínimo
  (`/` placeholder + `/health`), `.env.example`, `.gitignore`, marca preservada em
  `brand/source/`. Build/typecheck/lint/test verdes.
- ✅ **Observabilidade (Slice 0.2):** logger, request context, errors, audit,
  redaction + 51 testes. Ver [reports/SLICE-0-2-OBSERVABILITY-FOUNDATION.md](./reports/SLICE-0-2-OBSERVABILITY-FOUNDATION.md).
- ✅ **Verificações 0C:** ambiente, gate técnico, Vercel readiness (relatórios 0C).
- ⏳ **Tenancy / RLS / Auth (Slice 0A):** **planejado e provado no Claude.ai, mas o
  código NÃO está wired neste repo.** Preservado como referência em
  `brand/source/slice-0a-planning/`. Reentra numa fatia de dados dedicada.
- ⏳ **Design system, features de mentoria, landing/dashboard finais:** não iniciados.

> **Nenhuma feature de produto, tela final ou componente final foi implementado.**
> Os relatórios `SLICE-0A`, `SLICE-0B` e `SLICE-0-1` em `reports/` são **registros de
> planejamento** (com banner) — o código que descrevem ainda não vive aqui.
