-- ============================================================================
-- LOT 1 — OBS-0 + OBS-1 foundation
-- Version : 2026.16.0 (aligned with seed r2)
-- Scope   : outreach_events (métier) + outreach_ingest_events (plomberie)
--           + bootstrap_cursors + sentinelle pre-doctrine
-- Notes   : REPO-WRITTEN. Runtime-applied only when SQL Editor executes.
--           Requires MILE-1 migration (strategies + strategy_events) applied first.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Sentinelle « pre-doctrine » — permet strategy_version NOT NULL pour events
-- antérieurs à l'ancrage doctrine. Marquée ROLLED_BACK pour ne jamais
-- apparaître comme candidate à l'activation.
-- ---------------------------------------------------------------------------
INSERT INTO strategies (id, version, status, body, created_by)
VALUES (
  'pre-doctrine',
  'pre-doctrine',
  'ROLLED_BACK',
  '{"placeholder":true,"note":"Sentinelle pour events pré-ancrage doctrine. Ne pas activer."}'::jsonb,
  'migration-obs-1'
)
ON CONFLICT (version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Table : outreach_events (métier, 13 kinds doctrinaux, append-only)
-- Lue par : drawer D.03, journal C.04, learner P5
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_events (
  id                        BIGSERIAL PRIMARY KEY,
  at                        TIMESTAMPTZ NOT NULL,
  imported_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  client_id                 TEXT,
  orphan                    BOOLEAN NOT NULL DEFAULT false,

  strategy_version          TEXT NOT NULL REFERENCES strategies(version),
  strategy_assignment_mode  TEXT NOT NULL CHECK (strategy_assignment_mode IN ('native','retroactive','absent')),
  strategy_assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  mandate_id                TEXT,
  attempt_id                TEXT,

  kind                      TEXT NOT NULL CHECK (kind IN (
                              'SEND_ATTEMPT','SEND_SUCCESS','SEND_FAIL',
                              'DELIVERED','OPENED','CLICKED','REPLIED',
                              'BOUNCE','COMPLAINED','UNSUBSCRIBED',
                              'DEFER','REJECT','REVIEW'
                            )),
  provider                  TEXT NOT NULL,
  provider_event_id         TEXT,
  provider_event_type       TEXT,

  payload                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  derived                   JSONB NOT NULL DEFAULT '{}'::jsonb,

  actor                     TEXT,

  ingest_mode               TEXT NOT NULL CHECK (ingest_mode IN ('live','bootstrap','internal_backfill')),
  bootstrap_batch_id        TEXT,
  reconciliation            TEXT CHECK (reconciliation IN ('resend_only','internal_only','matched') OR reconciliation IS NULL),

  parent_event_id           BIGINT REFERENCES outreach_events(id)
);

-- Idempotence transport (webhook replay-safe)
CREATE UNIQUE INDEX IF NOT EXISTS outreach_events_provider_eid_idx
  ON outreach_events (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

-- Anti double-import batch
CREATE UNIQUE INDEX IF NOT EXISTS outreach_events_bootstrap_uniq_idx
  ON outreach_events (bootstrap_batch_id, provider, provider_event_id)
  WHERE ingest_mode = 'bootstrap';

-- Anti re-synthèse internal_backfill pour un même client+kind SEND_SUCCESS
CREATE UNIQUE INDEX IF NOT EXISTS outreach_events_internal_backfill_uniq_idx
  ON outreach_events (client_id, kind)
  WHERE ingest_mode = 'internal_backfill' AND kind = 'SEND_SUCCESS';

CREATE INDEX IF NOT EXISTS outreach_events_client_at_idx ON outreach_events (client_id, at DESC);
CREATE INDEX IF NOT EXISTS outreach_events_ingest_at_idx ON outreach_events (ingest_mode, at DESC);
CREATE INDEX IF NOT EXISTS outreach_events_kind_idx ON outreach_events (kind);
CREATE INDEX IF NOT EXISTS outreach_events_strategy_idx ON outreach_events (strategy_version);
CREATE INDEX IF NOT EXISTS outreach_events_orphan_idx ON outreach_events (orphan) WHERE orphan = true;

-- Append-only guard
CREATE OR REPLACE FUNCTION outreach_events_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'outreach_events is append-only (% forbidden)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outreach_events_no_update ON outreach_events;
CREATE TRIGGER outreach_events_no_update
  BEFORE UPDATE ON outreach_events
  FOR EACH ROW EXECUTE FUNCTION outreach_events_append_only();

DROP TRIGGER IF EXISTS outreach_events_no_delete ON outreach_events;
CREATE TRIGGER outreach_events_no_delete
  BEFORE DELETE ON outreach_events
  FOR EACH ROW EXECUTE FUNCTION outreach_events_append_only();

REVOKE UPDATE, DELETE ON outreach_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON outreach_events FROM anon;
REVOKE UPDATE, DELETE ON outreach_events FROM authenticated;

-- ---------------------------------------------------------------------------
-- Table : outreach_ingest_events (plomberie technique, append-only)
-- Non lue par V5 sauf admin routes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outreach_ingest_events (
  id              BIGSERIAL PRIMARY KEY,
  at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type      TEXT NOT NULL CHECK (event_type IN (
                    'BOOTSTRAP_BATCH_STARTED','BOOTSTRAP_BATCH_FINISHED','BOOTSTRAP_BATCH_FAILED',
                    'PROVIDER_CONFIRMED','RECONCILED','ORPHAN_RESOLVED',
                    'REIMPORT_TRIGGERED','CURSOR_ADVANCED'
                  )),
  actor           TEXT,
  reason          TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_event_id BIGINT REFERENCES outreach_events(id),
  batch_id        TEXT
);

CREATE INDEX IF NOT EXISTS outreach_ingest_events_at_idx ON outreach_ingest_events (at DESC);
CREATE INDEX IF NOT EXISTS outreach_ingest_events_batch_idx ON outreach_ingest_events (batch_id);
CREATE INDEX IF NOT EXISTS outreach_ingest_events_type_idx ON outreach_ingest_events (event_type);

CREATE OR REPLACE FUNCTION outreach_ingest_events_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'outreach_ingest_events is append-only (% forbidden)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outreach_ingest_events_no_update ON outreach_ingest_events;
CREATE TRIGGER outreach_ingest_events_no_update
  BEFORE UPDATE ON outreach_ingest_events
  FOR EACH ROW EXECUTE FUNCTION outreach_ingest_events_append_only();

DROP TRIGGER IF EXISTS outreach_ingest_events_no_delete ON outreach_ingest_events;
CREATE TRIGGER outreach_ingest_events_no_delete
  BEFORE DELETE ON outreach_ingest_events
  FOR EACH ROW EXECUTE FUNCTION outreach_ingest_events_append_only();

REVOKE UPDATE, DELETE ON outreach_ingest_events FROM PUBLIC;
REVOKE UPDATE, DELETE ON outreach_ingest_events FROM anon;
REVOKE UPDATE, DELETE ON outreach_ingest_events FROM authenticated;

-- ---------------------------------------------------------------------------
-- Table : bootstrap_cursors (état mutable, reprise pagination)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bootstrap_cursors (
  source            TEXT PRIMARY KEY,
  last_imported_at  TIMESTAMPTZ,
  last_cursor       TEXT,
  last_batch_id     TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- RLS : service_role only
-- ---------------------------------------------------------------------------
ALTER TABLE outreach_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_ingest_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bootstrap_cursors      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outreach_events_service_role_all ON outreach_events;
CREATE POLICY outreach_events_service_role_all ON outreach_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS outreach_ingest_events_service_role_all ON outreach_ingest_events;
CREATE POLICY outreach_ingest_events_service_role_all ON outreach_ingest_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS bootstrap_cursors_service_role_all ON bootstrap_cursors;
CREATE POLICY bootstrap_cursors_service_role_all ON bootstrap_cursors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
