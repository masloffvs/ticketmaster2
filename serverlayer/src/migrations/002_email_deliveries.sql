-- 002_email_deliveries.sql — Resend delivery telemetry

CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(64) NOT NULL,
  message_id VARCHAR(255),
  to_emails TEXT[] NOT NULL,
  subject VARCHAR(512) NOT NULL,
  status VARCHAR(32) NOT NULL,
  response_status INTEGER,
  request_payload TEXT,
  response_body TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_deliveries_created_at_idx
  ON email_deliveries (created_at DESC);

CREATE INDEX IF NOT EXISTS email_deliveries_status_idx
  ON email_deliveries (status);
