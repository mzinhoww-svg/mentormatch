import { describe, it, expect, vi, afterEach } from 'vitest';
import { TtlCache, cacheTtlMs } from '../ttlCache.js';

afterEach(() => vi.useRealTimers());

describe('TtlCache', () => {
  it('returns a cached value within the TTL and re-loads after it expires', async () => {
    vi.useFakeTimers();
    const cache = new TtlCache<number>(1000);
    const load = vi.fn(async () => 42);

    expect(await cache.getOrLoad('k', load)).toBe(42);
    expect(await cache.getOrLoad('k', load)).toBe(42);
    expect(load).toHaveBeenCalledTimes(1); // hit, not re-loaded

    vi.advanceTimersByTime(1001);
    const load2 = vi.fn(async () => 43);
    expect(await cache.getOrLoad('k', load2)).toBe(43); // expired → re-load
    expect(load2).toHaveBeenCalledTimes(1);
  });

  it('delete() and clear() drop entries', async () => {
    const cache = new TtlCache<string>(10_000);
    await cache.getOrLoad('a', async () => 'A');
    await cache.getOrLoad('b', async () => 'B');
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('B');
    cache.clear();
    expect(cache.get('b')).toBeUndefined();
  });

  it('ttl<=0 disables caching (always loads)', async () => {
    const cache = new TtlCache<number>(0);
    const load = vi.fn(async () => 1);
    await cache.getOrLoad('k', load);
    await cache.getOrLoad('k', load);
    expect(load).toHaveBeenCalledTimes(2);
    expect(cache.get('k')).toBeUndefined();
  });

  it('evicts the oldest entry past the soft cap', () => {
    const cache = new TtlCache<number>(10_000, 2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // exceeds cap of 2 → 'a' evicted
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('cacheTtlMs reads env with a default and rejects bad values', () => {
    const KEY = 'MM_TEST_TTL_X';
    delete process.env[KEY];
    expect(cacheTtlMs(KEY, 500)).toBe(500);
    process.env[KEY] = '0';
    expect(cacheTtlMs(KEY, 500)).toBe(0);
    process.env[KEY] = '1234';
    expect(cacheTtlMs(KEY, 500)).toBe(1234);
    process.env[KEY] = 'nonsense';
    expect(cacheTtlMs(KEY, 500)).toBe(500);
    delete process.env[KEY];
  });
});
