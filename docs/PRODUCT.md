# PRODUCT — MentorMatch

> Visão de produto consolidada a partir do ADR v1.1 (fonte de verdade — ver
> [ADR.md](./ADR.md)) e da especificação de marca. Documento vivo.

## 1. O que é

**MentorMatch** é um **SaaS multi-tenant de mentoria corporativa**, focado em
**transferência de conhecimento interno** — conectar quem sabe a quem precisa saber,
dentro da mesma empresa, com método, em escala e com impacto medido.

### O que NÃO é (fronteiras explícitas)
- **Não é LMS** (não é catálogo de cursos/treinamento formal).
- **Não é marketplace** (não vende mentores avulsos nem cobra por sessão pública).
- **Não é rede social.**
- **Não é coaching externo** (mentor e mentorado pertencem ao mesmo tenant).

## 2. Problema

O conhecimento crítico mora na cabeça de poucos. Quando essas pessoas saem — ou só
ficam ocupadas — esse conhecimento evapora. Treinamento formal não transfere
**contexto, julgamento e repertório**. O inimigo é a **estagnação**: conhecimento
parado, silos, gente travada esperando alguém ter tempo.

## 3. Comprador e usuários

- **Comprador:** Líderes de Pessoas & Cultura, L&D, founders.
- **Usuários (papéis):**
  - **Mentorado** — busca e solicita mentoria.
  - **Mentor** — aceita/recusa, conduz mentorias (pode **pausar disponibilidade**).
  - **Dual role:** uma pessoa pode ser mentor e mentorado.
  - **Tenant Admin / Program Manager** — administra o tenant; vê **métricas e dados
    operacionais**, não conteúdo privado das relações.
  - **Super Admin (plataforma)** — administra tenants; **sem** acesso a conteúdo de
    mentoria por padrão.

## 4. Proposta de valor

Transformar a experiência acumulada da empresa num **sistema que circula**: conexões
certas, no momento certo, com acompanhamento e resultado visível ao negócio. A marca
afirma **circulação** ("A Corrente"), não transação. Ver [BRANDKIT.md](./BRANDKIT.md).

## 5. Escopo da V1 (decisões fechadas — ADR v1.1)

| Tema | Decisão V1 |
|---|---|
| **Programas** | Um `Program` **default** por tenant; sem CRUD avançado de programas. |
| **Matching** | **Manual**: busca + filtros (área, skill, cargo, palavra-chave). **Sem IA/algoritmo.** |
| **Fluxo** | mentorado busca → solicita → mentor **aceita/recusa** → mentoria ativa. |
| **Capacidade** | Limite por capacidade do mentor → **waitlist**. |
| **Notificações** | In-app + e-mail. |
| **Billing** | **Manual** (fora da plataforma); estrutura `Plan`/`Subscription`/`tenantStatus` para controle do Super Admin. **Sem cobrança online na V1.** |
| **Aquisição** | **Sem auto-provisionamento público.** Landing institucional com CTA **"Solicitar Demonstração"**; tenant criado pelo Super Admin; demo tenant controlado. |
| **ContactInfo** | WhatsApp/e-mail de contato **ocultos até o match aceito**. Auth e-mail é credencial, não contato público. |
| **Consentimento** | **Obrigatório no cadastro**, termos versionados (LGPD). |
| **White-label** | **Tokenizado** desde a primeira tela (accent + logo do tenant; fallback = marca MentorMatch). |
| **Biblioteca** | Apoio leve (não vira LMS) — escopo a confirmar. |

## 6. Princípios de produto

- **Identidade isolada por tenant** (`TenantUser`, sem `User` global, sem login
  global). Ver [TENANCY.md](./TENANCY.md).
- **Privacidade por padrão**: ContactInfo após match; admin não vê conteúdo privado.
- **LGPD desde o cadastro**. Ver [LGPD.md](./LGPD.md).
- **Um único design system**, white-label tokenizado. Ver [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## 7. Fora de escopo da V1 (futuro)
Matching assistido por IA, billing online (per-seat: Starter/Growth/Enterprise),
custom domains (Enterprise), app mobile, CRUD avançado de programas.
