import { describe, it, expect } from 'vitest';
import { GET } from '../src/app/health/route.js';

describe('health route', () => {
  it('returns 200 with the expected baseline payload', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok', service: 'mentormatch' });
  });
});
