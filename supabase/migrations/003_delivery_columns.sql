-- ================================================================
-- GHOST TAX — DELIVERY PIPELINE COLUMNS
-- Extends audit_requests to support post-payment delivery flow.
--
-- Pipeline: paid → processing → delivered → followup_scheduled
--
-- run_id: canonical delivery identifier (idempotency key)
-- domain: company domain for enrichment/analysis
-- report_data: full structured report (JSONB)
-- delivered_at: when email was sent
-- followup_at: when follow-up should trigger
-- ================================================================

-- Add delivery columns to audit_requests
ALTER TABLE audit_requests
  ADD COLUMN IF NOT EXISTS run_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS report_data JSONB,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_at TIMESTAMPTZ;

-- UNIQUE constraint on stripe_payment_intent_id (required for upsert)
-- The column exists in 001 but has no unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_req_stripe_session
  ON audit_requests(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Index for idempotency checks on run_id
CREATE INDEX IF NOT EXISTS idx_audit_req_run_id ON audit_requests(run_id);

-- Index for follow-up scheduling cron
CREATE INDEX IF NOT EXISTS idx_audit_req_followup ON audit_requests(followup_at)
  WHERE followup_at IS NOT NULL AND status = 'delivered';

-- Update status CHECK to include delivery pipeline states
-- (PostgreSQL doesn't support ALTER CHECK directly, so we drop and re-add)
ALTER TABLE audit_requests DROP CONSTRAINT IF EXISTS audit_requests_status_check;
ALTER TABLE audit_requests ADD CONSTRAINT audit_requests_status_check
  CHECK (status IN ('pending', 'paid', 'processing', 'delivered', 'failed', 'followup_scheduled', 'lost'));
