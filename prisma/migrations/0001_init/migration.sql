-- =====================================================================
-- Migration 0001 — initial schema (tables, constraints, indexes)
-- Applied as the owner role (mm_owner). RLS is added in 0002.
-- gen_random_uuid() is available in PostgreSQL core (>= 13).
-- =====================================================================

-- Tenant registry. NOT tenant-scoped: looked up by slug to resolve a host
-- BEFORE any tenant context exists. mm_app gets SELECT only (see 0002).
CREATE TABLE tenant (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  status     text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Custom domains for a tenant (tenant-scoped).
CREATE TABLE tenant_domain (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  domain     text NOT NULL UNIQUE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenant_domain_tenant ON tenant_domain(tenant_id);

-- Identity is per-tenant (no global User). Auth email is a credential, not a
-- public contact. ContactInfo columns are LGPD-sensitive.
CREATE TABLE tenant_user (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email            text NOT NULL,
  normalized_email text NOT NULL,
  display_name     text,
  role             text NOT NULL DEFAULT 'member',
  password_hash    text,
  status           text NOT NULL DEFAULT 'active',
  contact_email    text,
  contact_phone    text,
  contact_whatsapp text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Same email may exist in two tenants; must be unique WITHIN a tenant.
  CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, normalized_email)
);
CREATE INDEX idx_tenant_user_tenant ON tenant_user(tenant_id);

-- LGPD consent (mandatory at signup; terms versioned).
CREATE TABLE consent_record (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  tenant_user_id uuid NOT NULL REFERENCES tenant_user(id) ON DELETE CASCADE,
  terms_version  text NOT NULL,
  consented_at   timestamptz NOT NULL DEFAULT now(),
  ip             text
);
CREATE INDEX idx_consent_tenant ON consent_record(tenant_id);

-- Append-only audit trail (tenant-scoped). Metadata is redacted by the app.
CREATE TABLE audit_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  action      text NOT NULL,
  actor_id    uuid,
  actor_type  text,
  target_id   uuid,
  target_type text,
  metadata    jsonb,
  request_id  text,
  ip          text,
  user_agent  text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant ON audit_event(tenant_id);
