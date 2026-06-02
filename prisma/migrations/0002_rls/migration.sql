-- =====================================================================
-- Migration 0002 — Row Level Security (the security core of Slice 1)
--
-- Mechanism:
--   The application enters tenant scope via withTenant(), which sets a
--   transaction-local GUC `app.tenant_id` using
--   `SELECT set_config('app.tenant_id', '<uuid>', true)` (is_local = true,
--   i.e. SET LOCAL semantics). Policies compare each row's tenant_id to it.
--
--   current_setting('app.tenant_id', true) returns NULL when the GUC is unset
--   (the `true` = missing_ok). NULL => USING/CHECK is NULL => NOT TRUE =>
--   the row is denied. This gives DEFAULT DENY with no tenant context.
--
--   SET LOCAL is transaction-scoped, so the context auto-resets on
--   COMMIT/ROLLBACK and cannot leak to the next query on a pooled connection.
--
-- FORCE ROW LEVEL SECURITY makes policies apply even to the table owner
-- (defense in depth); the app connects as the non-owner, NOBYPASSRLS mm_app.
-- =====================================================================

-- NULL-safe resolver of the current tenant from the GUC.
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

-- ---- tenant_domain ---------------------------------------------------
ALTER TABLE tenant_domain ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domain FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_tenant_domain_isolation ON tenant_domain;
CREATE POLICY p_tenant_domain_isolation ON tenant_domain
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

-- ---- Grants for mm_app (non-owner, NOBYPASSRLS) ----------------------
-- mm_app gets DML on tenant-scoped tables but is fully subject to the policies.
GRANT USAGE ON SCHEMA public TO mm_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  tenant_user, tenant_domain, consent_record, audit_event TO mm_app;
-- tenant is the registry: mm_app may only READ it (to resolve a slug).
GRANT SELECT ON tenant TO mm_app;
GRANT EXECUTE ON FUNCTION app_current_tenant() TO mm_app;
