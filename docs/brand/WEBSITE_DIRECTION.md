# WEBSITE_DIRECTION — Direção do Site Institucional

> Direção para o site público `mentormatch.app` (institucional). Referência de
> estrutura: `source/produto/Landing.html` (product UX reference — **não** copiar
> pixel; reconstruir com tokens). Marca: [BRAND_STRATEGY.md](./BRAND_STRATEGY.md).

## 1. Papel do site

Landing **institucional** — host apex `mentormatch.app`, **sem login de tenant** (ver
[../TENANCY.md](../TENANCY.md)). Objetivo: explicar o conceito "A Corrente",
qualificar o comprador e gerar **demonstração**.

## 2. CTA principal

**"Solicitar Demonstração"** — **sem auto-provisionamento público na V1** (ADR §9). O
tenant é criado pelo Super Admin; há demo tenant controlado para vendas.

## 3. Estrutura sugerida

1. **Hero** — "O conhecimento não para. Ele circula." + CTA demo.
2. **Manifesto** — a corrente vs. o estoque.
3. **Problema → Promessa** — pilares estratégicos.
4. **Como funciona** — Conecta · Circula · Multiplica.
5. **Resultados** — métricas/prova (sem números falsos; placeholders honestos).
6. **CTA final** — "Solicitar Demonstração".

## 4. Tom e estética

- Voz: direta, calorosa, confiante (ver [../COPY_GUIDE.md](../COPY_GUIDE.md)).
- Paleta quente (tinta/brasa/jade/argila), **sem azul SaaS**.
- Tipografia Instrument Serif / Hanken Grotesk / Space Mono.
- Motion "corrente" (entra, acelera, segue); reveal só por `transform`.
- **Sem** stock photos, pessoas sorrindo, ilustração SaaS genérica.

## 5. Acessibilidade & SEO

- Contraste AA; reduced-motion respeitado; alvo de toque ≥ 44px.
- OG image de marca (`source/generated/og-base.png`); `NEXT_PUBLIC_APP_URL` correto.
- HTML semântico; conteúdo visível por padrão (não dependente de JS).

## 6. Fronteira

O site institucional **não** é o produto. Nada de login de tenant no apex; nada de
features de mentoria. A direção de produto está em
[PRODUCT_UI_DIRECTION.md](./PRODUCT_UI_DIRECTION.md).
