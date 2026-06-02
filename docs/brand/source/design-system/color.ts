/**
 * COLOR TOKENS — sistema "Circulação"
 *
 * Fonte de verdade: docs/brand/source/assets/brand.css (brandkit Claude Design) e
 * docs/brand/COLOR_SYSTEM.md. Valores transcritos VERBATIM. Não inventar cores;
 * cores novas só via oklch harmônico (fora do escopo deste slice).
 *
 * Princípio: NÃO começar pelo azul. Paleta quente e editorial.
 * Brasa é a faísca (accent), usada com parcimônia — nunca grande bloco de fundo
 * exceto CTA final / avatar.
 */

/** Famílias de cor (escalas) */
export const tinta = {
  900: "#14100D",
  800: "#1E1812",
  700: "#2C241C",
  600: "#41372C",
  500: "#5C4F41",
} as const;

export const brasa = {
  700: "#C9340E",
  600: "#E63E12",
  500: "#FF4A1C",
  400: "#FF6E45",
  300: "#FF9A78",
  100: "#FFE2D6",
} as const;

export const jade = {
  800: "#0E342B",
  700: "#14463B",
  600: "#1B5C4C",
  500: "#257A64",
  300: "#5FA892",
  100: "#DCEDE6",
} as const;

export const argila = {
  50: "#FBF7F0",
  100: "#F4ECE0",
  200: "#E9DDCB",
  300: "#D8C8B0",
  400: "#BDAB90",
} as const;

/** Cores semânticas */
export const semantic = {
  success: "#1B5C4C",
  warning: "#E8A317",
  error: "#D23B2E",
} as const;

/**
 * Escala neutra ordenada (claro → escuro). Inclui passos da Argila e da Tinta,
 * conforme COLOR_SYSTEM.md §"Escala neutra".
 */
export const neutralScale = [
  "#FBF7F0", // argila-50
  "#F4ECE0", // argila-100
  "#E9DDCB", // argila-200
  "#D8C8B0", // argila-300
  "#BDAB90", // argila-400
  "#5C4F41", // tinta-500
  "#2C241C", // tinta-700
  "#14100D", // tinta-900
] as const;

/**
 * Aliases de papel/uso (light mode default).
 * `accent` é o ÚNICO alias destinado a override white-label por tenant.
 */
export const roleColors = {
  ink: tinta[900],
  ink2: tinta[700],
  muted: "#6E6052",
  paper: argila[50],
  paper2: argila[100],
  line: "#E2D6C4",
  lineStrong: "#C9B79C",
  accent: brasa[500],
  onAccent: "#FFFFFF", // texto sobre o accent (CTA)
} as const;

export const color = {
  tinta,
  brasa,
  jade,
  argila,
  semantic,
  neutralScale,
  role: roleColors,
} as const;

export type ColorTokens = typeof color;
