# LATAM_PLUS_REFERENCE_ANALYSIS — Análise da Referência Funcional (MentorMatch no LATAM+)

> O MentorMatch **já existe e funciona dentro do LATAM+**, validado com usuários reais. Esta
> análise trata o produto atual como **referência funcional** — o que aprender com ele e o
> que **não** reutilizar.
>
> **Importante (escopo de evidência):** nesta etapa não recebi screenshots nem exports do
> LATAM+ como arquivo (ver [ASSET_INVENTORY.md](./ASSET_INVENTORY.md) §3). A análise abaixo é
> baseada no conhecimento de domínio descrito no brief aprovado (ADR v1.1) e nos protótipos
> do Claude Design (`product UX reference`). Onde uma afirmação depende de detalhe da tela
> LATAM+ que não vi, está marcada como **[a confirmar com screenshots]**. Se as telas forem
> anexadas, atualizo este documento sem alterar as classificações de uso.

## Princípio do documento

Duas colunas mentais, sempre:

- **Aprender com LATAM+** → padrões de UX e decisões de produto validadas que viram
  **requisitos** do SaaS.
- **Não copiar LATAM+** → identidade, marca, fotos, CSS/componentes proprietários, e qualquer
  acoplamento ao ambiente LATAM. Reescrever do zero com tokens MentorMatch.

> Regra dura: **nenhum pixel, asset ou identidade LATAM vai para produção.** A reutilização é
> de **aprendizado de fluxo**, não de material.

## Fluxos existentes hoje (mapa funcional)

Com base no conceito validado e nos protótipos, o produto cobre: identidade de papel
(mentor/mentee), descoberta de mentores, solicitação e aceite/recusa, condução da mentoria
(sessões/status) e materiais de apoio. Detalhe por área a seguir.

---

## Análise por área

Para cada item: **o que existe**, **preservar (aprender)**, **melhorar**, **não reutilizar
(LATAM)**, **vira requisito do SaaS**.

### 1. Seletor Mentor/Mentee
- **Existe:** escolha/declaração do papel do usuário.
- **Preservar:** clareza imediata do papel; entrada de baixo atrito.
- **Melhorar:** suportar **dual role** de forma explícita (mentor *e* mentee ao mesmo tempo).
- **Não reutilizar:** estilo/identidade LATAM do seletor.
- **Requisito SaaS:** papel é atributo do `TenantUser`; UI alterna contexto; domínio trata
  ambos os papéis no mesmo usuário (ver [../PRODUCT.md](../PRODUCT.md)).

### 2. Alternância de papel
- **Existe:** trocar a visão entre papéis. **[a confirmar com screenshots]** se já há um
  shell único.
- **Preservar:** troca sem logout, contexto preservado.
- **Melhorar:** shell único Admin/Mentor/Mentorado (como no protótipo do Dashboard) com estado
  claro de "qual papel estou vendo".
- **Não reutilizar:** componentes/visual LATAM.
- **Requisito SaaS:** alternância de papel no app shell; cada papel respeita RBAC tenant-scoped.

### 3. Grid de mentores
- **Existe:** listagem navegável de mentores.
- **Preservar:** descoberta por varredura rápida; densidade legível.
- **Melhorar:** respeitar **visibilidade por tenant/programa** e ocultar mentor com
  disponibilidade pausada; **sem contato visível** no grid.
- **Não reutilizar:** layout/estética LATAM.
- **Requisito SaaS:** grid alimentado por busca + filtros manuais (V1, sem IA); tokens
  MentorMatch; `ContactInfo` nunca exposto aqui (ver [../LGPD.md](../LGPD.md)).

### 4. Card de mentor
- **Existe:** resumo do mentor (nome, área, sinais de senioridade).
- **Preservar:** informação suficiente para decidir "pedir mentoria" sem abrir o perfil.
- **Melhorar:** avatar por **iniciais** (não foto), skills/áreas, estado de disponibilidade.
- **Não reutilizar:** fotos reais, identidade LATAM.
- **Requisito SaaS:** card sem contato direto; deixa claro disponibilidade e foco de
  conhecimento.

### 5. Filtros
- **Existe:** filtragem de mentores. **[a confirmar com screenshots]** quais dimensões.
- **Preservar:** filtrar por necessidade real, não por afinidade superficial.
- **Melhorar:** padronizar dimensões: **área, skill, cargo, palavra-chave** (escopo V1).
- **Não reutilizar:** taxonomias/labels específicos do LATAM.
- **Requisito SaaS:** matching V1 = **busca manual + filtros** por área/skill/cargo/keyword
  (ver [../ADR.md](../ADR.md) §7).

### 6. Perfil do mentor
- **Existe:** página/painel detalhado do mentor.
- **Preservar:** repertório, objetivos que atende, contexto que ajuda a decidir.
- **Melhorar:** separar claramente **credencial (login)** de **contato** — contato só
  pós-match; bio/skills/disponibilidade visíveis conforme regra de visibilidade.
- **Não reutilizar:** identidade/fotos LATAM.
- **Requisito SaaS:** perfil tenant/programa-scoped; `ContactInfo` gated por match aceito.

### 7. Solicitação de mentoria
- **Existe:** mentorado pede mentoria a um mentor.
- **Preservar:** ação direta e de baixo atrito; contexto do pedido.
- **Melhorar:** estado explícito (pendente) e respeito a **limite de mentorados → waitlist**.
- **Não reutilizar:** componentes LATAM.
- **Requisito SaaS:** `MentorshipRequest` (pendente → aceita/recusada); waitlist quando o
  mentor está no limite.

### 8. Processo / status (da mentoria)
- **Existe:** acompanhamento do andamento (ex.: "no ritmo", "aguardando"). **[a confirmar]**
- **Preservar:** estado legível do relacionamento; próximos passos óbvios.
- **Melhorar:** vocabulário de circulação ("no ritmo", "horas circuladas") e clareza de
  próxima sessão.
- **Não reutilizar:** identidade LATAM.
- **Requisito SaaS:** ciclo da `Mentorship` (solicitada → ativa → concluída/encerrada) com
  status visível a ambas as partes.

### 9. Biblioteca
- **Existe:** materiais/recursos de apoio (trilhas, conteúdos). **[a confirmar escopo]**
- **Preservar:** apoio à mentoria com material reutilizável.
- **Melhorar:** alinhar a "trilhas vivas" e a goals/sessões; evitar virar LMS (não é o foco).
- **Não reutilizar:** conteúdos proprietários LATAM, materiais com marca LATAM.
- **Requisito SaaS:** **[decisão de escopo]** confirmar se "biblioteca" entra na V1 ou é
  pós-V1. Recomendação: tratar como apoio leve a trilhas/sessões; **não** construir LMS.

### 10. Modais
- **Existe:** confirmações/ações em modal (ex.: confirmar solicitação, aceite).
- **Preservar:** confirmar ações de consequência (solicitar, aceitar, recusar, encerrar).
- **Melhorar:** acessibilidade (foco, ESC, alvo ≥ 44px), copy na voz da marca.
- **Não reutilizar:** componentes de modal LATAM.
- **Requisito SaaS:** modais com tokens MentorMatch e copy de [../COPY_GUIDE.md](../COPY_GUIDE.md).

### 11. Estados vazios
- **Existe:** telas sem dados. **[a confirmar tratamento atual]**
- **Preservar:** orientar a próxima ação.
- **Melhorar:** estados vazios que reforçam circulação e convidam à ação (já redigidos no
  COPY_GUIDE).
- **Não reutilizar:** ilustração/identidade LATAM.
- **Requisito SaaS:** usar os empty states definidos em [../COPY_GUIDE.md](../COPY_GUIDE.md) §7.

### 12. Estados de aceite/recusa
- **Existe:** mentor aceita ou recusa a solicitação.
- **Preservar:** decisão clara do mentor; feedback ao mentorado.
- **Melhorar:** recusa **sem constrangimento** (copy gentil; reabrir caminho para outro
  mentor); aceite revela contato e cria mentoria.
- **Não reutilizar:** componentes LATAM.
- **Requisito SaaS:** aprovação V1 = **mentor aceita/recusa**; aceite cria `Mentorship` ativa
  e dispara revelação de `ContactInfo` (auditada).

### 13. Fluxo pós-match
- **Existe:** o que acontece depois que a mentoria começa (contato, sessões, progresso).
- **Preservar:** caminho claro do "match" para a primeira conversa.
- **Melhorar:** **só aqui** o contato direto (WhatsApp/e-mail) aparece; sessões, goals e
  feedback registráveis.
- **Não reutilizar:** integrações/identidade LATAM.
- **Requisito SaaS:** pós-aceite, `ContactInfo` visível (com `audit_event`); `Session`,
  `Goal`, `Feedback` dentro da `Mentorship` (ver [../LGPD.md](../LGPD.md) e
  [../SECURITY.md](../SECURITY.md)).

---

## Síntese: aprender vs. não copiar

**Aprender com LATAM+ (vira requisito):**
- Dual role e alternância de papel num shell único.
- Descoberta por necessidade real (filtros área/skill/cargo/keyword).
- Fluxo solicitar → aceitar/recusar → mentoria ativa, com limite + waitlist.
- Status legível da relação e próximos passos óbvios.
- Contato direto **apenas** pós-match.
- Recusa sem constrangimento; estados vazios que convidam à ação.

**Não copiar do LATAM+ (proibido em produção):**
- Qualquer marca/identidade/logo LATAM.
- Fotos reais; usar abstração/iniciais.
- CSS/componentes proprietários LATAM — reescrever com tokens MentorMatch.
- Taxonomias/labels e integrações acopladas ao LATAM.
- Screenshots do LATAM+ (são `reference only, not for production`).

## Pendências / a confirmar
- Anexar screenshots do LATAM+ para fechar os pontos **[a confirmar com screenshots]** —
  permanecem `reference only, not for production`.
- Decisão de escopo da **biblioteca** na V1 (apoio leve vs. fora da V1).
