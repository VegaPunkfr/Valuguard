/**
 * GHOST TAX — MULTILINGUAL COPYWRITER ENGINE (SERVER-ONLY)
 *
 * International Sniper module: Generate culturally-adapted outreach emails.
 *
 * Cultural Router:
 *   US → ROI-aggressive, urgency-driven, "money left on the table"
 *   DE → Precision, compliance, Ordnung, risk quantification
 *   NL → Direct, no-bullshit, pragmatic, "just the facts"
 *   FR → Professionnel, structured argument, institutional credibility
 *
 * Uses gpt-4o-mini (temperature 0.3) via fetchWithRetry.
 * Output is always in the target language.
 */

import { fetchWithRetry } from "@/lib/network/fetch-retry";
import type { ShadowBillResult, DetectedSaas } from "./shadow-bill-engine";
import type { CFOTarget } from "./enrichment";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export type GeoMarket = "US" | "DE" | "NL" | "FR" | "EU";

export interface CopywriterInput {
  target: CFOTarget;
  shadowBill: ShadowBillResult;
  market: GeoMarket;
  companyName?: string;
}

export interface CopywriterOutput {
  subject: string;
  body: string;                    // Plain text email body
  htmlBody: string;                // HTML email body
  language: string;                // "en" | "de" | "nl" | "fr"
  market: GeoMarket;
  tonality: string;                // Description of the cultural approach
  generatedAt: string;
  modelUsed: string;
  executionMs: number;
}

// ══════════════════════════════════════════════════════
//  CULTURAL ROUTER — Prompts per market
// ══════════════════════════════════════════════════════

const CULTURAL_PROFILES: Record<GeoMarket, {
  language: string;
  languageCode: string;
  tonality: string;
  systemPrompt: string;
}> = {
  US: {
    language: "English",
    languageCode: "en",
    tonality: "ROI-aggressive, urgency-driven, dollar-focused",
    systemPrompt: `You are a senior B2B sales copywriter targeting American CFOs.
Style: Direct, ROI-focused, urgency-driven. Lead with the money.
Tone: Confident but not pushy. Use "money left on the table" framing.
Format: Short paragraphs, bold numbers, clear CTA.
Write in American English. Use USD equivalents if helpful (1 EUR ≈ 1.08 USD).
Never use emojis. Never use "Dear". Start with first name only.`,
  },
  DE: {
    language: "German",
    languageCode: "de",
    tonality: "Präzision, Compliance, Risikoquantifizierung",
    systemPrompt: `Du bist ein Senior B2B-Copywriter, der deutsche CFOs und Finanzvorstände anspricht.
Stil: Präzise, datengetrieben, compliance-orientiert. Betone Risikoquantifizierung.
Ton: Professionell, sachlich, respektvoll. Verwende "Sie" (formal).
Format: Strukturierte Absätze, exakte Zahlen, klare Handlungsaufforderung.
Schreibe auf Deutsch. Verwende EUR.
Keine Emojis. Keine übertriebene Dringlichkeit. Fakten sprechen lassen.
Betone DORA, GDPR/DSGVO, SOC2 Compliance-Risiken wo relevant.`,
  },
  NL: {
    language: "Dutch",
    languageCode: "nl",
    tonality: "Direct, no-nonsense, pragmatisch",
    systemPrompt: `Je bent een senior B2B-copywriter die Nederlandse CFOs aanspreekt.
Stijl: Direct, pragmatisch, geen onzin. Kom meteen ter zake.
Toon: Informeel-professioneel, "je/u" (formeel). Geen overdreven beloften.
Format: Kort, bondig, concrete cijfers, duidelijke CTA.
Schrijf in het Nederlands. Gebruik EUR.
Geen emojis. Geen sales-jargon. Gewoon de feiten.`,
  },
  FR: {
    language: "French",
    languageCode: "fr",
    tonality: "Professionnel, argumenté, crédibilité institutionnelle",
    systemPrompt: `Tu es un copywriter B2B senior ciblant les CFO et Directeurs Financiers français.
Style: Professionnel, structuré, crédible. Argument > émotion. Chiffres > promesses.
Ton: Vouvoiement obligatoire. Registre soutenu mais accessible. Pas de tutoiement.
Format: Paragraphes structurés, chiffres précis, CTA institutionnel.
Rédige en français. Utilise EUR.
Pas d'emojis. Pas de familiarité. Crédibilité avant tout.
Mentionne les risques compliance (RGPD, DORA, AI Act) si pertinent.`,
  },
  EU: {
    language: "English",
    languageCode: "en",
    tonality: "Professional, data-driven, compliance-aware",
    systemPrompt: `You are a senior B2B sales copywriter targeting European CFOs.
Style: Professional, data-driven, compliance-aware. Balance between US directness and EU formality.
Tone: Respectful, structured, evidence-based.
Format: Clear paragraphs, precise numbers, institutional CTA.
Write in English. Use EUR.
No emojis. Reference EU compliance frameworks (GDPR, DORA, AI Act) where relevant.`,
  },
};

// ══════════════════════════════════════════════════════
//  GEO DETECTION — Domain TLD → Market
// ══════════════════════════════════════════════════════

export function detectMarket(domain: string): GeoMarket {
  const tld = domain.split(".").pop()?.toLowerCase() || "";
  if (tld === "com" || tld === "us" || tld === "io") return "US";
  if (tld === "de" || tld === "at" || tld === "ch") return "DE";
  if (tld === "nl" || tld === "be") return "NL";
  if (tld === "fr") return "FR";
  return "EU"; // Default for .eu, .co, .org, etc.
}

// ══════════════════════════════════════════════════════
//  MAIN: Generate culturally-adapted outreach email
// ══════════════════════════════════════════════════════

export async function generateOutreachEmail(
  input: CopywriterInput,
): Promise<CopywriterOutput | null> {
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[Copywriter] OPENAI_API_KEY not configured");
    return null;
  }

  const profile = CULTURAL_PROFILES[input.market];
  const { target, shadowBill } = input;
  const companyName = input.companyName || shadowBill.domain;

  // Build the data brief for the LLM
  const topVendors = shadowBill.detectedSaas.slice(0, 5)
    .map((v: DetectedSaas) => `${v.name} (~${v.estimatedAnnualEur.toLocaleString()} EUR/yr)`)
    .join(", ");

  const overlapSummary = shadowBill.overlaps
    .map((o) => `${o.vendors.join(" + ")} (${o.group}): ~${o.wasteEur.toLocaleString()} EUR waste`)
    .join("; ");

  const userPrompt = `Generate a cold outreach email for the following prospect.

TARGET:
- Name: ${target.fullName}
- Title: ${target.title}
- Company: ${companyName} (${shadowBill.domain})

INTELLIGENCE (from public Certificate Transparency logs — no access required):
- SaaS vendors detected: ${shadowBill.detectedSaas.length}
- Top vendors: ${topVendors || "None detected"}
- Estimated annual SaaS spend: ${shadowBill.totalEstimatedSpendEur.toLocaleString()} EUR
- Estimated annual waste: ${shadowBill.estimatedWasteEur.toLocaleString()} EUR (${Math.round(shadowBill.estimatedWasteEur / Math.max(1, shadowBill.totalEstimatedSpendEur) * 100)}%)
- Daily hemorrhage: ${shadowBill.dailyHemorrhageEur.toLocaleString()} EUR/day
- Overlaps detected: ${overlapSummary || "None"}
- Confidence: ${shadowBill.confidence}/100

RULES:
1. Write the ENTIRE email in ${profile.language}.
2. Subject line must be compelling and personalized (include company name or a specific vendor).
3. Open with the most shocking financial finding.
4. Reference 2-3 specific vendors by name (proves we did real research).
5. End with a single, clear CTA: link to their personalized audit page.
6. Keep under 200 words.
7. Sign from "Ghost Tax Intelligence" (not a person's name).
8. URL for CTA: https://ghost-tax.com/shadow-audit/${shadowBill.domain}

Return a JSON object with exactly these keys: "subject" (string), "body" (plain text), "htmlBody" (HTML with inline styles, dark: #0F172A bg, white text, enterprise aesthetic).`;

  try {
    const resp = await fetchWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 1500,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: profile.systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      },
      {
        retries: 2,
        timeoutMs: 30000,
        onRetry: (attempt, status, delay) => {
          console.warn(`[Copywriter] OpenAI retry ${attempt} (status=${status}, delay=${Math.round(delay)}ms)`);
        },
      },
    );

    if (!resp.ok) {
      console.error(`[Copywriter] OpenAI returned ${resp.status}`);
      return null;
    }

    const data = await resp.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      subject?: string;
      body?: string;
      htmlBody?: string;
    };

    if (!parsed.subject || !parsed.body) return null;

    return {
      subject: parsed.subject,
      body: parsed.body,
      htmlBody: parsed.htmlBody || `<pre style="font-family:monospace;color:#fff;background:#0F172A;padding:24px">${escapeHtml(parsed.body)}</pre>`,
      language: profile.languageCode,
      market: input.market,
      tonality: profile.tonality,
      generatedAt: new Date().toISOString(),
      modelUsed: "gpt-4o-mini",
      executionMs: Date.now() - start,
    };
  } catch (err) {
    console.error("[Copywriter] Error:", err instanceof Error ? err.message : err);
    return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
