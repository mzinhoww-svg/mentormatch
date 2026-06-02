-- =====================================================================
-- Migration 0005 — Mentorship session foundation (Slice 6)
--
-- mentorship_session: a scheduled meeting inside an ACTIVE mentorship.
--   States: requested | confirmed | completed | cancelled.
-- Sessions only exist for active mentorships; ContactInfo reveal is unchanged
-- (still gated by an active mentorship). All tenant-scoped (RLS), audited.
-- =====================================================================

-- Composite-unique target so mentorship_session can FK by (tenant_id, id).
ALTER TABLE mentorship ADD CONSTRAINT uq_mentorship_tenant_id UNIQUE (tenant_id, id);

CREATE TABLE mentorship_session (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  mentorship_id uuid NOT NULL,
  requested_by  uuid NOT NULL,
  scheduled_at  timestamptz,
  objective     text,
  notes         text,
  status        text NOT NULL DEFAULT 'requested',
  created_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at  timestamptz,
  completed_at  timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text,
  CONSTRAINT ck_session_status CHECK (status IN
    ('requested','confirmed','completed','cancelled')),
  CONSTRAINT fk_session_mentorship FOREIGN KEY (tenant_id, mentorship_id)
    REFERENCES mentorship (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_session_requester FOREIGN KEY (tenant_id, requested_by)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_session_mentorship ON mentorship_session(tenant_id, mentorship_id);
CREATE INDEX idx_session_status ON mentorship_session(tenant_id, status);

-- ---- RLS -------------------------------------------------------------
ALTER TABLE mentorship_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_session FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_session_isolation ON mentorship_session;
CREATE POLICY p_session_isolation ON mentorship_session
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON mentorship_session TO mm_app;
