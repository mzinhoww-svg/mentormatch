/**
 * Marketing funnel event taxonomy (pure — shared by the client tracker and the
 * /api/track endpoint). Allowlisted so the public endpoint can't be used to
 * inject arbitrary log lines. The conversion itself (a demo request) is logged
 * server-side by /api/demo-request, completing the funnel:
 *   landing_view → landing_cta_demo → demo_view → demo_request.
 */
export const FUNNEL_EVENTS = [
  'landing_view',
  'landing_cta_demo',
  'demo_view',
  'como_funciona_view',
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

const SET = new Set<string>(FUNNEL_EVENTS);

export function isFunnelEvent(value: unknown): value is FunnelEvent {
  return typeof value === 'string' && SET.has(value);
}
