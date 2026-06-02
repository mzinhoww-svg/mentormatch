# TENANCY — Multi-tenancy & Isolamento

> Consolidado do ADR v1.1 §1–3 e ADR-002 (ver [ADR.md](./ADR.md),
> [adr/ADR-002-slice-0a-stack.md](./adr/ADR-002-slice-0a-stack.md)). As
> implementações de referência estão em `brand/source/slice-0a-planning/` e serão
> wired numa fatia de dados dedicada (ver `prisma/README.md`).

## 1. Identidade isolada por tenant

- Modelo principal: **`TenantUser`**. **Não** há `User` global, **não** há
  `Membership`.
- Mesmo e-mail em dois tenants ⇒ **duas contas independentes**, credenciais próprias.
- Constraint obrigatória: **`unique(tenantId, normalizedEmail)`**
  (`normalizedEmail` = lowercase + trim).
- **Não existe login global sem tenant.**
- Separação de plataforma: `platform_admin` é uma identidade **separada** de
  `tenant_user`. Um host de tenant nunca resolve para o console admin e vice-versa.

## 2. Tenant resolution — por host

O domínio base de produção é **configurável** por `APP_BASE_DOMAIN` (env), **não é
hardcoded**. Abaixo, `D` = `APP_BASE_DOMAIN` (fallback seguro: `mentormatch.app`).

| Contexto | Host | Comportamento |
|---|---|---|
| Produção | `{tenant}.D` | tenant resolvido **antes** do auth |
| Institucional | `D` / `www.D` | landing pública; **sem** login de tenant |
| Plataforma | `admin.D` | console Super Admin (identidade separada) |
| Custom domain (futuro) | `mentoria.empresa.com` | via `tenant_domain` |
| Dev local | `{tenant}.localhost:3000` | **sempre** disponível, independe de `D` |

Ex.: com `APP_BASE_DOMAIN=mentorxmatch.xyz`, `acme.mentorxmatch.xyz` → TENANT `acme`;
`mentorxmatch.xyz` → INSTITUTIONAL; `admin.mentorxmatch.xyz` → PLATFORM_ADMIN.

- `APP_BASE_DOMAIN` é lido **em tempo de chamada** (`getBaseDomain()`), então mudar a
  env no deploy passa a valer **sem rebuild**. `localhost` nunca é afetado.
- `TENANT_DOMAIN_MODE` (`subdomain` | `path` | `custom`) é lido por
  `getTenantDomainMode()`; hoje **só `subdomain` está implementado** (os demais são
  reservados para evolução e se comportam como `subdomain`).
- **Sem** `/login` global; **sem** `/:slug/login`. Auth ocorre dentro do host
  resolvido **e ativo**.
- Resolução é uma **função pura host-based** + lookup de slug, com **blocklist** de
  subdomínios reservados (`admin`, `api`, `www`, …).
- `hostPermitsTenantLogin()` retorna `true` **somente** para um host de tenant
  confirmado e provisionado.

## 3. Isolamento — RLS + guard de aplicação (default-deny)

- `tenantId` **obrigatório** em todas as entidades de negócio.
- **RLS no banco** (`ENABLE` + `FORCE ROW LEVEL SECURITY`), policies em **SQL
  versionado** (não no schema Prisma).
- Helper obrigatório **`withTenant`/`withTenantPrisma`** injeta o contexto
  **transacionalmente** via `set_config('app.tenant_id', …, is_local=true)`
  (semântica `SET LOCAL`) — o contexto é escopo de transação e **não vaza** para a
  próxima query do pool.
- Query **sem `tenantId`/contexto falha** (default-deny). `app_current_tenant()` é
  NULL-safe.
- Role de aplicação **`mm_app`** é `NOSUPERUSER NOBYPASSRLS`; migrations rodam como
  `mm_owner` (também não-superuser).
- **Testes cross-tenant desde o primeiro slice de dados** (isolamento, default-deny,
  não-vazamento de contexto, mesmo e-mail em 2 tenants).

## 4. Visibilidade

- Perfis visíveis **dentro do tenant** e **dentro dos programas aplicáveis**; nunca
  cross-tenant.
- Mentor pode **pausar disponibilidade**.
- Admin vê métricas/operacional; **não** vê conteúdo privado das relações.

## 5. Integração com observabilidade

O `tenantId` resolvido deve entrar no **request context**
(`src/observability/request-context.ts`) para que todo log/audit já o carregue. O
middleware que popula o contexto por request entra com a camada web/dados (ver
[ARCHITECTURE.md](./ARCHITECTURE.md) §"ponte futura").

## 6. Vercel (resumo)

Wildcard `*.mentormatch.app` em prod/staging; **preview sem wildcard** por padrão →
workaround por staging wildcard ou header assinado de E2E; **nunca** fallback público
por path. Detalhes em [DEPLOYMENT.md](./DEPLOYMENT.md).
