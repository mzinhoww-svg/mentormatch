/**
 * Curated allowlist of Google Fonts a tenant may select (via DESIGN.md or the
 * branding form). Only allowlisted families load — an arbitrary string can never
 * inject a third-party URL. The chosen family is applied via the `--sans` CSS
 * var (see brandingToCssVars); this just loads its @font-face so it renders.
 */
const ALLOWED: readonly string[] = [
  'Poppins', 'Inter', 'Roboto', 'Montserrat', 'Lato', 'Open Sans', 'Nunito',
  'Nunito Sans', 'Work Sans', 'Raleway', 'Manrope', 'Mulish', 'Rubik', 'DM Sans',
  'Plus Jakarta Sans', 'Source Sans 3', 'Figtree', 'Outfit', 'Sora',
  'Space Grotesk', 'Albert Sans', 'Public Sans', 'Karla', 'Quicksand',
  'Josefin Sans', 'Hanken Grotesk', 'Lexend', 'Onest', 'Schibsted Grotesk',
];

const BY_LOWER = new Map(ALLOWED.map((f) => [f.toLowerCase(), f]));

/** The canonical allowlisted family for a (case-insensitive) name, or null. */
export function resolveGoogleFont(family: string | null | undefined): string | null {
  if (!family) return null;
  return BY_LOWER.get(family.trim().toLowerCase()) ?? null;
}

/** The Google Fonts stylesheet URL for an allowlisted family, or null. */
export function googleFontHref(family: string | null | undefined): string | null {
  const name = resolveGoogleFont(family);
  if (!name) return null;
  return `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
}

/** The list (for surfacing as suggestions in the branding UI). */
export const GOOGLE_FONTS = ALLOWED;
