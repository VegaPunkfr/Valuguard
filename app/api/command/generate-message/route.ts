/**
 * GHOST TAX — AI MESSAGE GENERATOR (Server-Side)
 *
 * POST /api/command/generate-message
 *
 * Generates a personalized outreach message using Claude Haiku.
 * This MUST run server-side because it uses the Anthropic API key.
 *
 * Body: {
 *   prospect: { firstName, lastName, title, company, domain, country, headcount?, industry?, signals? }
 *   scan?: { exposureLow, exposureHigh, dailyLoss, confidence, signals: [...] }
 *   channel: "email" | "linkedin_dm"
 *   sequenceStep: "M1" | "M2" | "M3" | "M4" | "M5"
 *   daysSinceLastContact?: number
 * }
 *
 * Returns: { subject?, body, language, wordCount, confidenceScore }
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// ── Cultural profiles (inlined for server-side) ─────────

function detectLanguage(country: string, headcount?: number, industry?: string): string {
  const c = country?.toUpperCase();
  if (['DE', 'AT', 'CH'].includes(c)) return 'German';
  if (['NL', 'BE'].includes(c)) return 'English'; // Dutch B2B in English
  return 'English';
}

function detectTone(country: string, headcount?: number, industry?: string): string {
  const c = country?.toUpperCase();
  if (c === 'DE' || c === 'AT') {
    const isStartup = (headcount && headcount < 300) && industry && /tech|saas|software|fintech/i.test(industry);
    return isStartup
      ? 'Semi-formal, founder-to-founder. Fast, no corporate padding. Sie form unless very informal LinkedIn.'
      : 'Formal, data-first. Sie form. Precise numbers. No fluff, no superlatives. Germans trust methodology.';
  }
  if (c === 'NL' || c === 'BE') return 'Ultra-direct, zero fluff. Get to the point in the first sentence. Dutch hate wasted words.';
  if (c === 'UK' || c === 'GB') return 'Polite but not servile. British understatement: "might be worth a look" > "you MUST see this".';
  return 'Confident, benefit-driven. ROI explicit. Social proof matters.';
}

function getPrice(country: string): number {
  return ['DE', 'AT', 'CH'].includes(country?.toUpperCase()) ? 590 : 490;
}

// ── Main handler ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { prospect, scan, channel, sequenceStep, daysSinceLastContact } = body;

    if (!prospect?.firstName || !prospect?.company || !prospect?.domain) {
      return NextResponse.json({ error: 'Missing prospect data' }, { status: 400 });
    }

    const language = detectLanguage(prospect.country, prospect.headcount, prospect.industry);
    const tone = detectTone(prospect.country, prospect.headcount, prospect.industry);
    const price = getPrice(prospect.country);
    const maxWords = channel === 'linkedin_dm' ? 120 : 180;

    // Build signals text
    const signalsText = scan?.signals?.slice(0, 3).map((s: any, i: number) =>
      `  ${i + 1}. ${s.label} (${s.impactLow?.toLocaleString()}-${s.impactHigh?.toLocaleString()} EUR/yr) — ${s.evidenceClass}`
    ).join('\n') || '  No specific signals available';

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
    const rawMessage = data.content?.[0]?.text || '';

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
        100
      ),
      channel,
      sequenceStep,
      price,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
