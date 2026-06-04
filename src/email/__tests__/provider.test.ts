import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getEmailProvider,
  __setEmailProvider,
  ConsoleEmailProvider,
  NoopEmailProvider,
  ResendEmailProvider,
  type OutgoingEmail,
} from '../provider.js';
import type { FetchLike } from '../../http/fetchLike.js';

const ENV_KEYS = ['EMAIL_PROVIDER', 'RESEND_API_KEY', 'EMAIL_FROM'] as const;
const saved: Record<string, string | undefined> = {};

const email: OutgoingEmail = {
  to: 'a@b.com',
  subject: 'Hi',
  body: 'Body',
  templateKey: 'admin.set_password',
  tenantId: 't1',
  originEvent: 'tenant.provisioned',
};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  __setEmailProvider(null); // reset module cache
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  __setEmailProvider(null);
});

describe('getEmailProvider selection', () => {
  it('defaults to console when EMAIL_PROVIDER is unset', () => {
    delete process.env.EMAIL_PROVIDER;
    expect(getEmailProvider()).toBeInstanceOf(ConsoleEmailProvider);
  });

  it('selects noop and resend by name (case-insensitive)', () => {
    process.env.EMAIL_PROVIDER = 'NOOP';
    expect(getEmailProvider()).toBeInstanceOf(NoopEmailProvider);
    __setEmailProvider(null);
    process.env.EMAIL_PROVIDER = 'resend';
    expect(getEmailProvider()).toBeInstanceOf(ResendEmailProvider);
  });
});

describe('ResendEmailProvider.send (injected fetch seam)', () => {
  it('reports a normal failure when unconfigured (no network)', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    const fetchImpl = vi.fn<FetchLike>(async () => new Response(null, { status: 200 }));

    const res = await new ResendEmailProvider(fetchImpl).send(email);
    expect(res).toEqual({ ok: false, error: 'resend_not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('POSTs to the Resend API and returns the message id on success', async () => {
    process.env.RESEND_API_KEY = 'rk_test';
    process.env.EMAIL_FROM = 'no-reply@acme.com';
    const fetchImpl = vi.fn<FetchLike>(
      async () => new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 }),
    );

    const res = await new ResendEmailProvider(fetchImpl).send(email);
    expect(res).toEqual({ ok: true, providerMessageId: 'msg_123' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(init!.method).toBe('POST');
    expect((init!.headers as Record<string, string>).authorization).toBe('Bearer rk_test');
    expect(JSON.parse(init!.body as string)).toMatchObject({
      from: 'no-reply@acme.com',
      to: 'a@b.com',
      subject: 'Hi',
      text: 'Body',
    });
  });

  it('returns a failure (never throws) on a non-2xx response', async () => {
    process.env.RESEND_API_KEY = 'rk_test';
    process.env.EMAIL_FROM = 'no-reply@acme.com';
    const fetchImpl = vi.fn<FetchLike>(async () => new Response('rate limited', { status: 429 }));
    const res = await new ResendEmailProvider(fetchImpl).send(email);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('resend_http_429');
  });

  it('returns a failure when fetch itself throws', async () => {
    process.env.RESEND_API_KEY = 'rk_test';
    process.env.EMAIL_FROM = 'no-reply@acme.com';
    const fetchImpl = vi.fn<FetchLike>(async () => {
      throw new Error('network down');
    });
    const res = await new ResendEmailProvider(fetchImpl).send(email);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('network down');
  });
});
