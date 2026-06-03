/**
 * Marketing/SEO helpers (institutional site). Pure — no product coupling.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = raw && /^https?:\/\//.test(raw) ? raw : 'https://mentormatch.app';
  return base.replace(/\/+$/, '');
}

/** Public marketing routes (used by nav + sitemap). */
export const MARKETING_ROUTES = [
  { href: '/', label: 'Home' },
  { href: '/como-funciona', label: 'Como Funciona' },
  { href: '/beneficios', label: 'Benefícios para RH' },
  { href: '/planos', label: 'Planos' },
  { href: '/contato', label: 'Contato' },
] as const;
