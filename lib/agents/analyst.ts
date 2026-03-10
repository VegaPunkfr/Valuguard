/**
 * GHOST TAX — AGENT ANALYSTE (SERVER-ONLY)
 *
 * Compare les données contractuelles (Agent Extracteur) avec
 * les données d'utilisation réelle (Orphan Detector / Connectors)
 * pour calculer le gaspillage financier exact.
 *
 * Input:  ContractData + UsageData (connector outputs)
 * Output: WasteAnalysis avec breakdown EUR précis
 */

import type { ContractData, WasteAnalysis, AgentPhaseResult } from "./types";
import type { OrphanReport } from "@/lib/engines/orphan-detector";

// ── System Prompt — Analyste ────────────────────────

const ANALYST_SYSTEM_PROMPT = `Tu es un analyste financier senior spécialisé en optimisation des coûts IT et SaaS.

MISSION: Analyser le gaspillage financier exact en croisant données contractuelles et utilisation réelle.

MÉTHODOLOGIE:
1. UTILISATION: Compare seats licenciés vs seats actifs. Calcule le taux d'utilisation.
2. GASPILLAGE PAR CATÉGORIE:
   - Licences inutilisées: (seats orphelins × coût/seat × 12)
   - Sur-provisionnement: (seats > besoin réel × coût × 12)
   - Escalation de prix: (% augmentation × valeur contrat)
   - Risque auto-renouvellement: (valeur contrat si deadline passée)
3. BENCHMARKS: Compare le coût/seat avec les taux du marché.
4. URGENCE: Calcule les jours restants avant deadline de renouvellement/annulation.
5. RECOMMANDATIONS: Actions concrètes avec EUR de savings, effort, et timeline.

RÈGLES:
- Toujours des FOURCHETTES [low, high], jamais d'estimations ponctuelles.
- Confiance ne dépasse JAMAIS 85 — l'humilité analytique est une force.
- Priorité par impact EUR, pas par facilité.
- Les recommandations doivent être actionnables par un CFO en 48h.

FORMAT: JSON strict conforme au schéma WasteAnalysis.`;

const WASTE_ANALYSIS_SCHEMA = {
  type: "object" as const,
  properties: {
    vendor: { type: "string" },
    contractValue: { type: "number" },
    licensedSeats: { type: "number" },
    activeSeats: { type: "number" },
    orphanSeats: { type: "number" },
    utilizationRate: { type: "number" },
    wasteBreakdown: {
      type: "object",
      properties: {
        unusedLicensesEur: { type: "number" },
        overProvisioningEur: { type: "number" },
        priceEscalationExposureEur: { type: "number" },
        autoRenewalRiskEur: { type: "number" },
        totalWasteEur: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
      },
      required: ["unusedLicensesEur", "overProvisioningEur", "priceEscalationExposureEur", "autoRenewalRiskEur", "totalWasteEur"],
    },
    daysUntilRenewal: { type: ["number", "null"] },
    daysUntilCancellationDeadline: { type: ["number", "null"] },
    urgencyLevel: { type: "string", enum: ["critical", "high", "medium", "low"] },
    marketRatePerSeatEur: { type: ["number", "null"] },
    premiumOverMarketPercent: { type: ["number", "null"] },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          savingsEurRange: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
          effort: { type: "string", enum: ["trivial", "easy", "moderate", "significant"] },
          timelineDays: { type: "number" },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        },
        required: ["action", "savingsEurRange", "effort", "timelineDays", "priority"],
      },
    },
    analysisConfidence: { type: "number" },
  },
  required: [
    "vendor", "contractValue", "licensedSeats", "activeSeats", "orphanSeats",
    "utilizationRate", "wasteBreakdown", "urgencyLevel", "recommendations", "analysisConfidence",
  ],
};

// ── Execute Agent ───────────────────────────────────

export async function executeAnalyst(
  contractData: ContractData,
  orphanReport: OrphanReport | null,
  locale: "en" | "fr" | "de" = "fr",
): Promise<{ data: WasteAnalysis; phase: AgentPhaseResult }> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const phase: AgentPhaseResult = {
    agentId: "analyst",
    status: "running",
    startedAt: new Date(),
  };

  // Build usage context from orphan report
  const usageContext = orphanReport
    ? `
DONNÉES D'UTILISATION RÉELLE (source: croisement IAM × SaaS):
- Total licences SaaS actives: ${orphanReport.totalSaaSLicenses}
- Utilisateurs IAM actifs: ${orphanReport.totalIAMUsers - orphanReport.deactivatedUsers}
- Utilisateurs désactivés dans IAM: ${orphanReport.deactivatedUsers}
- Licences orphelines détectées: ${orphanReport.orphanLicenses.length}
- Gaspillage orphelins estimé: ${orphanReport.totalAnnualWasteEur[0].toLocaleString()}-${orphanReport.totalAnnualWasteEur[1].toLocaleString()} EUR/an
- Top orphelins: ${orphanReport.orphanLicenses.slice(0, 5).map(
        (o) => `${o.displayName} (${o.vendor} ${o.licenseType}, ${o.monthlyCostEur} EUR/mois, inactif ${o.daysSinceDeactivation}j)`
      ).join("; ")}
`
    : `
DONNÉES D'UTILISATION: Non disponibles (pas de connecteur IAM).
Utilise les benchmarks industrie pour estimer le taux de gaspillage:
- CRM: 20% waste rate moyen
- Collaboration: 15%
- Analytics: 35%
- AI Tools: 28%
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "waste_analysis",
            strict: true,
            schema: WASTE_ANALYSIS_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: ANALYST_SYSTEM_PROMPT },
          {
            role: "user",
            content: `DONNÉES CONTRACTUELLES (source: extraction automatique du contrat):
${JSON.stringify(contractData, null, 2)}

${usageContext}

DATE ACTUELLE: ${new Date().toISOString().split("T")[0]}

Analyse le gaspillage financier exact. Calcule:
1. Le gap utilisation vs licences
2. Le breakdown financier par catégorie de gaspillage
3. L'urgence (jours avant renewal/deadline)
4. Les recommandations actionnables classées par impact EUR
Langue: ${locale}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) throw new Error("Empty response from OpenAI");

    const data: WasteAnalysis = JSON.parse(content);

    // Cap confidence at 85 (doctrine)
    data.analysisConfidence = Math.min(data.analysisConfidence, 85);

    phase.status = "completed";
    phase.completedAt = new Date();
    phase.executionMs = Date.now() - start;
    phase.output = data;
    phase.tokensUsed = result.usage?.total_tokens || 0;

    return { data, phase };
  } catch (err) {
    phase.status = "failed";
    phase.completedAt = new Date();
    phase.executionMs = Date.now() - start;
    phase.error = err instanceof Error ? err.message : "Unknown error";
    throw err;
  }
}
