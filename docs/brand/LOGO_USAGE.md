# LOGO_USAGE — Uso do Símbolo e Lockup

> Fonte: `docs/brand/source/assets/marks.js` (API `window.mm`).

## O símbolo: "A Corrente"

Dois braços de corrente — **mentor** e **mentorado** — girando em torno de um **nó comum** (o
"match"). Um braço em **tinta**, um braço em **brasa**: duas partes, um só movimento. Não há
começo nem fim; há circulação.

- **Função:** `mm.corrente({ size, ink, accent, weight })` → string SVG.
- **Construção:** grade 100×100; arco-comma espelhado em rotação de 180° sobre o centro;
  traço de peso constante (`weight`, default 9); terminais arredondados; nó central = círculo
  fixo.
- **Acessibilidade:** o SVG já traz `role="img"` e `aria-label="MentorMatch"`.

## Lockup oficial

- **Função:** `mm.lockup({ size, ink, accent })`.
- Composição: símbolo (≈1.18× a altura do texto) + wordmark **"Mentor**match**"** — "Mentor"
  peso 700, "match" peso 500, `letter-spacing:-0.035em`, na fonte `--sans` (Hanken Grotesk).
- **Match escrito como palavra única e contínua** (mitigação de naming — ver
  [BRAND_STRATEGY.md](./BRAND_STRATEGY.md)).

## Comportamento digital

- **Repouso:** símbolo estático e estável.
- **Movimento:** o **nó é fixo**; os **braços giram** em loaders e transições (`.mm-live`,
  14s linear infinite). A espera é a própria marca em movimento.
- Aplicações de ícone: favicon, app icon, avatar social, versão mono/1-cor — todas derivam de
  `mm.corrente`.

## Territórios de exploração (não-logo)

`window.mm` também expõe `fluxo` (= corrente), `abertura`, `multiplicacao`, `catalisador`,
`rede`. Eles **não** são o logo: `multiplicacao` vive como **textura/padrão de fundo**;
`catalisador` vira **linguagem de motion**; `rede` estrutura **mapas de relacionamento** no
produto; `abertura` é exploração. Usar conforme o papel, nunca como marca.

## Regras de uso

- **Sempre via `mm.*`** — nunca redesenhar o SVG à mão.
- Cores do símbolo: um braço `--ink` (`#14100D`), outro `--accent`/brasa (`#FF4A1C`). Em
  contextos mono, usar 1 cor.
- Dar respiro ao redor do lockup; não comprimir nem distorcer proporção.
- Em fundo escuro (`--tinta-900`), manter o nó e o braço tinta legíveis (usar variação de
  cor adequada via parâmetros `ink`/`accent`).

## Proibições (rígidas)

- **NUNCA** monograma **MM** ou dois "M" entrelaçados.
- **NUNCA** partir de uma letra — o símbolo nasce do conceito.
- **NUNCA** ícones de pessoas, balões de conversa, aperto de mãos, cérebro, lâmpada, setas
  clichês, árvore de conhecimento, livros, chapéu de formatura.
- **NUNCA** versão "rede" com 6 pontos simétricos (vira hexagrama/Estrela de Davi).
- Sem distorção, sem sombra falsa, sem gradiente agressivo aplicado ao símbolo.
