/**
 * Parser for "DESIGN.md" files (the design-system spec format used across
 * getsolu, salariotransparente, sicredi, etc.). It extracts the subset of
 * tokens the product can actually apply to a tenant theme — primary/secondary
 * colors, primary font family, and the button border radius — and is tolerant
 * of the formatting differences seen across real files:
 *   - "**Border Radius:** `4px`"  vs  "- Border Radius: `10px`"
 *   - "**Primary:** Poppins, sans-serif"  vs  "Times New Roman, Georgia, serif"
 *   - color lines "**Brand Yellow** (`#FFFF00`): ..."
 *
 * It never throws on malformed input; unknown/missing fields come back null so
 * the UI can show "not found" and let the admin fill in the gap.
 */

export interface ParsedDesign {
  title: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  borderRadius: string | null;
  /** All distinct hex colors found, in document order (for the palette preview). */
  palette: string[];
  /** Human-readable notes about what was/wasn't found. */
  warnings: string[];
}

const HEX = /#[0-9a-fA-F]{6}\b/;
const HEX_G = /#[0-9a-fA-F]{6}\b/g;

function firstSectionBody(md: string, headingRegex: RegExp): string | null {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => headingRegex.test(l));
  if (start === -1) return null;
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i]!)) break;
    body.push(lines[i]!);
  }
  return body.join('\n');
}

/** "Poppins, sans-serif" → "Poppins"; trims trailing fallbacks and markdown. */
function cleanFont(raw: string): string {
  return raw
    .replace(/`/g, '')
    .split(',')[0]!
    .replace(/\(.*?\)/g, '')
    .trim();
}

export function parseDesignMarkdown(md: string): ParsedDesign {
  const warnings: string[] = [];

  // Title: first level-1 heading.
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1]!.trim() : null;

  // --- Colors: prefer the "Color Palette" section, fall back to whole doc. ---
  const colorBody = firstSectionBody(md, /^##\s.*Color Palette/i) ?? md;
  const palette: string[] = [];
  for (const m of colorBody.matchAll(HEX_G)) {
    const hex = m[0].toUpperCase();
    if (!palette.includes(hex)) palette.push(hex);
  }

  // Primary color: the hex on the first line under a "Primary" subsection,
  // else the first palette color.
  let primaryColor: string | null = null;
  let secondaryColor: string | null = null;

  const primarySub = firstSectionBody(colorBody, /^###\s.*Primary/i);
  if (primarySub) {
    const m = primarySub.match(HEX);
    if (m) primaryColor = m[0].toUpperCase();
  }
  // Look for an explicit "Secondary"/"Accent" subsection for the second color.
  const secondarySub =
    firstSectionBody(colorBody, /^###\s.*(Secondary|Accent|Interactive)/i) ?? null;
  if (secondarySub) {
    const m = secondarySub.match(HEX);
    if (m) secondaryColor = m[0].toUpperCase();
  }

  if (!primaryColor && palette[0]) primaryColor = palette[0];
  if (!secondaryColor) {
    // Next distinct color that isn't the primary.
    secondaryColor = palette.find((c) => c !== primaryColor) ?? null;
  }
  if (!primaryColor) warnings.push('Cor primária não encontrada.');
  if (!secondaryColor) warnings.push('Cor secundária não encontrada.');

  // --- Font: "**Primary:**" / "**Primary Display Font:**" line. ---
  let fontFamily: string | null = null;
  const fontMatch = md.match(/\*\*Primary(?:\s+Display)?(?:\s+Font)?:\*\*\s*([^\n]+)/i);
  if (fontMatch) fontFamily = cleanFont(fontMatch[1]!);
  if (!fontFamily) warnings.push('Fonte primária não encontrada.');

  // --- Border radius: first "Border Radius: `Npx`" (the primary button's). ---
  let borderRadius: string | null = null;
  const radiusMatch = md.match(/Border Radius:\*{0,2}\s*`?(\d+(?:px|rem|%)?)`?/i);
  if (radiusMatch) borderRadius = radiusMatch[1]!;
  if (!borderRadius) warnings.push('Border radius não encontrado.');

  return { title, primaryColor, secondaryColor, fontFamily, borderRadius, palette, warnings };
}
