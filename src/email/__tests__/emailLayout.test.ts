import { describe, it, expect } from 'vitest';
import { renderBrandedEmail } from '../emailLayout.js';
import type { EmailBrand } from '../emailBrand.js';

const brand: EmailBrand = {
  tenantName: 'Acme Inc',
  logoUrl: null,
  primaryColor: '#2F8F2F',
  onPrimary: '#FFFFFF',
  programName: 'Programa',
};

describe('renderBrandedEmail', () => {
  it('renders HTML + text with heading, paragraphs, branded CTA and sign-off', () => {
    const { html, text } = renderBrandedEmail({
      brand,
      heading: 'Defina sua senha',
      paragraphs: ['Olá.', 'Crie sua senha.'],
      button: { label: 'Definir', url: 'https://x.test/set?token=abc' },
      footerNote: 'Ignore se não foi você.',
    });

    // HTML
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Defina sua senha');
    expect(html).toContain('Crie sua senha.');
    expect(html).toContain('https://x.test/set?token=abc');
    expect(html).toContain('Definir');
    expect(html).toContain('#2F8F2F'); // CTA uses the brand color
    expect(html).toContain('Acme Inc · Passe adiante.');

    // Text fallback
    expect(text).toContain('Defina sua senha');
    expect(text).toContain('Crie sua senha.');
    expect(text).toContain('Definir: https://x.test/set?token=abc');
    expect(text).toContain('Ignore se não foi você.');
    expect(text).toContain('— Acme Inc · Passe adiante.');
  });

  it('shows the logo when present, else the tenant name', () => {
    const withLogo = renderBrandedEmail({
      brand: { ...brand, logoUrl: 'https://cdn.test/logo.png' },
      heading: 'H',
      paragraphs: [],
    });
    expect(withLogo.html).toContain('<img');
    expect(withLogo.html).toContain('https://cdn.test/logo.png');

    const noLogo = renderBrandedEmail({ brand, heading: 'H', paragraphs: [] });
    expect(noLogo.html).not.toContain('<img');
    expect(noLogo.html).toContain('Acme Inc');
  });

  it('escapes HTML in interpolated values (no injection)', () => {
    const { html } = renderBrandedEmail({
      brand: { ...brand, tenantName: '<script>x</script>' },
      heading: 'A & B <b>',
      paragraphs: ['"quoted" <i>'],
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B &lt;b&gt;');
  });
});
