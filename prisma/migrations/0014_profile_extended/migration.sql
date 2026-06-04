-- =====================================================================
-- Migration 0014 — Extended profile (avatar, LinkedIn, contact visibility)
--
-- Adds self-service profile fields requested for the member profile screen:
--   * profile.avatar_url   — Vercel Blob URL of the profile photo
--   * profile.linkedin_url — public LinkedIn (or other) link
--   * tenant_user.contact_public — whether contact (email/phone/whatsapp)
--       may be shown in the directory BEFORE an accepted match. Defaults
--       false to preserve the current privacy posture (contact stays hidden
--       until a mentorship is accepted).
-- All additive; safe to run on existing data.
-- =====================================================================

ALTER TABLE profile      ADD COLUMN IF NOT EXISTS avatar_url   text;
ALTER TABLE profile      ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE tenant_user  ADD COLUMN IF NOT EXISTS contact_public boolean NOT NULL DEFAULT false;
