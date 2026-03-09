/**
 * GHOST TAX — PLUGIN SDK (SERVER-ONLY)
 *
 * Extensible plugin architecture for the intelligence pipeline.
 * Plugins amplify detection, scoring, and action generation.
 * Connectors pull data from external client systems.
 *
 * Revenue impact: plugins justify Rail B/C pricing (deeper intelligence).
 * Data flywheel: more connectors → more signals → better reports → more sales.
 */

import type {
  CompanyContext,
  ProofSignal,
  LossVelocity,
  PeerComparison,
  CorrectionMomentum,
  CausalGraph,
  ConfidenceModel,
  DecisionFriction,
  CounterfactualPrecompute,
  ProofEngine,
  CostOfDelay,
  ExecutiveSnapshot,
} from "@/lib/analysis";
import type { MarketMemoryResult } from "@/lib/market";
import type { DriftMonitorResult } from "@/lib/drift";
import type { NegotiationIntelligenceResult } from "@/lib/negotiation";

// ── Plugin Lifecycle ─────────────────────────────────

export type PluginPhase =
  | "pre-enrichment"    // Before Exa enrichment
  | "post-enrichment"   // After Exa, before analysis
  | "analysis"          // During 21-phase pipeline
  | "post-analysis"     // After pipeline, before report
  | "report"            // During report generation
  | "delivery";         // After report, during email/follow-up

export type PluginCategory =
  | "detection"         // Find new exposure signals
  | "scoring"           // Score/rank findings
  | "action"            // Generate corrective actions
  | "enrichment"        // Add external data
  | "reporting"         // Enhance report output
  | "monitoring";       // Ongoing drift/change tracking

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  category: PluginCategory;
  phases: PluginPhase[];
  description: string;
  revenueImpact: string;           // How this plugin drives EUR
  requiredConnectors?: string[];   // Connector IDs this plugin benefits from
  requiredEnvVars?: string[];      // Env vars needed to activate
}

// ── Pipeline Result (full intelligence output fed to plugins) ──

export interface PipelineResult {
  // CFO Shock Screen
  exposure: {
    lowEur: number;
    highEur: number;
    confidence: number;
    confidenceGrade: "high" | "moderate" | "low";
    benchmarkQuality: "strong" | "moderate" | "weak";
    basis: string;
    timeToImpactDays: number;
    ninetyDayRecoverableEur: [number, number];
  };

  // Economic Engine
  lossVelocity: LossVelocity;
  costOfDelay: CostOfDelay;

  // Confidence Layer
  confidenceModel: ConfidenceModel;
  proofEngine: ProofEngine;

  // Peer & Market Intelligence
  peerComparison: PeerComparison;
  marketMemory: MarketMemoryResult;
  driftMonitor: DriftMonitorResult;

  // Causal & Decision Layer
  causalGraph: CausalGraph;
  decisionFriction: DecisionFriction;
  decisionPressureScore: number;
  correctionMomentum: CorrectionMomentum;
  counterfactual: CounterfactualPrecompute;

  // Negotiation
  negotiationIntelligence: NegotiationIntelligenceResult;

  // Executive Output
  executiveSnapshot: ExecutiveSnapshot;
  scenarios: {
    conservative: { label: string; annualSavingsEur: [number, number] };
    base: { label: string; annualSavingsEur: [number, number] };
    aggressive: { label: string; annualSavingsEur: [number, number] };
  };
  decisionPack: {
    cfoMemo: string;
    cioOpsMemo: string;
    procurementSummary: string;
    boardOnePager: string;
  };

  // Global SaaS Exposure Score (composite 0-100)
  globalExposureScore: number;
}

export interface PluginContext {
  company: CompanyContext;
  enrichment: Record<string, unknown>;
  signals: ProofSignal[];
  connectorData: Record<string, ConnectorOutput>;
  locale: "en" | "fr" | "de";
  rail: "A" | "B_SETUP" | "B_MONITOR" | "C";
  runId: string;

  /** Full pipeline result — plugins use this for precision instead of guessing */
  pipeline: PipelineResult;
}

export interface PluginOutput {
  pluginId: string;
  signals?: ProofSignal[];
  scores?: Record<string, number>;
  actions?: PluginAction[];
  insights?: PluginInsight[];
  metadata?: Record<string, unknown>;
  executionMs: number;
}

export interface PluginAction {
  id: string;
  title: string;
  owner: string;
  priority: "critical" | "high" | "medium" | "low";
  savingsEurRange: [number, number];
  effort: "trivial" | "easy" | "moderate" | "significant";
  timelineDays: number;
  rationale: string;
}

export interface PluginInsight {
  id: string;
  label: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  eurImpact: [number, number] | null;
  confidence: number;  // 0-100
  source: string;
}

export interface GhostTaxPlugin {
  manifest: PluginManifest;
  initialize?: () => Promise<void>;
  execute: (ctx: PluginContext) => Promise<PluginOutput>;
  teardown?: () => Promise<void>;
}

// ── Connector Types ──────────────────────────────────

export type ConnectorCategory =
  | "billing"           // Stripe, Chargebee, invoicing
  | "cloud"             // AWS, Azure, GCP
  | "saas"              // Google Workspace, M365, Slack
  | "identity"          // Okta, Azure AD, OneLogin
  | "finance"           // QuickBooks, Xero, SAP
  | "crm"              // Salesforce, HubSpot
  | "project"          // Jira, Asana, Linear
  | "security"         // Crowdstrike, Snyk
  | "hr"               // BambooHR, Workday
  | "custom";          // Client-specific API

export type ConnectorAuthType =
  | "oauth2"
  | "api_key"
  | "service_account"
  | "basic_auth"
  | "webhook";

export interface ConnectorManifest {
  id: string;
  name: string;
  version: string;
  category: ConnectorCategory;
  vendor: string;
  authType: ConnectorAuthType;
  description: string;
  dataPoints: string[];           // What data this connector surfaces
  revenueImpact: string;          // How this connector drives EUR
  requiredScopes?: string[];      // OAuth scopes needed
  rateLimits?: { rpm: number; daily: number };
}

export interface ConnectorCredentials {
  connectorId: string;
  orgId: string;
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  serviceAccountJson?: string;
  expiresAt?: Date;
  metadata?: Record<string, string>;
}

export interface ConnectorOutput {
  connectorId: string;
  fetchedAt: Date;
  dataPoints: Record<string, unknown>;
  signalCount: number;
  rawRecordCount: number;
  executionMs: number;
  errors?: string[];
}

export interface GhostTaxConnector {
  manifest: ConnectorManifest;
  testConnection: (creds: ConnectorCredentials) => Promise<{ ok: boolean; error?: string }>;
  fetchData: (creds: ConnectorCredentials, company: CompanyContext) => Promise<ConnectorOutput>;
  mapToSignals: (data: ConnectorOutput) => ProofSignal[];
}
