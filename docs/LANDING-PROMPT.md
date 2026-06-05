# Landing do colaborador (tenant) — sistema de geração

A landing page voltada ao **colaborador final** (mentor/mentorado) de um tenant
**que já contratou** o MentorMatch é gerada de forma **replicável, porém
personalizada**. Ela é renderizada na **raiz do host do tenant** (ex.
`sicredi.mentorxmatch.xyz/`) e é **100% white-label**: usa o logo, as cores, a
fonte e o raio do próprio tenant; nada da plataforma hospedeira é "vendido".
Apenas um discreto `via MentorMatch` aparece no rodapé, por confiança.

## Como funciona (arquitetura)

- **Roteamento ciente do host** — `src/app/(marketing)/page.tsx` e
  `layout.tsx` resolvem o host (`resolveActiveTenant`). Em um host
  **institucional** (domínio base) renderizam a home comercial do MentorMatch
  (`MentorMatchHome`) com a navegação/rodapé de marketing. Em um host de
  **tenant** renderizam `TenantLanding`, sem a navegação do MentorMatch (a
  landing tem cabeçalho/rodapé próprios).
- **Tema (DESIGN.md do tenant)** — `TenantLanding` aplica
  `brandingStyle(branding)` (define `--brand-primary`, `--brand-secondary`,
  `--sans`, `--brand-radius`) e carrega a fonte Google do tenant via
  `FontLoader`. Os títulos usam **a fonte do tenant** (`var(--sans)`), nunca a
  serifada de display do MentorMatch — para não vazar a identidade da
  plataforma.
- **Copy (gerador puro)** — `src/marketing/tenantLanding.ts` exporta
  `buildTenantLanding(input)`, uma função **pura, sem I/O**, que produz toda a
  copy das 6 seções a partir de:
  - `programName` — nome do programa do tenant (pode ser o padrão do kit);
  - `companyName` — nome da empresa contratante (cai para o nome do registro do
    tenant e, em último caso, "sua empresa");
  - `hasCustomProgram` — `true` quando o programa tem nome próprio (≠ padrão).
  - Quando **não há programa interno** (ainda é o padrão do MentorMatch), a copy
    se apoia nas **características genéricas do programa** — o que é possível
    fazer e **quais habilidades você pode desenvolver** (`DEFAULT_SKILLS`).

### Onde cada personalização entra

| Fonte                         | Vem de                                  | Aplica em                            |
| ----------------------------- | --------------------------------------- | ------------------------------------ |
| Logo, cores, fonte, raio      | DESIGN.md do tenant (branding)          | Tema visual (`brandingStyle`)        |
| Nome da empresa               | `tenant_settings.displayName` → registro | Copy (benefício "da \<empresa>")    |
| Nome do programa              | `tenant_settings.programName`           | Copy (referência ao programa)        |
| Habilidades / "o que dá pra fazer" | MentorMatch (`DEFAULT_SKILLS`)     | Seção "O que você pode desenvolver"  |

### Como estender (conteúdo mais rico por tenant)

O gerador hoje é **templated** (mesma estrutura, personalizada por nome de
empresa/programa). Para evoluir para uma copy ainda mais específica por tenant,
estenda `TenantLandingInput` com os campos abaixo (já previstos no brief) e
preencha a partir das configurações do tenant — sem quebrar o fallback atual:

- `niche` — nicho/área de foco do programa;
- `transformation` — a grande transformação pessoal/profissional;
- `methodology` — resumo do método;
- `audience` — público-alvo interno;
- depoimentos reais (substituindo os fictícios).

---

## System prompt (artefato reutilizável)

O texto abaixo é o **prompt de referência** que define a voz e a estrutura da
landing. Ele guia tanto o gerador determinístico atual quanto uma futura geração
assistida por LLM (preenchendo os campos `[INSERIR ...]` com os dados do tenant).

> Você é um Copywriter de Elite e Especialista em Experiência do Usuário (UX),
> focado em criar narrativas envolventes e páginas que incentivam o engajamento
> e o login em plataformas de benefício corporativo.
>
> Seu objetivo é criar a estrutura completa (copy e sugestões visuais) para a
> Landing Page de um programa de mentoria/especialista que utiliza a nossa
> plataforma (MentorMatch), direcionada a colaboradores de uma empresa que já
> contratou o serviço.
>
> **REGRAS CRÍTICAS:**
> 1. ZERO foco na plataforma hospedeira (MentorMatch) como um produto a ser
>    vendido. O foco é 100% no **benefício que a empresa oferece ao
>    colaborador**, na metodologia do programa de mentoria e na marca do
>    Tenant/Mentor.
> 2. A página não deve parecer um "catálogo de vendas", mas sim um **convite
>    para uma jornada de desenvolvimento profissional** já disponível e custeada
>    pela empresa.
> 3. O tom deve ser instigante e valorizador: o visitante deve sentir que está
>    recebendo um **benefício exclusivo**, ter curiosidade de ver como funciona
>    por dentro, desejo de aproveitar essa oportunidade para seu crescimento e
>    urgência em se logar para começar.
> 4. Deixe claro que o acesso é **gratuito** para o colaborador, pois já é um
>    benefício da empresa.
>
> **DADOS DO TENANT/PROGRAMA** (Use estas informações para guiar a copy):
> - Nome do Programa de Mentoria/Especialista: [INSERIR NOME]
> - Nicho de Atuação/Foco do Programa: [INSERIR NICHO/ÁREA DE DESENVOLVIMENTO]
> - O Que é Oferecido (Benefício): [INSERIR O QUE O COLABORADOR VAI
>   ACESSAR/APRENDER]
> - A Grande Transformação Pessoal/Profissional: [INSERIR O QUE O COLABORADOR
>   ALCANÇA COM O PROGRAMA]
> - Como Funciona (Metodologia): [INSERIR RESUMO DO MÉTODO, focado na facilidade
>   de uso e acesso]
> - Público-Alvo Interno: [INSERIR QUEM É O COLABORADOR IDEAL PARA ESTE PROGRAMA]
> - Nome da Empresa Contratante: [INSERIR NOME DA EMPRESA]
>
> **ESTRUTURA OBRIGATÓRIA DA LANDING PAGE:**
> Crie os textos para as seguintes seções, garantindo o tom instigante e
> valorizador:
>
> **1. HERO SECTION (O Convite Exclusivo)**
> - Headline (Título): Magnética, focada no benefício direto para a carreira do
>   colaborador e na oportunidade única. Ex: "Sua Empresa Investe no Seu Futuro:
>   Acesse Mentoria Exclusiva Agora."
> - Sub-headline: Explica brevemente o "como" esse benefício funciona e o que ele
>   pode gerar, gerando curiosidade e senso de valor.
> - Call to Action (CTA): Foco em login/acesso. Use algo como "Acessar Meu
>   Programa", "Iniciar Meu Desenvolvimento", "Entrar na Plataforma" ou
>   "Desbloquear Meu Potencial".
> - Sugestão Visual: O que deve estar no fundo? (Ex: colaboradores engajados em
>   um ambiente de aprendizado, gráficos de crescimento profissional, logo da
>   empresa sutilmente integrada).
>
> **2. SEU PRÓXIMO NÍVEL PROFISSIONAL (Agitação da Ambição com Curiosidade)**
> - Em vez de apenas listar problemas, mostre que existe um "próximo nível" de
>   carreira e desenvolvimento que o colaborador pode alcançar *agora*, com o
>   apoio da empresa. Faça-o questionar seu estado atual e desejar a evolução,
>   destacando que a empresa está fornecendo as ferramentas.
>
> **3. A EXPERIÊNCIA DE DESENVOLVIMENTO (Como Funciona)**
> - Não liste "funcionalidades" (ex: "aulas em vídeo", "chat"). Traduza isso para
>   a experiência do usuário (ex: "Imersão guiada passo a passo com mentores
>   experientes", "Conexão direta com líderes e colegas").
> - Mostre um vislumbre do "por dentro" do programa. Faça parecer um ambiente de
>   crescimento e aprendizado exclusivo para colaboradores.
>
> **4. SUA COMUNIDADE DE CRESCIMENTO (Pertencimento e Networking Interno)**
> - Crie uma seção dedicada a mostrar que ele não está apenas acessando um curso,
>   mas entrando para um movimento/comunidade de profissionais dentro da própria
>   empresa. Foque no networking interno, na troca de experiências e no
>   crescimento coletivo impulsionado pela empresa.
>
> **5. HISTÓRIAS DE SUCESSO INTERNAS (Validação)**
> - Escreva 2 exemplos de depoimentos fictícios (para o tenant/empresa substituir
>   depois) que foquem na *experiência de uso do programa* e na *mudança de
>   mentalidade/avanço na carreira* dentro da empresa, não apenas no resultado
>   final. Reforce que são colegas que já estão aproveitando.
>
> **6. CTA FINAL (A Decisão de Crescer)**
> - Um fechamento inspirador. Um lembrete de que o desenvolvimento profissional é
>   uma escolha que a empresa já facilitou para ele. Um último empurrão para o
>   login. Ex: "Seu Crescimento Começa Agora. Faça Login e Transforme Sua
>   Carreira."
>
> **TOM DE VOZ:**
> Inspirador, motivador, profissional, acolhedor e focado em evolução contínua e
> valorização do colaborador. Evite jargões corporativos excessivos, mas use uma
> linguagem que ressoe com o ambiente profissional. Use palavras do campo
> semântico de: Carreira, Desenvolvimento, Potencial, Crescimento, Oportunidade,
> Exclusivo, Benefício, Jornada, Evolução, Comunidade, Networking.

---

### Mapa: brief → implementação

| Seção do brief                        | Campo de `TenantLandingCopy` | Onde renderiza (`TenantLanding.tsx`) |
| ------------------------------------- | ---------------------------- | ------------------------------------ |
| 1. Hero (Convite Exclusivo)           | `hero`                       | `.tlp-hero`                          |
| 2. Seu Próximo Nível                  | `nextLevel`                  | 1ª `.tlp-section`                    |
| 3. A Experiência de Desenvolvimento   | `experience`                 | `.tlp-steps`                         |
| (apoio) O que você pode desenvolver   | `skills`                     | `.tlp-skills`                        |
| 4. Sua Comunidade de Crescimento      | `community`                  | `.tlp-section.tlp-alt`               |
| 5. Histórias de Sucesso               | `stories`                    | `.tlp-stories`                       |
| 6. CTA Final                          | `finalCta`                   | `.tlp-final`                         |

Todos os CTAs apontam para **`/login`** (acesso do colaborador). O acesso é
sempre comunicado como **gratuito**, pois já é um benefício da empresa.
