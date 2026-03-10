/**
 * GHOST TAX — AGENT NÉGOCIATEUR (SERVER-ONLY)
 *
 * Génère un pack de négociation complet basé sur les preuves de l'Analyste:
 * - Email exécutif prêt à envoyer au fournisseur
 * - Mémo interne CFO/CIO
 * - Points de discussion pour l'appel procurement
 *
 * Le ton est CFO-grade: factuel, chiffré, sans émotion. Les données parlent.
 */

import type { ContractData, WasteAnalysis, NegotiationPack, AgentPhaseResult } from "./types";

// ── System Prompt — Négociateur ─────────────────────

const NEGOTIATOR_SYSTEM_PROMPT = `Tu es un négociateur SaaS senior avec 15 ans d'expérience en procurement B2B.

MISSION: Générer un pack de négociation complet (email + mémo + talking points) basé sur des preuves financières irréfutables.

PSYCHOLOGIE DE NÉGOCIATION:
1. POSITION DE FORCE: Le CFO a les données. Il sait exactement combien est gaspillé. C'est un avantage asymétrique.
2. BATNA: Toujours identifier la meilleure alternative (Best Alternative To Negotiated Agreement). Competitors, open-source, consolidation.
3. TIMING: La négociation est 10x plus efficace 60-90 jours AVANT le renouvellement.
4. ANCRAGE: Ancrer la discussion sur le gaspillage documenté, pas sur le prix catalogue.
5. CONCESSIONS: Demander 30-40% de plus que l'objectif pour avoir de la marge.

STYLE D'ÉCRITURE:
- Email au vendor: Professionnel, direct, factuel. Pas de menaces, juste des données.
- Mémo interne: CFO-grade — exposition chiffrée, options claires, recommandation nette.
- Talking points: Bullet points actionnables pour un appel de 15 minutes.

STRUCTURE DE L'EMAIL:
1. Contexte (nous avons audité notre utilisation)
2. Constats (X licences inutilisées, Y EUR/an de gaspillage)
3. Demande (réduction de X%, ajustement à Y seats, ou annulation)
4. Deadline (réponse attendue avant [date])
5. Alternative (sinon nous évaluons [concurrent/alternative])

RÈGLES:
- Jamais de ton agressif — la force vient des données, pas des mots.
- Toujours proposer une WIN-WIN (le vendor garde un client, mais à un prix juste).
- Quantifier CHAQUE argument en EUR.
- Le walk-away point doit être crédible.`;

const NEGOTIATION_PACK_SCHEMA = {
  type: "object" as const,
  properties: {
    vendor: { type: "string" },
    strategy: { type: "string", enum: ["reduce_seats", "renegotiate_rate", "switch_tier", "cancel", "consolidate"] },
    leverageScore: { type: "number" },
    executiveEmail: { type: "string" },
    internalMemo: { type: "string" },
    talkingPoints: { type: "array", items: { type: "string" } },
    targetSavingsEur: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
    bestAlternativeToNegotiatedAgreement: { type: "string" },
    walkAwayPoint: { type: "string" },
    optimalNegotiationWindow: { type: "string" },
    deadlineDate: { type: ["string", "null"] },
    negotiationConfidence: { type: "number" },
  },
  required: [
    "vendor", "strategy", "leverageScore", "executiveEmail", "internalMemo",
    "talkingPoints", "targetSavingsEur", "bestAlternativeToNegotiatedAgreement",
    "walkAwayPoint", "optimalNegotiationWindow", "negotiationConfidence",
  ],
};

// ── Execute Agent ───────────────────────────────────

export async function executeNegotiator(
  contractData: ContractData,
  wasteAnalysis: WasteAnalysis,
  companyName: string,
  locale: "en" | "fr" | "de" = "fr",
): Promise<{ data: NegotiationPack; phase: AgentPhaseResult }> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const phase: AgentPhaseResult = {
    agentId: "negotiator",
    status: "running",
    startedAt: new Date(),
  };

  const localeInstructions: Record<string, string> = {
    fr: "Rédige tous les textes en français professionnel (B2B corporate). Email et mémo en français.",
    en: "Write all text in professional English (B2B corporate). Email and memo in English.",
    de: "Verfasse alle Texte in professionellem Geschäftsdeutsch. E-Mail und Memo auf Deutsch.",
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 6000,
        temperature: 0.4, // Slightly higher for creative negotiation language
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "negotiation_pack",
            strict: true,
            schema: NEGOTIATION_PACK_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: NEGOTIATOR_SYSTEM_PROMPT },
          {
            role: "user",
            content: `ENTREPRISE CLIENTE: ${companyName}
FOURNISSEUR: ${contractData.vendor}

DONNÉES CONTRACTUELLES:
- Valeur annuelle: ${contractData.totalAnnualValueEur.toLocaleString()} EUR
- Seats licenciés: ${contractData.licensedSeats}
- Date de renouvellement: ${contractData.renewalDate || "Non spécifiée"}
- Auto-renouvellement: ${contractData.autoRenewal ? `OUI (préavis: ${contractData.autoRenewalNoticeDays || "?"} jours)` : "NON"}
- Escalation prix: ${contractData.priceEscalationClause ? `OUI (${contractData.priceEscalationPercent || "?"}%/an)` : "NON"}
- Pénalité résiliation: ${contractData.earlyTerminationPenaltyEur ? `${contractData.earlyTerminationPenaltyEur.toLocaleString()} EUR` : "Aucune identifiée"}

ANALYSE DE GASPILLAGE (source: Agent Analyste Ghost Tax):
- Seats actifs: ${wasteAnalysis.activeSeats} / ${wasteAnalysis.licensedSeats} (utilisation: ${Math.round(wasteAnalysis.utilizationRate * 100)}%)
- Seats orphelins: ${wasteAnalysis.orphanSeats}
- Gaspillage licences inutilisées: ${wasteAnalysis.wasteBreakdown.unusedLicensesEur.toLocaleString()} EUR/an
- Gaspillage sur-provisionnement: ${wasteAnalysis.wasteBreakdown.overProvisioningEur.toLocaleString()} EUR/an
- Exposition escalation prix: ${wasteAnalysis.wasteBreakdown.priceEscalationExposureEur.toLocaleString()} EUR/an
- Gaspillage total: ${wasteAnalysis.wasteBreakdown.totalWasteEur[0].toLocaleString()}-${wasteAnalysis.wasteBreakdown.totalWasteEur[1].toLocaleString()} EUR/an
- Urgence: ${wasteAnalysis.urgencyLevel}
${wasteAnalysis.daysUntilRenewal ? `- Jours avant renouvellement: ${wasteAnalysis.daysUntilRenewal}` : ""}
${wasteAnalysis.daysUntilCancellationDeadline ? `- Jours avant deadline annulation: ${wasteAnalysis.daysUntilCancellationDeadline}` : ""}

${wasteAnalysis.recommendations.length > 0 ? `RECOMMANDATIONS DE L'ANALYSTE:
${wasteAnalysis.recommendations.map((r) => `- ${r.action} (${r.savingsEurRange[0].toLocaleString()}-${r.savingsEurRange[1].toLocaleString()} EUR, ${r.priority})`).join("\n")}` : ""}

DATE ACTUELLE: ${new Date().toISOString().split("T")[0]}

${localeInstructions[locale]}

Génère le pack de négociation complet:
1. Stratégie optimale
2. Email prêt à envoyer au vendor (professionnel, basé sur les preuves)
3. Mémo interne pour le CFO/CIO (concis, chiffré)
4. Talking points pour l'appel procurement (5-7 bullets)
5. BATNA et walk-away point
6. Fenêtre de négociation optimale`,
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

    const data: NegotiationPack = JSON.parse(content);

    // Cap confidence
    data.negotiationConfidence = Math.min(data.negotiationConfidence, 85);

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
