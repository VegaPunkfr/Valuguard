-- GHOST TAX — Command Events Table
-- Stores platform events for the Founder Mission Control bridge.
-- Events flow: Public surface → API → this table → Command cockpit
--
-- This is the data bridge between Ghost-Tax (public) and the
-- Founder Mission Control (private). Never exposed to clients.

CREATE TABLE IF NOT EXISTS command_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  headcount INTEGER,
  industry VARCHAR(100),
  country VARCHAR(10),
  event_data JSONB DEFAULT '{}'::jsonb,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unprocessed event polling (cockpit reads these)
CREATE INDEX IF NOT EXISTS idx_command_events_unprocessed
  ON command_events (processed, created_at DESC)
  WHERE processed = FALSE;

-- Index for domain lookups (bridge enrichment)
CREATE INDEX IF NOT EXISTS idx_command_events_domain
  ON command_events (domain, created_at DESC);

-- RLS: Only service_role can read/write (never client-accessible)
ALTER TABLE command_events ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role (admin) can access
-- This ensures command_events is NEVER readable by the Supabase anon key
