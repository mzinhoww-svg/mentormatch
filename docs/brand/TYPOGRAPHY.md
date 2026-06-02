# TYPOGRAPHY — Sistema Tipográfico

> Fonte: brandkit Claude Design (`source/assets/brand.css`, `source/spec/`). Três
> famílias, sem Inter/Roboto/Arial/Fraunces.

## 1. Famílias

| Papel | Família | Uso |
|---|---|---|
| **Display** | `Instrument Serif` (400, +itálico) | Manchetes, manifesto, frases de marca. Sempre grande; itálico p/ ênfase. Editorial, com opinião. |
| **Heading/Body/UI** | `Hanken Grotesk` (300–800) | Cavalo de batalha: títulos de UI, corpo, botões, produto. Substitui Inter/Roboto. |
| **Mono/Dados** | `Space Mono` (400/700, +itálico) | Eyebrows, labels, métricas, datas, código. Textura "infraestrutura". |

```
--serif 'Instrument Serif', Georgia, serif
--sans  'Hanken Grotesk', system-ui, sans-serif
--mono  'Space Mono', ui-monospace, monospace
```

Hoje via Google Fonts `@import`; self-host (woff2) é `missing asset` (ver
[ASSET_INVENTORY.md](./ASSET_INVENTORY.md)).

## 2. Escala (classes em `brand.css`)

```
.d-1  400 clamp(48px,9vw,132px)/0.94  letter-spacing -.025em   (serif)
.d-2  400 clamp(38px,6vw,84px)/0.98   letter-spacing -.02em    (serif)
.h-1  clamp(28px,3.4vw,46px)/1.04      letter-spacing -.025em
.h-2  clamp(22px,2.4vw,32px)/1.08      letter-spacing -.02em
.lead clamp(19px,1.8vw,24px)/1.45      (cor --ink-2)
```

- **Body base:** `17px / 1.55`, peso 400.
- **Headings:** peso 600, `letter-spacing:-0.02em`.

## 3. Utilidades

```
.serif   font-family var(--serif)
.mono    font-family var(--mono)
.eyebrow 400 12px var(--mono); letter-spacing .18em; uppercase; color var(--muted)
```

`.eyebrow` é o rótulo-padrão acima de cada título de seção.

## 4. Regras

- Tipografia é **parte da identidade do produto** → **não** é white-label na V1.
- Em mobile alvo de toque ≥ 44px; em slides 1920×1080 nunca texto < 24px.
- Itálico do serif reservado para ênfase de marca, não corpo corrido.
