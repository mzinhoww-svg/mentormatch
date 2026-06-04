import { describe, it, expect } from 'vitest';
import { navForRole, activeHref, NAV_ITEMS } from '../nav.js';
import { assertSameOrigin } from '../api.js';
import { brandingToCssVars, type Branding } from '../branding.js';

describe('navForRole (shell respects role)', () => {
  it('hides admin items for non-admin roles', () => {
    const labels = navForRole('member').map((i) => i.label);
    expect(labels).toContain('Perfil');
    expect(labels).toContain('Mentores');
    expect(labels).not.toContain('Admin');
  });
  it('shows admin items for admin / program_manager', () => {
    expect(navForRole('admin').map((i) => i.label)).toContain('Admin');
    expect(navForRole('program_manager').map((i) => i.label)).toContain('Admin');
  });
});

describe('activeHref', () => {
  it('matches the deepest nav href', () => {
    expect(activeHref('/app')).toBe('/app');
    expect(activeHref('/app/mentors')).toBe('/app/mentors');
    expect(activeHref('/app/sessions/123')).toBe('/app/sessions');
  });
});

describe('assertSameOrigin (UI cannot cross tenants/origins)', () => {
  it('accepts same-origin relative paths', () => {
    expect(() => assertSameOrigin('/api/me')).not.toThrow();
    expect(() => assertSameOrigin('/api/mentors?q=x')).not.toThrow();
  });
  it('rejects absolute / cross-origin URLs', () => {
    for (const bad of ['http://evil.com/api', 'https://other.localhost/api', '//evil.com', 'javascript:alert(1)']) {
      expect(() => assertSameOrigin(bad)).toThrow();
    }
  });
});

describe('brandingToCssVars (tenant branding applied)', () => {
  it('maps brand colors to CSS vars', () => {
    const b: Branding = {
      displayName: 'Acme',
      logoUrl: null,
      primaryColor: '#0A0A0A',
      secondaryColor: '#0B0B0B',
      inkColor: '#14100D',
      paperColor: '#FBF7F0',
      programName: 'X',
      locale: 'pt-BR',
      fontFamily: null,
      borderRadius: null,
    };
    expect(brandingToCssVars(b)).toEqual({
      '--brand-primary': '#0A0A0A',
      '--brand-secondary': '#0B0B0B',
      // Dark accents → white text stays readable on accent surfaces.
      '--accent-ink': '#FFFFFF',
      '--accent-ink-2': '#FFFFFF',
    });
  });

  it('adds font and radius vars only when present', () => {
    const b: Branding = {
      displayName: null,
      logoUrl: null,
      primaryColor: '#0A0A0A',
      secondaryColor: '#0B0B0B',
      inkColor: '#14100D',
      paperColor: '#FBF7F0',
      programName: 'X',
      locale: 'pt-BR',
      fontFamily: 'Poppins',
      borderRadius: '34px',
    };
    const vars = brandingToCssVars(b);
    expect(vars['--sans']).toContain('Poppins');
    expect(vars['--brand-radius']).toBe('34px');
  });
});

describe('NAV_ITEMS routes match the expected /app surface', () => {
  it('covers every required page', () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    for (const h of ['/app', '/app/profile', '/app/mentors', '/app/requests', '/app/mentorships', '/app/sessions', '/app/notifications', '/app/admin', '/app/settings']) {
      expect(hrefs).toContain(h);
    }
  });
});
