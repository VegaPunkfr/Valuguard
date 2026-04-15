-- ============================================================================
-- activate-strategy.sql
-- Transactional DRAFT -> ACTIVE promotion for Ghost Tax strategies.
--
-- Usage (psql) :
--   psql "$DATABASE_URL" \
--     -v strategy_id='01JRW7YH5M3P2BXKN9F8VQ4TGC' \
--     -v actor='edith' \
--     -f supabase/scripts/activate-strategy.sql
--
-- Guarantees :
--  - atomically supersedes any currently-ACTIVE strategy
--  - FOR UPDATE lock on the target DRAFT row
--  - only inserts ACTIVATED + SIGNED_OFF events if activation actually occurred
--  - raises on any inconsistency (target not in DRAFT, no row activated, etc.)
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_target_id      TEXT := :'strategy_id';
  v_actor          TEXT := :'actor';
  v_target_status  TEXT;
  v_previous_id    TEXT;
  v_activated_id   TEXT;
BEGIN
  IF v_target_id IS NULL OR v_target_id = '' THEN
    RAISE EXCEPTION 'strategy_id variable is required (-v strategy_id=...)';
  END IF;
  IF v_actor IS NULL OR v_actor = '' THEN
    RAISE EXCEPTION 'actor variable is required (-v actor=...)';
  END IF;

  -- 1. Lock the target DRAFT row
  SELECT status INTO v_target_status
  FROM strategies
  WHERE id = v_target_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Strategy % not found', v_target_id;
  END IF;

  IF v_target_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Strategy % is not in DRAFT (current status = %)',
      v_target_id, v_target_status;
  END IF;

  -- 2. Supersede any existing ACTIVE strategy atomically
  UPDATE strategies
     SET status        = 'SUPERSEDED',
         superseded_at = NOW(),
         superseded_by = v_target_id
   WHERE status = 'ACTIVE'
   RETURNING id INTO v_previous_id;

  IF v_previous_id IS NOT NULL THEN
    INSERT INTO strategy_events (strategy_id, event_type, actor, reason, snapshot)
    VALUES (
      v_previous_id,
      'SUPERSEDED',
      v_actor,
      'Superseded by activation of ' || v_target_id,
      jsonb_build_object('superseded_by', v_target_id)
    );
  END IF;

  -- 3. Activate the target DRAFT
  UPDATE strategies
     SET status         = 'ACTIVE',
         activated_at   = NOW(),
         activated_by   = v_actor,
         parent_version = COALESCE(parent_version, v_previous_id)
   WHERE id = v_target_id
     AND status = 'DRAFT'
   RETURNING id INTO v_activated_id;

  IF v_activated_id IS NULL THEN
    RAISE EXCEPTION 'Activation failed : no row transitioned to ACTIVE for %', v_target_id;
  END IF;

  -- 4. Audit events (only after real activation)
  INSERT INTO strategy_events (strategy_id, event_type, actor, reason, snapshot)
  VALUES (
    v_activated_id,
    'ACTIVATED',
    v_actor,
    'DRAFT -> ACTIVE transition',
    jsonb_build_object('previous_active', v_previous_id)
  );

  UPDATE strategies
     SET signed_off_by = v_actor,
         signed_off_at = NOW()
   WHERE id = v_activated_id;

  INSERT INTO strategy_events (strategy_id, event_type, actor, reason, snapshot)
  VALUES (
    v_activated_id,
    'SIGNED_OFF',
    v_actor,
    'Operator sign-off recorded at activation time.',
    NULL
  );

  -- 5. Invariant check : exactly one ACTIVE
  IF (SELECT COUNT(*) FROM strategies WHERE status = 'ACTIVE') <> 1 THEN
    RAISE EXCEPTION 'Invariant violation : ACTIVE count != 1 after activation';
  END IF;
END;
$$;

COMMIT;
