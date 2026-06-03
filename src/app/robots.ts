import type { MetadataRoute } from 'next';
import { siteUrl } from '../marketing/seo.js';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/app/', '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
