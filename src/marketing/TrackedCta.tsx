'use client';
/**
 * A marketing CTA link that records a funnel event before navigating. sendBeacon
 * fires synchronously, so the event is captured even as the browser navigates
 * away. Falls back to a plain link if tracking is unavailable.
 */
import type { ReactNode } from 'react';
import { track } from './track.js';
import type { FunnelEvent } from './funnelEvents.js';

export function TrackedCta({
  event,
  href,
  className,
  children,
  style,
}: {
  event: FunnelEvent;
  href: string;
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <a href={href} className={className} style={style} onClick={() => track(event)}>
      {children}
    </a>
  );
}
