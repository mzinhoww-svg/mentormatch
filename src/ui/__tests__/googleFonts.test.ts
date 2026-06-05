import { describe, it, expect } from 'vitest';
import { resolveGoogleFont, googleFontHref } from '../googleFonts.js';

describe('googleFonts allowlist', () => {
  it('resolves allowlisted families case-insensitively', () => {
    expect(resolveGoogleFont('poppins')).toBe('Poppins');
    expect(resolveGoogleFont('  INTER ')).toBe('Inter');
    expect(resolveGoogleFont('Plus Jakarta Sans')).toBe('Plus Jakarta Sans');
  });

  it('rejects non-allowlisted or empty families (no third-party injection)', () => {
    expect(resolveGoogleFont('Comic Sans MS')).toBeNull();
    expect(resolveGoogleFont('')).toBeNull();
    expect(resolveGoogleFont(null)).toBeNull();
    expect(resolveGoogleFont('https://evil.test/font')).toBeNull();
  });

  it('builds a Google Fonts URL only for allowlisted families', () => {
    const href = googleFontHref('Montserrat');
    expect(href).toContain('https://fonts.googleapis.com/css2?family=Montserrat');
    expect(href).toContain('display=swap');
    // Multi-word families are + separated.
    expect(googleFontHref('Work Sans')).toContain('family=Work+Sans');
    expect(googleFontHref('nope')).toBeNull();
  });
});
