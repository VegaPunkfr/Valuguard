/**
 * GHOST TAX — BEHAVIORAL SIGNAL RELAY
 *
 * POST /api/signals
 *
 * Lightweight endpoint that captures front-end behavioral events
 * and persists them server-side for the orchestrator engine.
 *
 * The orchestrator reads these signals to calculate conviction scores
 * and trigger behavior-driven engagement (not time-based drips).
 *
 * Accepts batched events for efficiency. Max 20 events per request.
 * Rate limited: 30 req/min/IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

// ── Rate limiter ──────────────────────────────────────

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (entry && now > entry.resetAt) rateMap.delete(ip);
  const current = rateMap.get(ip);
  if (!current) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_MAX) return false;
  current.count++;
  return true;
}

// ── Conviction weights ────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, number> = {
  // Discovery signals (low conviction)
  "discovery.methodology_viewed": 2,
  "discovery.security_viewed": 2,
  "discovery.procurement_viewed": 3,
  "discovery.benchmark_viewed": 1,
  "discovery.trust_to_detection_clicked": 4,

  // Benchmark
  "benchmark.page_viewed": 1,
  "benchmark.cta_clicked": 3,
  "benchmark.to_detection_clicked": 5,
  "benchmark.return_visit_after_benchmark": 6,

  // Intel room (medium conviction)
  "intel.detection_started": 10,
  "intel.detection_completed": 15,
  "intel.proof_expanded": 5,
  "intel.scenario_switched": 3,
  "intel.simulator_lever_toggled": 3,
  "intel.simulator_used": 8,
  "intel.simulator_scenario_applied": 5,
  "intel.current_vs_simulated_viewed": 4,
  "intel.causal_map_expanded": 4,
  "intel.causal_graph_viewed": 4,
  "intel.confidence_layer_viewed": 3,
  "intel.execution_friction_viewed": 3,
  "intel.proof_layer_viewed": 3,
  "intel.cost_of_delay_viewed": 4,
  "intel.impact_shock_viewed": 5,
  "intel.delay_projection_expanded": 4,
  "intel.simulator_opened": 6,
  "intel.market_memory_viewed": 3,
  "intel.drift_monitor_viewed": 3,
  "intel.negotiation_leverage_viewed": 5,
  "intel.vendor_playbook_expanded": 5,
  "intel.return_visit": 5,
  "intel.recommended_action_clicked": 18,

  // Circulation signals (high conviction)
  "intel.memo_copied": 12,
  "circulation.cfo_memo_viewed": 6,
  "circulation.cfo_memo_copied": 14,
  "circulation.cio_memo_viewed": 6,
  "circulation.cio_memo_copied": 12,
  "circulation.procurement_viewed": 5,
  "circulation.procurement_copied": 12,
  "circulation.board_viewed": 8,
  "circulation.board_copied": 14,
  "circulation.consensus_viewed": 4,
  "circulation.print_opened": 10,
  "circulation.share_opened": 8,

  // Conversion signals (peak conviction)
  "conversion.checkout_started": 25,
  "conversion.checkout_after_trust": 28,
  "conversion.checkout_after_memo": 30,

  // Paywall interaction
  "intel.paywall_clicked": 18,
};

// ── Domain extraction ─────────────────────────────────

function extractDomain(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
  if (cleaned.length < 3 || !cleaned.includes(".")) return null;
  return cleaned;
}

// ── IP hashing ────────────────────────────────────────

function hashIP(ip: string): string {
  // Simple FNV-1a for non-sensitive hashing
  let hash = 2166136261;
  for (let i = 0; i < ip.length; i++) {
    hash ^= ip.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return "ip_" + hash.toString(36);
}

// ── POST Handler ──────────────────────────────────────

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  if (!checkRate(ip)) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: {
    events: Array<{
      event: string;
      domain?: string;
      email?: string;
      properties?: Record<string, unknown>;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }

  // Cap at 20 events per batch
  const events = body.events.slice(0, 20);
  const ipHash = hashIP(ip);
  const now = new Date().toISOString();

  const supabase = createAdminSupabase();
  if (!supabase) {
    // Dev mode — just acknowledge
    return NextResponse.json({ ok: true, processed: events.length, mode: "dev" });
  }

  let persisted = 0;

  for (const evt of events) {
    if (!evt.event || typeof evt.event !== "string") continue;

    const weight = SIGNAL_WEIGHTS[evt.event] || 1;
    const domain = extractDomain(evt.domain || "");

    try {
      // Persist to events table for orchestrator consumption
      await (supabase as any).from("events").insert({
        event_name: `signal.${evt.event}`,
        properties: {
          domain: domain || null,
          email: evt.email || null,
          ip_hash: ipHash,
          weight,
          ...((evt.properties as Record<string, unknown>) || {}),
        },
        created_at: now,
      });

      // If we have a domain, update conviction on outreach_leads
      if (domain) {
        // Increment conviction score atomically
        await (supabase as any).rpc("increment_conviction", {
          p_domain: domain,
          p_delta: weight,
          p_email: evt.email || null,
          p_ip_hash: ipHash,
          p_last_signal: now,
        }).catch(() => {
          // RPC may not exist yet — fallback to direct update
          return (supabase as any)
            .from("outreach_leads")
            .update({
              conviction_score: weight, // Will be overwritten by orchestrator
              last_signal_at: now,
            })
            .eq("domain", domain);
        });
      }

      persisted++;
    } catch {
      // Non-fatal — individual event failures shouldn't break the batch
    }
  }

  // ── BRIDGE: relay high-conviction signals to Founder Mission Control ──
  const BRIDGE_EVENTS: Record<string, string> = {
    "intel.memo_copied": "memo_copied",
    "circulation.cfo_memo_copied": "memo_copied",
    "circulation.cio_memo_copied": "memo_copied",
    "circulation.board_copied": "memo_copied",
    "circulation.procurement_copied": "memo_copied",
    "intel.return_visit": "return_visit",
    "conversion.checkout_started": "high_intent_detected",
    "conversion.checkout_after_trust": "high_intent_detected",
    "conversion.checkout_after_memo": "high_intent_detected",
  };

  const commandSecret = process.env.COMMAND_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
  if (commandSecret) {
    // Deduplicate: one bridge call per domain per event type
    const bridged = new Set<string>();
    for (const evt of events) {
      const bridgeType = BRIDGE_EVENTS[evt.event];
      if (!bridgeType) continue;
      const domain = extractDomain(evt.domain || "");
      if (!domain) continue;
      const key = `${domain}:${bridgeType}`;
      if (bridged.has(key)) continue;
      bridged.add(key);

      fetch(`${siteUrl}/api/command/ingest?key=${commandSecret}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: bridgeType,
          domain,
          email: evt.email || undefined,
          data: { source_event: evt.event },
        }),
      }).catch(() => { /* bridge failure is non-fatal */ });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: persisted,
    total: events.length,
  });
}
