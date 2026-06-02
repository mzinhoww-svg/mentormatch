# PRODUCT_UI_DIRECTION — Direção de UI do Produto

> Direção para as telas do produto (dentro do host de tenant). Referência de UX:
> `source/produto/Dashboard.html` e `App.html` (product UX reference — **aprender,
> não copiar**; reconstruir com tokens). Ver também
> [LATAM_PLUS_REFERENCE_ANALYSIS.md](./LATAM_PLUS_REFERENCE_ANALYSIS.md).

## 1. Princípios

- **Um único design system** desde a primeira tela (sem tema legado/duplicado).
- **White-label tokenizado:** componentes consomem `var(--mm-*)`; nunca cores
  literais. Override por tenant = **accent + logo** (com validação de contraste AA);
  fallback = marca MentorMatch. Ver [../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).
- **Privacidade na UI:** ContactInfo **oculto até o match aceito**; admin não vê
  conteúdo privado das relações (ver [../LGPD.md](../LGPD.md)).

## 2. App shell

- Troca de papel **Admin / Mentor / Mentorado** (dual role suportado).
- Sidebar + topbar; conteúdo com largura máxima; responsivo (sidebar → topo em
  mobile).
- Símbolo "A Corrente" como marca/loader; avatares por **iniciais**, **nunca** fotos.

## 3. Fluxos centrais da V1 (manual matching)

mentorado **busca** (área/skill/cargo/palavra-chave) → **solicita** → mentor
**aceita/recusa** → mentoria **ativa**. Capacidade do mentor → **waitlist**.
Notificações in-app + e-mail. Programa **default** por tenant.

## 4. Componentes base

Botões já especificados em `brand.css` (`.btn`, `.btn-primary`, `.btn-ink`,
`.btn-ghost`). Demais (cards, listas, tags, gráficos simples, estados vazios, modais)
a construir no slice de design system, sempre via tokens.

## 5. Acessibilidade

Contraste AA (inclusive accent white-label sobre paper), reduced-motion, alvo de toque
≥ 44px, reveal só por `transform`, símbolo com `aria-label`.

## 6. Fronteira (o que NÃO fazer agora)

Nada de landing final, dashboard final, login visual ou features de mentoria neste
baseline. Esta direção orienta os **próximos** slices; o repositório atual entrega
apenas o scaffold neutro.
