-- ============================================================================
-- MILE-1 Seed : doctrine 2026.16.0-seed.r2 (DRAFT)
-- Idempotent : safe to re-run.
-- ============================================================================

BEGIN;

INSERT INTO strategies (
  id,
  version,
  status,
  parent_version,
  body,
  seeded_from,
  expires_at,
  created_by
)
VALUES (
  '01JRW7YH5M3P2BXKN9F8VQ4TGC',
  '2026.16.0-seed.r2',
  'DRAFT',
  NULL,
  $json$
  {
    "version": "2026.16.0-seed.r2",
    "codename": "pre-build-phase1",
    "known_system_gap": {
      "description": "outreach_log is empty; no post-send observability yet. Learner stays DORMANT. Any bounce / open / reply metric must be treated as unverified until Touch1 pipeline emits real events.",
      "impact": "doctrine r2 cannot rely on runtime feedback loops; manual arbitration wins until MILE-2+.",
      "mitigation": "freeze learner = DORMANT, enforce prudence_mode on newly activated markets, require manual sign-off."
    },
    "markets": {
      "active_now": [
        {
          "code": "UK",
          "language": "en",
          "prudence_mode": false,
          "bounce_threshold_pct": 5,
          "daily_send_cap": 40,
          "tz": "Europe/London",
          "send_window_local": { "start": "09:30", "end": "11:30" }
        },
        {
          "code": "US",
          "language": "en",
          "prudence_mode": true,
          "bounce_threshold_pct": 3,
          "daily_send_cap": 20,
          "tz": "America/New_York",
          "send_window_local": { "start": "09:30", "end": "11:30" },
          "notes": "Prudence mode : half cap, tighter bounce ceiling, manual review required before scale-up."
        }
      ],
      "dormant": ["DE", "NL"],
      "forbidden": ["FR"],
      "forbidden_reason": "France is explicitly out of scope (Edith primary markets = DACH/US/UK/NL)."
    },
    "exclusions": {
      "pilot_competitor_exclusion_list": {
        "domains": [
          "vendr.com",
          "tropic.app",
          "sastrify.com",
          "spendhq.com",
          "zylo.com",
          "productiv.com",
          "torii.hq"
        ],
        "reason": "Direct SaaS spend / FinOps competitors — do not prospect during pilot phase."
      },
      "keyword_blocklist": {
        "value": [],
        "note": "Empty by design at r2 ; filled only once outreach_log emits real noise patterns."
      }
    },
    "learning": {
      "mode": "DORMANT",
      "reason": "no signal yet ; wake up only after MILE-2 emits outreach_log events",
      "wake_conditions": [
        "outreach_log has >= 200 events",
        "at least 2 active markets with bounce telemetry",
        "manual sign-off by operator"
      ]
    },
    "governance": {
      "pilot_arbitrations_in_r2": [
        "US kept in active_now but forced to prudence_mode=true (half cap, bounce<=3%)",
        "NL + DE dormant until Touch1 pipeline emits real observability",
        "FR permanently forbidden",
        "competitor exclusion list frozen at 7 domains for entire pilot",
        "keyword blocklist intentionally empty until signal-driven updates"
      ],
      "sign_off_required_by": "operator",
      "rollback_policy": "any ACTIVE strategy can be rolled back via activate-strategy.sql reversal script ; rollback MUST be recorded in strategy_events."
    },
    "metadata": {
      "seed_id": "01JRW7YH5M3P2BXKN9F8VQ4TGC",
      "seeded_at_utc": "2026-04-14T12:00:00Z",
      "expires_at_utc": "2026-04-19T23:59:59Z",
      "notes": "This doctrine is a 5-day pilot guardrail. Must be replaced or re-activated before expiry."
    }
  }
  $json$::jsonb,
  '[]'::jsonb,
  '2026-04-19T23:59:59Z'::timestamptz,
  'claude-pre-build-phase1'
)
ON CONFLICT (version) DO NOTHING;

-- Idempotent CREATED audit event : inserted only if absent
INSERT INTO strategy_events (strategy_id, event_type, actor, reason, snapshot)
SELECT
  '01JRW7YH5M3P2BXKN9F8VQ4TGC',
  'CREATED',
  'claude-pre-build-phase1',
  'Seed r2 inserted as DRAFT (MILE-1 foundation).',
  jsonb_build_object('version', '2026.16.0-seed.r2', 'status', 'DRAFT')
WHERE NOT EXISTS (
  SELECT 1 FROM strategy_events
  WHERE strategy_id = '01JRW7YH5M3P2BXKN9F8VQ4TGC'
    AND event_type  = 'CREATED'
);

COMMIT;
