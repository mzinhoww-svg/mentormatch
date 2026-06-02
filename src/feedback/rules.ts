/**
 * Feedback rules & constants (pure).
 */
export const FEEDBACK_TYPES = ['session', 'mentor', 'mentee', 'program'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const TARGET_TYPES = ['session', 'tenant_user', 'program'] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

export function isValidScore(score: unknown): score is number {
  return typeof score === 'number' && Number.isInteger(score) && score >= SCORE_MIN && score <= SCORE_MAX;
}

/** Average rounded to 2 decimals; 0 when there are no ratings. */
export function averageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}
