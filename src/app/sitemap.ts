import type { MetadataRoute } from 'next';
import { siteUrl, MARKETING_ROUTES } from '../marketing/seo.js';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const routes = [...MARKETING_ROUTES.map((r) => r.href), '/demo'];
  return routes.map((path) => ({
    url: `${base}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: path === '/' ? 1 : 0.7,
  }));
}
