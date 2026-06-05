import type { ReactNode } from 'react';
import './onboarding.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Full-screen onboarding shell — deliberately WITHOUT the app sidebar/topbar so
 * the first-login wizard has the user's full focus. Auth + the "already
 * onboarded → /app" guard live in the page (it needs the session anyway).
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children;
}
