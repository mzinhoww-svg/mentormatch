-- =====================================================================
-- Migration 0011 — Performance hardening (Slice 16)
--
-- Additive indexes for worker hot paths. No schema/semantic change.
--   * notification email worker scans email_status='pending'
--   * request-expiry job scans open requests by expires_at
-- =====================================================================

-- Email worker: enqueuePendingEmails() filters notifications by email_status.
CREATE INDEX IF NOT EXISTS idx_notification_email_pending
  ON notification (tenant_id)
  WHERE email_status = 'pending';

-- Request expiry: expireRequests() scans open requests past their expiry.
CREATE INDEX IF NOT EXISTS idx_request_expiry
  ON mentorship_request (expires_at)
  WHERE status IN ('pending', 'waitlisted');
