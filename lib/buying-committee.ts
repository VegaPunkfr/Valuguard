/**
 * GHOST TAX — BUYING COMMITTEE DETECTOR (SERVER-ONLY)
 *
 * Detects when multiple stakeholders from the same company domain
 * interact with Ghost Tax. This is the strongest B2B buying signal:
 * internal circulation = validated pain = accelerated deal.
 *
 * When 2+ unique identifiers (emails, IP hashes) from the same domain
 * interact, the system:
 *   1. Flags a "buying committee" formation
 *   2. Increases conviction by 20+ points
 *   3. Shifts CTA from Rail A to Rail B
 *   4. Changes email templates from individual to committee-aware
 *   5. At 'deciding' stage: triggers CEO-level personal outreach
 *
 * Queries: outreach_leads, vault_sessions, visitor_intel_pipeline
 * Storage: buying_committees table (Supabase)
 *
 * Exports: detectBuyingCommittee, recordStakeholder,
 *          getActiveBuyingCommittees, getCommitteeStrategy
 */

import { createAdminSupabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────

export interface Stakeholder {
  identifier: string;       // email or ipHash
  type: "email" | "ip";
  inferredRole: StakeholderRole;
  firstSeen: string;        // ISO 8601
  lastSeen: string;         // ISO 8601
  actions: string[];
  convictionContribution: number;
}

export type StakeholderRole =
  | "cfo"
  | "cio"
  | "procurement"
  | "it_director"
  | "unknown";

export interface CommitteeState {
  domain: string;
  companyName: string;
  stakeholders: Stakeholder[];
  committeeSize: number;
  isActive: boolean;          // had interaction in last 14 days
  formationDate: string;      // when 2nd person appeared
  totalConviction: number;
  stage: CommitteeStage;
  recommendedRail: "A" | "B_STABILIZE" | "B_MONITOR";
  estimatedDealSize: number;  // EUR
}

export type CommitteeStage = "forming" | "evaluating" | "deciding" | "ready";

export interface CommitteeStrategy {
  approach: "individual" | "committee" | "executive";
  messaging: {
    subject: Record<"en" | "fr" | "de", string>;
    angle: string;
  };
  recommendedCTA: string;
  urgencyMultiplier: number;  // 1.0–3.0x
  skipRailA: boolean;
}

// ── Role Inference ─────────────────────────────────────────

/**
 * Action → role mapping. Each action has a weight per role.
 * The role with the highest accumulated weight wins.
 */
const ROLE_SIGNALS: Record<string, Partial<Record<StakeholderRole, number>>> = {
  // Pricing / procurement pages
  "discovery.procurement_viewed":       { procurement: 5 },
  "circulation.procurement_viewed":     { procurement: 5 },
  "circulation.procurement_copied":     { procurement: 8 },
  "discovery.benchmark_viewed":         { procurement: 3, cfo: 2 },

  // CFO signals
  "circulation.cfo_memo_viewed":        { cfo: 5 },
  "circulation.cfo_memo_copied":        { cfo: 10 },
  "circulation.board_viewed":           { cfo: 6 },
  "circulation.board_copied":           { cfo: 8 },
  "intel.cost_of_delay_viewed":         { cfo: 4 },
  "intel.impact_shock_viewed":          { cfo: 3 },

  // CIO signals
  "circulation.cio_memo_viewed":        { cio: 5 },
  "circulation.cio_memo_copied":        { cio: 10 },
  "discovery.methodology_viewed":       { cio: 4 },
  "intel.causal_graph_viewed":          { cio: 3 },
  "intel.causal_map_expanded":          { cio: 4 },
  "intel.confidence_layer_viewed":      { cio: 3 },

  // IT Director signals
  "intel.simulator_used":              { it_director: 6 },
  "intel.simulator_lever_toggled":     { it_director: 8 },
  "intel.simulator_opened":           { it_director: 4 },
  "intel.simulator_scenario_applied":  { it_director: 6 },
  "intel.current_vs_simulated_viewed": { it_director: 5 },
  "intel.execution_friction_viewed":   { it_director: 4 },
  "intel.drift_monitor_viewed":        { it_director: 3 },
  "intel.vendor_playbook_expanded":    { it_director: 3, procurement: 2 },
  "intel.negotiation_leverage_viewed": { it_director: 2, procurement: 4 },

  // Generic engagement (weak signal)
  "intel.detection_started":           { unknown: 1 },
  "intel.detection_completed":         { unknown: 2 },
  "intel.proof_expanded":              { unknown: 1 },
  "intel.memo_copied":                 { cfo: 3, cio: 3 },
  "conversion.checkout_started":       { procurement: 3, cfo: 2 },
  "conversion.checkout_after_memo":    { cfo: 4 },
  "conversion.checkout_after_trust":   { procurement: 2 },
};

function inferRole(actions: string[]): StakeholderRole {
  const scores: Record<StakeholderRole, number> = {
    cfo: 0,
    cio: 0,
    procurement: 0,
    it_director: 0,
    unknown: 0,
  };

  for (const action of actions) {
    const signals = ROLE_SIGNALS[action];
    if (!signals) continue;
    for (const [role, weight] of Object.entries(signals)) {
      scores[role as StakeholderRole] += weight as number;
    }
  }

  // Find the role with the highest score
  let bestRole: StakeholderRole = "unknown";
  let bestScore = 0;

  for (const [role, score] of Object.entries(scores)) {
    if (role === "unknown") continue; // prefer any known role
    if (score > bestScore) {
      bestScore = score;
      bestRole = role as StakeholderRole;
    }
  }

  // Require a minimum threshold to assign a real role
  if (bestScore < 3) return "unknown";
  return bestRole;
}

// ── Conviction Scoring ─────────────────────────────────────

/**
 * High-value actions get more conviction weight.
 * These correlate with purchase intent, not just browsing.
 */
const ACTION_CONVICTION: Record<string, number> = {
  "conversion.checkout_started":        15,
  "conversion.checkout_after_memo":     18,
  "conversion.checkout_after_trust":    12,
  "circulation.cfo_memo_copied":        12,
  "circulation.cio_memo_copied":        10,
  "circulation.procurement_copied":     10,
  "circulation.board_copied":           12,
  "intel.simulator_used":               8,
  "intel.simulator_lever_toggled":      6,
  "intel.simulator_scenario_applied":   7,
  "intel.detection_completed":          5,
  "intel.cost_of_delay_viewed":         4,
  "intel.negotiation_leverage_viewed":  5,
  "intel.vendor_playbook_expanded":     4,
  "intel.impact_shock_viewed":          3,
  "intel.proof_expanded":               3,
  "intel.memo_copied":                  8,
  "intel.causal_graph_viewed":          3,
  "intel.drift_monitor_viewed":         3,
  "intel.market_memory_viewed":         2,
  "discovery.methodology_viewed":       2,
  "discovery.procurement_viewed":       3,
  "discovery.benchmark_viewed":         2,
  "circulation.cfo_memo_viewed":        3,
  "circulation.cio_memo_viewed":        3,
  "circulation.consensus_viewed":       4,
  "circulation.print_opened":           5,
  "circulation.share_opened":           6,
  "benchmark.cta_clicked":             4,
  "benchmark.to_detection_clicked":    5,
};

function computeStakeholderConviction(actions: string[]): number {
  let conviction = 0;
  for (const action of actions) {
    conviction += ACTION_CONVICTION[action] || 1;
  }
  return conviction;
}

// ── Stage Determination ────────────────────────────────────

const CHECKOUT_ACTIONS = new Set([
  "conversion.checkout_started",
  "conversion.checkout_after_memo",
  "conversion.checkout_after_trust",
]);

const MEMO_ACTIONS = new Set([
  "circulation.cfo_memo_copied",
  "circulation.cio_memo_copied",
  "circulation.procurement_copied",
  "circulation.board_copied",
  "intel.memo_copied",
]);

const SIMULATOR_ACTIONS = new Set([
  "intel.simulator_used",
  "intel.simulator_lever_toggled",
  "intel.simulator_scenario_applied",
]);

function determineStage(stakeholders: Stakeholder[]): CommitteeStage {
  const allActions = stakeholders.flatMap((s) => s.actions);
  const totalInteractions = allActions.length;
  const uniqueStakeholders = stakeholders.length;

  // ready: any stakeholder started checkout
  if (allActions.some((a) => CHECKOUT_ACTIONS.has(a))) {
    return "ready";
  }

  // deciding: 3+ stakeholders OR memo copied OR simulator used
  if (uniqueStakeholders >= 3) return "deciding";
  if (allActions.some((a) => MEMO_ACTIONS.has(a))) return "deciding";
  if (allActions.some((a) => SIMULATOR_ACTIONS.has(a))) return "deciding";

  // evaluating: 2+ stakeholders actively exploring
  if (uniqueStakeholders >= 2 && totalInteractions >= 5) return "evaluating";

  // forming: 2 stakeholders, < 5 total interactions
  return "forming";
}

// ── Rail & Deal Size ───────────────────────────────────────

function recommendRail(
  committeeSize: number,
  stage: CommitteeStage,
): "A" | "B_STABILIZE" | "B_MONITOR" {
  if (committeeSize >= 4) return "B_MONITOR";
  if (committeeSize >= 3) return "B_STABILIZE";
  if (committeeSize >= 2 && (stage === "deciding" || stage === "ready")) {
    return "B_STABILIZE";
  }
  return "A";
}

function estimateDealSize(
  committeeSize: number,
  stage: CommitteeStage,
  totalConviction: number,
): number {
  // Base prices: Rail A = 490, B_STABILIZE = 4990, B_MONITOR = 19900/yr
  if (committeeSize >= 4) {
    // Rail C territory: 20k+ EUR
    const base = 20_000;
    const convictionBonus = Math.min(totalConviction * 50, 30_000);
    return base + convictionBonus;
  }
  if (committeeSize >= 3) {
    // B_STABILIZE or B_MONITOR
    return stage === "ready" ? 19_900 : 4_990;
  }
  if (committeeSize >= 2) {
    if (stage === "deciding" || stage === "ready") return 4_990;
    return 890; // Rail A but upsell likely
  }
  return 490; // Single stakeholder, Rail A
}

// ── Free Email Domain Filter ───────────────────────────────

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.fr", "yahoo.de", "yahoo.co.uk",
  "hotmail.com", "hotmail.fr", "hotmail.de",
  "outlook.com", "outlook.fr", "outlook.de",
  "live.com", "live.fr",
  "aol.com",
  "protonmail.com", "proton.me",
  "icloud.com", "me.com", "mac.com",
  "mail.com",
  "gmx.com", "gmx.de", "gmx.fr",
  "web.de",
  "t-online.de",
  "orange.fr", "wanadoo.fr",
  "free.fr", "laposte.net",
  "yandex.com", "yandex.ru",
  "zoho.com",
  "tutanota.com", "tuta.io",
  "fastmail.com",
  "hey.com",
]);

/**
 * Extract a company domain from an email address.
 * Returns null for free/personal email providers.
 */
function extractDomainFromEmail(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return null;
  if (FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

// ── Core Functions ─────────────────────────────────────────

/**
 * Record a stakeholder interaction for buying committee detection.
 * Upserts into the buying_committees table, grouped by domain.
 *
 * This is the primary write path — called from:
 *   - /api/intel (when a scan completes or events fire)
 *   - /api/outreach/drip (when email opens are tracked)
 *   - /api/track (when client-side events fire with domain context)
 */
export async function recordStakeholder(params: {
  domain: string;
  email?: string;
  ipHash?: string;
  role?: StakeholderRole;
  action: string;
}): Promise<void> {
  const { domain, email, ipHash, action } = params;

  // Must have at least one identifier
  const identifier = email || ipHash;
  if (!identifier) return;

  // Derive domain from email if not provided
  const effectiveDomain = domain || (email ? extractDomainFromEmail(email) : null);
  if (!effectiveDomain) return;

  // Skip free email domains — can't cluster into a company
  if (FREE_EMAIL_DOMAINS.has(effectiveDomain)) return;

  const supabase = createAdminSupabase();
  if (!supabase) {
    if (process.env.NODE_ENV === "development") {
      console.log("[BuyingCommittee] No Supabase — dry run:", effectiveDomain, identifier, action);
    }
    return;
  }

  const now = new Date().toISOString();
  const identifierType: "email" | "ip" = email ? "email" : "ip";

  try {
    // Fetch existing committee record for this domain
    const { data: existing } = await (supabase as any)
      .from("buying_committees")
      .select("id, domain, company_name, stakeholders, formation_date")
      .eq("domain", effectiveDomain)
      .single();

    const currentStakeholders: Stakeholder[] = existing?.stakeholders
      ? (typeof existing.stakeholders === "string"
          ? JSON.parse(existing.stakeholders)
          : existing.stakeholders)
      : [];

    // Find or create stakeholder entry
    let stakeholder = currentStakeholders.find(
      (s) => s.identifier === identifier,
    );

    if (stakeholder) {
      // Existing stakeholder — update
      stakeholder.lastSeen = now;
      if (!stakeholder.actions.includes(action)) {
        stakeholder.actions.push(action);
      }
      stakeholder.inferredRole =
        params.role || inferRole(stakeholder.actions);
      stakeholder.convictionContribution = computeStakeholderConviction(
        stakeholder.actions,
      );
    } else {
      // New stakeholder
      const actions = [action];
      stakeholder = {
        identifier,
        type: identifierType,
        inferredRole: params.role || inferRole(actions),
        firstSeen: now,
        lastSeen: now,
        actions,
        convictionContribution: computeStakeholderConviction(actions),
      };
      currentStakeholders.push(stakeholder);
    }

    // Determine formation date: when the 2nd stakeholder appeared
    let formationDate = existing?.formation_date || null;
    if (!formationDate && currentStakeholders.length >= 2) {
      // Sort by firstSeen, take the 2nd one's date
      const sorted = [...currentStakeholders].sort(
        (a, b) => new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime(),
      );
      formationDate = sorted[1].firstSeen;
    }

    // Resolve company name from multiple sources
    const companyName = await resolveCompanyName(effectiveDomain, supabase, existing?.company_name);

    // Compute aggregates
    const totalConviction = currentStakeholders.reduce(
      (sum, s) => sum + s.convictionContribution,
      0,
    );
    const stage = determineStage(currentStakeholders);
    const rail = recommendRail(currentStakeholders.length, stage);
    const dealSize = estimateDealSize(
      currentStakeholders.length,
      stage,
      totalConviction,
    );

    // Check activity within last 14 days
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const isActive = currentStakeholders.some(
      (s) => new Date(s.lastSeen).getTime() > fourteenDaysAgo,
    );

    // Upsert committee record
    const record = {
      domain: effectiveDomain,
      company_name: companyName,
      stakeholders: currentStakeholders,
      committee_size: currentStakeholders.length,
      is_active: isActive,
      formation_date: formationDate,
      total_conviction: totalConviction,
      stage,
      recommended_rail: rail,
      estimated_deal_size: dealSize,
      updated_at: now,
    };

    if (existing?.id) {
      await (supabase as any)
        .from("buying_committees")
        .update(record)
        .eq("id", existing.id);
    } else {
      await (supabase as any)
        .from("buying_committees")
        .insert({ ...record, created_at: now });
    }

    // Log committee formation for monitoring
    if (currentStakeholders.length === 2 && !existing?.formation_date) {
      console.log(
        `[BuyingCommittee] COMMITTEE FORMED: ${effectiveDomain} ` +
          `(${companyName}) — 2 stakeholders detected`,
      );
    }

    if (currentStakeholders.length >= 3 && stage === "deciding") {
      console.log(
        `[BuyingCommittee] DECIDING STAGE: ${effectiveDomain} ` +
          `(${companyName}) — ${currentStakeholders.length} stakeholders, ` +
          `conviction=${totalConviction}, deal=€${dealSize}`,
      );
    }
  } catch (err) {
    console.error("[BuyingCommittee] recordStakeholder error:", err);
  }
}

/**
 * Detect whether a domain has a buying committee.
 * Returns null if the domain has only 1 stakeholder.
 */
export async function detectBuyingCommittee(
  domain: string,
): Promise<CommitteeState | null> {
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return null;

  const supabase = createAdminSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await (supabase as any)
      .from("buying_committees")
      .select("*")
      .eq("domain", domain)
      .single();

    if (error || !data) return null;

    const stakeholders: Stakeholder[] =
      typeof data.stakeholders === "string"
        ? JSON.parse(data.stakeholders)
        : data.stakeholders || [];

    if (stakeholders.length < 2) return null;

    // Recompute isActive based on current time
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const isActive = stakeholders.some(
      (s) => new Date(s.lastSeen).getTime() > fourteenDaysAgo,
    );

    return {
      domain: data.domain,
      companyName: data.company_name || domain,
      stakeholders,
      committeeSize: stakeholders.length,
      isActive,
      formationDate: data.formation_date || "",
      totalConviction: data.total_conviction || 0,
      stage: data.stage || "forming",
      recommendedRail: data.recommended_rail || "A",
      estimatedDealSize: data.estimated_deal_size || 490,
    };
  } catch (err) {
    console.error("[BuyingCommittee] detectBuyingCommittee error:", err);
    return null;
  }
}

/**
 * Get all domains with active buying committees (interaction in last 14 days).
 * Used for pipeline dashboards and outreach prioritization.
 */
export async function getActiveBuyingCommittees(): Promise<CommitteeState[]> {
  const supabase = createAdminSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await (supabase as any)
      .from("buying_committees")
      .select("*")
      .eq("is_active", true)
      .gte("committee_size", 2)
      .order("total_conviction", { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map((row) => {
      const stakeholders: Stakeholder[] =
        typeof row.stakeholders === "string"
          ? JSON.parse(row.stakeholders)
          : row.stakeholders || [];

      return {
        domain: row.domain,
        companyName: row.company_name || row.domain,
        stakeholders,
        committeeSize: row.committee_size,
        isActive: row.is_active,
        formationDate: row.formation_date || "",
        totalConviction: row.total_conviction || 0,
        stage: row.stage || "forming",
        recommendedRail: row.recommended_rail || "A",
        estimatedDealSize: row.estimated_deal_size || 490,
      };
    });
  } catch (err) {
    console.error("[BuyingCommittee] getActiveBuyingCommittees error:", err);
    return [];
  }
}

// ── Strategy Engine ────────────────────────────────────────

/**
 * Determine the optimal engagement strategy for a buying committee.
 * Pure function — no DB calls, works from CommitteeState alone.
 */
export function getCommitteeStrategy(committee: CommitteeState): CommitteeStrategy {
  const { stage, committeeSize, totalConviction, companyName } = committee;

  // ── Forming (2 people, < 5 interactions) ──────────────────
  if (stage === "forming") {
    return {
      approach: "individual",
      messaging: {
        subject: {
          en: `${companyName} — your team is looking at this`,
          fr: `${companyName} — votre équipe examine ceci`,
          de: `${companyName} — Ihr Team prüft das bereits`,
        },
        angle:
          "Your colleague is also reviewing your company's SaaS exposure. " +
          "Internal attention confirms the problem is real.",
      },
      recommendedCTA: "Share the free scan results with your team",
      urgencyMultiplier: 1.3,
      skipRailA: false,
    };
  }

  // ── Evaluating (active exploration) ───────────────────────
  if (stage === "evaluating") {
    return {
      approach: "committee",
      messaging: {
        subject: {
          en: `${committeeSize} people at ${companyName} are evaluating exposure`,
          fr: `${committeeSize} personnes chez ${companyName} évaluent l'exposition`,
          de: `${committeeSize} Personen bei ${companyName} prüfen die Exposition`,
        },
        angle:
          "Multiple stakeholders at your organization are independently " +
          "reviewing the same SaaS exposure data. This is a validated concern, " +
          "not a single-person initiative.",
      },
      recommendedCTA: "Get the full Decision Pack for your team",
      urgencyMultiplier: 1.8,
      skipRailA: false,
    };
  }

  // ── Deciding (3+ or memo copied or simulator used) ────────
  if (stage === "deciding") {
    return {
      approach: "executive",
      messaging: {
        subject: {
          en: `${companyName} — your team is ready to act on SaaS exposure`,
          fr: `${companyName} — votre équipe est prête à agir sur l'exposition SaaS`,
          de: `${companyName} — Ihr Team ist bereit, die SaaS-Exposition anzugehen`,
        },
        angle:
          "Your buying committee has reached critical mass. Memos are being copied, " +
          "scenarios are being simulated. The decision infrastructure is in place — " +
          "all that's missing is the full intelligence.",
      },
      recommendedCTA: "Start with the Stabilization Plan (Rail B)",
      urgencyMultiplier: 2.5,
      skipRailA: committeeSize >= 3,
    };
  }

  // ── Ready (checkout started) ──────────────────────────────
  // stage === "ready"
  return {
    approach: "executive",
    messaging: {
      subject: {
        en: `${companyName} — complete your team's SaaS intelligence order`,
        fr: `${companyName} — finalisez la commande d'intelligence SaaS de votre équipe`,
        de: `${companyName} — schließen Sie die SaaS-Intelligence-Bestellung Ihres Teams ab`,
      },
      angle:
        "Someone on your team has already started checkout. " +
        `With ${committeeSize} stakeholders engaged and conviction at ${totalConviction}, ` +
        "this is an organization-wide priority. Complete the order.",
    },
    recommendedCTA: committeeSize >= 3
      ? "Talk to us about the Stabilization Mission (Rail C)"
      : "Complete your Decision Pack purchase",
    urgencyMultiplier: 3.0,
    skipRailA: true,
  };
}

// ── Company Name Resolution ────────────────────────────────

/**
 * Try to resolve a human-readable company name from multiple sources.
 * Priority: existing name > vault_sessions > visitor_intel_pipeline > domain
 */
async function resolveCompanyName(
  domain: string,
  supabase: any,
  existingName?: string | null,
): Promise<string> {
  if (existingName && existingName !== domain) return existingName;

  try {
    // Try vault_sessions first (most likely to have user-provided data)
    const { data: session } = await supabase
      .from("vault_sessions")
      .select("company_name")
      .eq("domain", domain)
      .not("company_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (session?.company_name) return session.company_name as string;
  } catch {
    // table may not exist or no data
  }

  try {
    // Try visitor_intel_pipeline
    const { data: visitor } = await supabase
      .from("visitor_intel_pipeline")
      .select("company")
      .eq("domain", domain)
      .not("company", "is", null)
      .order("identified_at", { ascending: false })
      .limit(1)
      .single();

    if (visitor?.company) return visitor.company as string;
  } catch {
    // table may not exist or no data
  }

  try {
    // Try outreach_leads
    const { data: lead } = await supabase
      .from("outreach_leads")
      .select("company")
      .eq("domain", domain)
      .not("company", "is", null)
      .limit(1)
      .single();

    if (lead?.company) return lead.company as string;
  } catch {
    // table may not exist or no data
  }

  // Fallback: capitalize domain
  return domain
    .replace(/\.(com|io|co|net|org|de|fr|ch|be|nl|eu|ai|dev|app)$/, "")
    .replace(/[.-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Conviction Bonus ───────────────────────────────────────

/**
 * Calculate the conviction bonus from committee detection.
 * Called by the orchestrator when computing total conviction.
 *
 * Returns 0 for single-stakeholder domains.
 * Returns 20-50 for detected committees based on stage.
 */
export function getCommitteeConvictionBonus(
  committee: CommitteeState | null,
): number {
  if (!committee || committee.committeeSize < 2) return 0;

  const { stage, committeeSize } = committee;

  // Base: +20 for any committee (second_person_same_domain)
  let bonus = 20;

  // Stage escalation
  switch (stage) {
    case "forming":
      bonus += 0;
      break;
    case "evaluating":
      bonus += 5;
      break;
    case "deciding":
      bonus += 15;
      break;
    case "ready":
      bonus += 25;
      break;
  }

  // Size bonus: +3 per additional stakeholder beyond 2
  bonus += Math.max(0, committeeSize - 2) * 3;

  return Math.min(50, bonus); // cap at 50
}

// ── Committee-Aware Email Context ──────────────────────────

/**
 * Generate committee context for email templates.
 * Returns null if no committee exists — callers use standard templates.
 */
export function getCommitteeEmailContext(
  committee: CommitteeState | null,
): {
  isCommittee: boolean;
  committeeSize: number;
  stage: CommitteeStage;
  roles: StakeholderRole[];
  firstStakeholderAlert: string;
  teamContext: Record<"en" | "fr" | "de", string>;
} | null {
  if (!committee || committee.committeeSize < 2) return null;

  const roles = Array.from(
    new Set(
      committee.stakeholders
        .map((s) => s.inferredRole)
        .filter((r): r is Exclude<StakeholderRole, "unknown"> => r !== "unknown"),
    ),
  );

  const roleLabels: Record<StakeholderRole, Record<"en" | "fr" | "de", string>> = {
    cfo: { en: "CFO", fr: "DAF", de: "CFO" },
    cio: { en: "CIO", fr: "DSI", de: "CIO" },
    procurement: { en: "Procurement", fr: "Achats", de: "Einkauf" },
    it_director: { en: "IT Director", fr: "Directeur IT", de: "IT-Leiter" },
    unknown: { en: "team member", fr: "membre de l'équipe", de: "Teammitglied" },
  };

  const roleListEN = roles.length > 0
    ? roles.map((r) => roleLabels[r].en).join(", ")
    : `${committee.committeeSize} team members`;
  const roleListFR = roles.length > 0
    ? roles.map((r) => roleLabels[r].fr).join(", ")
    : `${committee.committeeSize} membres de l'équipe`;
  const roleListDE = roles.length > 0
    ? roles.map((r) => roleLabels[r].de).join(", ")
    : `${committee.committeeSize} Teammitglieder`;

  return {
    isCommittee: true,
    committeeSize: committee.committeeSize,
    stage: committee.stage,
    roles,
    firstStakeholderAlert:
      `${committee.committeeSize} people from ${committee.companyName} ` +
      `are reviewing SaaS exposure data`,
    teamContext: {
      en: `Your colleagues (${roleListEN}) are also reviewing ${committee.companyName}'s exposure. ` +
          `This is not a solo inquiry — it's an organization-wide concern.`,
      fr: `Vos collègues (${roleListFR}) examinent également l'exposition de ${committee.companyName}. ` +
          `Ce n'est pas une initiative isolée — c'est une préoccupation organisationnelle.`,
      de: `Ihre Kollegen (${roleListDE}) prüfen ebenfalls die Exposition von ${committee.companyName}. ` +
          `Dies ist keine Einzelanfrage — es ist ein unternehmensweites Thema.`,
    },
  };
}

// ── Pipeline Summary ───────────────────────────────────────

/**
 * Get a summary of buying committee pipeline health.
 * Used for internal dashboards and weekly reports.
 */
export async function getCommitteePipelineSummary(): Promise<{
  totalCommittees: number;
  activeCommittees: number;
  byStage: Record<CommitteeStage, number>;
  totalEstimatedPipeline: number;  // EUR
  topCommittees: Array<{
    domain: string;
    companyName: string;
    committeeSize: number;
    stage: CommitteeStage;
    conviction: number;
    dealSize: number;
  }>;
}> {
  const defaultResult = {
    totalCommittees: 0,
    activeCommittees: 0,
    byStage: { forming: 0, evaluating: 0, deciding: 0, ready: 0 },
    totalEstimatedPipeline: 0,
    topCommittees: [],
  };

  const supabase = createAdminSupabase();
  if (!supabase) return defaultResult;

  try {
    const { data, error } = await (supabase as any)
      .from("buying_committees")
      .select("domain, company_name, committee_size, is_active, stage, total_conviction, estimated_deal_size")
      .gte("committee_size", 2)
      .order("total_conviction", { ascending: false });

    if (error || !data) return defaultResult;

    const rows = data as any[];

    const byStage: Record<CommitteeStage, number> = {
      forming: 0,
      evaluating: 0,
      deciding: 0,
      ready: 0,
    };

    let totalPipeline = 0;
    let activeCount = 0;

    for (const row of rows) {
      const stage = (row.stage as CommitteeStage) || "forming";
      byStage[stage] = (byStage[stage] || 0) + 1;
      totalPipeline += row.estimated_deal_size || 0;
      if (row.is_active) activeCount++;
    }

    const topCommittees = rows.slice(0, 10).map((row) => ({
      domain: row.domain as string,
      companyName: (row.company_name || row.domain) as string,
      committeeSize: row.committee_size as number,
      stage: (row.stage || "forming") as CommitteeStage,
      conviction: (row.total_conviction || 0) as number,
      dealSize: (row.estimated_deal_size || 0) as number,
    }));

    return {
      totalCommittees: rows.length,
      activeCommittees: activeCount,
      byStage,
      totalEstimatedPipeline: totalPipeline,
      topCommittees,
    };
  } catch (err) {
    console.error("[BuyingCommittee] getCommitteePipelineSummary error:", err);
    return defaultResult;
  }
}
