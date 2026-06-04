/**
 * Vercel "edge" domain provider — registers a VERIFIED custom domain with the
 * Vercel project so the edge routes it and issues TLS. Env-gated
 * (VERCEL_API_TOKEN + VERCEL_PROJECT_ID + VERCEL_TEAM_ID); a no-op when
 * unconfigured, so the DNS-TXT verification flow works without it. Never throws
 * — every call returns a result and logs metadata only.
 */
import { logger } from '../observability/logger.js';
import type { FetchLike } from '../http/fetchLike.js';

const API = 'https://api.vercel.com';

interface EdgeConfig {
  token: string;
  projectId: string;
  teamId: string;
}

function edgeConfig(): EdgeConfig | null {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (!token || !projectId || !teamId) return null;
  return { token, projectId, teamId };
}

/** True when the Vercel edge integration is fully configured. */
export function isEdgeConfigured(): boolean {
  return edgeConfig() !== null;
}

export interface EdgeVerification {
  type: string;
  domain: string;
  value: string;
}

export interface EdgeResult {
  ok: boolean;
  /** Unconfigured → the call was a no-op (not a failure). */
  skipped?: boolean;
  verified?: boolean;
  /** Vercel's challenge records (e.g. the A/CNAME or TXT the customer must set). */
  verification?: EdgeVerification[];
  error?: string;
}

async function call(
  path: string,
  init: RequestInit,
  cfg: EdgeConfig,
  fetchImpl: FetchLike,
): Promise<Response> {
  const sep = path.includes('?') ? '&' : '?';
  return fetchImpl(`${API}${path}${sep}teamId=${encodeURIComponent(cfg.teamId)}`, {
    ...init,
    headers: {
      authorization: `Bearer ${cfg.token}`,
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Registers the domain with the Vercel project. A 400 ("already on this
 * project") is treated as success; a 409 ("assigned to another project/account")
 * surfaces as an error. Returns Vercel's verification challenge when present.
 */
export async function addDomainToEdge(
  domain: string,
  fetchImpl: FetchLike = fetch,
): Promise<EdgeResult> {
  const cfg = edgeConfig();
  if (!cfg) return { ok: false, skipped: true };
  try {
    const res = await call(
      `/v10/projects/${encodeURIComponent(cfg.projectId)}/domains`,
      { method: 'POST', body: JSON.stringify({ name: domain }) },
      cfg,
      fetchImpl,
    );
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        verified?: boolean;
        verification?: EdgeVerification[];
      };
      logger.info('edge.domain_added', { domain, verified: data.verified ?? null });
      return { ok: true, verified: data.verified, verification: data.verification };
    }
    if (res.status === 400) return { ok: true }; // already on this project
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    logger.warn('edge.add_domain_failed', { domain, status: res.status });
    return { ok: false, error: `vercel_http_${res.status}${detail ? `: ${detail}` : ''}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Asks Vercel to (re)check the domain's verification challenge. */
export async function verifyDomainOnEdge(
  domain: string,
  fetchImpl: FetchLike = fetch,
): Promise<EdgeResult> {
  const cfg = edgeConfig();
  if (!cfg) return { ok: false, skipped: true };
  try {
    const res = await call(
      `/v9/projects/${encodeURIComponent(cfg.projectId)}/domains/${encodeURIComponent(domain)}/verify`,
      { method: 'POST' },
      cfg,
      fetchImpl,
    );
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { verified?: boolean };
      return { ok: true, verified: data.verified };
    }
    return { ok: false, error: `vercel_http_${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
