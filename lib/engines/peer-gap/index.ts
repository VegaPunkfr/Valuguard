/**
 * VALUGUARD — PEER GAP ANALYSIS ENGINE (SERVER-ONLY)
 *
 * Sprint 3, Brique 3 : Benchmark concurrentiel impitoyable.
 *
 * Entrée : domaine cible, secteur, stack détectée
 * Sortie  : PeerGapScore (retard techno, catégories manquantes, coût du retard)
 *
 * V1 : findCompetitors() est mockée — interface prête pour le vrai endpoint.
 * Le scoring compare la stack de la cible aux standards optimaux du secteur.
 *
 * Usage:
 *   import { analyzePeerGap } from "@/lib/engines/peer-gap";
 *   const gap = await analyzePeerGap("acme.com", "technology", detectedVendors);
 */

import type { DetectedVendor } from "@/lib/engines/shadow-bill";
import type {
  PeerGapScore,
  PeerCompany,
  GapCategory,
} from "@/types/audit";

// ══════════════════════════════════════════════════════
//  INDUSTRY STACK STANDARDS — Ce qu'un leader devrait avoir
// ══════════════════════════════════════════════════════

interface StackExpectation {
  category: string;
  required: boolean;           // Critique pour ce secteur
  referenceVendor: string;     // "Best-in-class" du secteur
  absencePenalty: number;      // Points de gap si absent (0-15)
  costOfGapEur: number;        // Coût annuel estimé du retard
}

const INDUSTRY_STACKS: Record<string, StackExpectation[]> = {
  technology: [
    { category: "Identity",      required: true,  referenceVendor: "Okta / Auth0",         absencePenalty: 12, costOfGapEur: 25_000 },
    { category: "Observability",  required: true,  referenceVendor: "Datadog / Grafana",    absencePenalty: 14, costOfGapEur: 40_000 },
    { category: "Security",       required: true,  referenceVendor: "CrowdStrike / Wiz",    absencePenalty: 15, costOfGapEur: 60_000 },
    { category: "Productivity",   required: true,  referenceVendor: "Jira / Linear",        absencePenalty: 6,  costOfGapEur: 10_000 },
    { category: "Communication",  required: true,  referenceVendor: "Slack / Teams",        absencePenalty: 4,  costOfGapEur: 5_000 },
    { category: "Data",           required: false, referenceVendor: "Snowflake / BigQuery",  absencePenalty: 10, costOfGapEur: 30_000 },
    { category: "AI",             required: false, referenceVendor: "OpenAI / Anthropic",   absencePenalty: 8,  costOfGapEur: 20_000 },
    { category: "CRM",            required: false, referenceVendor: "Salesforce / HubSpot", absencePenalty: 5,  costOfGapEur: 15_000 },
  ],
  saas: [
    { category: "Identity",      required: true,  referenceVendor: "Okta",              absencePenalty: 12, costOfGapEur: 25_000 },
    { category: "Observability",  required: true,  referenceVendor: "Datadog",           absencePenalty: 14, costOfGapEur: 45_000 },
    { category: "Security",       required: true,  referenceVendor: "CrowdStrike",       absencePenalty: 15, costOfGapEur: 60_000 },
    { category: "CRM",            required: true,  referenceVendor: "Salesforce",        absencePenalty: 10, costOfGapEur: 30_000 },
    { category: "Support",        required: true,  referenceVendor: "Zendesk / Intercom", absencePenalty: 8,  costOfGapEur: 20_000 },
    { category: "Data",           required: true,  referenceVendor: "Snowflake",         absencePenalty: 10, costOfGapEur: 35_000 },
    { category: "HR",             required: false, referenceVendor: "Workday / Personio", absencePenalty: 5,  costOfGapEur: 10_000 },
    { category: "AI",             required: false, referenceVendor: "OpenAI",            absencePenalty: 8,  costOfGapEur: 20_000 },
  ],
  financial: [
    { category: "Security",       required: true,  referenceVendor: "CrowdStrike",       absencePenalty: 15, costOfGapEur: 80_000 },
    { category: "Identity",      required: true,  referenceVendor: "Okta",              absencePenalty: 14, costOfGapEur: 35_000 },
    { category: "ERP",            required: true,  referenceVendor: "SAP / Oracle",       absencePenalty: 12, costOfGapEur: 50_000 },
    { category: "Observability",  required: true,  referenceVendor: "Splunk / Datadog",   absencePenalty: 10, costOfGapEur: 40_000 },
    { category: "CRM",            required: true,  referenceVendor: "Salesforce",        absencePenalty: 8,  costOfGapEur: 25_000 },
    { category: "Data",           required: true,  referenceVendor: "Snowflake",         absencePenalty: 10, costOfGapEur: 40_000 },
    { category: "HR",             required: false, referenceVendor: "Workday",           absencePenalty: 5,  costOfGapEur: 12_000 },
  ],
  default: [
    { category: "Security",       required: true,  referenceVendor: "CrowdStrike",       absencePenalty: 12, costOfGapEur: 40_000 },
    { category: "Identity",      required: true,  referenceVendor: "Okta",              absencePenalty: 10, costOfGapEur: 20_000 },
    { category: "CRM",            required: false, referenceVendor: "Salesforce / HubSpot", absencePenalty: 6, costOfGapEur: 15_000 },
    { category: "Observability",  required: false, referenceVendor: "Datadog",           absencePenalty: 8,  costOfGapEur: 25_000 },
    { category: "Productivity",   required: false, referenceVendor: "Jira / Notion",      absencePenalty: 4,  costOfGapEur: 8_000 },
    { category: "HR",             required: false, referenceVendor: "Personio / BambooHR", absencePenalty: 4, costOfGapEur: 10_000 },
  ],
};

// ══════════════════════════════════════════════════════
//  COMPETITOR FINDER — Mock V1 (interface prête)
// ══════════════════════════════════════════════════════

/**
 * Interface pour le futur endpoint de recherche de concurrents.
 * V1 : retourne des peers simulés basés sur le secteur.
 * V2 : appellera Exa/Apollo pour trouver de vrais concurrents.
 */
export interface CompetitorFinderOptions {
  domain: string;
  industry: string;
  headcount?: number;
}

export async function findCompetitors(
  opts: CompetitorFinderOptions,
): Promise<PeerCompany[]> {
  // ── V1 : Peers simulés par secteur ──────────────
  // TODO V2 : Remplacer par appel Exa + enrichment réel
  const mockPeers = MOCK_PEERS[opts.industry.toLowerCase()] ?? MOCK_PEERS["default"];
  return mockPeers;
}

const MOCK_PEERS: Record<string, PeerCompany[]> = {
  technology: [
    { name: "Tech Leader Alpha",   domain: "techleader-alpha.com",  techMaturityScore: 82, stackAdvantages: ["SSO unifié", "Observabilité full-stack", "Zero-trust security"] },
    { name: "Tech Leader Beta",    domain: "techleader-beta.io",    techMaturityScore: 78, stackAdvantages: ["Data platform consolidée", "AI-first ops", "DevSecOps mature"] },
  ],
  saas: [
    { name: "SaaS Leader Alpha",   domain: "saasleader-alpha.com",  techMaturityScore: 85, stackAdvantages: ["PLG stack optimisé", "Customer 360°", "Automated security"] },
    { name: "SaaS Leader Beta",    domain: "saasleader-beta.io",    techMaturityScore: 80, stackAdvantages: ["Unified data layer", "AI-powered support", "Cost-optimized infra"] },
  ],
  financial: [
    { name: "FinServ Leader Alpha", domain: "finserv-alpha.com",    techMaturityScore: 80, stackAdvantages: ["Compliance automatisée", "SOC 2 Type II", "Fraud detection AI"] },
    { name: "FinServ Leader Beta",  domain: "finserv-beta.com",     techMaturityScore: 76, stackAdvantages: ["Unified risk platform", "Real-time monitoring", "DORA-compliant"] },
  ],
  default: [
    { name: "Industry Leader A",   domain: "leader-a.com",          techMaturityScore: 75, stackAdvantages: ["Stack moderne consolidée", "Sécurité proactive"] },
    { name: "Industry Leader B",   domain: "leader-b.com",          techMaturityScore: 72, stackAdvantages: ["Observabilité avancée", "SSO centralisé"] },
  ],
};

// ══════════════════════════════════════════════════════
//  MAIN: analyzePeerGap()
// ══════════════════════════════════════════════════════

export async function analyzePeerGap(
  domain: string,
  industry: string,
  detectedVendors: DetectedVendor[],
): Promise<PeerGapScore> {
  const peers = await findCompetitors({ domain, industry });
  const detectedCategories = new Set(detectedVendors.map((v) => v.category));
  const expectations = resolveStackExpectations(industry);

  const gapCategories = assessGapCategories(
    expectations, detectedCategories,
  );
  const gapScore = computeGapScore(gapCategories, peers);
  const competitiveRisk = computeCompetitiveRisk(gapCategories);
  const confidence = computeGapConfidence(
    detectedVendors.length, gapCategories.length,
  );

  return {
    domain,
    computedAt: new Date().toISOString(),
    gapScore,
    gapVerdict: scoreToVerdict(gapScore),
    peers,
    gapCategories,
    competitiveRiskEur: competitiveRisk,
    confidence,
  };
}

// ══════════════════════════════════════════════════════
//  GAP ASSESSMENT
// ══════════════════════════════════════════════════════

function assessGapCategories(
  expectations: StackExpectation[],
  detected: Set<string>,
): GapCategory[] {
  const gaps: GapCategory[] = [];

  for (const exp of expectations) {
    const hasCategory = detected.has(exp.category);

    if (!hasCategory) {
      gaps.push({
        category: exp.category,
        targetStatus: "absent",
        peerBenchmark: exp.referenceVendor,
        riskLevel: exp.required ? "critical" : "high",
        explanation: exp.required
          ? `${exp.category} absent — standard critique du secteur (ref: ${exp.referenceVendor})`
          : `${exp.category} non détecté — les leaders du secteur utilisent ${exp.referenceVendor}`,
      });
    }
  }

  return gaps;
}

function computeGapScore(
  gaps: GapCategory[],
  peers: PeerCompany[],
): number {
  if (gaps.length === 0) return 0;

  // Base : somme des pénalités
  let penalty = 0;
  for (const gap of gaps) {
    penalty += gap.riskLevel === "critical" ? 15
      : gap.riskLevel === "high" ? 10
      : gap.riskLevel === "medium" ? 5
      : 2;
  }

  // Normaliser par la maturité moyenne des peers
  const avgPeerMaturity = peers.length > 0
    ? peers.reduce((s, p) => s + p.techMaturityScore, 0) / peers.length
    : 75;

  // Gap = pénalité normalisée, cap à 100
  const raw = Math.round(penalty * (avgPeerMaturity / 75));
  return Math.min(100, Math.max(0, raw));
}

function computeCompetitiveRisk(gaps: GapCategory[]): number {
  // Le coût du retard = somme des costOfGap pour les catégories manquantes
  // On utilise les données de INDUSTRY_STACKS via le riskLevel
  const riskMap: Record<string, number> = {
    critical: 50_000,
    high: 25_000,
    medium: 10_000,
    low: 5_000,
  };

  return gaps.reduce(
    (total, gap) => total + (riskMap[gap.riskLevel] ?? 10_000),
    0,
  );
}

function computeGapConfidence(
  vendorCount: number,
  gapCount: number,
): number {
  let confidence = 25;

  // Plus on détecte de vendors, plus le gap est fiable
  confidence += Math.min(25, vendorCount * 4);

  // Peu de gaps détectés → on est peut-être aveugle
  if (gapCount === 0) confidence += 10;
  else if (gapCount > 5) confidence -= 5;

  confidence += 10; // Base peer comparison

  return Math.min(85, Math.max(10, confidence));
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════

function resolveStackExpectations(industry: string): StackExpectation[] {
  const key = industry.toLowerCase().replace(/[^a-z]/g, "");
  return INDUSTRY_STACKS[key] ?? INDUSTRY_STACKS["default"];
}

function scoreToVerdict(
  score: number,
): "leader" | "aligned" | "lagging" | "critical" {
  if (score <= 15) return "leader";
  if (score <= 35) return "aligned";
  if (score <= 65) return "lagging";
  return "critical";
}
