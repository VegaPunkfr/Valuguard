-- ============================================================
-- GHOST TAX — MIGRATION 005: OUTREACH TABLES
-- Lead management and drip sequence tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS outreach_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  domain text,
  company_name text,
  headcount int,
  industry text,
  source text DEFAULT 'manual',
  status text DEFAULT 'new' CHECK (status IN ('new','contacted','replied','qualified','converted','unsubscribed','bounced')),
  score int DEFAULT 0,
  last_contacted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE outreach_leads ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_leads_email ON outreach_leads(email);

CREATE TABLE IF NOT EXISTS outreach_sequences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES outreach_leads(id) ON DELETE CASCADE,
  sequence_name text NOT NULL DEFAULT 'post_scan_drip',
  current_step int DEFAULT 0,
  max_steps int DEFAULT 5,
  status text DEFAULT 'active' CHECK (status IN ('active','paused','completed','unsubscribed')),
  next_send_at timestamptz,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_outreach_seq_next ON outreach_sequences(next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_outreach_seq_lead ON outreach_sequences(lead_id);
