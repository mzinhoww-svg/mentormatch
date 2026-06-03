import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  readableTextOn,
  bestTextContrast,
  brandingToCssVars,
  MIN_TEXT_CONTRAST,
  type Branding,
} from '../branding.js';

describe('contrastRatio', () => {
  it('is 21 for black vs white and 1 for identical colors', () => {
    expect(Math.round(contrastRatio('#000000', '#FFFFFF'))).toBe(21);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });
  it('is symmetric and accepts 3-digit hex', () => {
    expect(contrastRatio('#FF4A1C', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#FF4A1C'), 6);
    expect(contrastRatio('#000', '#FFF')).toBeCloseTo(21, 0);
  });
  it('returns NaN for invalid hex', () => {
    expect(Number.isNaN(contrastRatio('nope', '#fff'))).toBe(true);
    expect(Number.isNaN(contrastRatio('#12', '#fff'))).toBe(true);
  });
});

describe('readableTextOn', () => {
  it('keeps white on the brand accent and on dark colors', () => {
    expect(readableTextOn('#FF4A1C')).toBe('#FFFFFF'); // Brasa — brand default preserved
    expect(readableTextOn('#1B5C4C')).toBe('#FFFFFF'); // Jade (dark)
    expect(readableTextOn('#000')).toBe('#FFFFFF');
  });
  it('flips to ink on a light accent where white would be unreadable', () => {
    expect(readableTextOn('#FFD400')).toBe('#14100D'); // bright yellow
    expect(readableTextOn('#FFFFFF')).toBe('#14100D');
    expect(readableTextOn('#FF0')).toBe('#14100D');
  });
});

describe('brandingToCssVars', () => {
  it('maps brand colors and derives readable on-accent text per color', () => {
    const b: Branding = {
      displayName: null,
      logoUrl: null,
      primaryColor: '#FFD400', // light → ink text
      secondaryColor: '#1B5C4C', // dark → white text
      inkColor: '#14100D',
      paperColor: '#FBF7F0',
      programName: 'X',
      locale: 'pt-BR',
    };
    expect(brandingToCssVars(b)).toEqual({
      '--brand-primary': '#FFD400',
      '--brand-secondary': '#1B5C4C',
      '--accent-ink': '#14100D',
      '--accent-ink-2': '#FFFFFF',
    });
  });
});

describe('bestTextContrast', () => {
  it('is comfortably above AA for the brand accent', () => {
    expect(bestTextContrast('#FF4A1C')).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
  it('falls below AA only in the mid-tone dead zone', () => {
    expect(bestTextContrast('#797979')).toBeLessThan(MIN_TEXT_CONTRAST);
  });
});
