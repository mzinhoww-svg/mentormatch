import { describe, it, expect } from 'vitest';
import {
  BRAND_DEFAULTS,
  isValidHexColor,
  isSupportedLocale,
  resolveBranding,
} from '../branding.js';

describe('brand-kit defaults', () => {
  it('match the approved brand tokens', () => {
    expect(BRAND_DEFAULTS.primaryColor).toBe('#FF4A1C'); // Brasa
    expect(BRAND_DEFAULTS.secondaryColor).toBe('#1B5C4C'); // Jade
    expect(BRAND_DEFAULTS.inkColor).toBe('#14100D'); // Tinta
    expect(BRAND_DEFAULTS.paperColor).toBe('#FBF7F0'); // Argila
    expect(BRAND_DEFAULTS.locale).toBe('pt-BR');
  });
});

describe('isValidHexColor', () => {
  it('accepts #RGB and #RRGGBB', () => {
    expect(isValidHexColor('#FFF')).toBe(true);
    expect(isValidHexColor('#FF4A1C')).toBe(true);
  });
  it('rejects junk', () => {
    expect(isValidHexColor('red')).toBe(false);
    expect(isValidHexColor('#12')).toBe(false);
    expect(isValidHexColor('FF4A1C')).toBe(false);
    expect(isValidHexColor(123)).toBe(false);
    expect(isValidHexColor(null)).toBe(false);
  });
});

describe('isSupportedLocale', () => {
  it('accepts known locales only', () => {
    expect(isSupportedLocale('pt-BR')).toBe(true);
    expect(isSupportedLocale('en-US')).toBe(true);
    expect(isSupportedLocale('xx-YY')).toBe(false);
  });
});

describe('resolveBranding', () => {
  it('returns complete brand-kit defaults when there is no customization', () => {
    const b = resolveBranding(null);
    expect(b.primaryColor).toBe('#FF4A1C');
    expect(b.secondaryColor).toBe('#1B5C4C');
    expect(b.inkColor).toBe('#14100D');
    expect(b.paperColor).toBe('#FBF7F0');
    expect(b.logoUrl).toBeNull();
    expect(b.programName.length).toBeGreaterThan(0);
    expect(b.locale).toBe('pt-BR');
  });

  it('merges valid overrides but ignores invalid colors/locale', () => {
    const b = resolveBranding({
      primaryColor: '#000000',
      secondaryColor: 'not-a-color',
      logoUrl: 'https://x/logo.svg',
      locale: 'xx-YY',
      programName: 'Trilha Líderes',
    });
    expect(b.primaryColor).toBe('#000000'); // valid override
    expect(b.secondaryColor).toBe('#1B5C4C'); // invalid → default
    expect(b.logoUrl).toBe('https://x/logo.svg');
    expect(b.locale).toBe('pt-BR'); // unsupported → default
    expect(b.programName).toBe('Trilha Líderes');
    // White-label contract: ink/paper always present.
    expect(b.inkColor).toBe('#14100D');
  });
});
