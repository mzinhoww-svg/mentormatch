/**
 * Minimal in-process TTL cache (no deps). Per-entry expiry with lazy eviction
 * and a soft size cap. Intended for hot, rarely-changing, NON-sensitive lookups
 * (tenant resolution, branding) on warm serverless instances — a cold instance
 * simply misses and falls back to the source, so it never changes correctness,
 * only latency. Writers invalidate explicitly so changes propagate immediately
 * within a process; across instances, staleness is bounded by the TTL.
 */
export class TtlCache<V> {
  private store = new Map<string, { value: V; expiresAt: number }>();
  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1000,
  ) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V): void {
    // Soft cap: when full, drop the oldest insertion (Map preserves order).
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * Returns the cached value or computes, caches, and returns it. Concurrent
   * callers may each compute on a cold miss (acceptable: the work is idempotent
   * reads); the last write wins. Disabled (ttl<=0) → always computes.
   */
  async getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    if (this.ttlMs <= 0) return load();
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await load();
    this.set(key, value);
    return value;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/** Reads a TTL (ms) from the environment with a default; 0 disables caching. */
export function cacheTtlMs(envVar: string, defaultMs: number): number {
  const raw = process.env[envVar];
  if (raw === undefined) return defaultMs;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : defaultMs;
}
