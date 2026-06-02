# DESIGN_SYSTEM — Base do Design System

> **Status:** base documental. Nenhum componente final foi implementado ainda (proibido no
> Slice 0B). Este documento define tokens, princípios, acessibilidade, white-label e regras de
> consistência para a implementação no **Slice 0**. A fonte de marca é
> [BRANDKIT.md](./BRANDKIT.md) e [brand/](./brand/); os valores literais abaixo vêm do
> brandkit aprovado no Claude Design (`docs/brand/source/assets/brand.css`).

## 1. Princípio único

**Um único design system desde o início.** Sem tokens paralelos, sem tema legado, sem
componentes duplicados. Tudo serve à frase **"o conhecimento circula"**: se um elemento novo
não reforça circulação/movimento/transferência, está errado.

## 2. Tokens (fonte: `brand.css`)

Os tokens vivem em `:root` de `brand.css`. **Regra:** usar **somente** estes tokens. Cores
novas só via `oklch` harmonizando com a paleta — preferir não inventar.

### 2.1 Cor

```
TINTA   (fundação, quase-preto quente)
  --tinta-900 #14100D  --tinta-800 #1E1812  --tinta-700 #2C241C
  --tinta-600 #41372C  --tinta-500 #5C4F41
BRASA   (accent assinatura, vermilion/ember — o catalisador)
  --brasa-700 #C9340E  --brasa-600 #E63E12  --brasa-500 #FF4A1C
  --brasa-400 #FF6E45  --brasa-300 #FF9A78  --brasa-100 #FFE2D6
JADE    (crescimento, verde profundo)
  --jade-800 #0E342B   --jade-700 #14463B   --jade-600 #1B5C4C
  --jade-500 #257A64   --jade-300 #5FA892   --jade-100 #DCEDE6
ARGILA  (neutro quente — papel)
  --argila-50 #FBF7F0  --argila-100 #F4ECE0  --argila-200 #E9DDCB
  --argila-300 #D8C8B0 --argila-400 #BDAB90
SEMÂNTICO
  --success #1B5C4C    --warning #E8A317     --error #D23B2E
ALIASES
  --ink #14100D  --ink-2 #2C241C  --muted #6E6052
  --paper #FBF7F0  --paper-2 #F4ECE0  --line #E2D6C4  --line-strong #C9B79C  --accent #FF4A1C
```

Detalhe de papel/psicologia/contraste em [brand/COLOR_SYSTEM.md](./brand/COLOR_SYSTEM.md).

### 2.2 Tipografia

```
--serif 'Instrument Serif', Georgia, serif        → display, manifesto, frases de marca
--sans  'Hanken Grotesk', system-ui, sans-serif   → headings, body, UI, botões (cavalo de batalha)
--mono  'Space Mono', ui-monospace, monospace     → eyebrows, labels, métricas, código
```

Escala display: `.d-1 .d-2 .h-1 .h-2 .lead`; body base `17px/1.55` peso 400; headings peso
600, `letter-spacing:-0.02em`. Detalhes em [brand/TYPOGRAPHY.md](./brand/TYPOGRAPHY.md).

### 2.3 Espaço, raio, sombra (escala 4px)

```
ESPAÇO  --sp-1 4 · --sp-2 8 · --sp-3 12 · --sp-4 16 · --sp-5 24 · --sp-6 32 · --sp-7 48 · --sp-8 64 · --sp-9 96 · --sp-10 128 · --sp-11 192 (px)
RAIO    --r-sm 6 · --r-md 10 · --r-lg 16 · --r-xl 24 · --r-pill 999 (px)
SOMBRA  --sh-1 (sutil) · --sh-2 (hover) · --sh-3 (elevação) — todas quentes, base rgba(20,16,13,…)
CONTAINER  .wrap max 1240px · .wrap-narrow max 820px · padding lateral 32px
```

### 2.4 Motion

```
--ease-flow cubic-bezier(.65,.05,.20,1)  (assinatura: acelera no encontro, desacelera ao entregar)
--ease-out  cubic-bezier(.16,1,.3,1)
--dur-1 180ms · --dur-2 320ms · --dur-3 560ms · --dur-4 900ms
```

Linguagem completa em [brand/MOTION_SYSTEM.md](./brand/MOTION_SYSTEM.md).

## 3. Acessibilidade (obrigatória)

- **Reduced motion:** respeitar `@media (prefers-reduced-motion: reduce)` zerando durações.
- **Reveal on scroll só com `transform`**, conteúdo **visível por padrão**. Nunca esconder
  conteúdo com `opacity:0` dependente de JS (lição crítica do brandkit; pior caso = animação
  não roda, conteúdo continua visível).
- **Contraste:** fundos escuros usam `--argila-100/-200/-300` para texto; `--muted #6E6052`
  para texto secundário em fundo claro. Validar AA no Slice 0.
- **Alvo de toque ≥ 44px** em mobile; em superfícies grandes (slides 1920×1080) nunca texto
  < 24px.
- Marca de símbolo sempre com `aria-label`/`role="img"` (já no `mm.corrente`).

## 4. White-label (tokenizado desde a primeira tela)

- O branding por tenant é injetado via **tokens**, nunca hard-coded. A marca MentorMatch é o
  **default**; um tenant pode sobrepor um subconjunto controlado de tokens.
- **Tokens white-label pretendidos (mapa para o Slice 0):**

| Token de marca | White-label? | Observação |
|---|---|---|
| `--accent` (`--brasa-500`) | **Sim** (controlado) | cor de marca do tenant; precisa passar contraste AA |
| `--ink` / `--paper` | Limitado | manter calor/legibilidade; evitar branco frio |
| logotipo (lockup) | **Sim** | asset do tenant; fallback = lockup MentorMatch |
| `--serif`/`--sans`/`--mono` | Não (V1) | tipografia é parte da identidade do produto |
| motion/espaço/raio/sombra | Não | consistência estrutural do produto |

- **Limites:** white-label ajusta **acento + logo** (e, com cautela, ink/paper); **não**
  troca a tipografia nem a estrutura do sistema na V1. Isso preserva a personalidade
  "Circulação" enquanto acomoda a marca do cliente. (Custom domain a partir do tier Enterprise —
  ver [DEPLOYMENT.md](./DEPLOYMENT.md).)
- Tema escuro/seções escuras já previstos via `--tinta-900` + `--argila-*`.

## 5. Regras de consistência

- Símbolos sempre via API `mm.*` (`corrente`, `lockup`, etc.) — não desenhar SVG à mão.
- Tipografia **somente** Instrument Serif / Hanken Grotesk / Space Mono.
- Accent (Brasa) **com parcimônia**: é a faísca, não o fundo. Bloco grande de accent só no
  CTA final/avatar.
- Sem azul de marca, sem gradiente agressivo de fundo, sem emoji, sem stock photo, sem
  ilustração SaaS genérica (ver proibições em [BRANDKIT.md](./BRANDKIT.md)).
- HTML canônico/editável: fechar toda tag não-void, aspas duplas em atributos; `gap` para
  espaçar grupos (não margens soltas).

## 6. Checklist de aceitação (todo elemento novo)

- [ ] Reforça "o conhecimento circula"?
- [ ] Usa apenas tokens de `brand.css`?
- [ ] Tipografia = Instrument Serif / Hanken Grotesk / Space Mono?
- [ ] Símbolos via `mm.*`?
- [ ] Acessível (reduced-motion, contraste, alvo de toque, reveal só por transform)?
- [ ] Sem nenhum item das proibições de marca?
- [ ] Poderia ser confundido com SaaS de RH genérico? → se sim, **descartar e refazer**.

## 7. O que falta para implementar no Slice 0

- Materializar tokens como camada única (CSS vars / tema) consumível por componentes.
- Mecanismo de override white-label por tenant (acento + logo) com validação de contraste.
- Biblioteca de componentes base (botões já especificados em `brand.css`; demais a construir).
- Validação AA automatizada e testes de acessibilidade.
