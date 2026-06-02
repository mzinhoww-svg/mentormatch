# APPLICATIONS — Aplicações da Marca

> Fonte: brandkit Claude Design (`source/assets/brand-book.html`). Tudo serve à frase
> "o conhecimento circula". Protótipos em `source/produto/` são **product UX
> reference**, não assets de produção.

## 1. Digitais (geradas de `mm.*`)

| Aplicação | Notas |
|---|---|
| Favicon | de `mm.corrente` (argila + tinta/brasa) |
| App icons (PNG 180/192/512, maskable) | de `mm.corrente`. Preservado: `source/generated/app-icon-512.png` |
| OG/social (1200×630) | lockup + campo de corrente. Preservado: `source/generated/og-base.png` |
| Avatar social | `mm.corrente` sobre brasa |
| Loader | símbolo girando (`.mm-live`) |

> Exports estáticos faltantes (favicon set, lockup claro/escuro, fontes self-host)
> são `missing asset` — **gerar a partir de `mm.*`**, não recriar à mão. Ver
> [ASSET_INVENTORY.md](./ASSET_INVENTORY.md).

## 2. Físicas / marketing

- **Camiseta:** símbolo + "PASSE ADIANTE" — vestível, não brinde.
- **Crachá:** eventos corporativos.
- **LinkedIn & Eventos:** social toolkit (fundo jade), "Ninguém cresce sozinho."

## 3. Produto (referência de UX)

Protótipos do Claude Design (referência de fluxo, **não** produção):
- **Landing** — hero, como funciona, resultados, CTA. CTA real V1 = **"Solicitar
  demonstração"** (ver [WEBSITE_DIRECTION.md](./WEBSITE_DIRECTION.md)).
- **Dashboard** — shell com troca de papel Admin/Mentor/Mentorado. Avatares por
  **iniciais**, não fotos.
- **App mobile** — conceito (fora da V1).

## 4. White-label

Aplicações respeitam o white-label tokenizado: **accent + logo** do tenant; fallback =
marca MentorMatch. Tipografia e estrutura permanecem fixas. Ver
[../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) e
[PRODUCT_UI_DIRECTION.md](./PRODUCT_UI_DIRECTION.md).
