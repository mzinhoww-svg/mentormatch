-- =====================================================================
-- Migration 0009 — Feedback & ratings foundation (Slice 12)
--
-- feedback: a post-session / post-mentorship / program rating by an author.
--   feedback_type: session | mentor | mentee | program
--   target_type:   session | tenant_user | program  (polymorphic target_id)
--   score 1..5, optional comment, status submitted|withdrawn.
-- Feedback can only exist for valid sessions / mentorships / programs (enforced
-- in the service). All tenant-scoped (RLS), audited. No ContactInfo here.
-- =====================================================================

CREATE TABLE feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL,
  feedback_type text NOT NULL,
  target_type   text NOT NULL,
  target_id     uuid NOT NULL,
  mentorship_id uuid,
  score         int NOT NULL,
  comment       text,
  status        text NOT NULL DEFAULT 'submitted',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_feedback_type CHECK (feedback_type IN ('session','mentor','mentee','program')),
  CONSTRAINT ck_feedback_target_type CHECK (target_type IN ('session','tenant_user','program')),
  CONSTRAINT ck_feedback_score CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT ck_feedback_status CHECK (status IN ('submitted','withdrawn')),
  CONSTRAINT fk_feedback_author FOREIGN KEY (tenant_id, author_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_feedback_target ON feedback(tenant_id, target_type, target_id);
CREATE INDEX idx_feedback_author ON feedback(tenant_id, author_id);
-- At most one active feedback per author + target + type.
CREATE UNIQUE INDEX uq_feedback_active ON feedback (tenant_id, author_id, feedback_type, target_id)
  WHERE status = 'submitted';

-- ---- RLS -------------------------------------------------------------
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_feedback_isolation ON feedback;
CREATE POLICY p_feedback_isolation ON feedback
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON feedback TO mm_app;
