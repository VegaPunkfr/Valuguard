-- ============================================================================
-- MILE-1 : Strategy Layer foundation (Ghost Tax V5)
-- Version : 2026.16.0-seed.r2
-- Scope   : strategies + strategy_events (append-only)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Table : strategies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strategies (
  id                  TEXT PRIMARY KEY,
  version             TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL CHECK (status IN ('DRAFT','ACTIVE','SUPERSEDED','ROLLED_BACK')),
  parent_version      TEXT REFERENCES strategies(id),
  body                JSONB NOT NULL,
  seeded_from         JSONB NOT NULL DEFAULT '[]'::jsonb,
  activated_at        TIMESTAMPTZ,
  activated_by        TEXT,
  expires_at          TIMESTAMPTZ,
  superseded_at       TIMESTAMPTZ,
  superseded_by       TEXT REFERENCES strategies(id),
  rolled_back_at      TIMESTAMPTZ,
  rolled_back_reason  TEXT,
  signed_off_by       TEXT,
  signed_off_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          TEXT
);

-- At most one ACTIVE strategy at any time
CREATE UNIQUE INDEX IF NOT EXISTS strategies_one_active_idx
  ON strategies ((1))
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS strategies_status_idx  ON strategies (status);
CREATE INDEX IF NOT EXISTS strategies_version_idx ON strategies (version);

-- ---------------------------------------------------------------------------
-- Table : strategy_events (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strategy_events (
  id           BIGSERIAL PRIMARY KEY,
  strategy_id  TEXT NOT NULL REFERENCES strategies(id),
  event_type   TEXT NOT NULL CHECK (event_type IN ('CREATED','ACTIVATED','SUPERSEDED','ROLLED_BACK','SIGNED_OFF')),
  actor        TEXT,
  reason       TEXT,
  snapshot     JSONB,
  at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS strategy_events_strategy_idx ON strategy_events (strategy_id);
CREATE INDEX IF NOT EXISTS strategy_events_type_idx     ON strategy_events (event_type);

-- Append-only guard : block UPDATE/DELETE at the trigger level
CREATE OR REPLACE FUNCTION strategy_events_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'strategy_events is append-only (operation % forbidden)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS strategy_events_no_update ON strategy_events;
CREATE TRIGGER strategy_events_no_update
  BEFORE UPDATE ON strategy_events
  FOR EACH ROW EXECUTE FUNCTION strategy_events_append_only();

DROP TRIGGER IF EXISTS strategy_events_no_delete ON strategy_events;
CREATE TRIGGER strategy_events_no_delete
  BEFORE DELETE ON strategy_events
  FOR EACH ROW EXECUTE FUNCTION strategy_events_append_only();

-- Revoke mutation rights
REVOKE UPDATE, DELETE ON strategy_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON strategy_events FROM anon;
REVOKE UPDATE, DELETE ON strategy_events FROM authenticated;

-- ---------------------------------------------------------------------------
-- RLS : service_role only
-- ---------------------------------------------------------------------------
ALTER TABLE strategies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_events  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS strategies_service_role_all ON strategies;
CREATE POLICY strategies_service_role_all
  ON strategies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS strategy_events_service_role_all ON strategy_events;
CREATE POLICY strategy_events_service_role_all
  ON strategy_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
