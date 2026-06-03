import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './marketing.css';
import { MarketingNav } from '../../marketing/MarketingNav.js';
import { MarketingFooter } from '../../marketing/MarketingFooter.js';
import { siteUrl } from '../../marketing/seo.js';

const DESCRIPTION =
  'MentorMatch é a plataforma de mentoria corporativa que faz o conhecimento circular: conecta quem sabe a quem precisa saber, com método, em escala e impacto medido.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'MentorMatch — o conhecimento circula', template: '%s · MentorMatch' },
  description: DESCRIPTION,
  applicationName: 'MentorMatch',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'MentorMatch',
    title: 'MentorMatch — o conhecimento circula',
    description: DESCRIPTION,
    url: siteUrl(),
    locale: 'pt_BR',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MentorMatch',
    description: DESCRIPTION,
    images: ['/og.png'],
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mk-page">
      <MarketingNav />
      <main className="mk-main">{children}</main>
      <MarketingFooter />
    </div>
  );
}
