/**
 * GHOST TAX — AGENT EXTRACTEUR (SERVER-ONLY)
 *
 * Reçoit un contrat SaaS en PDF (base64), extrait via OpenAI Vision:
 * - Dates de renouvellement
 * - Paliers tarifaires
 * - Clauses d'annulation
 * - Pénalités de résiliation
 * - Engagements minimaux
 *
 * Utilise GPT-4o Vision pour le PDF + structured output JSON.
 */

import type { ContractData, AgentPhaseResult } from "./types";

// ── System Prompt — Extracteur ──────────────────────

const EXTRACTOR_SYSTEM_PROMPT = `Tu es un analyste juridique et financier senior spécialisé dans les contrats SaaS B2B.

MISSION: Extraire avec précision chirurgicale toutes les données financières et contractuelles d'un contrat SaaS.

RÈGLES D'EXTRACTION:
1. DATES: Extrais start_date, end_date, renewal_date en ISO 8601. Si ambigu, indique la date la plus probable.
2. PRIX: Convertis tout en EUR annuel. Si le prix est en USD, applique un taux de 0.92. Si en GBP, 1.16.
3. ESCALATION: Cherche explicitement les clauses de type "annual increase", "CPI adjustment", "price escalation", "rate change".
4. AUTO-RENOUVELLEMENT: Identifie le délai de préavis pour annuler avant renouvellement automatique. C'est la clause la plus critique.
5. PÉNALITÉS: Early termination fees, cancellation penalties, minimum commit gaps.
6. SIÈGES: Licensed seats, minimum commit, overage rates.
7. CONFIANCE: Note ta confiance d'extraction 0-100. Réduis si le document est flou, incomplet, ou si tu interprètes.

FORMAT DE SORTIE: JSON strict conforme au schéma ContractData.
NE JAMAIS inventer de données. Si une information n'est pas dans le document, mets null.
TOUJOURS extraire les clauses clés en texte brut dans keyClausesExtracted.`;

// ── Contract Data JSON Schema for Structured Output ─

const CONTRACT_DATA_SCHEMA = {
  type: "object" as const,
  properties: {
    vendor: { type: "string" },
    contractType: { type: "string", enum: ["subscription", "enterprise", "usage_based", "hybrid"] },
    startDate: { type: "string" },
    endDate: { type: "string" },
    renewalDate: { type: ["string", "null"] },
    autoRenewal: { type: "boolean" },
    autoRenewalNoticeDays: { type: ["number", "null"] },
    totalAnnualValueEur: { type: "number" },
    paymentFrequency: { type: "string", enum: ["monthly", "quarterly", "annual"] },
    pricingTiers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          seatsIncluded: { type: "number" },
          monthlyCostPerSeatEur: { type: "number" },
          features: { type: "array", items: { type: "string" } },
        },
        required: ["name", "seatsIncluded", "monthlyCostPerSeatEur", "features"],
      },
    },
    cancellationNoticeDays: { type: "number" },
    earlyTerminationPenaltyEur: { type: ["number", "null"] },
    earlyTerminationPenaltyPercent: { type: ["number", "null"] },
    priceEscalationClause: { type: "boolean" },
    priceEscalationPercent: { type: ["number", "null"] },
    priceEscalationCap: { type: ["number", "null"] },
    licensedSeats: { type: "number" },
    minimumCommitSeats: { type: ["number", "null"] },
    overageRateEurPerSeat: { type: ["number", "null"] },
    keyClausesExtracted: { type: "array", items: { type: "string" } },
    extractionConfidence: { type: "number" },
  },
  required: [
    "vendor", "contractType", "startDate", "endDate", "autoRenewal",
    "totalAnnualValueEur", "paymentFrequency", "pricingTiers",
    "cancellationNoticeDays", "priceEscalationClause", "licensedSeats",
    "keyClausesExtracted", "extractionConfidence",
  ],
};

// ── Execute Agent ───────────────────────────────────

export async function executeExtractor(
  pdfBase64: string,
  locale: "en" | "fr" | "de" = "fr",
): Promise<{ data: ContractData; phase: AgentPhaseResult }> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const phase: AgentPhaseResult = {
    agentId: "extractor",
    status: "running",
    startedAt: new Date(),
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
        max_tokens: 4096,
        temperature: 0.1, // Low temperature for extraction accuracy
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "contract_data",
            strict: true,
            schema: CONTRACT_DATA_SCHEMA,
          },
        },
        messages: [
          { role: "system", content: EXTRACTOR_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyse ce contrat SaaS et extrais toutes les données financières et contractuelles. Langue de réponse: ${locale}.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                  detail: "high",
                },
              },
            ],
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

    const data: ContractData = JSON.parse(content);

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
