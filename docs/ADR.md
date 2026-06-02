# ADR — Architecture Decision Records (Fonte de Verdade)

Este documento registra as decisões arquiteturais **fechadas** do MentorMatch SaaS v2.
A **ADR v1.1** é a fonte de verdade do produto. A **ADR-002** fecha decisões de stack do
Slice 0A. Decisões novas exigem um ADR complementar — nada de mudança silenciosa.

---

## ADR v1.1 — Decisões de produto e arquitetura (APROVADA)

### 1. Identidade — isolada por tenant
- Modelo principal: **`TenantUser`**. **Não** há `User` global, **não** há `Membership`.
- Mesmo e-mail em dois tenants ⇒ duas contas independentes, credenciais próprias.
- Constraint obrigatória: **`unique(tenantId, normalizedEmail)`**; `normalizedEmail` =
  lowercase + trim.
- **Não existe login global sem tenant.**

### 2. Tenant resolution — por host
| Contexto | Host | Comportamento |
|---|---|---|
| Produção | `{tenant}.mentormatch.app` | tenant resolvido antes do auth |
| Institucional | `mentormatch.app` | landing pública; **sem** login de tenant |
| Custom domain (futuro) | `mentoria.empresa.com` | via `tenant_domain` |
| Dev local | `{tenant}.localhost:3000` | mesma resolução (alt.: `*.lvh.me`) |

**Sem** `/login` global; **sem** `/:slug/login`. Auth ocorre dentro do host resolvido.

### 3. Isolamento — RLS + guard de aplicação
- `tenantId` obrigatório em todas as entidades de negócio.
- **RLS no banco** (ENABLE + FORCE) com policies em SQL versionado.
- Helper obrigatório `withTenant`/`withTenantPrisma` injeta o contexto transacionalmente.
- Query sem `tenantId`/contexto **falha** (default-deny).
- Role de aplicação (`mm_app`) **não** é superuser e **não** tem BYPASSRLS.
- Testes cross-tenant desde o primeiro slice.

### 4. LGPD
- Consentimento **obrigatório** no cadastro; termos **versionados**.
- Exclusão **por tenant**; soft delete 30 dias → purge.
- Dados relacionais **anonimizados** quando necessário.
- **ContactInfo (WhatsApp, e-mail) só após match aceito.** Auth e-mail é credencial, não
  contato público.

### 5. Visibilidade de perfis
- Visíveis **dentro do tenant** e **dentro dos programas aplicáveis**; nunca cross-tenant.
- Usuário pode **pausar disponibilidade como mentor**.
- Admin vê **métricas e dados operacionais**, **não** conteúdo privado/sensível de relações.

### 6. Programas
- `Program` é entidade de domínio; schema suporta N.
- **V1 começa com um Program default por tenant.** Sem CRUD avançado de programas na V1.

### 7. Matching
- **Sem IA / sem algoritmo automático na V1.**
- Matching = busca manual + filtros (área, skill, cargo, palavra-chave).
- Fluxo: mentorado busca → solicita → mentor aceita/recusa → mentoria ativa.

### 8. Billing
- Modelo futuro: **per-seat** por colaborador ativo/mês; tiers **Starter / Growth /
  Enterprise**.
- **V1 sem cobrança online.** Apenas estrutura `Plan`/`Subscription`/`tenantStatus` para
  controle manual do Super Admin. Pagamento fora da plataforma no início.

### 9. Trial e Demo
- **Sem auto-provisionamento público na V1.**
- Landing institucional com CTA **"Solicitar Demonstração"**.
- Demo tenant controlado para vendas; criação de tenant pelo Super Admin.

### 10. Design System
- **Um único design system desde o início.** Sem tokens paralelos, tema legado ou
  componentes duplicados.
- **White-label tokenizado desde a primeira tela.** Base documental em
  [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md); marca em [BRANDKIT.md](./BRANDKIT.md).

### Decisões de produto fechadas (resumo)
Dual role: **sim**. Aprovação de mentoria (V1): **mentor aceita/recusa**. Limite de
mentorados: **capacidade do mentor → waitlist**. Waitlist: **sim**. Notificações: **in-app +
e-mail**. Administração: **Tenant Admin/Program Manager** (tenant) e **Super Admin**
(plataforma, sem acesso a conteúdo de mentoria por padrão).

### Production readiness (princípios)
Observabilidade com `tenantId` em todo log; auditoria append-only; pirâmide de testes com
invariantes de domínio; E2E incluindo **gate cross-tenant**; SAST/secret scanning;
migrations expand/contract reversíveis; rollback rápido e backups point-in-time.

---

## ADR-002 — Stack e runtime do Slice 0A (ACEITA)

Resumo (documento completo em [adr/ADR-002-slice-0a-stack.md](./adr/ADR-002-slice-0a-stack.md)):

- **Banco:** PostgreSQL 16 — única opção com RLS real + GUC de sessão para contexto
  transacional. Contexto via `SET LOCAL app.tenant_id`.
- **Dois roles, nenhum superuser:** `mm_owner` (migrations) e `mm_app` (aplicação,
  `NOSUPERUSER NOBYPASSRLS`).
- **ORM:** Prisma 7 + `@prisma/adapter-pg`. **RLS vive em migrations SQL, não no schema
  Prisma.** Prisma roda **atrás** de `withTenantPrisma()` (pendência fechada; provado em
  `tests/integration/prisma-rls.test.ts`).
- **Runtime/testes:** Node 22, TypeScript estrito, ESM, Vitest contra Postgres real.
- **Resolução de tenant:** função pura host-based + lookup de slug; blocklist de subdomínios
  reservados.
- **Dev subdomínios:** `*.localhost`; alternativa documentada `*.lvh.me`.
- **Vercel:** wildcard em prod/staging; preview sem wildcard por padrão → workaround por
  staging wildcard ou header assinado de E2E; **nunca** fallback público por path.
- **Hashing/rate limit:** scrypt nativo; limiter fail-closed atrás de interface.

---

## Como evoluir os ADRs

1. Toda nova decisão arquitetural → novo arquivo `docs/adr/ADR-00N-*.md`.
2. Referencie o ADR afetado e marque o status (Proposto / Aceito / Substituído).
3. Atualize este índice (`ADR.md`) e, se relevante, [ARCHITECTURE.md](./ARCHITECTURE.md).
4. Decisão ambígua → **não** assuma: registre as alternativas e recomende uma.
