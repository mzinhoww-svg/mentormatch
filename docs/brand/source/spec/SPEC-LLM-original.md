# MentorMatch — Especificação Completa para LLM

> **Propósito deste documento.** Este arquivo é a fonte única de verdade do sistema de marca e produto MentorMatch, escrito para ser lido e interpretado por um modelo de linguagem. Ele descreve cada decisão estratégica, cada token, cada path de SVG, cada classe de CSS e cada comportamento de JavaScript do projeto. Uma LLM deve conseguir, lendo só este documento, **reconstruir, estender ou auditar** qualquer parte do projeto sem abrir os arquivos-fonte. Valores são citados de forma literal (hex, px, paths). Quando este documento e o código divergirem, o código vence — mas o objetivo é que não divirjam.

---

## 0. Como usar este documento

- **Para reproduzir um elemento:** vá à seção do elemento (símbolo §5, cor §6, tipografia §7, componentes §10) e use os valores literais.
- **Para estender o projeto:** leia §13 (Regras de extensão) antes de criar qualquer coisa nova. Há proibições rígidas herdadas do brief original.
- **Idioma:** todo conteúdo de interface e marca é em **Português do Brasil**. Nomes de tokens, classes e funções são em PT/EN misto conforme o código.
- **Unidade mental do projeto:** "o conhecimento circula". Tudo — símbolo, cor, motion, copy — serve a essa frase. Se um elemento novo não reforça circulação/movimento/transferência, está errado.

---

## 1. Visão geral do projeto

**MentorMatch** é um SaaS de **mentoria corporativa**, multi-tenant, para empresas de qualquer porte (origem LATAM+). O projeto entrega um **sistema de marca completo** + **protótipos clicáveis de produto**.

### 1.1 Estrutura de arquivos

```
/
├── index.html                  → Brand Book (site scrollável; deliverable principal)
├── assets/
│   ├── brand.css               → Tokens (cor, tipo, espaço, raio, motion) + base + botões
│   ├── book.css                → Estilos de página do Brand Book
│   ├── marks.js                → Sistema de símbolos (gera SVG via JS). Expõe window.mm
│   └── brand-book.js           → Interações do Brand Book (nav, reveal, tabs, copy de cor)
├── produto/
│   ├── Landing.html            → Landing page (hero + preview de produto com abas)
│   ├── landing.css             → Estilos da landing
│   ├── Dashboard.html          → App shell com troca de papel Admin/Mentor/Mentorado
│   ├── dashboard.css           → Estilos do dashboard
│   └── App.html                → Conceito mobile (3 telas em mockups de phone)
└── MentorMatch — Especificação LLM.md  → ESTE documento
```

### 1.2 Dependências de cada arquivo

| Arquivo | Importa |
|---|---|
| `index.html` | `assets/brand.css`, `assets/book.css`, `assets/marks.js`, `assets/brand-book.js` |
| `produto/Landing.html` | `../assets/brand.css`, `landing.css`, `../assets/marks.js` + script inline |
| `produto/Dashboard.html` | `../assets/brand.css`, `dashboard.css`, `../assets/marks.js` + script inline |
| `produto/App.html` | `../assets/brand.css`, `../assets/marks.js` + `<style>` inline |

`marks.js` é a única dependência de JS compartilhada. Não há frameworks (sem React/Vue). Fontes via Google Fonts (`@import` em `brand.css`).

---

## 2. Conceito e estratégia

### 2.1 Conceito-mãe: **"A Corrente" (Fluxo)**
O conhecimento é tratado como uma **corrente** — energia que circula, ganha força ao passar de pessoa para pessoa e **nunca se esgota**. O oposto da corrente é o **estoque** (conhecimento parado, arquivado, perdido). A marca afirma *circulação*, não *transação* ("uma pessoa ensina outra").

Frase-síntese: **"O conhecimento circula."** (na home aparece como *"O conhecimento não para. Ele circula."*)

### 2.2 Posicionamento (statement canônico)
> Para empresas que tratam pessoas como seu maior ativo, **MentorMatch** é a plataforma de mentoria que conecta quem sabe a quem precisa saber — com método, em escala e medindo impacto. Diferente de plataformas de RH que apenas registram treinamentos, o MentorMatch faz o conhecimento **circular**.

### 2.3 Pilares estratégicos (usados como cards no Brand Book)
- **Problema:** conhecimento crítico mora na cabeça de poucos; some quando eles saem ou ficam ocupados. Treinamento formal não transfere contexto/julgamento/repertório.
- **Promessa:** transformar a experiência acumulada num sistema que circula — conexões certas, no momento certo, com acompanhamento e resultado visível ao negócio.
- **Audiência:** Líderes de Pessoas & Cultura, L&D, founders. Scale-ups a corporações multi-tenant (LATAM+).
- **Inimigo:** a estagnação. Conhecimento parado, silos, gente travada.

### 2.4 Manifesto (texto canônico)
1. O conhecimento nunca foi feito para ficar parado.
2. Ele só vale alguma coisa quando se **move** — de quem aprendeu para quem ainda vai aprender.
3. A maioria das empresas trata conhecimento como estoque. Guarda, arquiva, perde.
4. Nós tratamos como **corrente**. Mentoria não é uma pessoa ensinando outra — é energia que passa adiante e volta multiplicada.
5. Cada conversa abre um caminho. Cada caminho vira rede. Cada rede vira cultura.
6. Quando o conhecimento circula, ninguém cresce sozinho.
7. — Passe adiante.

---

## 3. Naming

- **Decisão:** manter **MentorMatch**.
- **Riscos identificados:** (a) soar como *marketplace* de mentor avulso; (b) "Match" remeter a *dating app* (par romântico).
- **Mitigação:** tratar **match** como **verbo** (combinar conhecimento), não substantivo (par). No lockup, escreve-se como **palavra única e contínua**: `Mentor` em peso 700 + `match` em peso 500, mesma cor.
- **Arquiteturas avaliadas e descartadas:** Circula, Corrente, Relay, Fluxo (todas mais abstratas e menos buscáveis).

---

## 4. Territórios conceituais (exercício estratégico)

10 territórios explorados. **Vencedor: Fluxo.** Top 3 desenvolvidos: Fluxo, Multiplicação, Catalisadores.

| # | Território | Significado | Papel final |
|---|---|---|---|
| 01 ★ | **Fluxo** | Conhecimento que se move e nunca se esgota | **Vencedor** → símbolo "A Corrente" |
| 02 | **Multiplicação** | Cada troca gera novas trocas; espalha | Prova de escala/ROI; vira textura (filotaxia) |
| 03 | **Catalisadores** | Mentor acelera sem se gastar | Dá dignidade ao mentor; vira gesto de motion |
| 04 | Constelações | Pessoas como pontos que formam mapa | Estrutura mapas de relacionamento |
| 05 | Legado | O que fica quando alguém passa adiante | Tom de voz |
| 06 | Conexões | O encontro certo no momento certo | — |
| 07 | Redes | Inteligência coletiva distribuída | Símbolo de exploração "rede" |
| 08 | Transferência | Contexto e julgamento que mudam de mãos | — |
| 09 | Ecossistemas | Organismo que se sustenta | — |
| 10 | Crescimento exponencial | Curva que dobra a cada ciclo | Métricas |

**Decisão final:** Fluxo é território-mãe; Multiplicação e Catalisadores são camadas de prova. *A marca afirma circulação; o produto prova multiplicação; a voz dá crédito ao catalisador.*

---

## 5. Sistema de símbolos

Todos os símbolos são **gerados por JavaScript** em `assets/marks.js`, que expõe `window.mm`. Cada função retorna uma **string SVG** com `viewBox="0 0 100 100"`. Toda marca vive numa grade conceitual de **100×100**.

### 5.1 API pública (`window.mm`)

```js
mm.corrente({ size, ink, accent, weight })   // MARCA VENCEDORA
mm.fluxo(opts)                                 // alias de corrente
mm.abertura(opts)
mm.multiplicacao(opts)
mm.catalisador(opts)
mm.rede(opts)
mm.lockup({ size, ink, accent })               // símbolo + wordmark
```

**Parâmetros (todos opcionais):**
- `size` (number, px) — largura/altura do SVG. Default `64` (lockup default `30`).
- `ink` (hex string) — cor primária do traço. Default `#14100D`.
- `accent` (hex string) — cor de destaque. Default `#FF4A1C`.
- `weight` (number) — espessura do traço, só em `corrente`. Default `9`.

**Padrão de injeção no HTML** (usado em todas as páginas):
```html
<div data-mark="corrente" data-size="90" data-ink="#F4ECE0" data-accent="#FF4A1C"></div>
```
```js
document.querySelectorAll('[data-mark]').forEach(el => {
  const fn = el.dataset.mark, size = +el.dataset.size || 64;
  const ink = el.dataset.ink, accent = el.dataset.accent;
  if (mm[fn]) el.innerHTML = mm[fn]({ size, ink, accent });
});
```

### 5.2 Helpers geométricos internos
```js
// ponto polar (deg medido a partir do topo, sentido horário)
pol(cx, cy, r, deg) => [cx + r*cos((deg-90)*π/180), cy + r*sin(...)]
// arco SVG aberto entre dois ângulos
arc(cx, cy, r, a0, a1) => "M x0 y0 A r r 0 large 1 x1 y1"   // large=1 se varredura > 180°
f(n) => n.toFixed(2)
```

### 5.3 MARCA VENCEDORA — "A Corrente" (`mm.corrente`)
**Conceito:** dois braços de corrente (mentor + mentorado) girando em torno de um nó central. Sem começo nem fim: circulação. Um braço em `ink`, outro em `accent` — duas partes, um só movimento. O nó central é o "match".

**Construção exata:**
- Braço (path único, reutilizado): `M 50 15 C 71 17, 81 35, 69 51 C 62 61, 53 58, 51 50`
- Braço 1: stroke `ink`, `stroke-width=weight (9)`, `stroke-linecap="round"`.
- Braço 2: **mesmo path**, stroke `accent`, com `transform="rotate(180 50 50)"`.
- Nó central: `<circle cx="50" cy="50" r="weight*0.66 (=5.94)" fill="ink"/>`.

```html
<svg viewBox="0 0 100 100" fill="none" aria-label="MentorMatch" role="img" class="mm-mark">
  <path d="M 50 15 C 71 17, 81 35, 69 51 C 62 61, 53 58, 51 50" stroke="#14100D" stroke-width="9" stroke-linecap="round"/>
  <path d="M 50 15 C 71 17, 81 35, 69 51 C 62 61, 53 58, 51 50" stroke="#FF4A1C" stroke-width="9" stroke-linecap="round" transform="rotate(180 50 50)"/>
  <circle cx="50" cy="50" r="5.94" fill="#14100D"/>
</svg>
```

**Aplicações da marca vencedora (combinações cor/fundo):**
| Uso | Fundo | ink | accent |
|---|---|---|---|
| Favicon | `#F4ECE0` (argila-100) | `#14100D` | `#FF4A1C` |
| App icon | `#14100D` (tinta-900) | `#F4ECE0` | `#FF4A1C` |
| Avatar social | `#FF4A1C` (brasa-500) | `#FFFFFF` | `#14100D` |
| Mono / 1 cor | `#14463B` (jade-700) | `#DCEDE6` | `#5FA892` |

### 5.4 Territórios de exploração (não-vencedores)

**`mm.abertura`** — íris/aperture de 6 lâminas. Loop `i=0..5`, ângulo `i*60`; cada lâmina é arco `r=38` de `pol(50,50,12,a)` a `pol(50,50,38,a+36)`, stroke-width 6, round cap. Lâmina `i=0` em accent, resto ink. Centro: `circle r=4.5 fill=accent`. *Risco: parece lente/IA. Papel: estática demais para vencer.*

**`mm.multiplicacao`** — filotaxia (girassol/Fibonacci). `N=64` pontos; ângulo de ouro `golden = π*(3−√5)`; ponto `i`: `r=4.4*√i`, `a=i*golden`, `x=50+r·cos a`, `y=50+r·sin a`, raio do dot `1.1 + (i/N)*2.6`, cor accent se `i<4` senão ink, opacidade `0.35 + 0.65*(i/N)`. *Papel: textura/padrão de fundo, não logo.*

**`mm.catalisador`** — gravity assist. Corpo central `circle cx=50 cy=46 r=9 fill=ink`. Trajetória accent stroke-width 7: `M 14 78 C 30 64, 34 40, 50 40 C 66 40, 64 60, 78 48 C 86 41, 88 30, 88 22`. Ponto de saída `circle cx=88 cy=22 r=5 fill=accent`. *Papel: vira linguagem de motion (o gesto do impulso).*

**`mm.rede`** — constelação assimétrica. Pontos `[[22,34],[46,18],[74,30],[80,60],[50,80],[24,62]]`; corrente como polyline na ordem `0→1→2→3→4→5→0` (stroke ink 3.4, opacity .85); corda extra entre pts[2] e pts[5] (stroke ink 3, opacity .5). Nós: `circle r=4` (pt 0 em accent com `r=5.6`). **NUNCA** use 6 pontos simétricos em estrela (gera hexagrama/Estrela de Davi — proibido). A assimetria é obrigatória.

### 5.5 Lockup (`mm.lockup`)
- Símbolo `corrente` em `size = h*1.18`, seguido do wordmark.
- Wordmark: `font-family: var(--sans)` (Hanken Grotesk), `font-size = h*0.92`, `letter-spacing: -0.035em`, `line-height: 1`.
- Texto: `Mentor` em **weight 700** + `match` em **weight 500**, mesma cor `ink`. Escrito como palavra única (sem espaço).
- Gap símbolo↔texto: `h*0.34` px, via flex.

### 5.6 Animação do símbolo ("A Corrente" como loader)
Classe `.mm-live` aplica rotação contínua. O símbolo girando é o **loader padrão** do sistema.
```css
@keyframes mm-spin { to { transform: rotate(360deg); } }
.mm-live { animation: mm-spin 14s linear infinite; transform-origin: 50% 50%; }
```
(No App.html há variante `.mm-spin-x` com `4s` para a tela de "conectando".)

---

## 6. Cor — sistema "Circulação"

**Princípio:** NÃO começar pelo azul. Paleta quente e editorial = calor + inteligência, oposta ao "SaaS azul" genérico. Todos os tokens vivem em `:root` de `assets/brand.css`.

### 6.1 Tokens literais

```css
/* TINTA — fundação (quase-preto quente, nunca preto puro) */
--tinta-900: #14100D;   --tinta-800: #1E1812;   --tinta-700: #2C241C;
--tinta-600: #41372C;   --tinta-500: #5C4F41;

/* BRASA — accent assinatura (vermilion/ember, o catalisador) */
--brasa-700: #C9340E;   --brasa-600: #E63E12;   --brasa-500: #FF4A1C;
--brasa-400: #FF6E45;   --brasa-300: #FF9A78;   --brasa-100: #FFE2D6;

/* JADE — crescimento (verde profundo, não-clichê) */
--jade-800: #0E342B;    --jade-700: #14463B;    --jade-600: #1B5C4C;
--jade-500: #257A64;    --jade-300: #5FA892;    --jade-100: #DCEDE6;

/* ARGILA — neutro quente (papel, humano) */
--argila-50:  #FBF7F0;  --argila-100: #F4ECE0;  --argila-200: #E9DDCB;
--argila-300: #D8C8B0;  --argila-400: #BDAB90;

/* SEMÂNTICO */
--success: #1B5C4C;     --warning: #E8A317;     --error: #D23B2E;

/* ALIASES DE PAPEL/USO */
--ink:    var(--tinta-900);   --ink-2:  var(--tinta-700);   --muted: #6E6052;
--paper:  var(--argila-50);   --paper-2: var(--argila-100);
--line:   #E2D6C4;            --line-strong: #C9B79C;        --accent: var(--brasa-500);
```

### 6.2 Papel de cada cor (psicologia + uso)
- **Brasa `#FF4A1C` (primária/accent):** o catalisador. Energia que passa adiante, urgência humana, otimismo. **Usar com parcimônia** — é a faísca, não o fundo. CTAs, destaques, 1 braço do símbolo, números-chave.
- **Tinta `#14100D` (fundação):** intelecto, permanência, legado. Fundo de seções escuras, texto, 1 braço do símbolo. Mais acolhedor que preto (tem terra dentro).
- **Jade `#1B5C4C` (secundária):** crescimento sem o verde-startup clichê. Estados de sucesso, barras alternadas, seções de naming.
- **Argila (neutro):** papel, calor, humanidade. Fundos (`--paper` = `#FBF7F0`), linhas (`--line`), nunca branco frio.

### 6.3 Escala neutra (ordem do mais claro ao mais escuro)
`#FBF7F0 → #F4ECE0 → #E9DDCB → #D8C8B0 → #BDAB90 → #5C4F41 → #2C241C → #14100D`

### 6.4 Regra de contraste
Fundos escuros usam `--argila-100/-200/-300` para texto. `--muted (#6E6052)` para texto secundário em fundo claro. Accent nunca como bloco grande de fundo exceto no CTA final e avatar.

---

## 7. Tipografia

Três famílias (Google Fonts), importadas no topo de `brand.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@300;400;500;600;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
--serif: 'Instrument Serif', Georgia, serif;
--sans:  'Hanken Grotesk', system-ui, sans-serif;
--mono:  'Space Mono', ui-monospace, monospace;
```

| Papel | Família | Uso |
|---|---|---|
| **Display** | Instrument Serif (400, +itálico) | Manchetes, manifesto, frases de marca. Sempre grande, itálico p/ ênfase. Editorial, com opinião. |
| **Heading/Body/UI** | Hanken Grotesk (300–800) | Cavalo de batalha: títulos de UI, corpo, botões, produto. Substitui Inter/Roboto. |
| **Mono/Dados** | Space Mono (400/700, +itálico) | Eyebrows, labels, métricas, datas, código. Dá textura "infraestrutura". |

### 7.1 Escala display (classes em `brand.css`)
```css
.d-1  { font: 400 clamp(48px,9vw,132px)/0.94 var(--serif); letter-spacing:-.025em; }
.d-2  { font: 400 clamp(38px,6vw,84px)/0.98 var(--serif); letter-spacing:-.02em; }
.h-1  { font-size: clamp(28px,3.4vw,46px); line-height:1.04; letter-spacing:-.025em; }
.h-2  { font-size: clamp(22px,2.4vw,32px); line-height:1.08; letter-spacing:-.02em; }
.lead { font-size: clamp(19px,1.8vw,24px); line-height:1.45; color: var(--ink-2); }
```
Body base: `17px / 1.55`, weight 400. Headings: weight 600, `letter-spacing:-0.02em`, `line-height:1.02`.

### 7.2 Utilidades tipográficas
```css
.serif  { font-family: var(--serif); }
.mono   { font-family: var(--mono); }
.eyebrow{ font: 400 12px var(--mono); letter-spacing:.18em; text-transform:uppercase; color:var(--muted); }
.kicker-accent { color: var(--brasa-500); }
```
**`.eyebrow`** é o rótulo-padrão acima de cada título de seção (mono, caixa-alta, tracking largo).

---

## 8. Espaço, raio, sombra, motion (tokens)

```css
/* ESPAÇO (escala 4px) */
--sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px;
--sp-6:32px; --sp-7:48px; --sp-8:64px; --sp-9:96px; --sp-10:128px; --sp-11:192px;

/* RAIO */
--r-sm:6px; --r-md:10px; --r-lg:16px; --r-xl:24px; --r-pill:999px;

/* MOTION */
--ease-flow: cubic-bezier(0.65,0.05,0.20,1);   /* assinatura: acelera no encontro, desacelera ao entregar */
--ease-out:  cubic-bezier(0.16,1,0.3,1);
--dur-1:180ms; --dur-2:320ms; --dur-3:560ms; --dur-4:900ms;

/* SOMBRA (quente, baixa) */
--sh-1: 0 1px 2px rgba(20,16,13,.06), 0 1px 1px rgba(20,16,13,.04);
--sh-2: 0 4px 14px rgba(20,16,13,.08), 0 2px 4px rgba(20,16,13,.05);
--sh-3: 0 18px 50px rgba(20,16,13,.14), 0 6px 16px rgba(20,16,13,.08);
```

**Container:** `.wrap { max-width:1240px; margin:auto; padding:0 32px; }` · `.wrap-narrow { max-width:820px; ... }`

---

## 9. Linguagem de motion

Princípio único: **tudo se move como uma corrente — entra, ganha energia, segue.** Nada surge do nada.

| Princípio | Comportamento | Implementação |
|---|---|---|
| Fluxo | Elementos entram de um lado, aceleram no foco, seguem | translateX + scale, `--ease-flow` |
| Crescimento | Estados expandem a partir da origem | `transform: scale()`, `--ease-out`, `--dur-3` |
| Hover vivo | Toque eleva (-3px) e esquenta (vira brasa) | transition em `--dur-2`, sombra `--sh-2` |
| Loader | O símbolo "A Corrente" gira | `.mm-live`, 14s linear infinite |
| Transição | Telas deslizam na direção da leitura | continuidade espacial |
| Curva-assinatura | `--ease-flow` = `cubic-bezier(.65,.05,.20,1)` | usar em movimentos de "entrega" |

**Acessibilidade (obrigatória):**
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
}
```

### 9.1 ⚠️ Lição crítica de implementação (reveal on scroll)
O ambiente de preview **não anima `opacity` de forma confiável** quando a classe é adicionada por JS — conteúdo pode ficar **invisível**. **Regra:** entrada por scroll usa **somente `transform`**, fill-mode default (`none`), e conteúdo é **visível por padrão**. Nunca esconda conteúdo com `opacity:0` dependente de JS.
```css
.reveal { /* visível por padrão */ }
.reveal.in { animation: reveal-rise var(--dur-3) var(--ease-out); }
@keyframes reveal-rise { from { transform: translateY(20px); } to { transform: none; } }
```
JS adiciona `.in` quando o elemento entra em `top < innerHeight*0.9` (ver §11.2). Pior caso: animação não roda → conteúdo continua visível. Nunca use `opacity` aqui.

---

## 10. Componentes & classes de CSS

### 10.1 Botões (`brand.css`)
```
.btn               base: pill, weight 600, 15px, padding 13px 24px, flex gap 8px
.btn-primary       bg brasa-500 → hover brasa-600 + translateY(-1px) + sh-2
.btn-ink           bg tinta-900, texto argila-50 → hover tinta-700
.btn-ghost         transparente, border line-strong → hover border ink
```

### 10.2 Brand Book (`book.css`) — classes-chave
- **Nav:** `.topnav` (fixa), `.topnav.scrolled` (blur + bg), `.nav-links a` (mono, uppercase), `.active`.
- **Seção:** `.sec` (padding vertical clamp 72–150px), `.sec-ink` (fundo tinta-900), `.sec-jade` (fundo jade-800), `.sec-line` (border-top), `.sec-head` (eyebrow + `.sec-num` brasa), `.reveal`.
- **Hero:** `.hero` (100vh), `.hero-mark` (símbolo gigante opacity .06), `.hero-meta` (blocos com border-left brasa).
- **Manifesto:** `.manifesto p` (serif clamp 26–50px), `.accent` (brasa-400), `.sign` (mono).
- **Territórios:** `.terr-grid` (5 col), `.terr`, `.terr.win` (fundo escuro = vencedor), `.top3` / `.t3` (cards top-3 com `.mk` ícone).
- **Naming:** `.name-grid`, `.risk.warn` / `.risk.ok` (tags), `.verdict` (bloco brasa).
- **Símbolo:** `.dir-tabs` / `.dir-tab` / `.dir-tab.is-win` (vencedor em brasa) / `.dir-panel` / `.dir-stage(.ink)` / `.win-apps` / `.win-app`.
- **Cor:** `.pal` (4 col) / `.swatch[data-hex]` (clicável, copia hex) / `.sw-copied` (toast) / `.scale-row`.
- **Tipografia:** `.type-spec` (grid 200px+1fr) / `.spec-big` (serif) / `.spec-alpha`.
- **Motion:** `.motion-grid` / `.motion-card` (demos animam no `:hover`) / `.demo-dot` / `.demo-grow` / `.demo-hover`.
- **Ilustração:** `.illo-grid` / `.illo` (quadrados com SVG/símbolo).
- **Voz:** `.voice-col.do` (jade) / `.voice-col.dont` (vermelho claro), `li::before` = `→` / `×`.
- **Slogans:** `.slo-hero` (3 col) / `.slo-big` / `.slo-chip`.
- **Aplicações:** `.app-grid` (6 col) / `.app-card(.span2/.span3)` / `.label` / mockups CSS `.tee`, `.badge-mk`, `.badge-card`.
- **Footer:** `.colophon` (tinta-900) / `.colo-grid`.

### 10.3 Landing (`landing.css`)
- `.lp-nav(.scrolled)`, `.lp-hero`, `.lp-pill` (badge brasa-100), `.lp-trust` (números).
- **Preview de produto:** `.lp-preview` (janela), `.lp-pv-bar` (3 dots de janela), `.lp-pv-tabs` / `.lp-pv-tab(.active)`, `.lp-pv-pane(.active)`. Widgets: `.pv-card`, `.pv-list`/`.pv-li`/`.pv-av`/`.pv-tag`, `.pv-bars` (mini-gráfico).
- `.lp-steps`/`.lp-step` (3 movimentos: Conecta/Circula/Multiplica), `.lp-band` (números, fundo tinta), `.lp-feat`/`.feat`, `.lp-final` (CTA brasa), `.lp-foot`.

### 10.4 Dashboard (`dashboard.css`)
- **Shell:** `.app` (grid `248px 1fr`), `.side` (sidebar tinta-900 sticky), `.main`, `.topbar` (sticky, blur), `.content` (max 1200px).
- **Sidebar:** `.role-switch`/`.role-btn(.active=brasa)` (troca de papel), `.side-nav`/`.nav-item(.active)`/`.side-lbl`, `.side-user`.
- **Cards/stats:** `.grid-4`, `.grid-2` (1.6fr+1fr), `.card(.pad0)`, `.stat .v` (34px 700), `.stat .d.up/.dn`, `.card-h`.
- **Gráfico:** `.chart` (height 180px, `align-items:flex-end`), `.chart .col` (**`height:100%`** — obrigatório p/ barras % funcionarem), `.chart .bar` (height em %), `.col.hi .bar` (brasa-500).
- **Listas:** `.row-item`/`.av`/`.tag.green|.ember|.gray`, `.btn-sm(.ghost)`, `.prog`/`.prog>span`.
- **Mentorado:** `.session-hero` (card tinta-900 c/ símbolo deco), `.mentor-grid`/`.mcard`.
- **Responsivo:** `<760px` a sidebar vira topo horizontal; `.side-nav`/`.side-user` somem.

### 10.5 App mobile (`App.html`, `<style>` inline)
- `.phone` (bezel tinta-900, raio 44px, padding 12px), `.screen` (height 620px, raio 34px), `.notch`, `.sbar` (status bar), `.scr-body`, `.tabbar`/`.t(.on)`, `.ph-cap` (legenda mono).
- Telas: **Home** (corrente do dia), **Sessão** (vídeo, símbolo girando), **Descobrir** (matching).

---

## 11. Comportamentos de JavaScript

### 11.1 `brand-book.js` — responsabilidades
1. **Injeção de marcas:** varre `[data-mark]`, chama `mm[fn]`.
2. **Scroll-spy:** destaca link de `.nav-links` da seção atual (offset +120px).
3. **Nav bg:** adiciona `.scrolled` à `.topnav` quando `scrollY > 40`.
4. **Reveal:** ver §11.2.
5. **Copy de cor:** clique em `.swatch[data-hex]` → `navigator.clipboard.writeText(hex)` + mostra `.sw-copied` por 1100ms.
6. **Tabs de símbolo:** `.dir-tab[data-dir]` → ativa `.dir-tab` e `#dir-{dir}` painel correspondente.

### 11.2 Padrão de reveal (robusto — copie literalmente)
```js
const reveals = [...document.querySelectorAll('.reveal:not(.in)')];
const showEl = (el) => el.classList.add('in');
const checkReveal = () => {
  const vh = innerHeight;
  for (let i = reveals.length - 1; i >= 0; i--) {
    const r = reveals[i].getBoundingClientRect();
    if (r.top < vh*0.9 && r.bottom > -40) { showEl(reveals[i]); reveals.splice(i,1); }
  }
};
addEventListener('scroll', checkReveal, {passive:true});
addEventListener('resize', checkReveal);
checkReveal(); setTimeout(checkReveal, 200);
```
**Não** usar IntersectionObserver (não disparou de forma confiável no preview) nem `opacity`.

### 11.3 Landing — script inline
- Injeção de marcas (idem §5.1).
- `.lp-nav.scrolled` em `scrollY > 30`.
- Tabs do preview: `.lp-pv-tab[data-pv]` → ativa `#pv-{pv}`.

### 11.4 Dashboard — troca de papel (núcleo do protótipo)
Objeto `NAV` define, por papel (`admin`/`mentor`/`mentorado`): `title`, `sub`, `user` (`[iniciais, nome, cargo]`), `items` (nav lateral).
```js
function setRole(role){
  document.querySelectorAll('.role-btn').forEach(b=>b.classList.toggle('active', b.dataset.role===role));
  document.querySelectorAll('.role-view').forEach(v=>v.classList.toggle('active', v.id==='view-'+role));
  renderNav(role);           // reescreve título, subtítulo, usuário e itens da sidebar
  scrollTo(0,0);
}
```
`renderNav` injeta `.nav-item` (primeiro = `.active`). Clique em item de nav apenas troca o destaque (delegação). Há 3 `.role-view` (`#view-admin`, `#view-mentor`, `#view-mentorado`); só uma `.active` por vez.

**Dados fictícios canônicos:** empresa **Nordia**; admin **Marina Alves** (Pessoas & Cultura); mentores: Marina Alves, Bruno Reis, Sofia Castro, Pedro Lima; mentorados: João Carvalho, Ana Moraes, Rafael Souza, Diana Klein, Letícia Tavares. Métricas: 312 conexões ativas, 1.284 horas circuladas, 92% retenção, 86 mentores, ramp-up 3.4×, −61% conhecimento perdido, +40k conexões.

---

## 12. Tom de voz, slogans e conteúdo

### 12.1 Voz
**É assim:** imperativo amigável ("Passe adiante", "Conecte", "Comece"); frases curtas, uma ideia por linha; conhecimento como protagonista, pessoas como heróis; otimismo com substância (promessa que o produto cumpre).

**NÃO é assim:** jargão de RH ("capital humano", "colaborador 360", "sinergia"); hype de IA ("revolucione", "powered by AI", "disrupção"); frieza corporativa/paternalismo; promessas vagas sem prova/número.

### 12.2 Slogans
**Finalistas (3):**
1. **Passe adiante.** (assinatura)
2. **Ninguém cresce sozinho.** (propósito)
3. **O conhecimento em movimento.** (categoria)

**Top 10:** Passe adiante. · Ninguém cresce sozinho. · O conhecimento em movimento. · A inteligência é coletiva. · Conhecimento que circula. · Cresça em rede. · O legado não para. · Sua empresa já sabe. Faça circular. · Aprenda de quem já viveu. · Mentoria em escala humana.

### 12.3 Aplicações documentadas no Brand Book
Landing (clicável), Dashboard 3 papéis (clicável), App mobile (clicável), **Camiseta** ("vestível, não brinde" — símbolo + "PASSE ADIANTE"), **Crachá** (eventos), **LinkedIn & Eventos** (social toolkit, fundo jade), todos como mockups CSS na `.app-grid`.

---

## 13. Regras de extensão (LER ANTES DE CRIAR QUALQUER COISA)

### 13.1 Proibições rígidas (herdadas do brief; quebrar = retrabalho)
**No símbolo/identidade, NUNCA criar:** monograma MM ou dois "M" entrelaçados; ícones genéricos de pessoas; balões de conversa; aperto de mãos; cérebro; lâmpada; setas clichês; árvore de conhecimento; livros; chapéu de formatura. **Nunca** partir de uma letra — o símbolo nasce do conceito.
**Nunca** o símbolo "rede" com 6 pontos simétricos (vira hexagrama/Estrela de Davi).
**Aparência proibida:** startup genérica, template de SaaS, "produto de IA", RH tradicional.

### 13.2 Proibições visuais gerais
Não usar azul como cor de marca. Não usar gradientes agressivos de fundo. Sem emoji (não faz parte da marca). Sem cantos arredondados + borda-accent-à-esquerda clichê. Sem fontes Inter/Roboto/Arial/Fraunces. Sem stock photos / pessoas sorrindo em escritório / ilustração SaaS genérica.

### 13.3 Obrigações
- Todo elemento novo deve reforçar **circulação/movimento/transferência**.
- Usar **somente** os tokens de `brand.css`. Cores novas só via `oklch` harmonizando com a paleta existente — preferir não inventar.
- Texto de UI sempre em PT-BR, na voz de §12.1.
- Símbolos sempre via `mm.*` (não desenhar SVG à mão se já existe a função).
- Em slides 1920×1080 nunca usar texto < 24px; em mobile, alvo de toque ≥ 44px.
- Reveal por scroll: só `transform`, conteúdo visível por padrão (§9.1, §11.2).
- Fechar toda tag não-void explicitamente; aspas duplas em todo atributo (HTML canônico, editável).
- `gap` em flex/grid para espaçar grupos de elementos — não margens soltas/whitespace.

### 13.4 Checklist de aceitação para algo novo
- [ ] Reforça "o conhecimento circula"?
- [ ] Usa apenas tokens de `brand.css`?
- [ ] Tipografia = Instrument Serif / Hanken Grotesk / Space Mono?
- [ ] Sem nenhum item da lista de proibições (§13.1–13.2)?
- [ ] Símbolos via `mm.*`?
- [ ] Poderia ser confundido com um SaaS de RH genérico? → se sim, **descartar e refazer**.

---

## 14. Glossário

| Termo | Significado no projeto |
|---|---|
| **A Corrente** | Símbolo vencedor; dois braços girando em torno de um nó |
| **Circulação** | Metáfora central: conhecimento que se move e não se esgota |
| **Brasa** | Cor accent `#FF4A1C` (o catalisador) |
| **Tinta** | Cor de fundação `#14100D` (quase-preto quente) |
| **Jade** | Verde secundário `#1B5C4C` (crescimento) |
| **Argila** | Família de neutros quentes (papel) |
| **Nó / match** | Centro do símbolo; ponto onde o conhecimento conecta |
| **Passe adiante** | Assinatura/slogan principal |
| **Estoque (inimigo)** | Conhecimento parado — o oposto da corrente |
| **Multi-tenant** | Cada empresa tem sua "corrente" isolada |

---

*Fim da especificação. Para qualquer ambiguidade, o código-fonte em `assets/` e `produto/` é a autoridade final.*
