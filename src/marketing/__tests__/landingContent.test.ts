import { describe, it, expect } from 'vitest';
import { resolveLandingContent, isLandingContentEmpty, EMPTY_LANDING_CONTENT } from '../landingContent.js';

describe('resolveLandingContent', () => {
  it('returns empty content for null/garbage input', () => {
    expect(resolveLandingContent(null)).toEqual(EMPTY_LANDING_CONTENT);
    expect(resolveLandingContent('nope')).toEqual(EMPTY_LANDING_CONTENT);
    expect(resolveLandingContent(42)).toEqual(EMPTY_LANDING_CONTENT);
    expect(isLandingContentEmpty(resolveLandingContent(null))).toBe(true);
  });

  it('trims text fields and treats blanks as null', () => {
    const c = resolveLandingContent({ niche: '  Liderança ', transformation: '   ', methodology: '', audience: 'Novos líderes' });
    expect(c.niche).toBe('Liderança');
    expect(c.transformation).toBeNull();
    expect(c.methodology).toBeNull();
    expect(c.audience).toBe('Novos líderes');
    expect(isLandingContentEmpty(c)).toBe(false);
  });

  it('caps long text fields', () => {
    const c = resolveLandingContent({ niche: 'a'.repeat(1000) });
    expect(c.niche?.length).toBe(600);
  });

  it('keeps only testimonials with a quote, filling defaults and capping count', () => {
    const c = resolveLandingContent({
      testimonials: [
        { quote: 'Mudou minha forma de liderar', author: 'Ana', role: 'PM' },
        { quote: '   ' }, // dropped (no quote)
        { author: 'Sem quote' }, // dropped
        { quote: 'Só quote' }, // author/role defaulted
        { quote: 'a' }, { quote: 'b' }, { quote: 'c' }, // overflow past the cap of 4
      ],
    });
    expect(c.testimonials).toHaveLength(4);
    expect(c.testimonials[0]).toEqual({ quote: 'Mudou minha forma de liderar', author: 'Ana', role: 'PM' });
    const onlyQuote = c.testimonials.find((t) => t.quote === 'Só quote');
    expect(onlyQuote).toMatchObject({ author: 'Colaborador(a)', role: '' });
  });

  it('ignores a non-array testimonials value', () => {
    expect(resolveLandingContent({ testimonials: 'x' }).testimonials).toEqual([]);
  });
});
