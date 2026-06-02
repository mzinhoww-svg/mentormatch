/**
 * Mentorship session state rules (pure).
 *
 * Lifecycle: requested → confirmed → completed
 *                     ↘ cancelled ↙  (from requested or confirmed)
 */
export const SESSION_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** A requested session may be confirmed. */
export function canConfirm(status: SessionStatus): boolean {
  return status === 'requested';
}

/** Only a confirmed session may be completed. */
export function canComplete(status: SessionStatus): boolean {
  return status === 'confirmed';
}

/** Open (not-yet-finished) sessions may be cancelled. */
export function canCancel(status: SessionStatus): boolean {
  return status === 'requested' || status === 'confirmed';
}
