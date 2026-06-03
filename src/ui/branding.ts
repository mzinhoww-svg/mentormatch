/**
 * Client-side branding types + mapping to CSS custom properties. The resolved
 * branding always carries valid tokens (the back-end guarantees the white-label
 * contract); here we translate the brandable ones into CSS variables and derive
 * a readable text color for surfaces painted with the tenant accent.
 */
export interface Branding {
  displayName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  inkColor: string;
  paperColor: string;
  programName: string;
  locale: string;
}

const INK = '#14100D';
const WHITE = '#FFFFFF';

/**
 * Minimum contrast for white text to remain ON the accent. The brand default
 * (white on Brasa) clears this; a light tenant accent (e.g. yellow) drops below
 * it and we flip the on-accent text to ink — so white-on-light never happens.
 * 3:1 is the WCAG AA threshold for large/bold UI text (buttons, nav, pills).
 */
export const MIN_ON_ACCENT_CONTRAST = 3;
/** WCAG AA for normal-size text. Used to flag a too-low-contrast accent. */
export const MIN_TEXT_CONTRAST = 4.5;

function parseHex(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return NaN;
  const [r, g, b] = rgb;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG contrast ratio (1–21) between two hex colors; NaN if either is invalid. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (Number.isNaN(la) || Number.isNaN(lb)) return NaN;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Readable text color (white or ink) to place ON the given background. */
export function readableTextOn(bg: string): string {
  return contrastRatio(WHITE, bg) >= MIN_ON_ACCENT_CONTRAST ? WHITE : INK;
}

/** Best achievable contrast for normal text on a background (white or ink). */
export function bestTextContrast(bg: string): number {
  const onWhite = contrastRatio(WHITE, bg);
  const onInk = contrastRatio(INK, bg);
  if (Number.isNaN(onWhite) || Number.isNaN(onInk)) return NaN;
  return Math.max(onWhite, onInk);
}

/** Maps branding to the CSS variables consumed by globals.css. */
export function brandingToCssVars(b: Branding): Record<string, string> {
  return {
    '--brand-primary': b.primaryColor,
    '--brand-secondary': b.secondaryColor,
    '--accent-ink': readableTextOn(b.primaryColor),
    '--accent-ink-2': readableTextOn(b.secondaryColor),
  };
}

/** Inline style object for theming a subtree with the tenant's brand. */
export function brandingStyle(b: Branding): Record<string, string> {
  return brandingToCssVars(b);
}
