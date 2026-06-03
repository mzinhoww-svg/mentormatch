import { describe, it, expect } from 'vitest';
import { POST } from '../../app/api/demo-request/route.js';

function req(body: unknown, ip: string): Request {
  return new Request('http://mentormatch.app/api/demo-request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

const good = { name: 'Ana', company: 'Acme', role: 'RH', email: 'ana@acme.com', headcount: '51–200' };

describe('POST /api/demo-request', () => {
  it('accepts a valid lead', async () => {
    const res = await POST(req(good, '10.0.0.1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('rejects an invalid lead (400)', async () => {
    const res = await POST(req({ ...good, email: 'nope' }, '10.0.0.2'));
    expect(res.status).toBe(400);
  });

  it('rate-limits abusive clients (429 after 5/min)', async () => {
    const ip = '10.0.0.99';
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await POST(req(good, ip));
      codes.push(res.status);
    }
    expect(codes.slice(0, 5).every((c) => c === 200)).toBe(true);
    expect(codes[5]).toBe(429);
  });
});
