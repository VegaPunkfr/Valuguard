/**
 * V6 Phase 1 — Autonomy guard / downgrade
 *
 * Evaluates whether the current autonomy level should be downgraded
 * based on runtime conditions (strategy expiry, bounce rates).
 *
 * Called by cockpit render or cron. Fire-and-forget pattern.
 * If downgrade needed: PATCHes bot_settings + emits REVIEW event.
 */

import { createAdminSupabase } from "@/lib/supabase";
import { emitOutreachEvent, getActiveStrategyVersion } from "./events";

export interface GuardResult {
  currentLevel: number;
  downgradeTo: number | null;
  reason: string | null;
  checks: {
    strategyActive: boolean;
    bounceRate24h: number | null;
    bounceRate7d: number | null;
    sendCount7d: number;
  };
}

export async function evaluateAutonomyGuard(): Promise<GuardResult> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return { currentLevel: 0, downgradeTo: null, reason: "supabase_unavailable", checks: { strategyActive: false, bounceRate24h: null, bounceRate7d: null, sendCount7d: 0 } };
  }

  // Current level
  const { data: lvlRow } = await (supabase as any)
    .from("bot_settings")
    .select("value")
    .eq("key", "autonomy_level")
    .maybeSingle();
  const currentLevel = lvlRow?.value ? parseInt(JSON.parse(lvlRow.value), 10) : 0;

  if (currentLevel === 0) {
    return { currentLevel: 0, downgradeTo: null, reason: null, checks: { strategyActive: false, bounceRate24h: null, bounceRate7d: null, sendCount7d: 0 } };
  }

  // Strategy check
  const strat = await getActiveStrategyVersion();
  const strategyActive = strat.mode === "native";

  // Bounce rate 24h
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count: bounces24h } = await (supabase as any)
    .from("outreach_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", "BOUNCE")
    .gte("at", since24h);

  // Bounce rate 7d + send count 7d
  const since7d = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const { count: bounces7d } = await (supabase as any)
    .from("outreach_events")
    .select("id", { count: "exact", head: true })
    .eq("kind", "BOUNCE")
    .gte("at", since7d);
  const { count: sends7d } = await (supabase as any)
    .from("outreach_events")
    .select("id", { count: "exact", head: true })
    .in("kind", ["SEND_SUCCESS", "SEND_ATTEMPT"])
    .gte("at", since7d);

  const bounceRate24h = (bounces24h ?? 0);
  const bounceRate7d = sends7d && sends7d > 0 ? (bounces7d ?? 0) / sends7d : 0;

  const checks = {
    strategyActive,
    bounceRate24h,
    bounceRate7d,
    sendCount7d: sends7d ?? 0,
  };

  // Downgrade rules (SSOT V6 §6)
  let downgradeTo: number | null = null;
  let reason: string | null = null;

  if (!strategyActive) {
    downgradeTo = 0;
    reason = "strategy_expired_or_absent";
  } else if (bounceRate7d >= 0.10 && currentLevel >= 2) {
    downgradeTo = 0;
    reason = `bounce_rate_7d=${(bounceRate7d * 100).toFixed(1)}%_exceeds_10%`;
  } else if (bounceRate7d >= 0.05 && currentLevel >= 2) {
    downgradeTo = 1;
    reason = `bounce_rate_7d=${(bounceRate7d * 100).toFixed(1)}%_exceeds_5%`;
  } else if (bounceRate24h >= 3 && currentLevel === 1) {
    downgradeTo = 0;
    reason = `3+_bounces_in_24h`;
  }

  return { currentLevel, downgradeTo, reason, checks };
}

export async function applyAutonomyDowngrade(
  result: GuardResult,
): Promise<boolean> {
  if (result.downgradeTo === null || result.downgradeTo === result.currentLevel) {
    return false;
  }

  const supabase = createAdminSupabase();
  if (!supabase) return false;

  await (supabase as any).from("bot_settings").upsert({
    key: "autonomy_level",
    value: JSON.stringify(result.downgradeTo),
    updated_at: new Date().toISOString(),
  });

  const strat = await getActiveStrategyVersion();
  await emitOutreachEvent({
    at: new Date().toISOString(),
    client_id: null,
    orphan: false,
    strategy_version: strat.version,
    strategy_assignment_mode: strat.mode,
    kind: "REVIEW",
    provider: "internal",
    actor: "autonomy-guard",
    ingest_mode: "live",
    derived: {
      level_change: { from: result.currentLevel, to: result.downgradeTo },
      reason: result.reason,
      checks: result.checks,
    },
  });

  return true;
}
