/**
 * Brand fonts, self-hosted via next/font/local (woff2 committed under ./fonts).
 *
 * Self-hosting (vs. the Google Fonts @import) means: no third-party request at
 * runtime, no render-blocking stylesheet, and — crucially — no network fetch at
 * BUILD time, so a deploy never fails because Google Fonts is unreachable.
 * Each face exposes a CSS variable consumed by globals.css (--sans/--serif/--mono).
 */
import localFont from 'next/font/local';

export const sans = localFont({
  variable: '--font-sans',
  display: 'swap',
  src: [
    { path: './fonts/HankenGrotesk-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/HankenGrotesk-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/HankenGrotesk-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/HankenGrotesk-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/HankenGrotesk-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/HankenGrotesk-800.woff2', weight: '800', style: 'normal' },
  ],
});

export const serif = localFont({
  variable: '--font-serif',
  display: 'swap',
  src: [
    { path: './fonts/InstrumentSerif-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/InstrumentSerif-400italic.woff2', weight: '400', style: 'italic' },
  ],
});

export const mono = localFont({
  variable: '--font-mono',
  display: 'swap',
  src: [
    { path: './fonts/SpaceMono-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/SpaceMono-400italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/SpaceMono-700.woff2', weight: '700', style: 'normal' },
  ],
});
