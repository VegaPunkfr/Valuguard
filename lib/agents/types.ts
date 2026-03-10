/**
 * GHOST TAX — MULTI-AGENT TYPE SYSTEM (SERVER-ONLY)
 *
 * Architecture: Pipeline séquentiel avec contexte partagé.
 *
 *   [PDF Contract]
 *       │
 *   ┌───▼───────────────┐
 *   │  Agent Extracteur  │  RAG/Vision → ContractData
 *   └───┬───────────────┘
 *       │
 *   ┌───▼───────────────┐
 *   │  Agent Analyste    │  ContractData + UsageData → WasteAnalysis
 *   └───┬───────────────┘
 *       │
 *   ┌───▼───────────────┐
 *   │  Agent Négociateur │  WasteAnalysis → NegotiationPack
 *   └───────────────────┘
 *
 * Pas de framework externe (LangGraph/CrewAI) — surcharge inutile.
 * Pipeline TypeScript pur avec OpenAI structured outputs.
 */

// ── Shared Context (passé d'agent en agent) ─────────

export interface AgentContext {
  runId: string;
  orgId: string;
  locale: "en" | "fr" | "de";
  startedAt: Date;
  phases: AgentPhaseResult[];
}

export interface AgentPhaseResult {
  agentId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  executionMs?: number;
  output?: unknown;
  error?: string;
  tokensUsed?: number;
}

// ── Agent 1: Extracteur — Output ────────────────────

export interface ContractData {
  vendor: string;
  contractType: "subscription" | "enterprise" | "usage_based" | "hybrid";
  startDate: string;           // ISO date
  endDate: string;             // ISO date
  renewalDate: string | null;  // ISO date
  autoRenewal: boolean;
  autoRenewalNoticeDays: number | null; // Days before renewal to cancel
  totalAnnualValueEur: number;
  paymentFrequency: "monthly" | "quarterly" | "annual";

  // Pricing tiers
  pricingTiers: PricingTier[];

  // Cancellation
  cancellationNoticeDays: number;
  earlyTerminationPenaltyEur: number | null;
  earlyTerminationPenaltyPercent: number | null;

  // Escalation
  priceEscalationClause: boolean;
  priceEscalationPercent: number | null;  // Annual increase %
  priceEscalationCap: number | null;       // Max increase %

  // Volume
  licensedSeats: number;
  minimumCommitSeats: number | null;
  overageRateEurPerSeat: number | null;

  // Extracted clauses (raw text)
  keyClausesExtracted: string[];

  // Confidence
  extractionConfidence: number; // 0-100
}

export interface PricingTier {
  name: string;
  seatsIncluded: number;
  monthlyCostPerSeatEur: number;
  features: string[];
}

// ── Agent 2: Analyste — Output ──────────────────────

export interface WasteAnalysis {
  vendor: string;
  contractValue: number;        // EUR/an

  // Usage vs License gap
  licensedSeats: number;
  activeSeats: number;
  orphanSeats: number;
  utilizationRate: number;       // 0-1

  // Financial waste breakdown
  wasteBreakdown: {
    unusedLicensesEur: number;
    overProvisioningEur: number;
    priceEscalationExposureEur: number;
    autoRenewalRiskEur: number;
    totalWasteEur: [number, number]; // [low, high]
  };

  // Time pressure
  daysUntilRenewal: number | null;
  daysUntilCancellationDeadline: number | null;
  urgencyLevel: "critical" | "high" | "medium" | "low";

  // Benchmark
  marketRatePerSeatEur: number | null;
  premiumOverMarketPercent: number | null;

  // Recommendations
  recommendations: WasteRecommendation[];

  analysisConfidence: number;     // 0-100
}

export interface WasteRecommendation {
  action: string;
  savingsEurRange: [number, number];
  effort: "trivial" | "easy" | "moderate" | "significant";
  timelineDays: number;
  priority: "critical" | "high" | "medium" | "low";
}

// ── Agent 3: Négociateur — Output ───────────────────

export interface NegotiationPack {
  vendor: string;

  // Negotiation strategy
  strategy: "reduce_seats" | "renegotiate_rate" | "switch_tier" | "cancel" | "consolidate";
  leverageScore: number;         // 0-100 — how strong is our position

  // Generated outputs
  executiveEmail: string;        // Ready-to-send email to vendor
  internalMemo: string;          // CFO/CIO briefing
  talkingPoints: string[];       // For procurement call

  // Financial targets
  targetSavingsEur: [number, number];
  bestAlternativeToNegotiatedAgreement: string;  // BATNA
  walkAwayPoint: string;

  // Timing
  optimalNegotiationWindow: string;
  deadlineDate: string | null;

  negotiationConfidence: number;  // 0-100
}

// ── Full Decision Room Output ───────────────────────

export interface DecisionRoomResult {
  runId: string;
  executedAt: Date;
  totalExecutionMs: number;

  contractData: ContractData;
  wasteAnalysis: WasteAnalysis;
  negotiationPack: NegotiationPack;

  phases: AgentPhaseResult[];
  totalTokensUsed: number;
}
