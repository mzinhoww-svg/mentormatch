-- =====================================================================
-- Migration 0004 — Mentorship request & approval (Slice 5)
--
-- mentorship_request: a mentee asks a mentor. States: pending | waitlisted |
--   accepted | rejected | cancelled | expired.
-- mentorship: the link created on accept. States: active | ended.
-- profile.mentor_capacity: max concurrent active mentees (waitlist when full).
-- All tenant-scoped (RLS). ContactInfo reveal is gated by an active mentorship.
-- =====================================================================

ALTER TABLE profile ADD COLUMN mentor_capacity int NOT NULL DEFAULT 3;

-- ---- mentorship_request ----------------------------------------------
CREATE TABLE mentorship_request (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  mentee_id  uuid NOT NULL,
  mentor_id  uuid NOT NULL,
  skill_id   uuid REFERENCES skill(id) ON DELETE SET NULL,
  message    text,
  status     text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  expires_at timestamptz,
  CONSTRAINT ck_request_status CHECK (status IN
    ('pending','waitlisted','accepted','rejected','cancelled','expired')),
  CONSTRAINT ck_request_not_self CHECK (mentee_id <> mentor_id),
  CONSTRAINT fk_request_mentee FOREIGN KEY (tenant_id, mentee_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_request_mentor FOREIGN KEY (tenant_id, mentor_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_request_mentor ON mentorship_request(tenant_id, mentor_id);
CREATE INDEX idx_request_mentee ON mentorship_request(tenant_id, mentee_id);
-- At most one OPEN request per (mentee -> mentor).
CREATE UNIQUE INDEX uq_open_request ON mentorship_request (tenant_id, mentee_id, mentor_id)
  WHERE status IN ('pending','waitlisted','accepted');

-- ---- mentorship ------------------------------------------------------
CREATE TABLE mentorship (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  mentor_id  uuid NOT NULL,
  mentee_id  uuid NOT NULL,
  request_id uuid,
  status     text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at   timestamptz,
  CONSTRAINT ck_mentorship_status CHECK (status IN ('active','ended')),
  CONSTRAINT ck_mentorship_not_self CHECK (mentee_id <> mentor_id),
  CONSTRAINT fk_mentorship_mentor FOREIGN KEY (tenant_id, mentor_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_mentorship_mentee FOREIGN KEY (tenant_id, mentee_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_mentorship_tenant ON mentorship(tenant_id);
CREATE INDEX idx_mentorship_mentor ON mentorship(tenant_id, mentor_id);
CREATE INDEX idx_mentorship_mentee ON mentorship(tenant_id, mentee_id);
-- One active mentorship per (mentor, mentee).
CREATE UNIQUE INDEX uq_active_mentorship ON mentorship (tenant_id, mentor_id, mentee_id)
  WHERE status = 'active';

-- ---- RLS -------------------------------------------------------------
ALTER TABLE mentorship_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_request FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_request_isolation ON mentorship_request;
CREATE POLICY p_request_isolation ON mentorship_request
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE mentorship ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_mentorship_isolation ON mentorship;
CREATE POLICY p_mentorship_isolation ON mentorship
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

-- ---- Grants for mm_app -----------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON mentorship_request, mentorship TO mm_app;
