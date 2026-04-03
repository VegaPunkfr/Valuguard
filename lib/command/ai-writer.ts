/**
 * GHOST TAX — AI MESSAGE WRITER
 *
 * Generates truly personalized outreach messages using Claude Haiku.
 * Each message passes through 6 intelligence layers before generation.
 *
 * Cost: ~€0.0005 per message (~€0.15/month at 10 messages/day)
 */

import { detectCulturalProfile, getProfileForPrompt } from "./cultural-profiles";
import { getRoleProfile, getRoleForPrompt } from "./role-profiles";
import { detectCompanyStage, getStageForPrompt } from "./company-intel";
import { detectTimingSignal, getTimingForPrompt } from "./timing-signals";

// ── Types ──────────────────────────────────────────

export interface ProspectData {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  domain: string;
  country: string;
  headcount?: number;
  industry?: string;
  linkedinUrl?: string;
  signals?: string[];          // From Apollo/OSINT: "funding", "hiring_IT", etc.
  fundingRound?: string;       // "Series B", "Series C", etc.
  fundingDate?: string;        // ISO date
}

export interface ScanData {
  exposureLow: number;
  exposureHigh: number;
  dailyLoss: number;
  confidence: number;
  signals: Array<{
    label: string;
    impactLow: number;
    impactHigh: number;
    evidenceClass: "observed" | "inferred" | "estimated";
  }>;
  vendorsDetected?: string[];
  percentile?: number;          // vs industry peers
}

export interface MessageRequest {
  prospect: ProspectData;
  scan: ScanData;
  channel: "linkedin_dm" | "email" | "email_followup";
  sequenceStep: "M1" | "M2" | "M3" | "M4" | "M5";
  daysSinceLastContact?: number;
  previousMessageSummary?: string;
}

export interface GeneratedMessage {
  subject?: string;             // Email only
  body: string;
  language: string;
  wordCount: number;
  channel: string;
  sequenceStep: string;
  confidenceScore: number;      // 0-100 based on data quality
  metadata: {
    culturalProfile: string;
    roleProfile: string;
    companyStage: string;
    timingSignal: string;
    priceShown: number;
  };
}

// ── Core Writer ────────────────────────────────────

export async function generatePersonalizedMessage(
  request: MessageRequest
): Promise<GeneratedMessage> {
  const { prospect, scan, channel, sequenceStep, daysSinceLastContact } = request;

  // Layer 1: Company Intelligence
  const companyStage = detectCompanyStage(prospect);

  // Layer 2: Role Intelligence
  const roleProfile = getRoleProfile(prospect.title);

  // Layer 3: Timing Intelligence
  const timingSignal = detectTimingSignal(prospect);

  // Layer 4: Cultural Intelligence
  const culturalProfile = detectCulturalProfile(
    prospect.country,
    prospect.headcount,
    prospect.industry,
  );

  // Price based on country
  const price = ["DE", "AT", "CH"].includes(prospect.country.toUpperCase()) ? 590 : 490;

  // Channel-specific rules
  const channelRules = getChannelRules(channel, sequenceStep, culturalProfile.maxWords);

  // Build the cost-of-delay for follow-ups
  const costSinceLastContact = daysSinceLastContact
    ? Math.round(scan.dailyLoss * daysSinceLastContact)
    : null;

  // ── Build the 6-layer prompt ──
  const prompt = buildPrompt({
    prospect,
    scan,
    companyStage: getStageForPrompt(companyStage),
    roleProfile: getRoleForPrompt(roleProfile),
    timingSignal: getTimingForPrompt(timingSignal),
    culturalProfile: getProfileForPrompt(culturalProfile),
    channelRules,
    price,
    sequenceStep,
    costSinceLastContact,
    previousMessageSummary: request.previousMessageSummary,
  });

  // ── Call Claude Haiku ──
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const rawMessage = data.content?.[0]?.text || "";

  // Parse subject line for emails
  let subject: string | undefined;
  let body = rawMessage.trim();

  if (channel === "email" || channel === "email_followup") {
    const subjectMatch = body.match(/^(?:Subject|Betreff|Objet)\s*:\s*(.+)\n/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      body = body.replace(subjectMatch[0], "").trim();
    } else {
      // Generate subject from domain + daily loss
      subject = culturalProfile.language === "de"
        ? `${prospect.domain} — ${scan.dailyLoss.toLocaleString("de-DE")} €/Tag`
        : `${prospect.domain} — €${scan.dailyLoss.toLocaleString("en-US")}/day`;
    }
  }

  // Calculate confidence based on data quality
  const confidenceScore = calculateMessageConfidence(scan, prospect);

  return {
    subject,
    body,
    language: culturalProfile.language,
    wordCount: body.split(/\s+/).length,
    channel,
    sequenceStep,
    confidenceScore,
    metadata: {
      culturalProfile: `${prospect.country}_${culturalProfile.formality}`,
      roleProfile: roleProfile.role,
      companyStage: companyStage.stage,
      timingSignal: timingSignal.signal,
      priceShown: price,
    },
  };
}

// ── Generate full sequence (M1-M5) ─────────────────

export async function generateFullSequence(
  prospect: ProspectData,
  scan: ScanData,
  primaryChannel: "linkedin_dm" | "email",
): Promise<GeneratedMessage[]> {
  const messages: GeneratedMessage[] = [];

  // M1: First contact on primary channel
  messages.push(await generatePersonalizedMessage({
    prospect, scan, channel: primaryChannel, sequenceStep: "M1",
  }));

  // M2: First contact on alt channel
  const altChannel = primaryChannel === "linkedin_dm" ? "email" : "linkedin_dm";
  messages.push(await generatePersonalizedMessage({
    prospect, scan, channel: altChannel as any, sequenceStep: "M2",
  }));

  // M3: Follow-up J+3 (email, cost-of-delay)
  messages.push(await generatePersonalizedMessage({
    prospect, scan, channel: "email_followup", sequenceStep: "M3",
    daysSinceLastContact: 3,
    previousMessageSummary: `Initial outreach sent: exposure ${scan.exposureLow}-${scan.exposureHigh} EUR`,
  }));

  // M4: Re-angle J+7 (primary channel, different angle)
  messages.push(await generatePersonalizedMessage({
    prospect, scan, channel: primaryChannel, sequenceStep: "M4",
    daysSinceLastContact: 7,
    previousMessageSummary: `Two messages sent, no response. Try peer benchmark angle.`,
  }));

  // M5: Breakup J+14 (email)
  messages.push(await generatePersonalizedMessage({
    prospect, scan, channel: "email_followup", sequenceStep: "M5",
    daysSinceLastContact: 14,
    previousMessageSummary: `Three messages sent, no response. Final respectful breakup.`,
  }));

  return messages;
}

// ── Prompt Builder ─────────────────────────────────

interface PromptContext {
  prospect: ProspectData;
  scan: ScanData;
  companyStage: string;
  roleProfile: string;
  timingSignal: string;
  culturalProfile: string;
  channelRules: string;
  price: number;
  sequenceStep: string;
  costSinceLastContact: number | null;
  previousMessageSummary?: string;
}

function buildPrompt(ctx: PromptContext): string {
  const { prospect, scan, sequenceStep, costSinceLastContact } = ctx;

  const signalsFormatted = scan.signals.slice(0, 3).map((s, i) =>
    `  ${i + 1}. ${s.label} (${s.impactLow.toLocaleString()}-${s.impactHigh.toLocaleString()} EUR/an) — ${s.evidenceClass}`
  ).join("\n");

  let sequenceInstructions = "";
  if (sequenceStep === "M1") {
    sequenceInstructions = "This is the FIRST contact. Lead with the most shocking finding. Create the 'how does she know this?' moment.";
  } else if (sequenceStep === "M3" && costSinceLastContact) {
    sequenceInstructions = `This is a FOLLOW-UP (J+3). The prospect hasn't replied. Lead with: "${costSinceLastContact.toLocaleString()} EUR lost since last contact." Make the cost of inaction VISCERAL.`;
  } else if (sequenceStep === "M4") {
    sequenceInstructions = "This is a RE-ANGLE (J+7). Use a DIFFERENT angle: peer comparison. 'Companies like yours in your industry typically...' Don't repeat findings from M1.";
  } else if (sequenceStep === "M5") {
    sequenceInstructions = "This is the BREAKUP message (J+14). Respectful, short, final. Offer the free scan link as a parting gift. 'No further contact from me.' Dignity, not desperation.";
  } else if (sequenceStep === "M2") {
    sequenceInstructions = "This is an ALT CHANNEL version. Same prospect, different framing. If M1 was LinkedIn (short), this is email (more detail). If M1 was email, this is LinkedIn (condensed).";
  }

  return `You are Edith, founder of Ghost Tax. You're writing a personal message to a prospect whose company you've analyzed. You are NOT a salesperson. You are an expert who found something in their data and shares it. Your tone: direct, factual, founder-to-executive.

═══ COMPANY INTELLIGENCE ═══
Company: ${prospect.company} (${prospect.domain})
Headcount: ${prospect.headcount || "unknown"} · Industry: ${prospect.industry || "tech"}
${ctx.companyStage}

═══ CONTACT ═══
Name: ${prospect.firstName} ${prospect.lastName}
Title: ${prospect.title}
${ctx.roleProfile}

═══ SCAN RESULTS (${prospect.domain}) ═══
Exposure: ${scan.exposureLow.toLocaleString()}-${scan.exposureHigh.toLocaleString()} EUR/year
Daily loss: ${scan.dailyLoss.toLocaleString()} EUR/day
Confidence: ${scan.confidence}/100
${scan.percentile ? `Position: ${scan.percentile}th percentile vs industry peers` : ""}
Signals (ranked by impact):
${signalsFormatted}
${scan.vendorsDetected?.length ? `Vendors detected: ${scan.vendorsDetected.join(", ")}` : ""}

═══ TIMING ═══
${ctx.timingSignal}

═══ CULTURAL RULES ═══
${ctx.culturalProfile}

═══ CHANNEL & FORMAT ═══
${ctx.channelRules}
Price to show: ${ctx.price} EUR
Link: ghost-tax.com/intel?domain=${prospect.domain}

═══ SEQUENCE STEP: ${sequenceStep} ═══
${sequenceInstructions}
${ctx.previousMessageSummary ? `Previous context: ${ctx.previousMessageSummary}` : ""}
${costSinceLastContact ? `Cost accumulated since last contact: ${costSinceLastContact.toLocaleString()} EUR` : ""}

═══ ABSOLUTE RULES ═══
1. First line = the most SPECIFIC fact about THEIR company (not a greeting)
2. Every sentence must FAIL the interchangeability test: if you can replace the company name and it still works, the sentence is too generic — rewrite it
3. Include 2-3 SPECIFIC findings from the scan (not generic claims)
4. ONE link only (either free scan or report purchase)
5. Sign off as just "Edith" (nothing else)
6. For email: start with "Subject:" or "Betreff:" or "Objet:" line
7. NEVER: "I hope this finds you well", "In today's landscape", "Our platform", "Book a call", "I'd love to", "solution", "innovative"
8. DO NOT mention Ghost Tax before mentioning the prospect's data`;
}

// ── Channel Rules ──────────────────────────────────

function getChannelRules(
  channel: string,
  step: string,
  maxWords: { linkedin: number; email: number },
): string {
  if (channel === "linkedin_dm") {
    return `Channel: LinkedIn DM
Max words: ${maxWords.linkedin}
Format: No subject line. Start directly with the hook. Short paragraphs. No bullet points longer than one line.
Constraint: LinkedIn truncates at ~300 chars in preview — the first sentence MUST contain a specific finding.`;
  }

  if (channel === "email_followup") {
    return `Channel: Email follow-up
Max words: ${Math.round(maxWords.email * 0.7)}
Format: Start with "Subject:" line. The subject MUST contain the prospect's domain and a number. Body is SHORTER than the initial email. More direct, more urgent.
${step === "M5" ? "This is the LAST email. Keep it under 60 words. Respectful goodbye + free scan link." : ""}`;
  }

  return `Channel: Email
Max words: ${maxWords.email}
Format: Start with "Subject:" line. The subject MUST contain the prospect's domain and a specific number (daily loss or exposure range). Body can use → arrows for findings. End with link + price + "48h".`;
}

// ── Confidence Calculator ──────────────────────────

function calculateMessageConfidence(scan: ScanData, prospect: ProspectData): number {
  let score = 0;

  // Scan quality (0-40)
  if (scan.confidence >= 70) score += 40;
  else if (scan.confidence >= 50) score += 30;
  else if (scan.confidence >= 30) score += 15;

  // Signal count (0-20)
  score += Math.min(scan.signals.length * 5, 20);

  // Prospect data completeness (0-20)
  if (prospect.firstName && prospect.lastName) score += 5;
  if (prospect.title) score += 5;
  if (prospect.headcount) score += 5;
  if (prospect.industry) score += 5;

  // Timing signals (0-20)
  if (prospect.signals?.length) {
    score += Math.min(prospect.signals.length * 5, 20);
  }

  return Math.min(score, 100);
}
