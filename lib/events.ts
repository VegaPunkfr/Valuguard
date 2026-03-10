/**
 * GHOST TAX — BUYER-CONVICTION EVENT INSTRUMENTATION
 *
 * Lightweight event taxonomy for measuring decision intent,
 * not just traffic. No external dependency — fires to PostHog
 * when configured, otherwise logs in dev.
 *
 * Event taxonomy:
 *   discovery.*   — trust/proof surface views
 *   intel.*       — Decision Room interactions
 *   conversion.*  — checkout/purchase signals
 *   benchmark.*   — intelligence surface engagement
 */

type EventProperties = Record<string, string | number | boolean | null>;

// ── Signal buffer for server relay ─────────────────────

let signalBuffer: Array<{
  event: string;
  domain?: string;
  email?: string;
  properties?: EventProperties;
}> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentDomain: string | null = null;
let currentEmail: string | null = null;

/** Set the domain context for signal relay (call after scan starts) */
export function setSignalContext(domain: string, email?: string): void {
  currentDomain = domain;
  if (email) currentEmail = email;
}

function flushSignals(): void {
  if (signalBuffer.length === 0) return;
  const batch = signalBuffer.splice(0, 20);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/signals",
      JSON.stringify({ events: batch })
    );
  } else if (typeof fetch !== "undefined") {
    fetch("/api/signals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(() => {});
  }
}

function queueSignal(event: string, properties?: EventProperties): void {
  if (typeof window === "undefined") return;
  signalBuffer.push({
    event,
    domain: currentDomain || undefined,
    email: currentEmail || undefined,
    properties: properties || undefined,
  });
  // Flush every 3 seconds or when buffer hits 10
  if (signalBuffer.length >= 10) {
    flushSignals();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushSignals();
      flushTimer = null;
    }, 3000);
  }
}

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSignals();
  });
}

// ── Event names (exhaustive taxonomy) ──────────────────

export const EVENTS = {
  // Discovery / trust surfaces
  METHODOLOGY_VIEWED: "discovery.methodology_viewed",
  SECURITY_VIEWED: "discovery.security_viewed",
  PROCUREMENT_VIEWED: "discovery.procurement_viewed",
  BENCHMARK_VIEWED: "discovery.benchmark_viewed",

  // Decision Room interactions
  INTEL_DETECTION_STARTED: "intel.detection_started",
  INTEL_DETECTION_COMPLETED: "intel.detection_completed",
  INTEL_PROOF_EXPANDED: "intel.proof_expanded",
  INTEL_SCENARIO_SWITCHED: "intel.scenario_switched",
  INTEL_SIMULATOR_LEVER_TOGGLED: "intel.simulator_lever_toggled",
  INTEL_SIMULATOR_USED: "intel.simulator_used",
  INTEL_SIMULATOR_SCENARIO_APPLIED: "intel.simulator_scenario_applied",
  INTEL_CURRENT_VS_SIMULATED_VIEWED: "intel.current_vs_simulated_viewed",
  INTEL_CAUSAL_MAP_EXPANDED: "intel.causal_map_expanded",
  INTEL_CONFIDENCE_LAYER_VIEWED: "intel.confidence_layer_viewed",
  INTEL_EXECUTION_FRICTION_VIEWED: "intel.execution_friction_viewed",
  INTEL_RECOMMENDED_ACTION_CLICKED: "intel.recommended_action_clicked",
  INTEL_PROOF_LAYER_VIEWED: "intel.proof_layer_viewed",
  INTEL_COST_OF_DELAY_VIEWED: "intel.cost_of_delay_viewed",
  INTEL_IMPACT_SHOCK_VIEWED: "intel.impact_shock_viewed",
  INTEL_DELAY_PROJECTION_EXPANDED: "intel.delay_projection_expanded",
  INTEL_SIMULATOR_OPENED: "intel.simulator_opened",
  INTEL_MEMO_COPIED: "intel.memo_copied",
  INTEL_CAUSAL_GRAPH_VIEWED: "intel.causal_graph_viewed",
  INTEL_RETURN_VISIT: "intel.return_visit",
  INTEL_MARKET_MEMORY_VIEWED: "intel.market_memory_viewed",
  INTEL_DRIFT_MONITOR_VIEWED: "intel.drift_monitor_viewed",
  INTEL_NEGOTIATION_LEVERAGE_VIEWED: "intel.negotiation_leverage_viewed",
  INTEL_VENDOR_PLAYBOOK_EXPANDED: "intel.vendor_playbook_expanded",

  // Decision circulation
  CIRCULATION_CFO_MEMO_VIEWED: "circulation.cfo_memo_viewed",
  CIRCULATION_CFO_MEMO_COPIED: "circulation.cfo_memo_copied",
  CIRCULATION_CIO_MEMO_VIEWED: "circulation.cio_memo_viewed",
  CIRCULATION_CIO_MEMO_COPIED: "circulation.cio_memo_copied",
  CIRCULATION_PROCUREMENT_VIEWED: "circulation.procurement_viewed",
  CIRCULATION_PROCUREMENT_COPIED: "circulation.procurement_copied",
  CIRCULATION_BOARD_VIEWED: "circulation.board_viewed",
  CIRCULATION_BOARD_COPIED: "circulation.board_copied",
  CIRCULATION_CONSENSUS_VIEWED: "circulation.consensus_viewed",
  CIRCULATION_PRINT_OPENED: "circulation.print_opened",
  CIRCULATION_SHARE_OPENED: "circulation.share_opened",
  CHECKOUT_STARTED_AFTER_MEMO: "conversion.checkout_after_memo",

  // Conversion signals
  CHECKOUT_STARTED: "conversion.checkout_started",
  CHECKOUT_STARTED_AFTER_TRUST: "conversion.checkout_after_trust",

  // Benchmark surfaces
  BENCHMARK_PAGE_VIEWED: "benchmark.page_viewed",
  BENCHMARK_CTA_CLICKED: "benchmark.cta_clicked",
  BENCHMARK_TO_DETECTION_CLICKED: "benchmark.to_detection_clicked",
  TRUST_TO_DETECTION_CLICKED: "discovery.trust_to_detection_clicked",
  BENCHMARK_INDEX_VIEWED: "benchmark.index_viewed",
  RETURN_VISIT_AFTER_BENCHMARK: "benchmark.return_visit_after_benchmark",
} as const;

// ── Trust interaction tracking ─────────────────────────

const TRUST_SURFACES: Set<string> = new Set([
  EVENTS.METHODOLOGY_VIEWED,
  EVENTS.SECURITY_VIEWED,
  EVENTS.PROCUREMENT_VIEWED,
]);

let trustInteracted = false;

// ── Core dispatch ──────────────────────────────────────

export function trackEvent(event: string, properties?: EventProperties): void {
  // Track trust surface interaction
  if (TRUST_SURFACES.has(event)) {
    trustInteracted = true;
  }

  const payload = {
    event,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      path: typeof window !== "undefined" ? window.location.pathname : "",
      trust_interacted: trustInteracted,
    },
  };

  // Queue signal for server-side orchestrator
  queueSignal(event, payload.properties);

  // PostHog integration (when available)
  if (typeof window !== "undefined" && (window as any).posthog?.capture) {
    (window as any).posthog.capture(event, payload.properties);
    return;
  }

  // Dev logging
  if (process.env.NODE_ENV === "development") {
    console.log("[GT Event]", event, payload.properties);
  }
}

// ── Convenience: checkout with trust context ───────────

export function trackCheckoutStarted(properties?: EventProperties): void {
  trackEvent(EVENTS.CHECKOUT_STARTED, properties);
  if (trustInteracted) {
    trackEvent(EVENTS.CHECKOUT_STARTED_AFTER_TRUST, properties);
  }
}

// ── Convenience: detect return visit ───────────────────

export function trackReturnVisit(): void {
  if (typeof window === "undefined") return;
  const key = "vg_intel_visited";
  const visited = sessionStorage.getItem(key);
  if (visited) {
    trackEvent(EVENTS.INTEL_RETURN_VISIT);
  }
  sessionStorage.setItem(key, "1");
}

// ── Has trust been engaged? ────────────────────────────

export function hasTrustInteraction(): boolean {
  return trustInteracted;
}
