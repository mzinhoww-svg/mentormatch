import type { MetadataRoute } from 'next';

/**
 * PWA web manifest. Icon is "A Corrente" (brand symbol); colors come from the
 * Circulação palette (theme = brasa-500 accent, background = argila-50 paper).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MentorMatch',
    short_name: 'MentorMatch',
    description: 'O conhecimento circula. Mentoria corporativa multi-tenant.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf7f0',
    theme_color: '#ff4a1c',
    lang: 'pt-BR',
    icons: [
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
