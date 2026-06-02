/**
 * Fail-closed rate limiter behind a small interface.
 *
 * Default implementation is in-process (fixed window). The interface lets a
 * shared store (e.g. Redis) drop in later. "Fail-closed" = if the backing store
 * throws, the request is DENIED (never silently allowed).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(key?: string): void;
}

export interface RateLimitStore {
  /** Increment the counter for key in the current window; return the new count. */
  hit(key: string, windowMs: number): number;
  clear(key?: string): void;
}

class MemoryStore implements RateLimitStore {
  private map = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, windowMs: number): number {
    const now = Date.now();
    const entry = this.map.get(key);
    if (!entry || entry.resetAt <= now) {
      this.map.set(key, { count: 1, resetAt: now + windowMs });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }

  clear(key?: string): void {
    if (key === undefined) this.map.clear();
    else this.map.delete(key);
  }
}

export function createRateLimiter(opts: {
  max: number;
  windowMs: number;
  store?: RateLimitStore;
}): RateLimiter {
  const store = opts.store ?? new MemoryStore();
  return {
    check(key: string): RateLimitResult {
      try {
        const count = store.hit(key, opts.windowMs);
        const remaining = Math.max(0, opts.max - count);
        return { allowed: count <= opts.max, remaining };
      } catch {
        // fail-closed: deny on store failure
        return { allowed: false, remaining: 0 };
      }
    },
    reset(key?: string): void {
      try {
        store.clear(key);
      } catch {
        // ignore
      }
    },
  };
}
