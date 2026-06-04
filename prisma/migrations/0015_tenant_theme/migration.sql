-- =====================================================================
-- Migration 0015 — Tenant theme tokens from DESIGN.md upload
-- Adds font family and button border radius to tenant_settings so an admin
-- can apply a parsed DESIGN.md (logo already exists as logo_url). Additive.
-- =====================================================================
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS font_family   text;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS border_radius text;
