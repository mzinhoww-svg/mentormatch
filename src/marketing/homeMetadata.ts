import type { Metadata } from 'next';

/**
 * Institutional SEO for the MentorMatch home, shown on a non-tenant (base
 * domain) host. Kept in its own module because the home page is host-aware
 * (`generateMetadata`) and a Next.js page file may not export extra constants;
 * this is exactly what generateMetadata returns on the institutional branch.
 */
export const INSTITUTIONAL_METADATA: Metadata = {
  title: 'Mentoria corporativa que faz o conhecimento circular',
  description:
    'Transforme a experiência da sua empresa num sistema que circula: conexões certas, no momento certo, com acompanhamento e resultado visível. Solicite uma demonstração.',
  openGraph: {
    title: 'MentorMatch — o conhecimento circula',
    description: 'Plataforma de mentoria corporativa. Solicite uma demonstração.',
    images: ['/og.png'],
  },
};
