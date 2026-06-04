# MentorMatch — Manual do Time (passo a passo)

> Guia operacional para o time MentorMatch. Cobre os acessos, papéis e fluxos
> reais do produto **como ele está hoje em produção**. Onde algo ainda não
> existe, está marcado com **⚠️ Lacuna** (e o que fazer enquanto isso).
>
> Domínio de produção: **`mentorxmatch.xyz`**. Troque `mentorxmatch.xyz` pelo
> domínio configurado em `APP_BASE_DOMAIN` se mudar.

---

## 0. Conceitos (leia primeiro — 1 min)

- **Plataforma**: o MentorMatch como um todo (nós, o time). Quem opera é o
  **Admin de Plataforma** (super-admin).
- **Tenant**: uma **empresa-cliente** isolada (ex.: `acme`). Cada tenant tem seu
  subdomínio `acme.mentorxmatch.xyz`, seus usuários, sua marca. **Dados de um
  tenant nunca vazam para outro** (isolamento por RLS no banco).
- **Papéis**:
  - **Admin de Plataforma** — nós. Cria/lista/suspende tenants no Console.
  - **Admin do Tenant** — pessoa de RH/programa da empresa-cliente. Personaliza a
    marca, administra o programa.
  - **Membro do Tenant** — mentor ou mentorado (mentee) dentro de uma empresa.

---

## 1. Links principais

| O quê | URL |
|---|---|
| Site público (vitrine) | `https://mentorxmatch.xyz` |
| Como funciona / Planos / Contato / Demo | `…/como-funciona` · `…/planos` · `…/contato` · `…/demo` |
| **Console de Plataforma** (super-admin) | `https://admin.mentorxmatch.xyz/console` |
| Login de um tenant | `https://<slug>.mentorxmatch.xyz/login` |
| App de um tenant | `https://<slug>.mentorxmatch.xyz/app` |
| Definir senha (link enviado por e-mail) | `https://<slug>.mentorxmatch.xyz/set-password?token=…` |
| Repositório | `https://github.com/mzinhoww-svg/mentormatch` |
| Deploy (Vercel) | projeto **mentormatch** (`mzinhoww-gmailcoms-projects`) |
| Banco (Supabase) | projeto **supabase-purple-book** (`tqgttdqxdctykgyssvkp`) |

> `<slug>` = o identificador da empresa (ex.: `acme`). Tudo minúsculo, sem espaço.

---

## 2. Como acessar o app (visão geral)

O MentorMatch **não tem login global**. O acesso é **sempre por empresa**:

1. Abra `https://<slug>.mentorxmatch.xyz/login` (ex.: `acme.mentorxmatch.xyz/login`).
2. Entre com **e-mail + senha** da sua conta **naquela** empresa.
3. Você cai no app em `…/app`.

Se você abrir só `https://mentorxmatch.xyz/login` (raiz), aparece o **seletor de
empresa**: digite o identificador (slug) e ele te leva para o login do tenant.

---

## 3. Admin de Plataforma (super-admin) — nós

### 3.1 Entrar no Console
1. Abra **`https://admin.mentorxmatch.xyz/console`**.
2. Você é redirecionado para a tela de login do console.
3. Informe **e-mail + senha de Admin de Plataforma** → **Entrar**.
4. Você verá: **lista de tenants**, o formulário **Provisionar tenant**, e em cada
   tenant os botões **Suspender/Reativar**, além de **Trocar minha senha**.

> O acesso de plataforma é **separado** do acesso de tenant (cookie próprio).
> Uma sessão de tenant nunca entra no Console e vice-versa.

### 3.2 Trocar a própria senha
No Console, card **"Trocar minha senha"** → informe **senha atual** + **nova
senha** (mín. 8) → **Trocar senha**.

### 3.3 Criar um Admin de Plataforma novo
Hoje é via processo interno (CLI `npm run platform:admin` com o
`PLATFORM_ADMIN_BOOTSTRAP_TOKEN`, ou inserção controlada no banco). Peça ao
responsável técnico. **⚠️ Lacuna**: ainda não há tela no Console para cadastrar
outros admins de plataforma.

---

## 4. Criar um tenant (empresa-cliente)

### 4.1 Pelo Console (recomendado)
1. Console → card **"Provisionar tenant"**.
2. Preencha:
   - **Slug** — identificador (ex.: `acme`). Será o subdomínio `acme.mentorxmatch.xyz`. Minúsculo, sem espaços/acentos.
   - **Nome** — nome de exibição da empresa (ex.: `Acme Inc`).
   - **E-mail do admin** — a pessoa que vai administrar o tenant (ver §5).
3. **Provisionar**.
4. O sistema cria o tenant **vazio** (sem dados de demo) + um programa padrão, e
   **envia automaticamente** um e-mail de **definição de senha** ao admin
   informado. A tela mostra se o e-mail saiu e o **link de set-password** (caso
   precise enviar manualmente).

### 4.2 Pela linha de comando (alternativa técnica)
```
npm run provision:real -- --slug acme --name "Acme Inc" --admin-email admin@acme.com \
  [--admin-name "Ana Admin"] [--program-name "Programa de Mentoria"] \
  [--primary-color "#FF4A1C"] [--secondary-color "#1B5C4C"] [--locale pt-BR]
```
Requer as variáveis de ambiente de banco/e-mail. Imprime o link de set-password.

---

## 5. Indicar o Admin do Tenant

O Admin do Tenant é definido **no momento de criar o tenant**, pelo campo
**"E-mail do admin"** (Console) ou `--admin-email` (CLI).

- Essa pessoa recebe um **e-mail** com o link **"definir senha"**.
- Ao definir a senha, ela entra como **admin** daquele tenant (papel `admin`).

**⚠️ Lacuna**: trocar/adicionar outro admin de um tenant **depois** de criado
ainda não tem tela. Hoje seria via processo técnico. (Roadmap: gerenciar membros
pelo Console/painel.)

---

## 6. Admin do Tenant — primeiro acesso e o que faz

### 6.1 Primeiro acesso (definir senha)
1. Abra o **e-mail** "Acesso ao <Empresa>: defina sua senha".
2. Clique no link → cai em `https://<slug>.mentorxmatch.xyz/set-password?token=…`.
3. Digite **nova senha** + **confirmar** (mín. 8) → **Definir senha**.
4. Vá em **Entrar** → `…/login` → entre com seu e-mail + a senha que acabou de criar.

> O link de set-password vale **7 dias**. Se expirar, peça ao Admin de Plataforma
> para reenviar (ou re-provisionar — é idempotente).

### 6.2 O que o admin do tenant vê no app
Menu lateral: **Início, Perfil, Mentores, Solicitações, Mentorias, Sessões,
Notificações, Admin, Configurações**. (A aba **Admin** e **Configurações** de
marca só aparecem para admin/gestor de programa.)

---

## 7. Personalizar o tenant (marca + domínio)

Tudo em **`…/app/settings`** (aba **Configurações**), seção **"Branding do tenant
(admin)"**.

### 7.1 Logo, cores e nome do programa
1. **Logotipo** — clique em **enviar arquivo** (PNG, JPG, WEBP ou SVG, até 512 KB).
   Aparece o preview; some o "Sem logo". (Botão **Remover** apaga.)
2. **Nome de exibição** e **Nome do programa** — texto livre.
3. **Cor primária** e **Cor secundária** — em HEX (ex.: `#FF4A1C`). Se a cor for
   muito clara, aparece um aviso de **contraste baixo** (o texto sobre ela é
   ajustado automaticamente para continuar legível).
4. **Salvar branding**. A marca passa a valer no login e em todo o app do tenant.

### 7.2 Domínio personalizado (ex.: `mentoria.suaempresa.com`)
Na mesma página, seção **"Domínio personalizado (admin)"**:
1. Digite o domínio (`mentoria.suaempresa.com`) → **Adicionar**.
2. Aparece um **registro TXT** para você criar no DNS da empresa:
   - **Tipo:** TXT
   - **Nome:** `_mentormatch-verify.mentoria.suaempresa.com`
   - **Valor:** `mentormatch-domain-verification=<token>`
3. Crie esse TXT no seu provedor de DNS (Registro.br, Cloudflare, etc.).
4. A plataforma também registra o domínio na **Vercel**, que vai pedir um
   **A/CNAME** apontando para o edge da Vercel (para roteamento + **SSL
   automático**). Configure conforme a Vercel indicar.
5. Volte e clique **Verificar**. Quando o TXT propagar (pode levar minutos), o
   status vira **verificado** e o domínio passa a abrir o tenant.

> **Segurança**: só domínio **verificado** resolve para o tenant — ninguém
> "sequestra" um domínio sem provar o controle do DNS.

---

## 8. Membro do Tenant (mentor / mentee)

### 8.1 Como acessar (já tendo conta)
1. `https://<slug>.mentorxmatch.xyz/login` → e-mail + senha → entra no app.
2. Complete o **Perfil** (área, senioridade, skills oferecidas/buscadas).
3. **Mentores** → buscar e **Solicitar** mentoria. O mentor **aceita** em
   **Solicitações** → vira **Mentoria** ativa → marcam **Sessões**.

### 8.2 Como se cadastrar sendo apenas um usuário do tenant — **⚠️ Lacuna atual**
**Hoje não existe tela de cadastro (signup) nem convite de membros no app.** Um
tenant recém-criado tem **apenas o admin**. Na prática:
- **Não há** botão "criar conta" no login.
- **Não há** tela do admin para "convidar/adicionar membro".
- Existe apenas a **API** `POST /api/auth/signup` (exige consentimento), **sem
  interface** — uso técnico.

**O que fazer enquanto isso / recomendação de roadmap (a construir):**
- (a) **Tela de cadastro** no login do tenant, respeitando a configuração
  `allowSelfSignup` do tenant; **e/ou**
- (b) **Convite de membros** pelo admin do tenant (gera link/e-mail de
  set-password, igual ao do admin).

> Este é o **principal gap** para operar com clientes reais hoje. Priorizar.

---

## 9. E-mail (como as mensagens saem)

- Provedor: **Resend** (`EMAIL_PROVIDER=resend`). Remetente em `EMAIL_FROM`.
- E-mails atuais: **definir senha** (no provisionamento). Notificações de
  mentoria/sessão existem no backend (outbox), mas o envio automático contínuo
  depende de processamento — confirmar com o técnico o estado em produção.
- Se o e-mail não chegar: confira spam, e o status na tela de provisionamento
  (mostra se "enviado"); o **link de set-password** sempre aparece lá como backup.

---

## 10. Resumo dos fluxos (cola rápida)

| Quero… | Onde / como |
|---|---|
| Operar a plataforma | `admin.mentorxmatch.xyz/console` (login de plataforma) |
| Criar uma empresa-cliente | Console → Provisionar tenant |
| Definir quem é o admin da empresa | campo "E-mail do admin" ao criar o tenant |
| Suspender/reativar uma empresa | Console → botão no tenant |
| Entrar como admin da empresa | e-mail → set-password → `<slug>…/login` |
| Personalizar marca da empresa | `…/app/settings` (logo, cores, programa) |
| Usar domínio próprio da empresa | `…/app/settings` → Domínio personalizado (+ DNS) |
| Entrar como membro | `<slug>…/login` (precisa já ter conta) |
| Cadastrar um membro novo | **⚠️ sem tela hoje** — ver §8.2 (roadmap) |

---

## 11. Lacunas conhecidas (a construir)

1. **Cadastro/convite de membros do tenant** (o gap nº 1 — §8.2).
2. Gerenciar **admins de plataforma** e **trocar/adicionar admin de um tenant** já
   existente, pelas telas.
3. Console mais rico: **abrir um tenant** e personalizá-lo de lá (logo, cores)
   sem precisar logar como o tenant.

_(Documento vivo — atualizar conforme o produto evolui.)_
