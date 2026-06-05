-- =====================================================================
-- Migration 0016 — First-login onboarding state + spoken languages
-- Adds:
--   profile.onboarded_at  — when the collaborator finished onboarding. NULL
--     means "never onboarded" and is what the /app gate uses to send a user
--     into the full-screen /onboarding wizard on first login.
--   profile.languages     — spoken languages (text[]) collected in onboarding.
-- Additive and idempotent. Existing collaborators have already been using the
-- app, so we backfill onboarded_at to avoid forcing them back through the wizard.
-- =====================================================================
ALTER TABLE profile ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS languages    text[] NOT NULL DEFAULT '{}';

-- Don't re-onboard anyone who already has a profile row (they've used the app).
UPDATE profile SET onboarded_at = COALESCE(onboarded_at, created_at) WHERE onboarded_at IS NULL;
