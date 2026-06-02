-- =====================================================================
-- Migration 0006 — Notifications foundation (Slice 7)
--
-- notification: an in-app notification for a target user, born from a valid
--   domain event (origin_event). Status unread|read. Payload is JSONB and must
--   never carry ContactInfo / secrets (enforced in the service layer).
-- notification_preference: per-(user,type) channel toggles (in_app / email).
--   Absence of a row = defaults (in_app on, email off).
-- email_status on notification is the foundation for transactional email
--   (none|pending|sent); no sender is implemented in this slice.
-- All tenant-scoped (RLS). Audit stays separate (origin_event references it).
-- =====================================================================

CREATE TABLE notification (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL,
  type           text NOT NULL,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  status         text NOT NULL DEFAULT 'unread',
  origin_event   text NOT NULL,
  origin_audit_id uuid,
  email_status   text NOT NULL DEFAULT 'none',
  created_at     timestamptz NOT NULL DEFAULT now(),
  read_at        timestamptz,
  CONSTRAINT ck_notification_status CHECK (status IN ('unread','read')),
  CONSTRAINT ck_notification_email_status CHECK (email_status IN ('none','pending','sent')),
  CONSTRAINT fk_notification_target FOREIGN KEY (tenant_id, target_user_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_notification_target ON notification(tenant_id, target_user_id, status);
CREATE INDEX idx_notification_created ON notification(tenant_id, created_at);

CREATE TABLE notification_preference (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  tenant_user_id uuid NOT NULL,
  type           text NOT NULL,
  in_app         boolean NOT NULL DEFAULT true,
  email          boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_pref_user FOREIGN KEY (tenant_id, tenant_user_id)
    REFERENCES tenant_user (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_pref UNIQUE (tenant_id, tenant_user_id, type)
);

-- ---- RLS -------------------------------------------------------------
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_notification_isolation ON notification;
CREATE POLICY p_notification_isolation ON notification
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

ALTER TABLE notification_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preference FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_pref_isolation ON notification_preference;
CREATE POLICY p_pref_isolation ON notification_preference
  USING (tenant_id = app_current_tenant()) WITH CHECK (tenant_id = app_current_tenant());

GRANT SELECT, INSERT, UPDATE, DELETE ON notification, notification_preference TO mm_app;
