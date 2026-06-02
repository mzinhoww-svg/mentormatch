# COPY_GUIDE — Guia de Conteúdo e Voz

Fonte: brandkit "Circulação" (Claude Design). Todo texto de UI em **PT-BR**. A voz é
**direta, calorosa e confiante** — de gente grande para gente grande.

## 1. Slogan e assinatura

- **Assinatura principal:** **"Passe adiante."**
- **Finalistas (campanha):**
  1. *Passe adiante.* (a assinatura)
  2. *Ninguém cresce sozinho.* (o propósito)
  3. *O conhecimento em movimento.* (a categoria)
- **Frase-síntese de marca:** "O conhecimento circula." / na home: "O conhecimento não para.
  Ele circula."

## 2. Manifesto (texto canônico)

> O conhecimento nunca foi feito para ficar parado. Ele só vale alguma coisa quando se move —
> de quem aprendeu para quem ainda vai aprender.
>
> A maioria das empresas trata conhecimento como estoque. Guarda, arquiva, perde. Nós
> tratamos como **corrente**.
>
> Mentoria não é uma pessoa ensinando outra — é energia que passa adiante e volta
> multiplicada. Cada conversa abre um caminho. Cada caminho vira rede. Cada rede vira cultura.
>
> Quando o conhecimento circula, ninguém cresce sozinho.
>
> — *Passe adiante.*

## 3. Voz: como falamos / como nunca falamos

**Falamos assim:**
- Verbos no imperativo amigável: "Passe adiante", "Conecte", "Comece".
- Frases curtas com peso. Uma ideia por linha.
- Conhecimento como protagonista, pessoas como heróis.
- Otimismo com substância — promessa que o produto cumpre.

**Nunca falamos assim:**
- Jargão de RH: "capital humano", "colaborador 360", "sinergia".
- Hype de IA: "revolucione", "powered by AI", "disrupção".
- Frieza corporativa ou paternalismo com quem aprende.
- Promessas vagas sem prova ou número por trás.

## 4. Landing (direção de copy)

- **Headline:** "O conhecimento não para. Ele circula."
- **Subheadline:** "MentorMatch é a infraestrutura que põe o conhecimento da sua empresa em
  movimento — conectando quem viveu a quem vai viver, em escala, com método e impacto medido."
- **CTA primário (institucional, V1):** "Solicitar demonstração."
- **CTA de apoio:** "Começar" / "O conhecimento circula."
- Tom: editorial no display (Instrument Serif), preciso no mono para eyebrows/labels.

> Nota: na V1 **não há** auto-provisionamento público. O CTA da landing institucional é
> **"Solicitar demonstração"**, não "Criar conta". Ver [PRODUCT.md](./PRODUCT.md) e
> [ADR.md](./ADR.md) §9.

## 5. CTAs (biblioteca base)

| Contexto | Texto |
|---|---|
| Landing institucional | Solicitar demonstração |
| Convite aceito → começar | Comece |
| Buscar mentor | Encontrar mentor |
| Enviar solicitação | Pedir mentoria |
| Mentor aceita | Aceitar |
| Mentor recusa | Recusar |
| Entrar em fila | Entrar na waitlist |
| Passar conhecimento adiante (avatar/CTA final) | Passe adiante |

## 6. Mensagens de erro (tom + segurança)

Erros são curtos, humanos e **não revelam informação sensível**. Especialmente em auth, a
mensagem é **genérica** para não permitir enumeração (ver [SECURITY.md](./SECURITY.md)).

| Situação | Mensagem |
|---|---|
| Credenciais inválidas (usuário inexistente OU senha errada) | "E-mail ou senha inválidos." |
| Login indisponível neste endereço (host institucional/admin/desconhecido) | "O login não está disponível neste endereço." |
| Excesso de tentativas / limiter | "Muitas tentativas. Tente novamente em instantes." |
| Campo obrigatório vazio | "Preencha este campo para continuar." |
| Consentimento não aceito | "Aceite os termos para continuar." |
| Erro inesperado | "Algo saiu do lugar. Tente de novo em instantes." |

(As três primeiras correspondem a `INVALID_CREDENTIALS`, `NO_TENANT_LOGIN`, `RATE_LIMITED` em
`authService.ts`.)

## 7. Estados vazios (empty states)

Estados vazios reforçam circulação e convidam à ação — nunca becos sem saída.

| Tela | Título | Apoio | Ação |
|---|---|---|---|
| Sem mentores no filtro | "Nada por aqui ainda." | "Ajuste os filtros ou amplie a busca — o conhecimento certo pode estar a um termo de distância." | Limpar filtros |
| Sem mentorias ativas (mentorado) | "Sua corrente começa com um pedido." | "Encontre alguém que já viveu o que você quer aprender." | Encontrar mentor |
| Sem mentorados (mentor) | "Ninguém na sua corrente ainda." | "Quando alguém pedir mentoria, aparece aqui." | Revisar disponibilidade |
| Waitlist vazia | "Sem ninguém na fila." | "Você verá aqui quem está esperando uma vaga." | — |
| Sem sessões | "Nenhuma sessão registrada." | "Registre o que foi conversado para acompanhar o progresso." | Registrar sessão |
| Sem notificações | "Tudo em dia." | "Novidades da sua corrente aparecem aqui." | — |

## 8. E-mails transacionais (conteúdo base)

Curtos, na voz da marca, com uma ação clara. Sem jargão. (Implementação no slice de
notificações; aqui fica o conteúdo de referência.)

| E-mail | Assunto | Corpo (essência) | CTA |
|---|---|---|---|
| Convite ao colaborador | "Você foi convidado para o MentorMatch" | "Sua empresa está pondo o conhecimento em movimento. Aceite o convite e comece sua corrente." | Aceitar convite |
| Solicitação recebida (mentor) | "Alguém quer aprender com você" | "{nome} pediu mentoria. Veja o pedido e responda quando puder." | Ver pedido |
| Solicitação aceita (mentorado) | "Sua mentoria começou" | "{mentor} aceitou. Agora vocês podem se falar diretamente." | Abrir mentoria |
| Solicitação recusada (mentorado) | "Sobre seu pedido de mentoria" | "Desta vez não rolou — mas há mais gente pronta para passar adiante." | Encontrar outro mentor |
| Vaga na waitlist | "Abriu uma vaga" | "{mentor} tem espaço agora. Sua vez de avançar." | Pedir mentoria |
| Sessão agendada | "Sessão marcada" | "Sua próxima sessão com {pessoa} está marcada." | Ver detalhes |
| Mentoria encerrada | "Mentoria concluída" | "Essa corrente seguiu seu curso. Conte como foi." | Deixar feedback |

> **LGPD:** e-mails não expõem contato direto antes do match aceito; o contato (WhatsApp/
> e-mail pessoal) só aparece dentro da mentoria já aceita (ver [LGPD.md](./LGPD.md)).

## 9. Microcopy — regras

- Eyebrows/labels em **mono**, caixa-alta, tracking largo (`.eyebrow`).
- Números-chave podem usar **brasa** para destaque pontual.
- Evitar exclamação em excesso; o peso vem da frase curta, não da pontuação.
- PT-BR sempre; nomes de tokens/funções podem ser PT/EN misto conforme o código.
