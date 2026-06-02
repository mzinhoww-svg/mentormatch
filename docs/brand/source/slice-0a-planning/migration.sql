-- =====================================================================
-- Migration 0002 — Row Level Security
--
-- This is the security core of Slice 0A. Reviewed in isolation.
--
-- Mechanism:
--   The application sets a transaction-local GUC `app.tenant_id` via
--   `SET LOCAL app.tenant_id = '<uuid>'`. Policies compare the row's
--   tenant_id against that GUC.
--
--   current_setting('app.tenant_id', true) returns NULL when the GUC is unset
--   (the `true` = missing_ok). NULL => the USING/CHECK expression is NULL =>
--   NOT TRUE => row is denied. This gives DEFAULT DENY with no tenant context.
--
-- FORCE ROW LEVEL SECURITY ensures even the table owner is subject to policies
-- (defense in depth), though the app connects as the non-owner mm_app role.
-- =====================================================================

-- Helper: resolve the current tenant from the GUC, NULL-safe.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

-- ---- tenant_user -----------------------------------------------------
ALTER TABLE tenant_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_user FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_tenant_user_isolation ON tenant_user;
CREATE POLICY p_tenant_user_isolation ON tenant_user
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

-- ---- consent_record --------------------------------------------------
ALTER TABLE consent_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_record FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_consent_isolation ON consent_record;
CREATE POLICY p_consent_isolation ON consent_record
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

-- ---- audit_event -----------------------------------------------------
ALTER TABLE audit_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_event FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_audit_isolation ON audit_event;
CREATE POLICY p_audit_isolation ON audit_event
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

-- ---- tenant_domain ---------------------------------------------------
-- tenant_domain is tenant-scoped data and follows the same rule.
ALTER TABLE tenant_domain ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domain FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_tenant_domain_isolation ON tenant_domain;
CREATE POLICY p_tenant_domain_isolation ON tenant_domain
  USING (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

-- ---- Grants for mm_app (non-owner, NOBYPASSRLS) ----------------------
-- mm_app gets table DML but is fully subject to the policies above.
GRANT USAGE ON SCHEMA public TO mm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  tenant_user, consent_record, audit_event, tenant_domain TO mm_app;
-- tenant + platform_admin are platform-control tables: mm_app gets read on tenant
-- only (needed to resolve a slug), no access to platform_admin.
GRANT SELECT ON tenant TO mm_app;
GRANT EXECUTE ON FUNCTION app_current_tenant() TO mm_app;
