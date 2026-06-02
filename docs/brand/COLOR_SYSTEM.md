# COLOR_SYSTEM — Sistema de Cor "Circulação"

> Fonte: `docs/brand/source/assets/brand.css` (`:root`). **Princípio:** não começar pelo
> azul. Paleta quente e editorial = calor + inteligência, oposta ao "SaaS azul" genérico.

## Famílias e tokens

### Tinta — fundação (quase-preto quente, nunca preto puro)
```
--tinta-900 #14100D   --tinta-800 #1E1812   --tinta-700 #2C241C
--tinta-600 #41372C   --tinta-500 #5C4F41
```
Intelecto, permanência, legado. Fundo de seções escuras, texto, 1 braço do símbolo. "Tem
terra dentro" — mais acolhedor que preto.

### Brasa — accent assinatura (vermilion/ember, o catalisador)
```
--brasa-700 #C9340E   --brasa-600 #E63E12   --brasa-500 #FF4A1C
--brasa-400 #FF6E45   --brasa-300 #FF9A78   --brasa-100 #FFE2D6
```
Energia que passa adiante, urgência humana, otimismo. **Usar com parcimônia — é a faísca,
não o fundo.** CTAs, destaques, 1 braço do símbolo, números-chave.

### Jade — secundária (crescimento, verde profundo não-clichê)
```
--jade-800 #0E342B   --jade-700 #14463B   --jade-600 #1B5C4C
--jade-500 #257A64   --jade-300 #5FA892   --jade-100 #DCEDE6
```
Crescimento sem o verde-startup óbvio. Estados de sucesso, seções de naming, barras alternadas.

### Argila — neutro quente (papel, humano)
```
--argila-50 #FBF7F0   --argila-100 #F4ECE0   --argila-200 #E9DDCB
--argila-300 #D8C8B0  --argila-400 #BDAB90
```
Papel, calor, humanidade. Fundos (`--paper`), linhas — **nunca branco frio**.

## Semântico
```
--success #1B5C4C   --warning #E8A317   --error #D23B2E
```

## Aliases de papel/uso
```
--ink #14100D   --ink-2 #2C241C   --muted #6E6052
--paper #FBF7F0   --paper-2 #F4ECE0
--line #E2D6C4   --line-strong #C9B79C   --accent #FF4A1C
```

## Escala neutra (claro → escuro)
`#FBF7F0 → #F4ECE0 → #E9DDCB → #D8C8B0 → #BDAB90 → #5C4F41 → #2C241C → #14100D`

## Regras de contraste
- Fundos escuros usam `--argila-100/-200/-300` para texto.
- `--muted (#6E6052)` para texto secundário em fundo claro.
- Accent **nunca** como bloco grande de fundo, exceto no CTA final e avatar.
- Validar AA na implementação (Slice 0), inclusive em overrides white-label.

## Psicologia (resumo)
Brasa traz calor e ação onde a categoria usa frieza corporativa. Jade ancora crescimento sem
o verde óbvio. Tinta dá gravidade intelectual. Argila humaniza. Juntas: parece consultoria de
design, não template de RH.

## White-label
O acento de marca (`--accent`) é o principal token sobreponível por tenant, com validação de
contraste obrigatória. `--ink`/`--paper` têm override limitado (manter calor/legibilidade,
evitar branco frio). Ver [../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) §4.
