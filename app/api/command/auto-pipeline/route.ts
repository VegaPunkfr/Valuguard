/**
 * GHOST TAX — AUTO-PIPELINE
 *
 * GET /api/command/auto-pipeline
 *
 * Le pipeline AUTONOME qui fait TOUT :
 * 1. Cherche 5 prospects sur Apollo (utilise les crédits pour révéler les emails)
 * 2. Pour chaque : génère un message IA personnalisé via Claude Haiku
 * 3. Retourne les prospects prêts pour le cockpit
 *
 * Appelé par :
 * - Le cockpit au chargement (si la queue est vide)
 * - Le cron daily-brief à 06:00
 *
 * Edith ne fait RIEN. Ce pipeline tourne tout seul.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 min max

// ── Day-based market selection ──────────────────────────────

function getTodayMarkets(): string[] {
  const dow = new Date().getDay();
  if (dow >= 1 && dow <= 3) return ['Germany'];   // Mon-Wed: DE
  if (dow === 4) return ['Netherlands', 'United Kingdom']; // Thu: NL+UK
  return []; // Fri-Sun: no new prospects
}

// ── Main handler ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  // Allow both cron auth and open access from cockpit
  const isCron = secret === process.env.CRON_SECRET;

  const apolloKey = process.env.APOLLO_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (!apolloKey) {
    return NextResponse.json({ error: 'APOLLO_API_KEY not configured' }, { status: 500 });
  }

  try {
    const markets = getTodayMarkets();
    const results: any[] = [];

    // Step 1: Search Apollo for prospects
    const searchRes = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apolloKey },
      body: JSON.stringify({
        page: 1,
        per_page: 5,
        person_titles: ['CFO', 'Chief Financial Officer', 'CIO', 'Chief Information Officer', 'VP IT', 'IT Director'],
        organization_num_employees_ranges: ['51,200', '201,500'],
        person_locations: markets.length > 0 ? markets : ['Germany'],
      }),
    });

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Apollo search failed', status: searchRes.status }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const people = searchData.people || [];

    // Step 2: For each person, try to get their email via people/match
    for (const person of people.slice(0, 5)) {
      const org = person.organization || {};
      const domain = org.primary_domain || '';
      const firstName = person.first_name || '';
      const lastName = person.last_name || '';

      // Try to enrich/reveal the email
      let email = person.email || '';
      let emailStatus = person.email_status || '';

      if (!email && firstName && lastName && domain) {
        try {
          const matchRes = await fetch('https://api.apollo.io/api/v1/people/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apolloKey },
            body: JSON.stringify({
              first_name: firstName,
              last_name: lastName,
              organization_name: org.name || '',
              domain: domain,
              reveal_personal_emails: false,
              reveal_phone_number: false,
            }),
          });

          if (matchRes.ok) {
            const matchData = await matchRes.json();
            if (matchData.person?.email) {
              email = matchData.person.email;
              emailStatus = matchData.person.email_status || 'likely_valid';
            }
          }
        } catch {}
      }

      // Build prospect object for cockpit
      const prospect = {
        id: person.id || `apollo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        company: org.name || 'Unknown',
        domain: domain || `${(org.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '')}.de`,
        country: 'DE',
        industry: org.industry || 'Technology',
        headcount: org.estimated_num_employees || 150,
        employeeRange: org.estimated_num_employees
          ? `${Math.round(org.estimated_num_employees * 0.8)}-${Math.round(org.estimated_num_employees * 1.2)}`
          : '100-300',
        website: org.website_url || `https://${domain}`,
        status: 'new',
        score: 0,
        tier: 2,
        attackability: 'soon',
        dealPotential: 'medium',
        conviction: 'moderate',
        solofit: 'good',
        financeLead: {
          name: `${firstName} ${lastName}`.trim(),
          title: person.title || 'CFO',
          email: email || undefined,
          emailStatus: emailStatus || 'missing',
          linkedIn: person.linkedin_url || undefined,
        },
        signals: [],
        mainSignal: '',
        whyNow: '',
        hypothesis: { summary: '', whyItMatters: '', hiddenExposure: [], proofNeeded: '' },
        strengths: [],
        weaknesses: [],
        outreach: [],
        timeline: [],
        executionLog: [],
        nextAction: 'scan',
        revenueEstimate: 200000,
      };

      // Step 3: Generate AI message if we have anthropic key
      let aiMessage: { subject: string; body: string; language: string } | null = null;
      if (anthropicKey) {
        try {
          const language = 'German';
          const price = 590;
          const exposure = Math.round(150000 + Math.random() * 200000);
          const dailyLoss = Math.round(exposure / 365);

          const prompt = `You are Edith, founder of Ghost Tax. Write a personal outreach message to a prospect.

PROSPECT: ${firstName} ${lastName}, ${person.title || 'CFO'} at ${org.name || 'their company'} (${domain})
Country: Germany · Industry: ${org.industry || 'Technology'} · ~${org.estimated_num_employees || 150} employees

LANGUAGE: ${language}
CHANNEL: Email (max 180 words)
PRICE: ${price} EUR

Start with "Betreff:" (subject line with domain and a number).
Lead with a specific observation about their company.
Mention estimated exposure: ~${exposure.toLocaleString()} EUR/year (~${dailyLoss} EUR/day).
End with: ghost-tax.com/intel?domain=${domain}
Sign off as just "Edith"

NEVER: "I hope this finds you well", "Our platform", "Book a call", generic openings.
Every sentence must be specific to THIS company.`;

          const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 400,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const rawMsg = aiData.content?.[0]?.text || '';
            const subjectMatch = rawMsg.match(/^Betreff:\s*(.+)\n/i);
            aiMessage = {
              subject: subjectMatch ? subjectMatch[1].trim() : `${domain} — Ghost Tax`,
              body: subjectMatch ? rawMsg.replace(subjectMatch[0], '').trim() : rawMsg.trim(),
              language: 'de',
            };
          }
        } catch {}
      }

      // Add AI message as outreach draft
      if (aiMessage) {
        (prospect as any).outreach = [{
          channel: email ? 'email' : 'linkedin',
          subject: aiMessage.subject,
          body: aiMessage.body,
          hook: aiMessage.body.split('\n')[0] || '',
          status: 'draft',
        }];
        prospect.status = 'outreach_ready';
        prospect.score = 65;
        prospect.attackability = 'now';
      }

      results.push(prospect);
    }

    return NextResponse.json({
      prospects: results,
      count: results.length,
      markets: markets.length > 0 ? markets : ['Germany'],
      withMessages: results.filter(r => r.outreach.length > 0).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
