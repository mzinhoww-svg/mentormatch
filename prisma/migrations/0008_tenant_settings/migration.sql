-- =====================================================================
-- Migration 0008 — Tenant settings & branding foundation (Slice 10)
--
-- tenant_settings: one row per tenant holding white-label branding (logo,
--   colors, display name, program name, locale), an operational status
--   (active/inactive, distinct from the platform registry status), and basic
--   operational preferences. Absence of a row → safe brand-kit defaults
--   (resolved in the service layer). Tenant-scoped (RLS).
-- =====================================================================

CREATE TABLE tenant_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  display_name          text,
  logo_url              text,
  primary_color         text,
  secondary_color       text,
  program_name          text,
  locale                text NOT NULL DEFAULT 'pt-BR',
  status                text NOT NULL DEFAULT 'active',
  allow_self_signup     boolean NOT NULL DEFAULT true,
  default_mentor_capacity int NOT NULL DEFAULT 3,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_settings UNIQUE (tenant_id),
  CONSTRAINT ck_settings_status CHECK (status IN ('active','inactive')),
  CONSTRAINT ck_settings_capacity CHECK (default_mentor_capacity >= 0)
);

-- ---- RLS -------------------------------------------------------------
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_settings_isolation ON tenant_settings;
CREATE POLICY p_settings_isolation ON tenant_settings
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_settings TO mm_app;
