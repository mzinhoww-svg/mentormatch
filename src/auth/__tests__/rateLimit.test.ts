import { describe, it, expect } from 'vitest';
import { createRateLimiter, type RateLimitStore } from '../rateLimit.js';

describe('rate limiter', () => {
  it('allows up to max then blocks within the window', () => {
    const rl = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(rl.check('k').allowed).toBe(true); // 1
    expect(rl.check('k').allowed).toBe(true); // 2
    expect(rl.check('k').allowed).toBe(true); // 3
    expect(rl.check('k').allowed).toBe(false); // 4 -> blocked
  });

  it('tracks keys independently', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(rl.check('a').allowed).toBe(true);
    expect(rl.check('b').allowed).toBe(true);
    expect(rl.check('a').allowed).toBe(false);
  });

  it('reset clears a key', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(rl.check('a').allowed).toBe(true);
    expect(rl.check('a').allowed).toBe(false);
    rl.reset('a');
    expect(rl.check('a').allowed).toBe(true);
  });

  it('fails CLOSED when the store throws', () => {
    const brokenStore: RateLimitStore = {
      hit() {
        throw new Error('store down');
      },
      clear() {},
    };
    const rl = createRateLimiter({ max: 100, windowMs: 60_000, store: brokenStore });
    expect(rl.check('a').allowed).toBe(false);
  });
});
