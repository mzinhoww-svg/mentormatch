'use client';
/** Fires a single funnel event when mounted (e.g. a page view). Renders nothing. */
import { useEffect } from 'react';
import { track } from './track.js';
import type { FunnelEvent } from './funnelEvents.js';

export function FunnelTracker({ event }: { event: FunnelEvent }) {
  useEffect(() => {
    track(event);
  }, [event]);
  return null;
}
