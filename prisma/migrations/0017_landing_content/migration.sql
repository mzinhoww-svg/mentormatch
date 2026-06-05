-- =====================================================================
-- Migration 0017 — Per-tenant employee-landing copy
-- Adds tenant_settings.landing (jsonb): admin-authored copy for the
-- employee-facing landing — niche, transformation, methodology, audience,
-- and real testimonials. NULL/absent → the generic landing copy is used.
-- Additive and idempotent.
-- =====================================================================
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS landing jsonb;
