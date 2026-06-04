import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { sans, serif, mono } from './fonts.js';
import { siteUrl } from '../marketing/seo.js';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'MentorMatch', template: '%s · MentorMatch' },
  description: 'MentorMatch — o conhecimento circula. Mentoria corporativa multi-tenant.',
  applicationName: 'MentorMatch',
  // Favicon / app icons are wired via the file-based metadata convention
  // (app/icon.png, apple-icon.png) + the web manifest (app/manifest.ts). The
  // social image is referenced explicitly (public/og.png) rather than via the
  // opengraph-image file convention, which does not propagate into the
  // (marketing) route group when a segment defines its own openGraph.
  openGraph: {
    type: 'website',
    siteName: 'MentorMatch',
    title: 'MentorMatch',
    description: 'O conhecimento circula. Mentoria corporativa multi-tenant.',
    locale: 'pt_BR',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MentorMatch',
    description: 'O conhecimento circula. Mentoria corporativa multi-tenant.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
