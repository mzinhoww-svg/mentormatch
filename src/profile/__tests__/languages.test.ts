import { describe, it, expect } from 'vitest';
import { normalizeLanguages, COMMON_LANGUAGES } from '../languages.js';

describe('normalizeLanguages', () => {
  it('trims, drops empties and dedupes case-insensitively', () => {
    expect(normalizeLanguages(['Português', 'português', ' Inglês ', '', '  '])).toEqual([
      'Português',
      'Inglês',
    ]);
  });

  it('preserves the first-seen casing', () => {
    expect(normalizeLanguages(['inglês', 'Inglês'])).toEqual(['inglês']);
  });

  it('caps the list length', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Lang${i}`);
    expect(normalizeLanguages(many, 5)).toHaveLength(5);
  });

  it('offers a curated default list', () => {
    expect(COMMON_LANGUAGES).toContain('Português');
    expect(COMMON_LANGUAGES).toContain('Inglês');
  });
});
