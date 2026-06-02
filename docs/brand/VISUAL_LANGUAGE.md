# VISUAL_LANGUAGE — Símbolo, Ilustração e Sistema Visual

> Fonte: brandkit Claude Design. Símbolos são **gerados por código** em
> `source/assets/marks.js` (API `window.mm`), grade conceitual **100×100**. Sempre via
> `mm.*` — não desenhar SVG à mão.

## 1. Símbolo vencedor — "A Corrente" (`mm.corrente`)

Dois braços de corrente (mentor + mentorado) girando em torno de um **nó central** (o
"match"). Sem começo nem fim: circulação. Um braço em `ink`, outro em `accent` — duas
partes, um só movimento.

- Braço (path único, espelhado por `rotate(180 50 50)`):
  `M 50 15 C 71 17, 81 35, 69 51 C 62 61, 53 58, 51 50`
- `stroke-width` (weight) default **9**, `stroke-linecap="round"`.
- Nó central: `circle cx=50 cy=50 r=weight*0.66 (=5.94)`.
- Sempre com `aria-label`/`role="img"`.

### Aplicações cromáticas
| Uso | Fundo | ink | accent |
|---|---|---|---|
| Favicon | `#F4ECE0` | `#14100D` | `#FF4A1C` |
| App icon | `#14100D` | `#F4ECE0` | `#FF4A1C` |
| Avatar social | `#FF4A1C` | `#FFFFFF` | `#14100D` |
| Mono / 1 cor | `#14463B` | `#DCEDE6` | `#5FA892` |

## 2. Territórios de exploração (papéis no sistema)

- **`mm.multiplicacao`** — filotaxia (girassol/Fibonacci): textura/padrão de fundo,
  prova de escala. Não é logo.
- **`mm.catalisador`** — gravity assist: vira linguagem de **motion** (o gesto do
  impulso).
- **`mm.rede`** — constelação **assimétrica**. **NUNCA** 6 pontos simétricos (vira
  hexagrama/Estrela de Davi — proibido).
- **`mm.abertura`** — íris de 6 lâminas (exploração; estática demais p/ vencer).
- **`mm.lockup`** — símbolo + wordmark (`Mentor` 700 + `match` 500).

## 3. Ilustração

Linguagem **abstrata e generativa**: **campos de corrente** — linhas e pontos que
fluem, adensam onde há troca, rareiam no silêncio. Profundidade por sobreposição e
opacidade, **nunca** sombra falsa.

## 4. Proibições (recap)

Sem stock photos, sem pessoas sorrindo em escritório, sem ilustração SaaS genérica,
sem monograma MM, sem clichês (balões, lâmpada, aperto de mãos, cérebro, livros,
árvore), sem azul de marca. Ver [LOGO_USAGE.md](./LOGO_USAGE.md) e
[BRAND_STRATEGY.md](./BRAND_STRATEGY.md).
