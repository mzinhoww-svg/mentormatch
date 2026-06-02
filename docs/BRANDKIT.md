# BRANDKIT — Marca MentorMatch (Fonte Oficial)

> **Fonte de verdade da marca.** Este material foi produzido no **Claude Design** e é a
> identidade **oficial e aprovada** do MentorMatch. O papel deste documento e dos arquivos em
> [brand/](./brand/) é **transformar o brandkit aprovado em documentação técnica e operacional**
> — não criar uma marca nova, não substituir o trabalho do Claude Design.
>
> Os arquivos-fonte estão preservados em `docs/brand/source/`:
> `assets/brand.css`, `assets/book.css`, `assets/marks.js`, `assets/brand-book.js`,
> `brand-book.html`, `produto/*`, e a especificação `SPEC-LLM-original.md`.

## 1. Conceito

**Circulação · "A Corrente".** O conhecimento é tratado como uma **corrente** — energia que
circula, ganha força ao passar de pessoa para pessoa e **nunca se esgota**. O oposto da
corrente é o **estoque** (conhecimento parado, arquivado, perdido). A marca **afirma
circulação**, não transação.

- Frase-síntese: **"O conhecimento circula."** (na home: *"O conhecimento não para. Ele
  circula."*)
- Assinatura: **"Passe adiante."**
- Categoria: SaaS de mentoria corporativa.

## 2. Sistema de símbolos

A direção vencedora é **"A Corrente"** (`mm.corrente`): dois braços de corrente — **mentor**
e **mentorado** — girando em torno de um **nó comum** (o "match"). Um braço em **tinta**, um
braço em **brasa**: duas partes, um só movimento. Não há começo nem fim — há circulação.

- Construção: grade 100×100, arco-comma espelhado em rotação de 180° sobre o centro, traço de
  peso constante, terminais arredondados, nó central fixo.
- Comportamento digital: o nó é fixo; os braços giram em loaders/transições (`.mm-live`,
  14s). Em repouso, estático e estável.
- Lockup oficial (`mm.lockup`): símbolo + wordmark "Mentor**match**" (peso 700 + 500),
  `letter-spacing:-0.035em`.
- API: `window.mm` expõe `corrente`, `lockup` e 5 territórios de exploração (`fluxo`,
  `abertura`, `multiplicacao`, `catalisador`, `rede`). **Usar sempre via `mm.*`**, nunca
  desenhar SVG à mão.

Detalhes em [brand/LOGO_USAGE.md](./brand/LOGO_USAGE.md) e
[brand/VISUAL_LANGUAGE.md](./brand/VISUAL_LANGUAGE.md).

## 3. Cor

Paleta quente e editorial — calor + inteligência, **oposta ao "SaaS azul"**: **Tinta**
(fundação `#14100D`), **Brasa** (accent `#FF4A1C`), **Jade** (crescimento `#1B5C4C`),
**Argila** (neutro/papel `#FBF7F0`/`#F4ECE0`). Brasa usada **com parcimônia** — é a faísca,
não o fundo. Tokens literais em [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) §2.1; psicologia/uso em
[brand/COLOR_SYSTEM.md](./brand/COLOR_SYSTEM.md).

## 4. Tipografia

**Instrument Serif** (display/manifesto, com itálico), **Hanken Grotesk** (headings/body/UI —
o cavalo de batalha, substitui Inter/Roboto), **Space Mono** (eyebrows/labels/métricas).
Detalhes em [brand/TYPOGRAPHY.md](./brand/TYPOGRAPHY.md).

## 5. Motion

Tudo se move como uma corrente: **entra, ganha energia, segue. Nada surge do nada.** Curva
assinatura `--ease-flow` (acelera no encontro, desacelera ao entregar). O loader é "A
Corrente" girando. Detalhes em [brand/MOTION_SYSTEM.md](./brand/MOTION_SYSTEM.md).

## 6. Tom de voz

Direto, caloroso e confiante — de gente grande para gente grande. Imperativo amigável
("Passe adiante", "Conecte", "Comece"), frases curtas, uma ideia por linha. **Nunca:** jargão
de RH ("capital humano", "sinergia"), hype de IA ("revolucione", "powered by AI"), frieza
corporativa ou promessa vaga sem prova. Guia completo em [COPY_GUIDE.md](./COPY_GUIDE.md) e
[brand/](./brand/) (estratégia/voz).

## 7. Proibições (rígidas — quebrar = retrabalho)

**No símbolo/identidade, NUNCA:** monograma **MM** ou dois "M" entrelaçados; ícones genéricos
de pessoas; balões de conversa; aperto de mãos; cérebro; lâmpada; setas clichês; árvore de
conhecimento; livros; chapéu de formatura. **Nunca** partir de uma letra — o símbolo nasce do
conceito. **Nunca** rede com 6 pontos simétricos (vira hexagrama).

**Visuais gerais:** sem azul de marca; sem gradientes agressivos de fundo; sem emoji; sem
canto arredondado + borda-accent-à-esquerda clichê; sem Inter/Roboto/Arial/Fraunces; sem
stock photos / pessoas sorrindo em escritório / ilustração SaaS genérica.

**Aparência proibida:** startup genérica, template de SaaS, "produto de IA", RH tradicional.

## 8. Aplicações

Documentadas no brand book: landing, dashboard (Admin/Mentor/Mentorado), app mobile (futuro),
camiseta ("Passe adiante" — vestível, não brinde), crachá de evento, toolkit social
(LinkedIn). Direção em [brand/APPLICATIONS.md](./brand/APPLICATIONS.md),
[brand/WEBSITE_DIRECTION.md](./brand/WEBSITE_DIRECTION.md) e
[brand/PRODUCT_UI_DIRECTION.md](./brand/PRODUCT_UI_DIRECTION.md).

## 9. Glossário

| Termo | Significado |
|---|---|
| A Corrente | Símbolo vencedor; dois braços girando em torno de um nó |
| Circulação | Metáfora central: conhecimento que se move e não se esgota |
| Brasa | Accent `#FF4A1C` (o catalisador) |
| Tinta | Fundação `#14100D` (quase-preto quente) |
| Jade | Verde secundário `#1B5C4C` (crescimento) |
| Argila | Neutros quentes (papel) |
| Nó / match | Centro do símbolo; onde o conhecimento conecta |
| Passe adiante | Assinatura/slogan principal |
| Estoque (inimigo) | Conhecimento parado — o oposto da corrente |

## 10. Lacunas do brandkit

O relatório de lacunas (assets faltantes para produção: favicons, app icons exportados, etc.)
está em [reports/SLICE-0B-BRAND-HANDOFF.md](./reports/SLICE-0B-BRAND-HANDOFF.md).
