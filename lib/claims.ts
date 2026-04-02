/**
 * GHOST TAX — VERIFIED CLAIMS REGISTRY
 *
 * SINGLE SOURCE OF TRUTH for all stats, numbers, and claims.
 * NO component should hardcode stats. Import from here.
 *
 * Rules:
 *   - null = don't display (not yet measured)
 *   - number/string = verified, display freely
 *   - NEVER add a claim without a verification source
 */

export const CLAIMS = {
  // ── VERIFIED: derived from source code ──────────────
  detectionPhases: 21,          // count of phases in lib/analysis.ts pipeline
  deliveryHours: 48,            // SLA documented in CLAUDE.md
  leakTypes: 12,                // count of detection categories in analysis.ts
  priceEUR: 490,                // lib/pricing.ts RAIL_A_PRICE.eur
  priceEUR_DE: 590,             // lib/pricing.ts RAIL_A_PRICE.eur_de
  priceBStabilize: 4990,        // lib/pricing.ts RAILS.B_STABILIZE.price_eur
  priceBMonitor: 1990,          // lib/pricing.ts RAILS.B_MONITOR.price_eur
  pluginCount: 10,              // count of files in lib/plugins/
  connectorCount: 11,           // count of files in lib/connectors/
  systemAccess: "zero",         // no access to client systems - architectural fact
  marginPercent: 99.5,          // COGS ~2.50 EUR per report

  // ── VERIFIED: derived from database (update when real) ──
  totalAnalyses: null as number | null,       // null = don't display
  avgExposureEUR: null as number | null,      // null = don't display
  clientActionRate: null as number | null,     // null = don't display
  clientCount: null as number | null,         // null = don't display

  // ── QUALITATIVE: always safe to display ─────────────
  methodology: "OSINT + industry signals",
  deliveryFormat: "Decision Pack (PDF + memos)",
  security: "AES-256, TLS 1.3, GDPR-compliant",
  guarantee: "30-day satisfaction guarantee",
} as const;

/** Get a claim value. Returns null if not yet verified. */
export function claim<K extends keyof typeof CLAIMS>(key: K): typeof CLAIMS[K] {
  return CLAIMS[key];
}

/** Format a claim for display. Returns empty string if null. */
export function claimDisplay(key: keyof typeof CLAIMS): string {
  const val = CLAIMS[key];
  if (val === null) return "";
  return String(val);
}

/** Check if a claim is verified (not null). */
export function isVerified(key: keyof typeof CLAIMS): boolean {
  return CLAIMS[key] !== null;
}

/**
 * BANNED PATTERNS — these strings must NEVER appear in the codebase
 * outside of this file. The SEO Guardian skill checks for these.
 */
export const BANNED_CLAIMS = [
  /200\+\s*(analyses|audits|companies)/i,
  /294[\s,.]?k/i,
  /€294/,
  /94%\s*(client|action|taux)/i,
  /340k/i,
  /247k/i,
] as const;
