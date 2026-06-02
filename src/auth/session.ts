/**
 * Stateless, signed tokens (HMAC-SHA256 over a base64url JSON payload).
 *
 * Used for the tenant-scoped session cookie and for password-reset tokens.
 * Every token carries `tenantId`, so a session minted for one tenant is never
 * valid for another (verified against the resolved host in requireSession).
 *
 * Signed with AUTH_SECRET. No external auth library.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'mm_session';
const DEFAULT_SESSION_TTL = 60 * 60 * 8; // 8h
const DEFAULT_RESET_TTL = 60 * 60; // 1h

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

interface BaseClaims {
  typ: 'session' | 'reset';
  sub: string;
  tenantId: string;
  iat: number;
  exp: number;
  role?: string;
}

function sign(claims: BaseClaims): string {
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  const sig = b64url(createHmac('sha256', secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

function verify(token: string): BaseClaims | null {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = b64url(createHmac('sha256', secret()).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let claims: BaseClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as BaseClaims;
  } catch {
    return null;
  }
  if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null;
  return claims;
}

export interface SessionClaims {
  sub: string;
  tenantId: string;
  role: string;
  iat: number;
  exp: number;
}

export function createSessionToken(input: {
  sub: string;
  tenantId: string;
  role: string;
  ttlSeconds?: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    typ: 'session',
    sub: input.sub,
    tenantId: input.tenantId,
    role: input.role,
    iat: now,
    exp: now + (input.ttlSeconds ?? DEFAULT_SESSION_TTL),
  });
}

export function verifySessionToken(token: string): SessionClaims | null {
  const c = verify(token);
  if (!c || c.typ !== 'session' || typeof c.role !== 'string') return null;
  return { sub: c.sub, tenantId: c.tenantId, role: c.role, iat: c.iat, exp: c.exp };
}

export function createResetToken(input: {
  sub: string;
  tenantId: string;
  ttlSeconds?: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    typ: 'reset',
    sub: input.sub,
    tenantId: input.tenantId,
    iat: now,
    exp: now + (input.ttlSeconds ?? DEFAULT_RESET_TTL),
  });
}

export function verifyResetToken(token: string): { sub: string; tenantId: string } | null {
  const c = verify(token);
  if (!c || c.typ !== 'reset') return null;
  return { sub: c.sub, tenantId: c.tenantId };
}
