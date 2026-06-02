/**
 * Client-side branding types + mapping to CSS custom properties. The resolved
 * branding always carries valid tokens (the back-end guarantees the white-label
 * contract); here we only translate the brandable ones into CSS variables.
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

/** Maps branding to the CSS variables consumed by globals.css. */
export function brandingToCssVars(b: Branding): Record<string, string> {
  return {
    '--brand-primary': b.primaryColor,
    '--brand-secondary': b.secondaryColor,
  };
}

/** Inline style object for theming a subtree with the tenant's brand. */
export function brandingStyle(b: Branding): Record<string, string> {
  return brandingToCssVars(b);
}
