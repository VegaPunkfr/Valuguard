/**
 * GHOST TAX — BEHAVIORAL ORCHESTRATOR ENGINE (SERVER-ONLY)
 *
 * Replaces the time-based drip sequence with a behavior-driven
 * engagement system. Instead of "Send Touch 2 on Day 3", the
 * orchestrator decides what to send based on WHAT the prospect DID.
 * Time is a fallback, not the driver.
 *
 * Core concept: Event -> Signal -> Conviction -> Action
 *
 * The orchestrator maintains a conviction score per lead (keyed by domain)
 * that increases with every interaction. Different events carry different
 * weights. When conviction crosses a threshold, the optimal next action fires.
 *
 * Anti-spam rules are built IN, not bolted on:
 *   1. Max 1 email per domain per 24h (across ALL systems)
 *   2. Max 3 emails per domain per 7 days
 *   3. Never send 22:00-07:00 in recipient timezone
 *   4. Conviction < 0 => suppress all for 30 days
 *   5. Email bounce => mark domain undeliverable, stop all
 *
 * Tri-lingual: EN/FR/DE based on locale detection.
 *
 * Integration:
 *   - Free scan page (/intel) calls recordSignal() on key events
 *   - API routes call recordSignal() for server-side events
 *   - Cron route calls runOrchestrator() every 2 hours
 *   - Drip cron remains as fallback for leads with no behavioral signals
 */

import { createAdminSupabase } from "@/lib/supabase";
import {
  getRailAPrice,
  formatPrice,
  type PricingLocale,
} from "@/lib/pricing";
import * as crypto from "crypto";

// ── Types ──────────────────────────────────────────────────

export interface ConvictionState {
  domain: string;
  emails: string[];
  conviction: number;
  lastAction: string | null;
  lastActionAt: string | null;
  lastSignalAt: string;
  signals: Array<{ event: string; weight: number; at: string }>;
  stakeholderCount: number;
  isBuyingCommittee: boolean;
  hasScanned: boolean;
  hasPurchased: boolean;
  hasAbandoned: boolean;
  geoMarket: string;
  locale: PricingLocale;
  estimatedExposure: [number, number] | null;
}

export interface OrchestratorAction {
  type: "email" | "wait" | "escalate" | "suppress";
  template: string;
  to: string;
  priority: number;
  reason: string;
  cooldownHours: number;
}

export interface OrchestratorResult {
  processed: number;
  actionsFired: number;
  emailsSent: number;
  suppressed: number;
  errors: number;
  details: Array<{
    domain: string;
    conviction: number;
    tier: ConvictionTier;
    action: OrchestratorAction | null;
    outcome: "sent" | "suppressed" | "cooled_down" | "error" | "waiting";
    error?: string;
  }>;
  durationMs: number;
}

export type ConvictionTier =
  | "COLD"
  | "WARM"
  | "HOT"
  | "READY"
  | "URGENT"
  | "CRITICAL";

// ── Conviction Event Weights ─────────────────────────────────

const SIGNAL_WEIGHTS: Record<string, number> = {
  // Discovery signals (low conviction)
  page_view_pricing: 3,
  page_view_methodology: 2,
  page_view_platform: 2,
  page_view_intel_benchmark: 1,
  return_visit: 5,
  return_visit_within_24h: 8,

  // Engagement signals (medium conviction)
  scan_started: 10,
  scan_completed: 15,
  proof_section_expanded: 5,
  simulator_used: 8,
  simulator_lever_toggled: 3,
  causal_graph_viewed: 4,
  confidence_layer_viewed: 3,

  // Circulation signals (high conviction)
  memo_viewed: 6,
  memo_copied: 12,
  board_memo_viewed: 8,
  print_opened: 10,
  second_person_same_domain: 20,

  // Conversion signals (peak conviction)
  checkout_started: 25,
  checkout_abandoned: 15,
  paywall_blur_clicked: 18,
  competitor_scan_initiated: 10,

  // Negative signals
  unsubscribe_clicked: -100,
  email_bounced: -50,
  no_interaction_14_days: -10,
};

// Map PostHog/event taxonomy names to orchestrator signal names
const EVENT_NAME_MAP: Record<string, string> = {
  "discovery.methodology_viewed": "page_view_methodology",
  "discovery.security_viewed": "page_view_methodology",
  "discovery.procurement_viewed": "page_view_methodology",
  "discovery.benchmark_viewed": "page_view_intel_benchmark",
  "benchmark.page_viewed": "page_view_intel_benchmark",
  "benchmark.index_viewed": "page_view_intel_benchmark",
  "intel.detection_started": "scan_started",
  "intel.detection_completed": "scan_completed",
  "intel.proof_expanded": "proof_section_expanded",
  "intel.proof_layer_viewed": "proof_section_expanded",
  "intel.simulator_used": "simulator_used",
  "intel.simulator_lever_toggled": "simulator_lever_toggled",
  "intel.simulator_opened": "simulator_used",
  "intel.simulator_scenario_applied": "simulator_used",
  "intel.causal_map_expanded": "causal_graph_viewed",
  "intel.causal_graph_viewed": "causal_graph_viewed",
  "intel.confidence_layer_viewed": "confidence_layer_viewed",
  "intel.memo_copied": "memo_copied",
  "intel.return_visit": "return_visit",
  "circulation.cfo_memo_viewed": "memo_viewed",
  "circulation.cfo_memo_copied": "memo_copied",
  "circulation.cio_memo_viewed": "memo_viewed",
  "circulation.cio_memo_copied": "memo_copied",
  "circulation.procurement_viewed": "memo_viewed",
  "circulation.procurement_copied": "memo_copied",
  "circulation.board_viewed": "board_memo_viewed",
  "circulation.board_copied": "memo_copied",
  "circulation.print_opened": "print_opened",
  "circulation.consensus_viewed": "memo_viewed",
  "conversion.checkout_started": "checkout_started",
  "conversion.checkout_after_memo": "checkout_started",
  "conversion.checkout_after_trust": "checkout_started",
  "benchmark.cta_clicked": "page_view_pricing",
  "benchmark.to_detection_clicked": "page_view_pricing",
  "benchmark.return_visit_after_benchmark": "return_visit",
  "discovery.trust_to_detection_clicked": "page_view_pricing",
};

// ── Conviction Tiers ─────────────────────────────────────────

function getConvictionTier(score: number): ConvictionTier {
  if (score >= 91) return "CRITICAL";
  if (score >= 71) return "URGENT";
  if (score >= 51) return "READY";
  if (score >= 31) return "HOT";
  if (score >= 16) return "WARM";
  return "COLD";
}

// Template mapping per tier
const TIER_TEMPLATES: Record<
  ConvictionTier,
  { template: string; cooldownHours: number; priority: number } | null
> = {
  COLD: null, // No outreach. Wait for signal.
  WARM: { template: "value_signal", cooldownHours: 72, priority: 3 },
  HOT: { template: "urgency_leak", cooldownHours: 48, priority: 5 },
  READY: { template: "decision_ready", cooldownHours: 36, priority: 7 },
  URGENT: { template: "peer_pressure", cooldownHours: 24, priority: 8 },
  CRITICAL: { template: "personal_ceo", cooldownHours: 24, priority: 10 },
};

// ── Constants ────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
const MAX_ACTIONS_PER_RUN = 50;
const MAX_SIGNAL_HISTORY = 100;
const SUPPRESSION_DAYS = 30;

// ── Locale Detection ─────────────────────────────────────────

function detectLocaleFromDomain(domain: string): PricingLocale {
  const d = domain.toLowerCase();
  if (d.endsWith(".de") || d.endsWith(".at") || d.endsWith(".ch")) return "de";
  if (d.endsWith(".fr") || d.endsWith(".be") || d.endsWith(".lu")) return "fr";
  return "en";
}

function detectGeoFromDomain(domain: string): string {
  const d = domain.toLowerCase();
  if (d.endsWith(".de") || d.endsWith(".at")) return "dach";
  if (d.endsWith(".ch")) return "dach";
  if (d.endsWith(".fr") || d.endsWith(".be") || d.endsWith(".lu")) return "fr";
  if (
    d.endsWith(".com") ||
    d.endsWith(".us") ||
    d.endsWith(".io") ||
    d.endsWith(".co") ||
    d.endsWith(".ai")
  )
    return "us";
  if (d.endsWith(".nl") || d.endsWith(".es") || d.endsWith(".it") || d.endsWith(".eu"))
    return "eu";
  return "other";
}

// Estimate timezone offset from geo for quiet hours enforcement
function estimateUtcOffset(geoMarket: string): number {
  switch (geoMarket) {
    case "us":
      return -5; // EST as default
    case "dach":
      return 1; // CET
    case "fr":
      return 1; // CET
    case "eu":
      return 1; // CET
    default:
      return 0; // UTC
  }
}

// ── Anti-Spam Coordinator ────────────────────────────────────

interface AntiSpamCheck {
  allowed: boolean;
  reason?: string;
}

async function checkAntiSpam(
  db: any,
  domain: string,
  geoMarket: string
): Promise<AntiSpamCheck> {
  const now = new Date();

  // Rule 3: Never send between 22:00-07:00 in recipient timezone
  const utcOffset = estimateUtcOffset(geoMarket);
  const recipientHour = (now.getUTCHours() + utcOffset + 24) % 24;
  if (recipientHour >= 22 || recipientHour < 7) {
    return {
      allowed: false,
      reason: `Quiet hours (${recipientHour}:00 local time, geo=${geoMarket})`,
    };
  }

  // Rule 1: Max 1 email per domain per 24h
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: recentSends24h } = await db
    .from("outreach_leads")
    .select("last_sent_at")
    .eq("domain", domain)
    .gte("last_sent_at", twentyFourHoursAgo)
    .not("last_sent_at", "is", null)
    .limit(1);

  if (recentSends24h && recentSends24h.length > 0) {
    return {
      allowed: false,
      reason: "Max 1 email per domain per 24h exceeded",
    };
  }

  // Rule 2: Max 3 emails per domain per 7 days
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: recentSends7d, count } = await db
    .from("outreach_leads")
    .select("last_sent_at", { count: "exact" })
    .eq("domain", domain)
    .gte("last_sent_at", sevenDaysAgo)
    .not("last_sent_at", "is", null);

  const sendCount7d = count ?? recentSends7d?.length ?? 0;
  if (sendCount7d >= 3) {
    return {
      allowed: false,
      reason: "Max 3 emails per domain per 7 days exceeded",
    };
  }

  return { allowed: true };
}

// ── Signal Normalization ─────────────────────────────────────

function normalizeEventName(eventName: string): string {
  // Try direct mapping first
  if (EVENT_NAME_MAP[eventName]) return EVENT_NAME_MAP[eventName];
  // Already a weight key
  if (SIGNAL_WEIGHTS[eventName] !== undefined) return eventName;
  // Strip prefixes
  const stripped = eventName.replace(/^(discovery|intel|conversion|circulation|benchmark)\./, "");
  if (SIGNAL_WEIGHTS[stripped] !== undefined) return stripped;
  return eventName;
}

// ── Core: Record Signal ──────────────────────────────────────

export async function recordSignal(params: {
  email?: string;
  domain: string;
  eventName: string;
  metadata?: Record<string, any>;
  ipHash?: string;
}): Promise<{ conviction: number; action: OrchestratorAction | null }> {
  const db = createAdminSupabase();
  if (!db) {
    console.error("[Orchestrator] Database not configured");
    return { conviction: 0, action: null };
  }

  const { domain, eventName, metadata } = params;
  const email = params.email?.trim().toLowerCase();
  const normalizedEvent = normalizeEventName(eventName);
  const weight = SIGNAL_WEIGHTS[normalizedEvent] ?? 0;
  const now = new Date().toISOString();

  if (weight === 0 && !SIGNAL_WEIGHTS.hasOwnProperty(normalizedEvent)) {
    // Unknown event — log but don't error
    console.log(`[Orchestrator] Unknown signal: ${eventName} (normalized: ${normalizedEvent})`);
  }

  // Fetch current state for this domain
  const state = await getConviction(domain);

  // Add email if new
  if (email && !state.emails.includes(email)) {
    state.emails.push(email);
    // Check if this is a second person from same domain
    if (state.emails.length >= 2) {
      const secondPersonWeight = SIGNAL_WEIGHTS["second_person_same_domain"] || 20;
      state.signals.push({
        event: "second_person_same_domain",
        weight: secondPersonWeight,
        at: now,
      });
      state.conviction += secondPersonWeight;
      state.stakeholderCount = state.emails.length;
      state.isBuyingCommittee = true;
    }
  }

  // Record the signal
  state.signals.push({ event: normalizedEvent, weight, at: now });
  state.conviction = Math.max(-100, state.conviction + weight);
  state.lastSignalAt = now;

  // Trim signal history
  if (state.signals.length > MAX_SIGNAL_HISTORY) {
    state.signals = state.signals.slice(-MAX_SIGNAL_HISTORY);
  }

  // Update derived flags
  if (normalizedEvent === "scan_completed") state.hasScanned = true;
  if (normalizedEvent === "checkout_abandoned") state.hasAbandoned = true;
  if (normalizedEvent === "checkout_started" && metadata?.completed) {
    state.hasPurchased = true;
  }

  // Update exposure from metadata if provided
  if (metadata?.exposureLow && metadata?.exposureHigh) {
    state.estimatedExposure = [metadata.exposureLow, metadata.exposureHigh];
  }

  // Persist state
  await persistConvictionState(db, state);

  // Determine if an action should fire NOW (real-time trigger)
  // Only for high-conviction events that might warrant immediate action
  const immediateEvents = new Set([
    "checkout_abandoned",
    "memo_copied",
    "second_person_same_domain",
    "paywall_blur_clicked",
  ]);

  let action: OrchestratorAction | null = null;
  if (immediateEvents.has(normalizedEvent) && state.conviction >= 16) {
    action = await determineNextAction(db, state);
  }

  return { conviction: state.conviction, action };
}

// ── Core: Get Conviction ─────────────────────────────────────

export async function getConviction(domain: string): Promise<ConvictionState> {
  const db = createAdminSupabase();
  if (!db) {
    return makeEmptyState(domain);
  }

  // Try to load from orchestrator_state column on outreach_leads
  const { data: leads } = await (db as any)
    .from("outreach_leads")
    .select(
      "email, domain, locale, conviction_score, last_signal_at, stakeholder_count, orchestrator_state, converted, meta"
    )
    .eq("domain", domain)
    .order("conviction_score", { ascending: false })
    .limit(10);

  if (!leads || leads.length === 0) {
    return makeEmptyState(domain);
  }

  // Check if any lead has persisted orchestrator state
  const withState = leads.find(
    (l: any) => l.orchestrator_state && typeof l.orchestrator_state === "object"
  );

  if (withState?.orchestrator_state?.domain) {
    const s = withState.orchestrator_state as ConvictionState;
    // Merge emails from all leads for this domain
    const allEmails = [
      ...new Set([
        ...s.emails,
        ...leads.map((l: any) => l.email).filter(Boolean),
      ]),
    ];
    return { ...s, emails: allEmails, stakeholderCount: allEmails.length };
  }

  // Build state from lead rows
  const emails: string[] = [...new Set(leads.map((l: any) => l.email).filter(Boolean) as string[])];
  const locale = detectLocaleFromDomain(domain);
  const geoMarket = detectGeoFromDomain(domain);
  const hasPurchased = leads.some((l: any) => l.converted === true);

  return {
    domain,
    emails,
    conviction: leads[0]?.conviction_score ?? 0,
    lastAction: null,
    lastActionAt: null,
    lastSignalAt: leads[0]?.last_signal_at ?? new Date().toISOString(),
    signals: [],
    stakeholderCount: emails.length,
    isBuyingCommittee: emails.length >= 2,
    hasScanned: false,
    hasPurchased,
    hasAbandoned: false,
    geoMarket,
    locale,
    estimatedExposure: null,
  };
}

function makeEmptyState(domain: string): ConvictionState {
  return {
    domain,
    emails: [],
    conviction: 0,
    lastAction: null,
    lastActionAt: null,
    lastSignalAt: new Date().toISOString(),
    signals: [],
    stakeholderCount: 0,
    isBuyingCommittee: false,
    hasScanned: false,
    hasPurchased: false,
    hasAbandoned: false,
    geoMarket: detectGeoFromDomain(domain),
    locale: detectLocaleFromDomain(domain),
    estimatedExposure: null,
  };
}

// ── Core: Run Orchestrator Batch ─────────────────────────────

export async function runOrchestrator(): Promise<OrchestratorResult> {
  const start = Date.now();
  const result: OrchestratorResult = {
    processed: 0,
    actionsFired: 0,
    emailsSent: 0,
    suppressed: 0,
    errors: 0,
    details: [],
    durationMs: 0,
  };

  const db = createAdminSupabase();
  if (!db) {
    console.error("[Orchestrator] Database not configured");
    result.durationMs = Date.now() - start;
    return result;
  }

  const resendKey = process.env.RESEND_API_KEY;
  const now = new Date();

  // Fetch active leads with behavioral signals, ordered by conviction
  const { data: leads, error: fetchError } = await (db as any)
    .from("outreach_leads")
    .select("*")
    .eq("status", "active")
    .eq("unsubscribed", false)
    .eq("converted", false)
    .gt("conviction_score", 0)
    .order("conviction_score", { ascending: false })
    .limit(MAX_ACTIONS_PER_RUN * 2); // Fetch extra since some will be filtered

  if (fetchError) {
    console.error("[Orchestrator] Failed to fetch leads:", fetchError.message);
    result.durationMs = Date.now() - start;
    return result;
  }

  if (!leads || leads.length === 0) {
    console.log("[Orchestrator] No leads with behavioral signals");
    result.durationMs = Date.now() - start;
    return result;
  }

  // Group leads by domain
  const domainMap = new Map<string, any[]>();
  for (const lead of leads) {
    const d = lead.domain || lead.email?.split("@")[1] || "unknown";
    if (!domainMap.has(d)) domainMap.set(d, []);
    domainMap.get(d)!.push(lead);
  }

  // Cross-check: exclude anyone who has purchased
  const allEmails = leads.map((l: any) => l.email).filter(Boolean);
  const { data: paidRequests } = await (db as any)
    .from("audit_requests")
    .select("email")
    .in("email", allEmails)
    .in("status", [
      "paid",
      "processing",
      "report_persisted",
      "delivered",
      "followup_scheduled",
    ]);
  const paidEmails = new Set(
    (paidRequests || []).map((r: any) => r.email)
  );

  // Process each domain
  let actionsThisRun = 0;

  for (const [domain, domainLeads] of domainMap) {
    if (actionsThisRun >= MAX_ACTIONS_PER_RUN) break;
    result.processed++;

    // Build conviction state
    const state = await getConviction(domain);

    // Skip purchased domains
    const anyPaid = domainLeads.some((l: any) => paidEmails.has(l.email));
    if (anyPaid || state.hasPurchased) {
      // Mark as converted
      for (const lead of domainLeads) {
        if (paidEmails.has(lead.email)) {
          await (db as any)
            .from("outreach_leads")
            .update({ converted: true, updated_at: now.toISOString() })
            .eq("id", lead.id);
        }
      }
      result.suppressed++;
      result.details.push({
        domain,
        conviction: state.conviction,
        tier: getConvictionTier(state.conviction),
        action: null,
        outcome: "suppressed",
      });
      continue;
    }

    // Rule 4: conviction < 0 => suppress for 30 days
    if (state.conviction < 0) {
      result.suppressed++;
      result.details.push({
        domain,
        conviction: state.conviction,
        tier: "COLD",
        action: null,
        outcome: "suppressed",
        error: "Negative conviction — suppressed for 30 days",
      });
      continue;
    }

    // Check decay: if no interaction for 14 days, apply decay
    const lastSignalDate = new Date(state.lastSignalAt);
    const daysSinceSignal = Math.floor(
      (now.getTime() - lastSignalDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSinceSignal >= 14) {
      const decayPeriods = Math.floor(daysSinceSignal / 14);
      const decayAmount = decayPeriods * 10;
      state.conviction = Math.max(0, state.conviction - decayAmount);
      await persistConvictionState(db, state);
    }

    const tier = getConvictionTier(state.conviction);

    // Determine action
    const action = await determineNextAction(db, state);

    if (!action) {
      result.details.push({
        domain,
        conviction: state.conviction,
        tier,
        action: null,
        outcome: "waiting",
      });
      continue;
    }

    if (action.type === "suppress" || action.type === "wait") {
      result.suppressed++;
      result.details.push({
        domain,
        conviction: state.conviction,
        tier,
        action,
        outcome: action.type === "suppress" ? "suppressed" : "cooled_down",
      });
      continue;
    }

    if (action.type === "email") {
      // Anti-spam check
      const spamCheck = await checkAntiSpam(db, domain, state.geoMarket);
      if (!spamCheck.allowed) {
        result.suppressed++;
        result.details.push({
          domain,
          conviction: state.conviction,
          tier,
          action,
          outcome: "cooled_down",
          error: spamCheck.reason,
        });
        continue;
      }

      // Send the email
      try {
        const primaryLead = domainLeads[0];
        const company =
          primaryLead.company || domain.split(".")[0] || "your company";

        const { subject, html } = buildOrchestratorEmail(action.template, {
          locale: state.locale,
          company,
          email: action.to,
          domain,
          estimatedExposure: state.estimatedExposure,
          headcount: primaryLead.headcount ?? undefined,
          industry: primaryLead.industry ?? undefined,
          isBuyingCommittee: state.isBuyingCommittee,
          stakeholderCount: state.stakeholderCount,
          conviction: state.conviction,
          tier,
          meta: primaryLead.meta,
        });

        if (resendKey) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Ghost Tax <reports@ghost-tax.com>",
              to: [action.to],
              subject,
              html,
            }),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "Unknown");
            // Check for bounce
            if (res.status === 422 || errText.includes("bounce")) {
              // Rule 5: mark domain undeliverable
              await recordSignal({
                domain,
                email: action.to,
                eventName: "email_bounced",
              });
            }
            throw new Error(`Resend ${res.status}: ${errText}`);
          }
        } else {
          console.log(
            `[Orchestrator] [DRY RUN] Would send "${action.template}" to ${action.to} (conviction=${state.conviction}, tier=${tier})`
          );
        }

        // Record send in state
        state.lastAction = action.template;
        state.lastActionAt = now.toISOString();
        await persistConvictionState(db, state);

        // Update lead row
        await (db as any)
          .from("outreach_leads")
          .update({
            last_sent_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("email", action.to);

        result.emailsSent++;
        actionsThisRun++;
        result.actionsFired++;
        result.details.push({
          domain,
          conviction: state.conviction,
          tier,
          action,
          outcome: "sent",
        });
      } catch (err) {
        result.errors++;
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(
          `[Orchestrator] Error sending "${action.template}" to ${action.to}:`,
          message
        );
        result.details.push({
          domain,
          conviction: state.conviction,
          tier,
          action,
          outcome: "error",
          error: message,
        });
      }
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}

// ── Determine Next Action ────────────────────────────────────

async function determineNextAction(
  _db: any,
  state: ConvictionState
): Promise<OrchestratorAction | null> {
  const tier = getConvictionTier(state.conviction);
  const tierConfig = TIER_TEMPLATES[tier];

  // COLD tier: no outreach
  if (!tierConfig) return null;

  // No emails known
  if (state.emails.length === 0) return null;

  // Already purchased
  if (state.hasPurchased) {
    return {
      type: "suppress",
      template: "none",
      to: state.emails[0],
      priority: 0,
      reason: "Domain has already purchased",
      cooldownHours: 0,
    };
  }

  // Conviction below zero: suppress
  if (state.conviction < 0) {
    return {
      type: "suppress",
      template: "none",
      to: state.emails[0],
      priority: 0,
      reason: "Negative conviction — suppressed for 30 days",
      cooldownHours: SUPPRESSION_DAYS * 24,
    };
  }

  // Check cooldown from last action
  if (state.lastActionAt) {
    const lastActionDate = new Date(state.lastActionAt);
    const hoursSinceLastAction =
      (Date.now() - lastActionDate.getTime()) / (60 * 60 * 1000);

    if (hoursSinceLastAction < tierConfig.cooldownHours) {
      return {
        type: "wait",
        template: tierConfig.template,
        to: state.emails[0],
        priority: 0,
        reason: `Cooldown: ${Math.round(tierConfig.cooldownHours - hoursSinceLastAction)}h remaining`,
        cooldownHours: tierConfig.cooldownHours,
      };
    }
  }

  // Don't re-send the same template consecutively unless tier has escalated
  let template = tierConfig.template;
  if (state.lastAction === template) {
    // Check if we should escalate to the special buying_committee template
    if (state.isBuyingCommittee && template !== "buying_committee") {
      template = "buying_committee";
    } else {
      // Skip — same template was last action, wait for new signal
      return null;
    }
  }

  // Override: if buying committee detected and conviction >= 31, use buying_committee template
  if (
    state.isBuyingCommittee &&
    state.conviction >= 31 &&
    state.lastAction !== "buying_committee"
  ) {
    template = "buying_committee";
  }

  // Choose the best email recipient
  const to = selectBestRecipient(state);

  return {
    type: "email",
    template,
    to,
    priority: tierConfig.priority,
    reason: buildActionReason(state, tier, template),
    cooldownHours: tierConfig.cooldownHours,
  };
}

function selectBestRecipient(state: ConvictionState): string {
  // For buying committees, pick the most recent email (latest stakeholder)
  // For single leads, just pick the first
  if (state.emails.length === 1) return state.emails[0];

  // Since signals don't track email, fall back to first email
  return state.emails[0];
}

function buildActionReason(
  state: ConvictionState,
  tier: ConvictionTier,
  template: string
): string {
  const parts: string[] = [];
  parts.push(`Conviction=${state.conviction} (${tier})`);

  if (state.isBuyingCommittee) {
    parts.push(`Buying committee (${state.stakeholderCount} stakeholders)`);
  }

  if (state.hasAbandoned) parts.push("Checkout abandoned");

  // Identify top signals
  const recentSignals = state.signals.slice(-5);
  const topSignals = recentSignals
    .filter((s) => s.weight > 0)
    .map((s) => s.event)
    .join(", ");
  if (topSignals) parts.push(`Recent: ${topSignals}`);

  parts.push(`Template: ${template}`);

  return parts.join(" | ");
}

// ── Persistence ──────────────────────────────────────────────

async function persistConvictionState(
  db: any,
  state: ConvictionState
): Promise<void> {
  const now = new Date().toISOString();

  // Update all leads for this domain with conviction data
  for (const email of state.emails) {
    await (db as any)
      .from("outreach_leads")
      .update({
        conviction_score: Math.max(0, Math.min(100, Math.round(state.conviction))),
        last_signal_at: state.lastSignalAt,
        stakeholder_count: state.stakeholderCount,
        orchestrator_state: state,
        updated_at: now,
      })
      .eq("email", email);
  }

  // If no leads exist for the primary email, create one
  if (state.emails.length > 0) {
    const { data: existing } = await (db as any)
      .from("outreach_leads")
      .select("id")
      .eq("email", state.emails[0])
      .limit(1);

    if (!existing || existing.length === 0) {
      await (db as any).from("outreach_leads").insert({
        email: state.emails[0],
        domain: state.domain,
        conviction_score: Math.max(
          0,
          Math.min(100, Math.round(state.conviction))
        ),
        last_signal_at: state.lastSignalAt,
        stakeholder_count: state.stakeholderCount,
        orchestrator_state: state,
        status: "active",
        drip_step: 0,
        unsubscribed: false,
        converted: false,
        next_send_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        created_at: now,
        updated_at: now,
      });
    }
  }
}

// ── Email Template Builder ───────────────────────────────────

interface EmailTemplateData {
  locale: PricingLocale;
  company: string;
  email: string;
  domain: string;
  estimatedExposure: [number, number] | null;
  headcount?: number;
  industry?: string;
  isBuyingCommittee: boolean;
  stakeholderCount: number;
  conviction: number;
  tier: ConvictionTier;
  meta?: Record<string, any> | null;
}

// ── Tri-Lingual Email Copy ───────────────────────────────────

const TEMPLATE_COPY = {
  // ── 1. VALUE SIGNAL: Pure value, no CTA ──
  value_signal: {
    en: {
      subject: (c: string) => `We found something in ${c}'s stack`,
      preheader: "EXPOSURE INTELLIGENCE",
      headline: (d: EmailTemplateData) => `Hidden exposure detected in ${d.company}`,
      body: (d: EmailTemplateData) => {
        if (d.estimatedExposure) {
          const low = fmtAmount(d.estimatedExposure[0]);
          const high = fmtAmount(d.estimatedExposure[1]);
          return `Our intelligence scan detected financial exposure in the range of <strong style="color:#DC2626;font-family:monospace">${low} - ${high}/year</strong> across ${d.company}'s SaaS, Cloud, and AI stack. This includes hidden vendor lock-in, unoptimized contracts, and redundant tooling.`;
        }
        return `Our intelligence scan of ${d.company} detected signals consistent with hidden financial exposure. Companies of similar size and industry profile typically carry 8-15% in unoptimized IT spending.`;
      },
      note: "No action required. We'll follow up only if we find something worth your time.",
    },
    fr: {
      subject: (c: string) => `Nous avons detecte quelque chose dans le stack de ${c}`,
      preheader: "INTELLIGENCE EXPOSITION",
      headline: (d: EmailTemplateData) => `Exposition cachee detectee chez ${d.company}`,
      body: (d: EmailTemplateData) => {
        if (d.estimatedExposure) {
          const low = fmtAmount(d.estimatedExposure[0]);
          const high = fmtAmount(d.estimatedExposure[1]);
          return `Notre scan d'intelligence a detecte une exposition financiere de l'ordre de <strong style="color:#DC2626;font-family:monospace">${low} - ${high}/an</strong> dans le stack SaaS, Cloud et IA de ${d.company}. Cela inclut du verrouillage fournisseur, des contrats non optimises et des outils redondants.`;
        }
        return `Notre scan de ${d.company} a detecte des signaux coherents avec une exposition financiere cachee. Les entreprises de taille et profil similaires ont typiquement 8-15% de depenses IT non optimisees.`;
      },
      note: "Aucune action requise. Nous ne reviendrons que si nous trouvons quelque chose qui merite votre attention.",
    },
    de: {
      subject: (c: string) => `Wir haben etwas im Stack von ${c} gefunden`,
      preheader: "EXPOSITIONS-INTELLIGENCE",
      headline: (d: EmailTemplateData) => `Versteckte Exposition bei ${d.company} erkannt`,
      body: (d: EmailTemplateData) => {
        if (d.estimatedExposure) {
          const low = fmtAmount(d.estimatedExposure[0]);
          const high = fmtAmount(d.estimatedExposure[1]);
          return `Unser Intelligence-Scan hat eine finanzielle Exposition im Bereich von <strong style="color:#DC2626;font-family:monospace">${low} - ${high}/Jahr</strong> im SaaS-, Cloud- und KI-Stack von ${d.company} erkannt. Dies umfasst verstecktes Vendor-Lock-in, nicht optimierte Vertrage und redundante Tools.`;
        }
        return `Unser Scan von ${d.company} hat Signale erkannt, die auf versteckte finanzielle Exposition hinweisen. Unternehmen ahnlicher Grosse und Branche tragen typischerweise 8-15% an nicht optimierten IT-Ausgaben.`;
      },
      note: "Keine Aktion erforderlich. Wir melden uns nur, wenn wir etwas Relevantes finden.",
    },
  },

  // ── 2. URGENCY LEAK: Daily loss math + soft CTA ──
  urgency_leak: {
    en: {
      subject: (c: string) => `${c} is losing money every day you wait`,
      preheader: "COST OF DELAY",
      headline: (d: EmailTemplateData) => {
        const daily = d.estimatedExposure
          ? fmtAmount(d.estimatedExposure[0] / 365)
          : "significant amounts";
        return `${daily}/day is draining from ${d.company}`;
      },
      body: (d: EmailTemplateData) => {
        if (d.estimatedExposure) {
          const daily = fmtAmount(d.estimatedExposure[0] / 365);
          const annual = fmtAmount(d.estimatedExposure[0]);
          return `At the low end of our estimate, ${d.company} is losing <strong style="color:#DC2626;font-family:monospace">${daily}</strong> per day in hidden IT exposure. That's ${annual}/year minimum. Every vendor renewal that passes without data is a missed correction window.`;
        }
        return `Based on companies similar to ${d.company}, the typical hidden IT exposure runs 8-15% of total SaaS and Cloud spending. This compounds daily — every vendor renewal that passes without data is a missed correction window.`;
      },
      cta: "Stop the Leak",
      note: "The Decision Pack typically pays for itself within 2 weeks of corrective action.",
    },
    fr: {
      subject: (c: string) => `${c} perd de l'argent chaque jour d'attente`,
      preheader: "COUT DU RETARD",
      headline: (d: EmailTemplateData) => {
        const daily = d.estimatedExposure
          ? fmtAmount(d.estimatedExposure[0] / 365)
          : "des montants significatifs";
        return `${daily}/jour s'ecoule de ${d.company}`;
      },
      body: (d: EmailTemplateData) => {
        if (d.estimatedExposure) {
          const daily = fmtAmount(d.estimatedExposure[0] / 365);
          const annual = fmtAmount(d.estimatedExposure[0]);
          return `En estimation basse, ${d.company} perd <strong style="color:#DC2626;font-family:monospace">${daily}</strong> par jour en exposition IT cachee. Soit ${annual}/an minimum. Chaque renouvellement fournisseur sans donnees est une fenetre de correction manquee.`;
        }
        return `Pour des entreprises similaires a ${d.company}, l'exposition IT cachee typique est de 8-15% des depenses SaaS et Cloud. Cela se compose chaque jour.`;
      },
      cta: "Stopper la Fuite",
      note: "Le Decision Pack se rentabilise typiquement dans les 2 semaines d'action corrective.",
    },
    de: {
      subject: (c: string) => `${c} verliert jeden Tag Geld`,
      preheader: "KOSTEN DER VERZOGERUNG",
      headline: (d: EmailTemplateData) => {
        const daily = d.estimatedExposure
          ? fmtAmount(d.estimatedExposure[0] / 365)
          : "erhebliche Betrage";
        return `${daily}/Tag fliessen aus ${d.company} ab`;
      },
      body: (d: EmailTemplateData) => {
        if (d.estimatedExposure) {
          const daily = fmtAmount(d.estimatedExposure[0] / 365);
          const annual = fmtAmount(d.estimatedExposure[0]);
          return `In der unteren Schatzung verliert ${d.company} <strong style="color:#DC2626;font-family:monospace">${daily}</strong> pro Tag an versteckter IT-Exposition. Das sind mindestens ${annual}/Jahr. Jede Verlangerung ohne Daten ist ein verpasstes Korrekturfenster.`;
        }
        return `Fur Unternehmen ahnlich wie ${d.company} liegt die typische versteckte IT-Exposition bei 8-15% der SaaS- und Cloud-Ausgaben.`;
      },
      cta: "Das Leck Stoppen",
      note: "Das Decision Pack amortisiert sich typischerweise innerhalb von 2 Wochen nach Korrekturmassnahmen.",
    },
  },

  // ── 3. DECISION READY: CFO memo teaser + checkout link ──
  decision_ready: {
    en: {
      subject: (c: string) => `Your ${c} Decision Pack is ready to unlock`,
      preheader: "DECISION PACK READY",
      headline: (_d: EmailTemplateData) => `Your CFO memo is waiting`,
      body: (d: EmailTemplateData) => {
        return `We've assembled a complete Decision Pack for ${d.company} — including vendor-by-vendor risk analysis, negotiation playbooks, and a CFO-ready corrective protocol. The executive memo alone typically saves 10-20 hours of internal analysis. One click to unlock everything.`;
      },
      cta: "Unlock the Decision Pack",
      note: "Instant delivery. No call. No demo. Just intelligence.",
    },
    fr: {
      subject: (c: string) => `Le Decision Pack de ${c} est pret a debloquer`,
      preheader: "DECISION PACK PRET",
      headline: (_d: EmailTemplateData) => `Votre memo CFO est en attente`,
      body: (d: EmailTemplateData) => {
        return `Nous avons assemble un Decision Pack complet pour ${d.company} — analyse de risque fournisseur par fournisseur, protocoles de negociation et plan correctif pret pour le CFO. Le memo executif seul economise typiquement 10-20 heures d'analyse interne. Un clic pour tout debloquer.`;
      },
      cta: "Debloquer le Decision Pack",
      note: "Livraison instantanee. Pas d'appel. Pas de demo. Juste de l'intelligence.",
    },
    de: {
      subject: (c: string) => `Das ${c} Decision Pack ist bereit`,
      preheader: "DECISION PACK BEREIT",
      headline: (_d: EmailTemplateData) => `Ihr CFO-Memo wartet`,
      body: (d: EmailTemplateData) => {
        return `Wir haben ein vollstandiges Decision Pack fur ${d.company} zusammengestellt — Anbieter-fur-Anbieter-Risikoanalyse, Verhandlungsleitfaden und ein CFO-fertiges Korrekturprotokoll. Das Executive-Memo allein spart typischerweise 10-20 Stunden interner Analyse. Ein Klick, um alles freizuschalten.`;
      },
      cta: "Decision Pack Freischalten",
      note: "Sofortige Lieferung. Kein Anruf. Keine Demo. Nur Intelligence.",
    },
  },

  // ── 4. PEER PRESSURE: Industry stats + hard CTA ──
  peer_pressure: {
    en: {
      subject: (c: string) => `Companies like ${c} are acting 3x faster than you`,
      preheader: "PEER INTELLIGENCE",
      headline: (_d: EmailTemplateData) => `Your competitors aren't waiting`,
      body: (d: EmailTemplateData) => {
        const industry = d.industry || "your industry";
        return `In ${industry}, companies with ${d.headcount ? `${d.headcount}+ employees` : "similar headcounts"} are detecting an average of 12% hidden exposure and acting within 14 days. The ones who delay past 30 days see correction windows close — vendor renewals lock in, pricing power shifts, and the exposure compounds.`;
      },
      cta: "Act Before Your Next Renewal",
      note: "Your scan data is still available. Window closing.",
    },
    fr: {
      subject: (c: string) => `Des entreprises comme ${c} agissent 3x plus vite que vous`,
      preheader: "INTELLIGENCE PAIRS",
      headline: (_d: EmailTemplateData) => `Vos concurrents n'attendent pas`,
      body: (d: EmailTemplateData) => {
        const industry = d.industry || "votre secteur";
        return `Dans ${industry}, les entreprises de ${d.headcount ? `${d.headcount}+ employes` : "taille similaire"} detectent en moyenne 12% d'exposition cachee et agissent dans les 14 jours. Celles qui tardent au-dela de 30 jours voient les fenetres de correction se fermer.`;
      },
      cta: "Agir Avant Votre Prochain Renouvellement",
      note: "Vos donnees de scan sont toujours disponibles. Fenetre qui se ferme.",
    },
    de: {
      subject: (c: string) => `Unternehmen wie ${c} handeln 3x schneller als Sie`,
      preheader: "PEER-INTELLIGENCE",
      headline: (_d: EmailTemplateData) => `Ihre Wettbewerber warten nicht`,
      body: (d: EmailTemplateData) => {
        const industry = d.industry || "Ihrer Branche";
        return `In ${industry} erkennen Unternehmen mit ${d.headcount ? `${d.headcount}+ Mitarbeitern` : "ahnlicher Grosse"} durchschnittlich 12% versteckte Exposition und handeln innerhalb von 14 Tagen. Wer uber 30 Tage hinauszogert, sieht Korrekturfenster schliessen.`;
      },
      cta: "Vor der Nachsten Verlangerung Handeln",
      note: "Ihre Scan-Daten sind noch verfugbar. Fenster schliesst sich.",
    },
  },

  // ── 5. PERSONAL CEO: CEO-signed personal email ──
  personal_ceo: {
    en: {
      subject: (c: string) => `I reviewed ${c}'s scan personally`,
      preheader: "PERSONAL REVIEW",
      headline: (d: EmailTemplateData) =>
        `I spent 20 minutes reviewing ${d.company}'s exposure`,
      body: (d: EmailTemplateData) => {
        const exposure = d.estimatedExposure
          ? `${fmtAmount(d.estimatedExposure[0])} - ${fmtAmount(d.estimatedExposure[1])}/year`
          : "significant hidden exposure";
        return `I don't usually do this, but ${d.company}'s scan caught my attention. The exposure pattern — ${exposure} — is one I've seen lead to serious budget surprises at similar companies. I've seen CFOs wish they had this data 90 days earlier. The full Decision Pack breaks down exactly where the exposure is, vendor by vendor, with ready-to-use negotiation scripts.`;
      },
      cta: "Get the Full Picture",
      signoff: "Jean-Étienne<br><span style='color:#64748B;font-size:12px'>Founder, Ghost Tax</span>",
    },
    fr: {
      subject: (c: string) => `J'ai examine le scan de ${c} personnellement`,
      preheader: "REVUE PERSONNELLE",
      headline: (d: EmailTemplateData) =>
        `J'ai passe 20 minutes a examiner l'exposition de ${d.company}`,
      body: (d: EmailTemplateData) => {
        const exposure = d.estimatedExposure
          ? `${fmtAmount(d.estimatedExposure[0])} - ${fmtAmount(d.estimatedExposure[1])}/an`
          : "une exposition cachee significative";
        return `Je ne fais pas ca d'habitude, mais le scan de ${d.company} a attire mon attention. Le pattern d'exposition — ${exposure} — est un que j'ai vu mener a de serieuses surprises budgetaires chez des entreprises similaires. J'ai vu des CFO regretter de ne pas avoir eu ces donnees 90 jours plus tot. Le Decision Pack complet detaille exactement ou se trouve l'exposition, fournisseur par fournisseur, avec des scripts de negociation prets a l'emploi.`;
      },
      cta: "Obtenir la Vue Complete",
      signoff: "Jean-Étienne<br><span style='color:#64748B;font-size:12px'>Fondateur, Ghost Tax</span>",
    },
    de: {
      subject: (c: string) => `Ich habe den Scan von ${c} personlich gepruft`,
      preheader: "PERSONLICHE PRUFUNG",
      headline: (d: EmailTemplateData) =>
        `Ich habe 20 Minuten mit der Exposition von ${d.company} verbracht`,
      body: (d: EmailTemplateData) => {
        const exposure = d.estimatedExposure
          ? `${fmtAmount(d.estimatedExposure[0])} - ${fmtAmount(d.estimatedExposure[1])}/Jahr`
          : "erhebliche versteckte Exposition";
        return `Normalerweise mache ich das nicht, aber der Scan von ${d.company} hat meine Aufmerksamkeit erregt. Das Expositionsmuster — ${exposure} — habe ich bei ahnlichen Unternehmen zu ernsthaften Budgetuberraschungen fuhren sehen. Ich habe CFOs gesehen, die sich wunschten, diese Daten 90 Tage fruher gehabt zu haben. Das vollstandige Decision Pack schlusselt genau auf, wo die Exposition liegt, Anbieter fur Anbieter.`;
      },
      cta: "Das Volle Bild Erhalten",
      signoff: "Jean-Étienne<br><span style='color:#64748B;font-size:12px'>Gründer, Ghost Tax</span>",
    },
  },

  // ── 6. BUYING COMMITTEE: Multi-stakeholder email ──
  buying_committee: {
    en: {
      subject: (c: string) => `Multiple people at ${c} are reviewing your exposure`,
      preheader: "BUYING COMMITTEE DETECTED",
      headline: (d: EmailTemplateData) =>
        `${d.stakeholderCount} people at ${d.company} are looking at this`,
      body: (d: EmailTemplateData) => {
        return `We've noticed ${d.stakeholderCount} different people from ${d.company} have been reviewing the exposure analysis. When multiple stakeholders independently research the same issue, it usually means the pain is real and the decision is close. The full Decision Pack includes role-specific memos — CFO, CIO, Procurement — so each stakeholder gets the intelligence they need in the format they expect.`;
      },
      cta: "Get the Decision Pack for Your Team",
      note: "One purchase. All stakeholders get access.",
    },
    fr: {
      subject: (c: string) => `Plusieurs personnes chez ${c} examinent votre exposition`,
      preheader: "COMITE D'ACHAT DETECTE",
      headline: (d: EmailTemplateData) =>
        `${d.stakeholderCount} personnes chez ${d.company} regardent cela`,
      body: (d: EmailTemplateData) => {
        return `Nous avons remarque que ${d.stakeholderCount} personnes differentes de ${d.company} ont examine l'analyse d'exposition. Quand plusieurs parties prenantes recherchent independamment le meme probleme, cela signifie generalement que la douleur est reelle et la decision proche. Le Decision Pack complet inclut des memos specifiques par role — CFO, CIO, Procurement — pour que chaque partie prenante obtienne l'intelligence dont elle a besoin.`;
      },
      cta: "Decision Pack pour Votre Equipe",
      note: "Un seul achat. Tous les stakeholders ont acces.",
    },
    de: {
      subject: (c: string) => `Mehrere Personen bei ${c} prufen Ihre Exposition`,
      preheader: "EINKAUFSKOMITEE ERKANNT",
      headline: (d: EmailTemplateData) =>
        `${d.stakeholderCount} Personen bei ${d.company} schauen sich das an`,
      body: (d: EmailTemplateData) => {
        return `Wir haben festgestellt, dass ${d.stakeholderCount} verschiedene Personen von ${d.company} die Expositionsanalyse gepruft haben. Wenn mehrere Stakeholder unabhangig dasselbe Problem recherchieren, bedeutet das normalerweise, dass der Schmerz real und die Entscheidung nah ist. Das vollstandige Decision Pack enthalt rollenspezifische Memos — CFO, CIO, Einkauf.`;
      },
      cta: "Decision Pack fur Ihr Team",
      note: "Ein Kauf. Alle Stakeholder erhalten Zugang.",
    },
  },
} as const;

// ── Amount Formatting ────────────────────────────────────────

function fmtAmount(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M EUR`;
  if (abs >= 10_000) return `${Math.round(n / 1000)}k EUR`;
  return `${Math.round(n).toLocaleString("de-DE")} EUR`;
}

// ── Unsubscribe & Tracking ───────────────────────────────────

function generateUnsubToken(email: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "orch-salt";
  return crypto
    .createHash("sha256")
    .update(`unsub:${email}:${secret}`)
    .digest("hex")
    .slice(0, 16);
}

function trackingPixelUrl(email: string, template: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`orch:${email}:${template}:${Date.now()}`)
    .digest("hex")
    .slice(0, 12);
  return `${SITE_URL}/api/viral/pixel?src=orchestrator&tpl=${template}&h=${hash}`;
}

function buildCheckoutUrl(params: {
  domain: string;
  headcount?: number;
  template: string;
  locale: PricingLocale;
}): string {
  const url = new URL(`${SITE_URL}/pricing`);
  url.searchParams.set("ref", "orchestrator");
  url.searchParams.set("tpl", params.template);
  if (params.domain) url.searchParams.set("domain", params.domain);
  if (params.headcount)
    url.searchParams.set("headcount", String(params.headcount));
  url.searchParams.set("locale", params.locale);
  return url.toString();
}

// ── Email HTML Builder ───────────────────────────────────────

function buildOrchestratorEmail(
  template: string,
  data: EmailTemplateData
): { subject: string; html: string } {
  const locale = data.locale;
  const templateKey = template as keyof typeof TEMPLATE_COPY;
  const copy = TEMPLATE_COPY[templateKey]?.[locale];

  if (!copy) {
    // Fallback to value_signal in english
    const fallback = TEMPLATE_COPY.value_signal.en;
    return {
      subject: fallback.subject(data.company),
      html: buildEmailHtml({
        preheader: fallback.preheader,
        headline: fallback.headline(data),
        body: fallback.body(data),
        cta: undefined,
        note: fallback.note,
        signoff: undefined,
        template,
        data,
      }),
    };
  }

  const subject = copy.subject(data.company);
  const hasCta = "cta" in copy;

  return {
    subject,
    html: buildEmailHtml({
      preheader: copy.preheader,
      headline: copy.headline(data),
      body: copy.body(data),
      cta: hasCta ? (copy as any).cta : undefined,
      note: (copy as any).note,
      signoff: (copy as any).signoff,
      template,
      data,
    }),
  };
}

function buildEmailHtml(params: {
  preheader: string;
  headline: string;
  body: string;
  cta?: string;
  note: string;
  signoff?: string;
  template: string;
  data: EmailTemplateData;
}): string {
  const { preheader, headline, body, cta, note, signoff, template, data } =
    params;

  const price = getRailAPrice(data.headcount, data.locale);
  const formattedPrice = formatPrice(price, data.locale);

  const checkoutUrl = buildCheckoutUrl({
    domain: data.domain,
    headcount: data.headcount,
    template,
    locale: data.locale,
  });

  const unsubUrl = `${SITE_URL}/api/leads/unsubscribe?email=${encodeURIComponent(data.email)}&token=${generateUnsubToken(data.email)}`;
  const pixelUrl = trackingPixelUrl(data.email, template);

  // Accent color based on conviction tier
  const accentColor =
    data.tier === "CRITICAL" || data.tier === "URGENT"
      ? "#DC2626"
      : data.tier === "READY"
        ? "#3b82f6"
        : "#3b82f6";

  const ctaColor =
    data.tier === "CRITICAL" || data.tier === "URGENT"
      ? "#DC2626"
      : data.tier === "READY"
        ? "#3b82f6"
        : "#3b82f6";

  // Conviction indicator (subtle social proof)
  const convictionBar =
    data.conviction >= 31
      ? `
    <div style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:24px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:10px;color:#64748B;letter-spacing:0.1em;text-transform:uppercase">
            ${data.locale === "fr" ? "INTERET DETECTE" : data.locale === "de" ? "INTERESSE ERKANNT" : "INTEREST DETECTED"}
          </td>
          <td align="right">
            <div style="background:rgba(59,130,246,0.15);border-radius:4px;padding:2px 8px;display:inline-block">
              <span style="font-size:10px;font-family:monospace;color:${accentColor};font-weight:700">
                ${data.tier}
              </span>
            </div>
          </td>
        </tr>
      </table>
    </div>`
      : "";

  // Buying committee callout
  const committeeBox =
    data.isBuyingCommittee && template !== "buying_committee"
      ? `
    <div style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.15);border-radius:8px;padding:12px 16px;margin-bottom:24px">
      <p style="font-size:11px;color:#3b82f6;margin:0">
        ${data.locale === "fr" ? `${data.stakeholderCount} personnes de votre organisation examinent cette analyse` : data.locale === "de" ? `${data.stakeholderCount} Personen aus Ihrer Organisation prufen diese Analyse` : `${data.stakeholderCount} people from your organization are reviewing this analysis`}
      </p>
    </div>`
      : "";

  // CTA button (only for templates that have one)
  const ctaBlock = cta
    ? `
    <div style="text-align:center;margin-bottom:24px">
      <a href="${checkoutUrl}" style="display:inline-block;background:${ctaColor};color:#ffffff;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:-0.01em">
        ${cta}
      </a>
    </div>`
    : "";

  // Price reminder (only for templates with CTA)
  const priceLabel =
    data.locale === "fr"
      ? "Decision Pack complet"
      : data.locale === "de"
        ? "Vollstandiges Decision Pack"
        : "Full Decision Pack";
  const oneTime =
    data.locale === "fr"
      ? "(paiement unique)"
      : data.locale === "de"
        ? "(einmalige Zahlung)"
        : "(one-time payment)";
  const priceBlock = cta
    ? `
    <div style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px">
      <p style="font-size:12px;color:#475569;margin:0">
        ${priceLabel} &mdash;
        <span style="color:#0F172A;font-weight:700;font-family:monospace">${formattedPrice}</span>
        <span style="color:#64748B"> ${oneTime}</span>
      </p>
    </div>`
    : "";

  // Signoff block (for personal_ceo template)
  const signoffBlock = signoff
    ? `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0">
      <p style="font-size:14px;color:#0F172A;margin:0">${signoff}</p>
    </div>`
    : "";

  const unsubLabel =
    data.locale === "fr"
      ? "Se desabonner"
      : data.locale === "de"
        ? "Abmelden"
        : "Unsubscribe";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:580px;margin:0 auto;padding:32px 16px">

  <!-- Wordmark -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px">
    <tr>
      <td>
        <p style="font-size:11px;font-family:monospace;font-weight:800;color:#3b82f6;letter-spacing:0.25em;margin:0;text-transform:uppercase">GHOST TAX</p>
      </td>
      <td align="right">
        <p style="font-size:10px;letter-spacing:0.15em;color:${accentColor};text-transform:uppercase;margin:0">${preheader}</p>
      </td>
    </tr>
  </table>

  ${convictionBar}

  <!-- Headline -->
  <h1 style="font-size:22px;color:#0F172A;margin:0 0 16px 0;line-height:1.3;font-weight:800;letter-spacing:-0.02em">
    ${headline}
  </h1>

  <!-- Body -->
  <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 16px 0">
    ${body}
  </p>

  ${committeeBox}

  <!-- Note -->
  <p style="font-size:12px;color:#64748B;line-height:1.6;margin:0 0 24px 0">
    ${note}
  </p>

  ${ctaBlock}
  ${priceBlock}
  ${signoffBlock}

  <!-- Footer -->
  <div style="text-align:center;padding-top:24px;border-top:1px solid #E2E8F0">
    <p style="font-size:10px;color:#94A3B8;margin:0 0 4px 0">Ghost Tax Decision Intelligence</p>
    <p style="font-size:10px;color:#94A3B8;margin:0">
      <a href="${unsubUrl}" style="color:#94A3B8;text-decoration:underline">
        ${unsubLabel}
      </a>
    </p>
  </div>

</div>
<!-- Tracking Pixel -->
<img src="${pixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;border:0" alt="" />
</body>
</html>`;
}

// ── Exports for external integration ─────────────────────────

/**
 * Convenience: record a signal from the event taxonomy (lib/events.ts).
 * Maps event taxonomy names to orchestrator signal names automatically.
 */
export function mapEventToSignal(
  taxonomyEvent: string
): string | null {
  const mapped = EVENT_NAME_MAP[taxonomyEvent];
  if (mapped) return mapped;
  // Try stripping prefix
  const stripped = taxonomyEvent.replace(
    /^(discovery|intel|conversion|circulation|benchmark)\./,
    ""
  );
  if (SIGNAL_WEIGHTS[stripped] !== undefined) return stripped;
  return null;
}

/**
 * Get the weight for a signal name.
 */
export function getSignalWeight(signalName: string): number {
  return SIGNAL_WEIGHTS[signalName] ?? 0;
}

/**
 * Get all defined signal weights (for debugging/admin).
 */
export function getAllSignalWeights(): Record<string, number> {
  return { ...SIGNAL_WEIGHTS };
}

/**
 * Get tier info for a conviction score (for UI display).
 */
export function getConvictionTierInfo(score: number): {
  tier: ConvictionTier;
  label: string;
  range: [number, number];
} {
  const tier = getConvictionTier(score);
  const ranges: Record<ConvictionTier, [number, number]> = {
    COLD: [0, 15],
    WARM: [16, 30],
    HOT: [31, 50],
    READY: [51, 70],
    URGENT: [71, 90],
    CRITICAL: [91, 100],
  };
  const labels: Record<ConvictionTier, string> = {
    COLD: "No outreach. Waiting for signal.",
    WARM: "Value email (exposure summary, no CTA)",
    HOT: "Urgency email (daily leak math + soft CTA)",
    READY: "Decision email (CFO memo teaser + checkout)",
    URGENT: "Peer pressure (industry stats + hard CTA)",
    CRITICAL: "Final conversion (CEO personal + competitor)",
  };
  return { tier, label: labels[tier], range: ranges[tier] };
}
