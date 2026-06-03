-- =====================================================================
-- Migration 0013 — custom domains (Phase 5)
--
-- Repurpose tenant_domain as a host→tenant REGISTRY (like `tenant`): it must be
-- readable BEFORE any tenant context exists in order to resolve a custom host,
-- so it cannot be RLS-scoped. RLS is removed; mm_app keeps SELECT only (writes
-- go through the owner, mm_owner). DNS-TXT verification columns are added, and
-- ONLY verified domains ever resolve to a tenant (anti-hijacking) — enforced in
-- application resolution (findTenantByCustomDomain).
--
-- Safe: tenant_domain is currently unused (no rows, no code path), so dropping
-- its policy changes no existing behaviour.
-- =====================================================================
ALTER TABLE tenant_domain DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_tenant_domain_isolation ON tenant_domain;

-- mm_app may only READ the registry; creating/verifying domains is an owner op.
REVOKE INSERT, UPDATE, DELETE ON tenant_domain FROM mm_app;

ALTER TABLE tenant_domain ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE tenant_domain ADD COLUMN IF NOT EXISTS verification_token text;
ALTER TABLE tenant_domain ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Fast lookup of verified domains during host resolution.
CREATE INDEX IF NOT EXISTS idx_tenant_domain_verified ON tenant_domain(domain) WHERE verified;
