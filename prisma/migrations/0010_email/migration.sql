-- =====================================================================
-- Migration 0010 — Email delivery foundation (Slice 14)
--
-- email_message: a transactional email queued from a domain event (via the
--   notification it produced). Out-of-band worker renders + sends it, so a
--   provider failure never affects the core flow. Tenant-scoped (RLS).
--   status: pending | sent | failed (with attempts + last_error for retry).
-- One email per source notification (unique notification_id).
-- =====================================================================

CREATE TABLE email_message (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES notification(id) ON DELETE CASCADE,
  recipient       text NOT NULL,
  template_key    text NOT NULL,
  subject         text NOT NULL,
  body            text NOT NULL,
  origin_event    text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  provider        text,
  attempts        int NOT NULL DEFAULT 0,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_email_status CHECK (status IN ('pending','sent','failed'))
);
CREATE UNIQUE INDEX uq_email_notification ON email_message (notification_id)
  WHERE notification_id IS NOT NULL;
CREATE INDEX idx_email_tenant_status ON email_message (tenant_id, status);

-- ---- RLS -------------------------------------------------------------
ALTER TABLE email_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_message FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_email_isolation ON email_message;
CREATE POLICY p_email_isolation ON email_message
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON email_message TO mm_app;
