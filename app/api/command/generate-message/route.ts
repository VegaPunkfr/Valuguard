/**
 * GHOST TAX — AI MESSAGE GENERATOR (Server-Side)
 *
 * POST /api/command/generate-message
 *
 * Generates a personalized outreach message using Claude Haiku, then
 * runs the Quality Gate (4 layers) before returning the draft.
 *
 * Body: {
 *   prospect: { firstName, lastName, title, company, domain, country, headcount?, industry?, signals? }
 *   scan?: { exposureLow, exposureHigh, dailyLoss, confidence, signals: [...] }
 *   channel: "email" | "linkedin_dm"
 *   sequenceStep: "M1" | "M2" | "M3" | "M4" | "M5"
 *   daysSinceLastContact?: number
 *   useForgeStack?: boolean  // forge-driven regen hint (informatif)
 * }
 *
 * Returns: {
 *   subject?, body, language, wordCount, confidenceScore, channel, sequenceStep, price,
 *   gateResult: string (legacy, dérivé de gate.decision),
 *   gate: { decision, scores, hardBlockers, regenerateHints, auditLog }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  detectLanguage,
  detectTone,
  getPrice,
  getPriceLabel,
  getSignalAngle,
  pickSignalAngle,
  type SignalLang,
} from '@/lib/outreach/culture-rules';
import { qualityGate, type GateResult } from '@/lib/outreach/quality-gate';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ── Main handler ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { prospect, scan, channel, sequenceStep, daysSinceLastContact, useForgeStack } = body;

    if (!prospect?.firstName || !prospect?.company || !prospect?.domain) {
      return NextResponse.json({ error: 'Missing prospect data' }, { status: 400 });
    }

    const language = detectLanguage(prospect.country);
    const tone = detectTone(prospect.country, prospect.headcount, prospect.industry);
    const price = getPrice(prospect.country);
    const priceLabel = getPriceLabel(prospect.country);
    const maxWords = channel === 'linkedin_dm' ? 120 : 180;

    // Langue ISO utilisée pour signal angles (en/de/fr/nl)
    const langCode: SignalLang =
      language === 'German' ? 'de' : language === 'French' ? 'fr' : prospect.country === 'NL' || prospect.country === 'BE' ? 'nl' : 'en';

    // Build signals text
    const signalsText = scan?.signals?.slice(0, 3).map((s: any, i: number) =>
      `  ${i + 1}. ${s.label} (${s.impactLow?.toLocaleString()}-${s.impactHigh?.toLocaleString()} EUR/yr) — ${s.evidenceClass}`
    ).join('\n') || '  No specific signals available';

    // ── FORGE STACK (J2) — signal-first opener injection ──
    // Si useForgeStack=true, on sélectionne un angle signal et on pré-rédige
    // l'opener + la consequence dans la langue cible. Haiku doit les REUTILISER
    // tels quels, pas les reformuler.
    let forgeBlock = '';
    if (useForgeStack === true) {
      const primarySignal: string | undefined = scan?.signals?.[0]?.label;
      const allSignalLabels: string[] = (scan?.signals || []).map((s: any) => s?.label || '').filter(Boolean);
      const angleType = pickSignalAngle(primarySignal, allSignalLabels);
      // variant dérivé du sequenceStep pour rotation (M1→0, M3→1, M4→2)
      const variantMap: Record<string, number> = { M1: 0, M2: 0, M3: 1, M4: 2, M5: 0 };
      const variant = variantMap[sequenceStep as string] ?? 0;
      const angle = getSignalAngle(angleType, langCode, variant);

      // Interpolation simple ${co} ${industry} ${expShort} ${priceLabel}
      const expShort = scan?.exposureHigh
        ? `€${Math.round((scan.exposureHigh || 0) / 1000)}K`
        : '€100K+';
      const interpolate = (t: string): string =>
        t
          .replace(/\$\{co\}/g, prospect.company)
          .replace(/\$\{industry\}/g, prospect.industry || 'tech')
          .replace(/\$\{expShort\}/g, expShort)
          .replace(/\$\{priceLabel\}/g, priceLabel);

      const opener = interpolate(angle.opener);
      const consequence = interpolate(angle.consequence);
      const cta = interpolate(angle.cta);

      forgeBlock = `\nFORGE STACK ACTIVE (signal-first):
ANGLE DETECTED: ${angle.label} (${angleType})
OPENER (REUSE VERBATIM as sentence 1): "${opener}"
CONSEQUENCE (REUSE VERBATIM as sentence 2-3, adjust minor grammar only): "${consequence}"
CTA (REUSE VERBATIM before signoff): "${cta}"

HARD CONSTRAINT: the generated message MUST start with the OPENER text above, word for word. Do NOT paraphrase, do NOT translate, do NOT add a greeting before it.
`;
    }

    // Sequence-specific instructions
    let seqInstructions = '';
    if (sequenceStep === 'M1') {
      seqInstructions = 'FIRST CONTACT. Lead with the most shocking finding. Create the "how does she know this?" moment.';
    } else if (sequenceStep === 'M3' && daysSinceLastContact) {
      const costSince = Math.round((scan?.dailyLoss || 500) * daysSinceLastContact);
      seqInstructions = `FOLLOW-UP J+${daysSinceLastContact}. Lead with "${costSince.toLocaleString()} EUR lost since last contact." Cost of inaction.`;
    } else if (sequenceStep === 'M4') {
      seqInstructions = 'RE-ANGLE J+7. Different angle: peer benchmark comparison. Do NOT repeat M1 findings.';
    } else if (sequenceStep === 'M5') {
      seqInstructions = 'BREAKUP J+14. Final respectful message. Free scan link as parting gift. Under 60 words.';
    }

    const prompt = `You are Jean-Étienne, founder of Ghost Tax. You write a personal message to a prospect whose company you analyzed. You are NOT a salesperson — you are an expert sharing findings. Direct, factual, founder-to-executive.

PROSPECT:
Name: ${prospect.firstName} ${prospect.lastName}
Title: ${prospect.title || 'CFO'}
Company: ${prospect.company} (${prospect.domain})
Country: ${prospect.country} · Headcount: ${prospect.headcount || '?'} · Industry: ${prospect.industry || 'tech'}

SCAN RESULTS:
Exposure: ${scan?.exposureLow?.toLocaleString() || '?'}–${scan?.exposureHigh?.toLocaleString() || '?'} EUR/year
Daily loss: ${scan?.dailyLoss?.toLocaleString() || '?'} EUR/day
Confidence: ${scan?.confidence || '?'}/100
Signals:
${signalsText}

LANGUAGE: ${language}
TONE: ${tone}
CHANNEL: ${channel === 'linkedin_dm' ? 'LinkedIn DM' : 'Email'} (max ${maxWords} words)
PRICE: ${price} EUR
LINK: ghost-tax.com/intel?domain=${prospect.domain}

SEQUENCE: ${sequenceStep}
${seqInstructions}
${forgeBlock}
${channel === 'email' || channel === 'email_followup' ? 'Start with "Subject:" or "Betreff:" line. Subject MUST contain the domain and a number.' : 'No subject line. Start directly with the hook.'}

RULES:
1. First line = most SPECIFIC fact about THEIR company (not a greeting)
2. Every sentence must FAIL the interchangeability test — if you swap the company name and it still works, rewrite it
3. 2-3 SPECIFIC findings from the scan
4. ONE link only
5. Sign off as just "Jean-Étienne"
6. NEVER: "I hope this finds you well", "Our platform", "Book a call", "innovative", "solution"
7. Do NOT mention Ghost Tax before mentioning the prospect's data`;

    // Call Claude Haiku
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Claude API: ${err.slice(0, 200)}` }, { status: 502 });
    }

    const data = await res.json();
    const rawMessage: string = data.content?.[0]?.text || '';

    // Parse subject for emails
    let subject: string | undefined;
    let messageBody = rawMessage.trim();

    if (channel === 'email' || channel === 'email_followup') {
      const subjectMatch = messageBody.match(/^(?:Subject|Betreff|Objet)\s*:\s*(.+)\n/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        messageBody = messageBody.replace(subjectMatch[0], '').trim();
      } else {
        subject = language === 'German'
          ? `${prospect.domain} — ${scan?.dailyLoss?.toLocaleString() || '?'} €/Tag`
          : `${prospect.domain} — €${scan?.dailyLoss?.toLocaleString() || '?'}/day`;
      }
    }

    // ── QUALITY GATE — 4 layers blocking ──
    // Note: langCode déjà calculé plus haut (SignalLang : en|de|fr|nl).
    // Quality gate accepte un subset (en|de|fr) — nl tombera dans le fallback 'en' côté gate, comportement accepté.
    const gateLang: 'en' | 'de' | 'fr' = langCode === 'de' ? 'de' : langCode === 'fr' ? 'fr' : 'en';
    const gate: GateResult = qualityGate(
      subject,
      messageBody,
      {
        co: prospect.company,
        lang: gateLang,
        industry: prospect.industry,
        size: prospect.headcount ? String(prospect.headcount) : undefined,
        contact: {
          name: `${prospect.firstName}${prospect.lastName ? ' ' + prospect.lastName : ''}`,
          email: prospect.email,
        },
      },
      'standard',
    );

    // Legacy string for retro-compat (V6 cockpit lit gateResult.startsWith('PASS') à plusieurs endroits)
    const gateResult = gate.decision;

    return NextResponse.json({
      subject,
      body: messageBody,
      language: language.toLowerCase(),
      wordCount: messageBody.split(/\s+/).length,
      confidenceScore: Math.min(
        (scan?.confidence || 50) * 0.4 +
        (prospect.firstName ? 5 : 0) +
        (prospect.title ? 5 : 0) +
        (prospect.headcount ? 5 : 0) +
        (scan?.signals?.length || 0) * 5 +
        (prospect.signals?.length || 0) * 5,
        100,
      ),
      channel,
      sequenceStep,
      price,
      gateResult,
      gate: {
        decision: gate.decision,
        scores: gate.scores,
        hardBlockers: gate.hardBlockers,
        regenerateHints: gate.regenerateHints,
        auditLog: gate.auditLog,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
