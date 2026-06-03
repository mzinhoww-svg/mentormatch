import { describe, it, expect, afterEach } from 'vitest';
import { validateDemoRequest } from '../demoRequest.js';
import { PLANS, HOW_IT_WORKS, HR_BENEFITS, HEADCOUNT_OPTIONS } from '../content.js';
import { siteUrl, MARKETING_ROUTES } from '../seo.js';
import robots from '../../app/robots.js';
import sitemap from '../../app/sitemap.js';
import { metadata as homeMeta } from '../../app/(marketing)/page.js';
import { metadata as comoMeta } from '../../app/(marketing)/como-funciona/page.js';
import { metadata as planosMeta } from '../../app/(marketing)/planos/page.js';
import { metadata as demoMeta } from '../../app/(marketing)/demo/page.js';

const ORIG = process.env.NEXT_PUBLIC_APP_URL;
afterEach(() => {
  if (ORIG === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = ORIG;
});

describe('validateDemoRequest (form validation)', () => {
  const good = { name: 'Ana', company: 'Acme', role: 'Head de RH', email: 'ana@acme.com', headcount: '51–200' };
  it('accepts a complete request', () => {
    const r = validateDemoRequest(good);
    expect(r.ok).toBe(true);
  });
  it('rejects missing/invalid fields', () => {
    expect(validateDemoRequest({ ...good, name: '' }).ok).toBe(false);
    expect(validateDemoRequest({ ...good, email: 'nope' }).ok).toBe(false);
    expect(validateDemoRequest({ ...good, headcount: '999' }).ok).toBe(false);
    expect(validateDemoRequest({ ...good, company: '  ' }).ok).toBe(false);
  });
});

describe('commercial content (matches what exists)', () => {
  it('has 3 tiers with features', () => {
    expect(PLANS.map((p) => p.name)).toEqual(['Starter', 'Growth', 'Enterprise']);
    expect(PLANS.every((p) => p.features.length > 0)).toBe(true);
    expect(PLANS.filter((p) => p.highlight)).toHaveLength(1);
  });
  it('covers the six how-it-works steps and HR benefits', () => {
    expect(HOW_IT_WORKS.map((s) => s.key)).toEqual(['mentor', 'mentee', 'busca', 'request', 'sessao', 'feedback']);
    expect(HR_BENEFITS.length).toBeGreaterThanOrEqual(5);
    expect(HEADCOUNT_OPTIONS.length).toBe(4);
  });
});

describe('SEO building blocks', () => {
  it('siteUrl honours NEXT_PUBLIC_APP_URL with a safe fallback', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(siteUrl()).toBe('https://mentormatch.app');
    process.env.NEXT_PUBLIC_APP_URL = 'https://mentorxmatch.xyz/';
    expect(siteUrl()).toBe('https://mentorxmatch.xyz');
  });
  it('robots allows site, blocks /app and /api, links sitemap', () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule?.allow).toBe('/');
    expect(rule?.disallow).toContain('/app/');
    expect(rule?.disallow).toContain('/api/');
    expect(typeof r.sitemap).toBe('string');
  });
  it('sitemap lists all marketing routes + /demo', () => {
    const urls = sitemap().map((e) => e.url);
    for (const r of MARKETING_ROUTES) {
      expect(urls.some((u) => u.endsWith(r.href === '/' ? '' : r.href))).toBe(true);
    }
    expect(urls.some((u) => u.endsWith('/demo'))).toBe(true);
  });
});

describe('per-page metadata (SEO present)', () => {
  it('every page declares title + description + openGraph', () => {
    for (const m of [homeMeta, comoMeta, planosMeta, demoMeta]) {
      expect(m.title).toBeTruthy();
      expect(m.description && String(m.description).length).toBeGreaterThan(20);
      expect(m.openGraph).toBeTruthy();
    }
  });
});
