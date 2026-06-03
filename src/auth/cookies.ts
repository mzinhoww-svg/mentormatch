/**
 * Cookie helpers (no dependency). The session cookie is HttpOnly, SameSite=Lax,
 * Path=/, and Secure in production.
 */
import { SESSION_COOKIE, PLATFORM_COOKIE } from './session.js';

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

function isProd(): boolean {
  return process.env.APP_ENV === 'production';
}

export function serializeSessionCookie(value: string, maxAgeSeconds: number): string {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProd()) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearSessionCookie(): string {
  const attrs = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProd()) attrs.push('Secure');
  return attrs.join('; ');
}

/** Platform-console cookie (separate name from the tenant session cookie). */
export function serializePlatformCookie(value: string, maxAgeSeconds: number): string {
  const attrs = [
    `${PLATFORM_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProd()) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearPlatformCookie(): string {
  const attrs = [`${PLATFORM_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProd()) attrs.push('Secure');
  return attrs.join('; ');
}
