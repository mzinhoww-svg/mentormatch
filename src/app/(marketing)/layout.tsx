import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './marketing.css';
import { MarketingNav } from '../../marketing/MarketingNav.js';
import { MarketingFooter } from '../../marketing/MarketingFooter.js';
import { siteUrl } from '../../marketing/seo.js';
import { resolveActiveTenant } from '../../tenancy/admin.js';

// Reads the host to decide whether to render the MentorMatch marketing chrome
// (institutional) or none (tenant host — the employee landing is self-chromed).
export const dynamic = 'force-dynamic';

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

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const host = (await headers()).get('host');
  const resolution = await resolveActiveTenant(host);

  // On a tenant host the children are the white-label employee landing, which
  // carries its own branded header/footer. Never wrap it in MentorMatch chrome.
  if (resolution.kind === 'TENANT') {
    return <div className="mk-page">{children}</div>;
  }

  return (
    <div className="mk-page">
      <MarketingNav />
      <main className="mk-main">{children}</main>
      <MarketingFooter />
    </div>
  );
}
