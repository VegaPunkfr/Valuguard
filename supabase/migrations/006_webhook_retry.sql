-- 006: Webhook retry queue + dead letter
-- Supports exponential backoff retries for failed delivery pipeline executions.

CREATE TABLE IF NOT EXISTS webhook_retries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        text NOT NULL,
  payload       jsonb NOT NULL,
  attempt       int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'completed', 'dead_letter')),
  error_log     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on job_id to prevent duplicate retry entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_retries_job_id
  ON webhook_retries (job_id);

-- Partial index for the retry processor: quickly find pending jobs ready to execute
CREATE INDEX IF NOT EXISTS idx_webhook_retries_pending_next
  ON webhook_retries (next_retry_at)
  WHERE status = 'pending';

-- Index for admin dead-letter monitoring
CREATE INDEX IF NOT EXISTS idx_webhook_retries_dead_letter
  ON webhook_retries (created_at DESC)
  WHERE status = 'dead_letter';

-- Enable RLS (admin client bypasses, but RLS must be on per project doctrine)
ALTER TABLE webhook_retries ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role can access this table
