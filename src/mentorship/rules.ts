/**
 * Mentorship state rules (pure).
 */
export const REQUEST_STATUSES = [
  'pending',
  'waitlisted',
  'accepted',
  'rejected',
  'cancelled',
  'expired',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const MENTORSHIP_STATUSES = ['active', 'ended'] as const;
export type MentorshipStatus = (typeof MENTORSHIP_STATUSES)[number];

/** New requests go to the waitlist when the mentor is at capacity. */
export function decideInitialStatus(
  activeCount: number,
  capacity: number,
): 'pending' | 'waitlisted' {
  return activeCount >= capacity ? 'waitlisted' : 'pending';
}

/** Requests that a mentor may still accept/reject (or a mentee may cancel). */
export function isOpenForDecision(status: RequestStatus): boolean {
  return status === 'pending' || status === 'waitlisted';
}
