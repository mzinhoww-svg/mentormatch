import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isEdgeConfigured, addDomainToEdge, verifyDomainOnEdge } from '../vercelDomains.js';
import type { FetchLike } from '../../http/fetchLike.js';

const KEYS = ['VERCEL_API_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_TEAM_ID'] as const;
const saved: Record<string, string | undefined> = {};

function configure() {
  process.env.VERCEL_API_TOKEN = 'tok';
  process.env.VERCEL_PROJECT_ID = 'prj_1';
  process.env.VERCEL_TEAM_ID = 'team_1';
}

beforeEach(() => {
  for (const k of KEYS) saved[k] = process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('isEdgeConfigured', () => {
  it('is true only when all three env vars are set', () => {
    for (const k of KEYS) delete process.env[k];
    expect(isEdgeConfigured()).toBe(false);
    process.env.VERCEL_API_TOKEN = 'tok';
    expect(isEdgeConfigured()).toBe(false);
    configure();
    expect(isEdgeConfigured()).toBe(true);
  });
});

describe('addDomainToEdge (injected fetch seam)', () => {
  it('skips with no network when unconfigured', async () => {
    for (const k of KEYS) delete process.env[k];
    const fetchImpl = vi.fn<FetchLike>();
    expect(await addDomainToEdge('mentoria.acme.com', fetchImpl)).toEqual({ ok: false, skipped: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs to the project domains endpoint and returns the challenge', async () => {
    configure();
    const fetchImpl = vi.fn<FetchLike>(
      async () =>
        new Response(
          JSON.stringify({ verified: false, verification: [{ type: 'TXT', domain: '_vercel.x', value: 'v' }] }),
          { status: 200 },
        ),
    );

    const r = await addDomainToEdge('mentoria.acme.com', fetchImpl);
    expect(r.ok).toBe(true);
    expect(r.verified).toBe(false);
    expect(r.verification?.[0]?.type).toBe('TXT');

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toContain('/v10/projects/prj_1/domains');
    expect(url).toContain('teamId=team_1');
    expect((init!.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(init!.body as string)).toEqual({ name: 'mentoria.acme.com' });
  });

  it('treats 400 (already on project) as ok and 409 as an error', async () => {
    configure();
    const ok400 = await addDomainToEdge(
      'x.acme.com',
      vi.fn<FetchLike>(async () => new Response('', { status: 400 })),
    );
    expect(ok400.ok).toBe(true);

    const r409 = await addDomainToEdge(
      'x.acme.com',
      vi.fn<FetchLike>(async () => new Response('exists', { status: 409 })),
    );
    expect(r409.ok).toBe(false);
    expect(r409.error).toContain('vercel_http_409');
  });

  it('never throws when fetch throws', async () => {
    configure();
    const r = await addDomainToEdge(
      'x.acme.com',
      vi.fn<FetchLike>(async () => {
        throw new Error('net down');
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.error).toContain('net down');
  });
});

describe('verifyDomainOnEdge (injected fetch seam)', () => {
  it('skips when unconfigured', async () => {
    for (const k of KEYS) delete process.env[k];
    expect(await verifyDomainOnEdge('x.acme.com', vi.fn<FetchLike>())).toEqual({ ok: false, skipped: true });
  });
  it('returns verified on success', async () => {
    configure();
    const r = await verifyDomainOnEdge(
      'x.acme.com',
      vi.fn<FetchLike>(async () => new Response(JSON.stringify({ verified: true }), { status: 200 })),
    );
    expect(r).toEqual({ ok: true, verified: true });
  });
});
