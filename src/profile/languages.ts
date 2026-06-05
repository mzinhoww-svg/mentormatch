/**
 * Curated list of spoken languages offered in onboarding (pt-BR labels). Free
 * entry is also allowed in the UI; this just powers the autocomplete. Stored as
 * the label string on profile.languages (text[]). Kept pure (no I/O).
 */
export const COMMON_LANGUAGES: readonly string[] = [
  'Português',
  'Inglês',
  'Espanhol',
  'Francês',
  'Alemão',
  'Italiano',
  'Mandarim',
  'Japonês',
  'Coreano',
  'Árabe',
  'Russo',
  'Hindi',
  'Libras',
];

/** Trims, dedupes (case-insensitively) and caps a free-form languages list. */
export function normalizeLanguages(input: readonly string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const v = String(raw).trim();
    if (!v) continue;
    const key = v.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}
