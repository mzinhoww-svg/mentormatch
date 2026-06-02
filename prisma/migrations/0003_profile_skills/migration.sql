-- =====================================================================
-- Migration 0003 — Profile + Skills foundation (Slice 3)
--
-- New tenant-scoped tables: profile (1:1 TenantUser), skill (catalog),
-- user_skill (offered/sought/interest), development_goal. All protected by RLS
-- and reachable only via withTenant(). Same-tenant composite FKs guarantee a
-- relation can never point at another tenant's row (defense in depth).
-- =====================================================================

-- Composite-unique target so child tables can FK by (tenant_id, id).
ALTER TABLE tenant_user ADD CONSTRAINT uq_tenant_user_tenant_id UNIQUE (tenant_id, id);

-- ---- profile (1:1 with tenant_user) ----------------------------------
CREATE TABLE profile (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  tenant_user_id   uuid NOT NULL,
  bio              text,
  title            text,           -- cargo
  area             text,
  seniority        text,           -- e.g. junior | mid | senior
  status           text NOT NULL DEFAULT 'inactive',  -- active | inactive
  mentor_available boolean NOT NULL DEFAULT false,     -- offers mentoring
  mentor_paused    boolean NOT NULL DEFAULT false,     -- temporarily paused
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_profile_user UNIQUE (tenant_id, tenant_user_id),
  CONSTRAINT ck_profile_status CHECK (status IN ('active','inactive')),
  CONSTRAINT fk_profile_user FOREIGN KEY (tenant_id, tenant_user_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_profile_tenant ON profile(tenant_id);

-- ---- skill (knowledge area / skill catalog, tenant-scoped) -----------
CREATE TABLE skill (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name            text NOT NULL,
  normalized_name text NOT NULL,
  category        text,            -- optional grouping (knowledge area)
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_skill_name UNIQUE (tenant_id, normalized_name),
  CONSTRAINT uq_skill_tenant_id UNIQUE (tenant_id, id)
);
CREATE INDEX idx_skill_tenant ON skill(tenant_id);

-- ---- user_skill (offered | sought | interest) ------------------------
CREATE TABLE user_skill (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  tenant_user_id uuid NOT NULL,
  skill_id       uuid NOT NULL,
  relation       text NOT NULL,    -- offered | sought | interest
  level          text,             -- optional proficiency for offered
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_skill UNIQUE (tenant_id, tenant_user_id, skill_id, relation),
  CONSTRAINT ck_user_skill_relation CHECK (relation IN ('offered','sought','interest')),
  CONSTRAINT fk_user_skill_user FOREIGN KEY (tenant_id, tenant_user_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_user_skill_skill FOREIGN KEY (tenant_id, skill_id)
    REFERENCES skill (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_user_skill_tenant ON user_skill(tenant_id);
CREATE INDEX idx_user_skill_user ON user_skill(tenant_id, tenant_user_id);

-- ---- development_goal -------------------------------------------------
CREATE TABLE development_goal (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  tenant_user_id uuid NOT NULL,
  description    text NOT NULL,
  status         text NOT NULL DEFAULT 'open',  -- open | done
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_dev_goal_status CHECK (status IN ('open','done')),
  CONSTRAINT fk_dev_goal_user FOREIGN KEY (tenant_id, tenant_user_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_dev_goal_tenant ON development_goal(tenant_id);

-- ---- RLS (enable + force + isolation policy) -------------------------
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_profile_isolation ON profile;
CREATE POLICY p_profile_isolation ON profile
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_skill_isolation ON skill;
CREATE POLICY p_skill_isolation ON skill
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE user_skill ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_user_skill_isolation ON user_skill;
CREATE POLICY p_user_skill_isolation ON user_skill
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE development_goal ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_goal FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_dev_goal_isolation ON development_goal;
CREATE POLICY p_dev_goal_isolation ON development_goal
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

-- ---- Grants for mm_app (non-owner, NOBYPASSRLS) ----------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
  profile, skill, user_skill, development_goal TO mm_app;
