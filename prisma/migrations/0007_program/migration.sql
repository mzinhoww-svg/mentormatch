-- =====================================================================
-- Migration 0007 — Program management foundation (Slice 9)
--
-- program: a mentoring program within a tenant. Exactly one default program per
--   tenant (partial unique index). Status active|inactive. Optional capacity.
-- program_participant: links a tenant user to a program (mentor|mentee|member),
--   status active|left. Unique per (program, user).
-- All tenant-scoped (RLS). The tenant's default program is created with the
-- tenant (see createTenant → ensureDefaultProgram).
-- =====================================================================

CREATE TABLE program (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'active',
  is_default  boolean NOT NULL DEFAULT false,
  capacity    int,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_program_status CHECK (status IN ('active','inactive')),
  CONSTRAINT ck_program_capacity CHECK (capacity IS NULL OR capacity >= 0)
);
CREATE INDEX idx_program_tenant ON program(tenant_id);
-- At most one default program per tenant.
CREATE UNIQUE INDEX uq_default_program ON program (tenant_id) WHERE is_default;
-- Composite-unique target so participants can FK by (tenant_id, id).
ALTER TABLE program ADD CONSTRAINT uq_program_tenant_id UNIQUE (tenant_id, id);

CREATE TABLE program_participant (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  program_id      uuid NOT NULL,
  tenant_user_id  uuid NOT NULL,
  role_in_program text NOT NULL DEFAULT 'member',
  status          text NOT NULL DEFAULT 'active',
  joined_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_participant_role CHECK (role_in_program IN ('mentor','mentee','member')),
  CONSTRAINT ck_participant_status CHECK (status IN ('active','left')),
  CONSTRAINT fk_participant_program FOREIGN KEY (tenant_id, program_id)
    REFERENCES program (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_participant_user FOREIGN KEY (tenant_id, tenant_user_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_participant UNIQUE (tenant_id, program_id, tenant_user_id)
);
CREATE INDEX idx_participant_program ON program_participant(tenant_id, program_id);

-- ---- RLS -------------------------------------------------------------
ALTER TABLE program ENABLE ROW LEVEL SECURITY;
ALTER TABLE program FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_program_isolation ON program;
CREATE POLICY p_program_isolation ON program
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE program_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_participant FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_participant_isolation ON program_participant;
CREATE POLICY p_participant_isolation ON program_participant
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON program, program_participant TO mm_app;
