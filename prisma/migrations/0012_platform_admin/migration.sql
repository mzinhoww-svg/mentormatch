-- =====================================================================
-- Migration 0012 — platform_admin registry (Phase 4: platform console)
--
-- Applied as the owner role (mm_owner). NOT tenant-scoped: platform admins
-- operate the whole platform (cross-tenant), so this table mirrors the
-- `tenant` registry's privilege model — it carries NO RLS and mm_app is
-- granted NO access. Password hashes are therefore never reachable by the
-- application role; only the owner (mm_owner, via ownerPool) reads/writes it.
-- gen_random_uuid() is PostgreSQL core (>= 13).
-- =====================================================================
CREATE TABLE platform_admin (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text NOT NULL,
  normalized_email text NOT NULL UNIQUE,
  display_name     text,
  password_hash    text NOT NULL,
  status           text NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Intentionally NO grants to mm_app: the platform_admin registry is owner-only.
