/**
 * Pure metric helpers for the tenant admin overview. Kept side-effect free so
 * they can be unit-tested without a database.
 */

/** Participation = share of active users engaged in at least one active mentorship. */
export function participationRate(participants: number, activeUsers: number): number {
  if (activeUsers <= 0) return 0;
  return Math.round((participants / activeUsers) * 10000) / 10000;
}

/**
 * Folds grouped {status,count} rows into a complete map, defaulting every known
 * status to 0 so the shape is stable for empty states.
 */
export function countsByStatus<K extends string>(
  rows: { status: string; count: number }[],
  statuses: readonly K[],
): Record<K, number> {
  const out = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<K, number>;
  for (const r of rows) {
    if ((statuses as readonly string[]).includes(r.status)) {
      out[r.status as K] = Number(r.count) || 0;
    }
  }
  return out;
}
