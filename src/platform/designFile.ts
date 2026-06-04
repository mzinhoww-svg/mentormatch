/**
 * Parses an uploaded "design" file into branding fields the console can prefill.
 * Pure (no I/O), so it is unit-testable. Accepts either:
 *   - JSON: { primaryColor, secondaryColor, programName, displayName }
 *   - Markdown/text: the first two valid #RRGGBB colors become primary/secondary,
 *     plus `key: value` / `key = value` lines for the names (and explicit color keys).
 * Only valid values are returned; anything unrecognized is simply omitted.
 */
import { isValidHexColor } from '../settings/branding.js';

export interface ParsedDesign {
  primaryColor?: string;
  secondaryColor?: string;
  programName?: string;
  displayName?: string;
}

const HEX_GLOBAL = /#[0-9a-fA-F]{6}\b/g;

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Finds a `key: value` or `key = value` line (case-insensitive) for any alias. */
function lineValue(text: string, keys: string[]): string | undefined {
  for (const k of keys) {
    const m = text.match(new RegExp(`^\\s*${k}\\s*[:=]\\s*"?([^"\\n]+?)"?\\s*$`, 'im'));
    const v = m?.[1]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function parseDesignFile(text: string): ParsedDesign {
  const out: ParsedDesign = {};
  const trimmed = (text ?? '').trim();

  // 1) JSON form.
  if (trimmed.startsWith('{')) {
    try {
      const j = JSON.parse(trimmed) as Record<string, unknown>;
      const pc = str(j.primaryColor);
      const sc = str(j.secondaryColor);
      if (isValidHexColor(pc)) out.primaryColor = pc;
      if (isValidHexColor(sc)) out.secondaryColor = sc;
      out.programName = str(j.programName);
      out.displayName = str(j.displayName ?? j.name);
      return out;
    } catch {
      // fall through to text parsing
    }
  }

  // 2) Markdown/plain-text form.
  const colors = (text.match(HEX_GLOBAL) ?? []).filter((c) => isValidHexColor(c));
  if (colors[0]) out.primaryColor = colors[0];
  if (colors[1]) out.secondaryColor = colors[1];

  // Explicit color keys win over positional detection.
  const pc = lineValue(text, ['primaryColor', 'cor primaria', 'cor primária', 'primary']);
  if (isValidHexColor(pc)) out.primaryColor = pc;
  const sc = lineValue(text, ['secondaryColor', 'cor secundaria', 'cor secundária', 'secondary']);
  if (isValidHexColor(sc)) out.secondaryColor = sc;

  out.programName = lineValue(text, ['programName', 'programa', 'program']);
  out.displayName = lineValue(text, ['displayName', 'nome', 'name', 'empresa']);
  return out;
}
