# MOTION_SYSTEM — Linguagem de Motion

> Fonte: brandkit Claude Design (`source/assets/brand.css`, `source/assets/marks.js`).

## 1. Princípio único

**Tudo se move como uma corrente — entra, ganha energia, segue.** Nada surge do nada.

## 2. Tokens

```
--ease-flow cubic-bezier(.65,.05,.20,1)   (assinatura: acelera no encontro, desacelera ao entregar)
--ease-out  cubic-bezier(.16,1,.3,1)
--dur-1 180ms · --dur-2 320ms · --dur-3 560ms · --dur-4 900ms
```

## 3. Padrões

| Princípio | Comportamento | Implementação |
|---|---|---|
| Fluxo | Entra de um lado, acelera no foco, segue | translateX + scale, `--ease-flow` |
| Crescimento | Estados expandem a partir da origem | `scale()`, `--ease-out`, `--dur-3` |
| Hover vivo | Eleva (−3px) e "esquenta" (vira brasa) | transition `--dur-2`, sombra `--sh-2` |
| Loader | O símbolo "A Corrente" gira | `.mm-live`, 14s linear infinite |
| Transição | Telas deslizam na direção da leitura | continuidade espacial |

O **símbolo girando é o loader padrão** do sistema (`@keyframes mm-spin`).

## 4. Acessibilidade (obrigatória)

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

## 5. ⚠️ Lição crítica — reveal on scroll

Entrada por scroll usa **somente `transform`**, conteúdo **visível por padrão**.
**Nunca** esconder conteúdo com `opacity:0` dependente de JS (pior caso: animação não
roda → conteúdo continua visível). Não usar IntersectionObserver para isso (não
disparou de forma confiável no ambiente do brandkit). Referência de comportamento em
`source/assets/brand-book.js`.
