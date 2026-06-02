# ASSET_INVENTORY — Inventário de Assets de Design

> Objetivo: registrar **todos** os arquivos recebidos de design, brandkit, referências e
> screenshots, com classificação de uso — para **impedir que referência LATAM+ vire asset de
> produção por acidente**.
>
> Fonte preservada (verbatim) em `docs/brand/source/`.

## Classificações usadas

| Classificação | Significado |
|---|---|
| **brand source of truth** | Identidade oficial MentorMatch (Claude Design). Base canônica. |
| **product UX reference** | Protótipo de produto MentorMatch para referência de fluxo/UX. |
| **legacy LATAM+ reference** | Origem do conceito no LATAM+; referência funcional, **nunca** asset. |
| **reference only, not for production** | Pode informar decisões, **não** pode ir para produção. |
| **production eligible asset** | Pode ser usado/gerado para produção (respeitadas as regras). |
| **missing asset** | Necessário para produção, ainda não existe. |

## Regra de proteção LATAM+ (obrigatória)

> Qualquer arquivo com **marca LATAM**, **identidade LATAM**, **screenshots do LATAM+**,
> **fotos reais** ou **elementos proprietários LATAM** é classificado como
> **reference only, not for production** — independentemente de qualquer outra utilidade.
> Nenhuma identidade LATAM vai para produção.

## 1. Arquivos efetivamente recebidos (entregues como arquivo)

Recebidos via upload (dois zips do Claude Design) e preservados em `docs/brand/source/`.

### 1.1 Brandkit — `docs/brand/source/assets/` (de `MentorMatch.zip`)

| Arquivo | Tipo | Origem | Conteúdo | Uso permitido | Restrições | Classificação |
|---|---|---|---|---|---|---|
| `brand.css` | CSS (tokens) | Claude Design | Tokens de cor, tipografia, espaço, raio, sombra, motion + base + botões | Fonte única de tokens; consumir no design system | Não criar tokens paralelos; cores novas só via oklch harmônico | **brand source of truth** |
| `marks.js` | JS (gera SVG) | Claude Design | API `window.mm`: `corrente` (logo), `lockup`, territórios `fluxo/abertura/multiplicacao/catalisador/rede` | Gerar símbolo/loader e exports a partir daqui | Sempre via `mm.*`; sem monograma MM, sem clichês | **brand source of truth** |
| `book.css` | CSS | Claude Design | Estilos de página do brand book | Referência de aplicação dos tokens | É estilo do brand book, não do produto | **brand source of truth** (referência de aplicação) |
| `brand-book.js` | JS | Claude Design | Interações do brand book (nav, reveal, copy de cor, tabs) | Referência de padrões de motion/reveal | Lição de reveal só por transform (ver MOTION_SYSTEM) | **brand source of truth** (referência de comportamento) |
| `brand-book.html` | HTML | Claude Design | Brand book scrollável (estratégia, símbolo, cor, tipo, motion, voz, aplicações) | Documento canônico de marca | — | **brand source of truth** |
| `SPEC-LLM-original.md` | Markdown | Claude Design | Especificação completa (tokens, paths SVG, classes, comportamentos, regras §13) | Fonte de verdade técnica da marca | Quando código e spec divergirem, o código vence | **brand source of truth** |

### 1.2 Protótipos de produto — `docs/brand/source/produto/` (de `MentorMatch__1_.zip`)

| Arquivo | Tipo | Origem | Conteúdo | Uso permitido | Restrições | Classificação |
|---|---|---|---|---|---|---|
| `Landing.html` | HTML | Claude Design | Protótipo de landing (hero, como funciona, resultados, plataforma, CTA) | Referência de estrutura/copy/UX da landing | CTA real da V1 = "Solicitar demonstração" (ver WEBSITE_DIRECTION) | **product UX reference** |
| `landing.css` | CSS | Claude Design | Estilos da landing | Referência de aplicação | — | **product UX reference** |
| `Dashboard.html` | HTML | Claude Design | App shell com troca de papel Admin/Mentor/Mentorado | Referência de UX do produto | Avatares por **iniciais**, não fotos | **product UX reference** |
| `dashboard.css` | CSS | Claude Design | Estilos do dashboard | Referência de aplicação | — | **product UX reference** |
| `App.html` | HTML | Claude Design | Conceito mobile (3 telas) | Referência de direção mobile (futuro) | Fora da V1 | **product UX reference** |

## 2. Verificação de conteúdo LATAM / fotos / proprietário

Varredura nos arquivos recebidos (`grep` por "latam", `<img>`, `background-image`):

- **Nenhuma marca/identidade/logo LATAM** foi entregue como arquivo.
- As menções a "LATAM" no `SPEC-LLM-original.md` e no `brand-book.html` são **textuais e de
  contexto** — "origem LATAM+" (produto-mãe) e "LATAM e além" (região/mercado). **Não são
  assets de marca LATAM.** Ainda assim, qualquer reuso dessas frases em superfícies públicas
  deve ser revisado para não sugerir co-branding com a LATAM.
- **Nenhuma foto real** foi entregue. Os avatares dos protótipos usam **iniciais** (ex.: "MA
  Marina Alves"), não imagens — seguro para produção.
- **Nenhum elemento proprietário LATAM** (logo, tipografia institucional, fotografia) presente.

## 3. Referências do LATAM+ ainda NÃO entregues como arquivo (registro preventivo)

As telas atuais do MentorMatch **dentro do LATAM+** existem (origem do produto) e serão
analisadas como referência funcional em
[LATAM_PLUS_REFERENCE_ANALYSIS.md](./LATAM_PLUS_REFERENCE_ANALYSIS.md). Caso venham a ser
anexadas (screenshots, exports, vídeos), ficam **desde já** classificadas:

| Item (se/quando recebido) | Classificação | Restrição |
|---|---|---|
| Screenshots do MentorMatch no LATAM+ | **legacy LATAM+ reference** / **reference only, not for production** | Só leitura de fluxo/UX; nenhum pixel vai a produção |
| Qualquer logo/identidade LATAM | **reference only, not for production** | Proibido em produção |
| Fotos reais de pessoas (LATAM ou stock) | **reference only, not for production** | Marca usa abstração, não fotos |
| Componentes/CSS proprietários LATAM | **reference only, not for production** | Reescrever do zero com tokens MentorMatch |

## 4. Assets de produção faltantes (missing asset)

A marca é **generativa** (SVG via `mm.*`); faltam exports estáticos, a serem **gerados a
partir de `mm.*`** (não recriados à mão):

| Asset | Para | Classificação |
|---|---|---|
| Favicon (`.ico`/`.svg` + PNG 16/32/48) | Navegador | **missing asset** → gerar de `mm.corrente` |
| App icons (PNG 180/192/512, maskable) | PWA/mobile | **missing asset** → `mm.corrente` |
| OG/social image (1200×630) | Compartilhamento | **missing asset** → lockup + campo de corrente |
| Lockup exportado (SVG/PNG, claro+escuro) | E-mails, slides, parceiros | **missing asset** → `mm.lockup` |
| Fontes self-hosted (woff2) | Performance/privacidade | **missing asset** (hoje Google Fonts `@import`) |
| Zip de marca para terceiros | Vendas/imprensa | **missing asset** |
| HTML transacional de e-mail na marca | Notificações | **missing asset** |
| Logo placeholder para demo tenant | White-label/demo | **missing asset** → derivar de `mm.*` |

## 5. Resumo

- **Fonte da marca:** brandkit do Claude Design (`brand source of truth`). **Continua sendo a
  fonte principal da marca MentorMatch.**
- **Referências de UX:** protótipos de produto do Claude Design (`product UX reference`).
- **LATAM+:** nenhum asset LATAM foi recebido; qualquer referência futura é
  `reference only, not for production`. **Nenhuma identidade LATAM em produção.**
- **Faltantes:** exports estáticos gerados a partir de `mm.*` (não bloqueiam o Slice 0).
