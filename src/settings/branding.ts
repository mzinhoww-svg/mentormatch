/**
 * Branding resolution (pure). Encodes the APPROVED MentorMatch brand kit tokens
 * as safe defaults so the white-label contract never breaks when a tenant has
 * no customization. Source of truth: the brand book / "Especificação LLM" §6.1.
 *
 *   Brasa (primary)   #FF4A1C   — the catalyst / accent
 *   Jade  (secondary) #1B5C4C   — growth
 *   Tinta (ink)       #14100D   — foundation (warm near-black)
 *   Argila (paper)    #FBF7F0   — warm neutral
 *
 * Custom tenant colors are allowed (true white-label) but must be valid hex;
 * the resolved object always carries every token so the UI contract holds.
 */
export const BRAND_DEFAULTS = {
  primaryColor: '#FF4A1C',
  secondaryColor: '#1B5C4C',
  inkColor: '#14100D',
  paperColor: '#FBF7F0',
  logoUrl: null as string | null,
  programName: 'Programa de Mentoria',
  locale: 'pt-BR',
  fontFamily: null as string | null, // null = use the product's default type stack
  borderRadius: null as string | null, // null = use the product's default radius
} as const;

export const SUPPORTED_LOCALES = ['pt-BR', 'en-US', 'es-ES', 'es-419'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

const RADIUS_RE = /^\d{1,3}(px|rem|%)?$/;
/** Accepts simple CSS length tokens like "4px", "34px", "0.5rem", "50%". */
export function isValidRadius(value: unknown): value is string {
  return typeof value === 'string' && RADIUS_RE.test(value.trim());
}

export interface StoredBranding {
  displayName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  programName?: string | null;
  locale?: string | null;
  fontFamily?: string | null;
  borderRadius?: string | null;
}

export interface ResolvedBranding {
  displayName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  inkColor: string;
  paperColor: string;
  programName: string;
  locale: string;
  fontFamily: string | null;
  borderRadius: string | null;
}

/**
 * Merges stored branding over the brand-kit defaults. Null/absent/invalid values
 * fall back to defaults, guaranteeing a complete, valid branding object — even
 * when `stored` is null (no customization at all).
 */
export function resolveBranding(stored: StoredBranding | null | undefined): ResolvedBranding {
  const s = stored ?? {};
  return {
    displayName: s.displayName ?? null,
    logoUrl: s.logoUrl ?? BRAND_DEFAULTS.logoUrl,
    primaryColor: isValidHexColor(s.primaryColor) ? s.primaryColor : BRAND_DEFAULTS.primaryColor,
    secondaryColor: isValidHexColor(s.secondaryColor)
      ? s.secondaryColor
      : BRAND_DEFAULTS.secondaryColor,
    inkColor: BRAND_DEFAULTS.inkColor,
    paperColor: BRAND_DEFAULTS.paperColor,
    programName: s.programName?.trim() ? s.programName : BRAND_DEFAULTS.programName,
    locale: isSupportedLocale(s.locale) ? s.locale : BRAND_DEFAULTS.locale,
    // Free-form but sanitized: font family kept as-is (string), radius validated.
    fontFamily: typeof s.fontFamily === 'string' && s.fontFamily.trim() ? s.fontFamily.trim() : BRAND_DEFAULTS.fontFamily,
    borderRadius: isValidRadius(s.borderRadius) ? s.borderRadius!.trim() : BRAND_DEFAULTS.borderRadius,
  };
}
