/**
 * Baseline HTTP security headers applied to every response (next.config).
 * Conservative by design — does not include a strict CSP (Next injects inline
 * styles/scripts and we load Google Fonts), which would require nonces; that is
 * tracked as a follow-up. These headers are safe and break nothing.
 */
export interface HttpHeader {
  key: string;
  value: string;
}

export const SECURITY_HEADERS: HttpHeader[] = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];
