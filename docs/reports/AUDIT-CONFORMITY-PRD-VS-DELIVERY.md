# Auditoria de Conformidade — Pedido Original vs Entrega Real

**Date:** 2026-06-02 · **Método:** evidência observável (migrations, rotas, páginas,
serviços, testes executados, inspeção de código). Não conta documentação nem testes
como funcionalidade; não conta código não integrado como entregue.

**Inventário base:** 19 tabelas · 51 rotas API · 11 páginas UI · 16 módulos · 30
arquivos de teste unit + 13 integration (156 unit + 99 integration **passando**).

---

## PARTE 1 — MATRIZ DE CONFORMIDADE (requisitos do PRD/ADR)

| Requisito | Status | Evidência (arquivo / rota / tabela / teste) |
|---|---|---|
| Multi-tenant `TenantUser`, sem User global | **ENTREGUE** | `tenant`, `tenant_user`; `auth/authService`; resolveTenant; auth.integration |
| Resolução por host (institucional/admin/reserved/tenant) | **ENTREGUE** | `tenancy/resolveTenant.ts`; 18 testes resolveTenant |
| Base domain configurável (`APP_BASE_DOMAIN`) | **ENTREGUE** | `getBaseDomain()`; resolveTenant.config.test |
| Custom domain por tenant (`tenant_domain`) | **NÃO ENTREGUE** | tabela `tenant_domain` existe mas **não é lida em nenhum código** (órfã) |
| RLS default-deny | **ENTREGUE** | 19 tabelas FORCE RLS; default-deny provado em toda integração |
| Auth: login/logout/signup | **ENTREGUE** | rotas `auth/*`; `authService`; auth.integration |
| Consentimento obrigatório | **ENTREGUE** | `consent_record`; signup atômico; profile.activate exige consent |
| Reset de senha | **PARCIAL** | backend `requestPasswordReset/resetPassword` + rotas; **sem UI** |
| Rate limit | **ENTREGUE** | `auth/rateLimit`; auth.integration (bloqueio após N falhas) |
| Sessão assinada com tenantId | **ENTREGUE** | `auth/session.ts`; tenant-mismatch rejeitado |
| Perfil + skills + goals + disponibilidade + pausa | **ENTREGUE** | `profile/*`; rotas `profile/*`; profile.integration |
| Dual role (mentor & mentee) | **ENTREGUE** | `profile/roles.ts` (isMentor/isMentee derivados) |
| Diretório de mentores + filtros + paginação + ordenação | **ENTREGUE** | `search/mentorSearch.ts` (ORDER BY, LIMIT/OFFSET); search.integration |
| Mentoria: request/accept/reject/cancel | **ENTREGUE** | `mentorship/*`; rotas; mentorship.integration |
| Waitlist por capacidade | **ENTREGUE** | `mentorship/rules.ts` `decideInitialStatus`→waitlisted |
| Capacidade do mentor | **ENTREGUE** | accept enforce `mentor_at_capacity`; setMentorCapacity |
| ContactInfo oculto até match | **ENTREGUE** | `mentorship/contact` (gate por mentoria ativa); nunca em search/feedback/email |
| Sessões: criar/confirmar/concluir/cancelar | **ENTREGUE** | `session/*`; rotas; session.integration (9) |
| Notificações: unread/read/prefs/eventos | **ENTREGUE** | `notifications/*`; event-driven; notifications.integration |
| Feedback: rating/comentário/agregação | **ENTREGUE** | `feedback/*` (getAverageRating); feedback.integration |
| Admin: overview/usuários/mentores/mentorias/sessões | **ENTREGUE (backend)** | `admin/adminService` (SQL real); rotas admin/* |
| Programas: default/participantes/regras | **ENTREGUE (backend)** | `program/*`; program.integration |
| Tenant settings + branding (logo/cores/locale) | **PARCIAL** | settings completo; **logo só URL (sem upload)**; cores aplicadas |
| Email transacional | **PARCIAL** | `email/*` (queue/templates/estados/retry); **transporte real ausente** (console/noop) + **sem scheduler** |
| Provisionamento / seed | **ENTREGUE (local)** | `provisioning/*`; `npm run provision`; **nunca rodado em produção** |
| UI navegável (shell + páginas core) | **ENTREGUE** | `app/*` + `ui/*`; 8 testes DOM |
| UI admin completa | **PARCIAL** | `AdminView` cobre só overview + usuários |
| UI programas / feedback completo / email | **NÃO ENTREGUE** | sem páginas dedicadas (APIs existem) |
| Landing institucional | **NÃO ENTREGUE** | `/` é placeholder "baseline is running" (fora de escopo dos slices) |
| Billing / IA / chat / biblioteca / mobile | **NÃO ENTREGUE** | fora de escopo (excluídos explicitamente) |

---

## PARTE 2 — VALIDAÇÃO POR CAMADA

| Camada | Itens | Status |
|---|---|---|
| **Multi-Tenant** | tenant ✓, tenant settings ✓, branding ✓ (logo só URL), RLS ✓, isolamento ✓; **tenant_domain ✗ (órfã)** | **PARCIAL** (custom domain não existe) |
| **Auth** | login ✓, logout ✓, consent ✓, rate limit ✓, sessão ✓; **reset sem UI** | **PARCIAL** |
| **Perfil** | profile ✓, skills ✓, goals ✓, disponibilidade ✓, dual role ✓ | **ENTREGUE** |
| **Busca** | diretório ✓, filtros ✓, paginação ✓, ordenação ✓ | **ENTREGUE** |
| **Mentoria** | request ✓, accept ✓, reject ✓, waitlist ✓, capacidade ✓ | **ENTREGUE** |
| **Sessões** | criar ✓, confirmar ✓, concluir ✓, cancelar ✓ | **ENTREGUE** |
| **Notificações** | unread ✓, read ✓, preferências ✓, eventos ✓ | **ENTREGUE** |
| **Feedback** | ratings ✓, comentários ✓, agregação ✓ | **ENTREGUE** |
| **Admin (backend)** | overview ✓, métricas ✓, usuários ✓, mentorias ✓, sessões ✓ | **ENTREGUE** |
| **Admin (UI)** | só overview + usuários (mentorias/sessões/programas/feedback/email **sem tela**) | **PARCIAL** |
| **Programas** | default ✓, participantes ✓, regras ✓ (backend); **sem UI** | **PARCIAL** |
| **Branding** | settings ✓, cores ✓, white-label aplicado ✓; **logo sem upload** | **PARCIAL** |
| **UI** | login ✓, shell ✓, profile ✓, mentors ✓, requests ✓, mentorships ✓, sessions ✓, notifications ✓, admin (parcial), settings ✓ | **PARCIAL** |
| **Email** | modelo/estados/retry/templates ✓; **transporte real ✗, scheduler ✗** | **PARCIAL** |

---

## PARTE 3 — PRODUÇÃO (somente o que é real)

| Pergunta | Resposta | Evidência |
|---|---|---|
| Funciona em **localhost**? | **SIM** | `npm run provision -- --slug acmedemo` criou 8 usuários/3 mentores/1 mentoria/1 sessão; login do admin verificado |
| Funciona em **produção**? | **NÃO** | tenant `acme` não existe no banco de prod; nunca provisionado; nunca validado em navegador end-to-end (egress bloqueado daqui) |
| Depende de **seed**? | **SIM** | sem seed, UI mostra estados vazios (default-deny → 0 linhas) |
| Depende de **tenant provisionado**? | **SIM** | login chama `resolveActiveTenant` → `findTenantBySlug` no banco |
| Depende de **configuração manual**? | **SIM** | `APP_BASE_DOMAIN` + `DATABASE_URL/DIRECT_URL` na Vercel, wildcard DNS, rodar `provision` contra prod |

Email em produção: mesmo provisionado, **nenhum email sai** (provider `console`/`noop`,
sem cron). Transporte real é pré-requisito para os fluxos transacionais por email.

---

## PARTE 4 — GAP ANALYSIS

### Falta CRÍTICA (impede uso por cliente)
1. **Validação real em produção** — nada foi exercido em navegador num host de tenant de produção; tenant `acme` inexistente no banco de prod.
2. **Onboarding/provisionamento self-serve** — hoje exige `npm run provision` manual com credenciais de prod (dev no loop).
3. **Transporte de email real + scheduler** — emails nunca são entregues (console/noop, trigger manual).
4. **Reset de senha sem UI** — usuário travado não recupera acesso pela interface.

### Falta IMPORTANTE (reduz valor)
5. **UI de admin incompleta** — só overview + usuários; mentorias/sessões/programas/feedback/email não têm tela.
6. **UI de programas** — gestão só via API.
7. **Upload de logo** — branding aceita só URL.
8. **E2E em host de tenant** — cobertura é integration (servidor) + DOM (mockado), sem click-through real.

### Falta COSMÉTICA (futuro)
9. **Landing institucional** — `/` é placeholder.
10. **tenant_domain (custom domain)** — tabela órfã; decidir implementar ou remover.
11. **Consolidar 4 projetos Vercel** em um com wildcard.
12. Self-host de fontes; dead-letter UI para emails falhos.

---

## PARTE 5 — PRONTIDÃO (0–100)

| Dimensão | Nota | Base |
|---|---|---|
| **Backend** | **85** | domínio completo, RLS, 255 testes verdes; pontos: email sem transporte, tenant_domain órfã |
| **Frontend** | **62** | shell + páginas core reais; admin parcial, sem reset UI, sem programas/feedback/email UI |
| **Multi-Tenant** | **82** | RLS+isolamento sólidos, domínio configurável; custom domain ausente |
| **Admin** | **60** | backend forte; UI só overview+usuários |
| **UX** | **48** | funcional e com marca; sem onboarding, sem reset UI, placeholder landing |
| **Produção** | **25** | deployável; não provisionado, não validado em navegador, email não entrega |
| **Comercialização** | **18** | sem billing, sem onboarding self-serve, sem email real, não validado com cliente |

---

## PARTE 6 — VEREDITO

### **PILOTO INTERNO**

**Justificativa:** o núcleo (multi-tenant, auth, perfil, busca, mentoria, sessões,
notificações, feedback, admin backend, programas) está **real, isolado por tenant e
testado** — adequado a um piloto **controlado e operado pela equipe**. Porém **não**
está pronto para cliente sem ajuda do dev porque, com evidência: (a) **nunca foi
validado em produção** num host de tenant; (b) **emails não são entregues** (sem
transporte/scheduler); (c) **onboarding é manual** (provisionamento via CLI com
credenciais de prod); (d) **reset de senha não tem UI**; (e) **UI de admin é parcial**.
São bloqueios concretos para "PILOTO COM CLIENTE", não para uso interno assistido.

---

## PARTE 7 — PRÓXIMOS PASSOS (roadmap por risco → impacto → esforço)

| # | Ação | Por quê (risco/impacto) | Esforço |
|---|---|---|---|
| 1 | **Provisionar + validar em produção** (APP_BASE_DOMAIN + wildcard DNS + env Supabase; `provision` no banco de prod; walk-through no navegador de todos os fluxos) | Maior risco: nada validado em prod | Baixo–Médio |
| 2 | **Transporte de email real + Vercel Cron** chamando `/api/admin/email/process` | Email transacional hoje não entrega | Médio |
| 3 | **UI de reset de senha** (backend pronto) | Usuário travado não recupera acesso | Baixo |
| 4 | **Completar UI de admin** (mentorias/sessões/programas/feedback/email) | Operação do tenant depende disso | Médio |
| 5 | **Onboarding self-serve** (criação de tenant + convite/primeiro admin por email) | Remove o dev do loop → habilita cliente | Alto |
| 6 | **Decidir tenant_domain**: implementar custom domain ou remover a tabela órfã | Coerência/segurança | Médio |
| 7 | **E2E (Playwright)** num host de tenant + consolidar Vercel + landing institucional | Confiança de release / imagem | Médio |

**Conclusão:** pronto para **piloto interno assistido**; para **piloto com cliente**,
executar itens 1–4 (e, para comercialização, 5).
