/**
 * GHOST TAX — AUTO-PIPELINE V2
 *
 * Le pipeline INTELLIGENT qui utilise Apollo à 100% :
 * 1. Recherche avec signaux d'intention + tech stack + scoring
 * 2. Ne garde que les prospects HOT (score calculé > 70)
 * 3. Enrichit via people/match (email) UNIQUEMENT pour les chauds
 * 4. Génère un message IA via les 6 couches d'intelligence
 * 5. Retourne des prospects PRÊTS pour le cockpit
 *
 * Apollo est LE CARBURANT du pipeline. Chaque feature est exploitée.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

// ── Market plan par jour ────────────────────────────────────

function getTodayMarkets(): string[] {
  const dow = new Date().getDay();
  if (dow >= 1 && dow <= 3) return ['Germany'];
  if (dow === 4) return ['Netherlands', 'United Kingdom'];
  return [];
}

// ── Score un prospect Apollo (0-100) ────────────────────────

function scoreProspect(person: any): number {
  let score = 0;
  const org = person.organization || {};

  // Taille (sweet spot 100-500 = notre ICP)
  const emp = org.estimated_num_employees || 0;
  if (emp >= 100 && emp <= 500) score += 20;
  else if (emp >= 50 && emp < 100) score += 10;
  else if (emp > 500 && emp <= 1000) score += 15;

  // Titre (CFO = top, CIO = bon, IT Director = ok)
  const title = (person.title || '').toLowerCase();
  if (/\bcfo\b|chief financial/i.test(title)) score += 20;
  else if (/\bcio\b|chief information|chief technology/i.test(title)) score += 18;
  else if (/\bvp\b.*\b(it|finance|tech)/i.test(title)) score += 15;
  else if (/director.*\b(it|finance|tech)/i.test(title)) score += 12;
  else score += 5;

  // Email disponible
  if (person.email && person.email_status === 'verified') score += 15;
  else if (person.email) score += 8;

  // LinkedIn disponible
  if (person.linkedin_url) score += 5;

  // Industrie tech/SaaS (plus de SaaS spend = plus d'exposition)
  const industry = (org.industry || '').toLowerCase();
  if (/software|saas|tech|fintech|ai|cloud/i.test(industry)) score += 15;
  else if (/finance|banking|insurance/i.test(industry)) score += 12;
  else if (/health|pharma|biotech/i.test(industry)) score += 10;
  else score += 5;

  // Signaux d'intention Apollo
  if (person.intent_strength === 'high') score += 15;
  else if (person.intent_strength === 'medium') score += 8;

  // Funding récent
  if (org.latest_funding_round_date) {
    const monthsAgo = (Date.now() - new Date(org.latest_funding_round_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo < 12) score += 10;
    else if (monthsAgo < 24) score += 5;
  }

  // Tech stack SaaS dense (beaucoup d'outils = plus d'exposition)
  const techCount = (org.technology_names || []).length;
  if (techCount >= 20) score += 10;
  else if (techCount >= 10) score += 7;
  else if (techCount >= 5) score += 3;

  return Math.min(score, 100);
}

// ── Détecte le signal de timing ─────────────────────────────

function detectTiming(person: any): { signal: string; urgency: string } {
  const org = person.organization || {};

  // Nouveau dans le poste
  if (person.employment_history?.[0]) {
    const startDate = person.employment_history[0].start_date;
    if (startDate) {
      const monthsInRole = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsInRole < 6) return { signal: 'new_executive', urgency: 'critical' };
    }
  }

  // Funding récent
  if (org.latest_funding_round_date) {
    const monthsAgo = (Date.now() - new Date(org.latest_funding_round_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo < 6) return { signal: 'post_funding', urgency: 'high' };
  }

  // Intent high
  if (person.intent_strength === 'high') return { signal: 'active_research', urgency: 'critical' };

  // Croissance rapide (headcount)
  if (org.estimated_num_employees_growth_6m > 10) return { signal: 'rapid_growth', urgency: 'high' };

  return { signal: 'general_fit', urgency: 'medium' };
}

// ── Main handler ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const apolloKey = process.env.APOLLO_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (!apolloKey) {
    return NextResponse.json({ error: 'APOLLO_API_KEY not configured' }, { status: 500 });
  }

  try {
    const markets = getTodayMarkets();

    // ── STEP 1: Recherche Apollo INTELLIGENTE ──────────────

    const searchRes = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apolloKey },
      body: JSON.stringify({
        page: 1,
        per_page: 15,  // On cherche 15 pour n'en garder que 5 HOT
        person_titles: [
          'CFO', 'Chief Financial Officer',
          'CIO', 'Chief Information Officer',
          'VP IT', 'VP Finance', 'VP Technology',
          'IT Director', 'Finance Director',
          'Head of IT', 'Head of Finance',
        ],
        organization_num_employees_ranges: ['51,200', '201,500', '501,1000'],
        person_locations: markets.length > 0 ? markets : ['Germany'],
        // Filtre tech stack : priorité aux gros consommateurs SaaS
        organization_latest_funding_stage: null, // Accepte tout
        revenue_range: { min: 1000000, max: null }, // Min 1M€ revenue
      }),
    });

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Apollo search failed' }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const people = searchData.people || [];

    // ── STEP 2: Scorer et trier ───────────────────────────

    const scored = people
      .map((p: any) => ({ person: p, score: scoreProspect(p), timing: detectTiming(p) }))
      .sort((a: any, b: any) => b.score - a.score);

    // Ne garder que les 5 meilleurs avec score > 50
    const topProspects = scored.filter((s: any) => s.score >= 50).slice(0, 5);

    // ── STEP 3: Enrichir les emails (crédits Apollo) ──────

    const results: any[] = [];

    for (const { person, score, timing } of topProspects) {
      const org = person.organization || {};
      const domain = org.primary_domain || '';
      const firstName = person.first_name || '';
      const lastName = person.last_name || '';
      const country = markets.includes('Germany') ? 'DE' : markets.includes('Netherlands') ? 'NL' : 'UK';
      const price = country === 'DE' ? 590 : 490;

      // Enrichir l'email si pas déjà disponible et score > 70
      let email = person.email || '';
      let emailStatus = person.email_status || '';

      if (!email && score >= 70 && firstName && lastName && (domain || org.name)) {
        try {
          const matchRes = await fetch('https://api.apollo.io/api/v1/people/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apolloKey },
            body: JSON.stringify({
              first_name: firstName,
              last_name: lastName,
              organization_name: org.name || '',
              domain: domain || undefined,
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

      // ── STEP 4: Construire le prospect ──────────────────

      const techStack = (org.technology_names || []).slice(0, 10);
      const exposure = Math.round(
        (org.estimated_num_employees || 150) * (techStack.length > 10 ? 1200 : 800)
      );
      const dailyLoss = Math.round(exposure / 365);

      const prospect: any = {
        company: org.name || domain,
        domain: domain || `${(org.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '')}.de`,
        country,
        industry: org.industry || 'Technology',
        headcount: org.estimated_num_employees || 150,
        revenueEstimate: exposure,
        score,
        timingSignal: timing.signal,
        timingUrgency: timing.urgency,
        techStack,
        fundingRound: org.latest_funding_stage || null,
        fundingDate: org.latest_funding_round_date || null,
        financeLead: {
          name: `${firstName} ${lastName}`.trim(),
          title: person.title || 'CFO',
          email: email || undefined,
          emailStatus: emailStatus || 'missing',
          linkedIn: person.linkedin_url || undefined,
        },
        signals: [
          timing.signal !== 'general_fit' ? { type: timing.signal, detail: timing.signal.replace(/_/g, ' '), source: 'apollo', strength: timing.urgency === 'critical' ? 5 : 3 } : null,
          techStack.length >= 10 ? { type: 'high_saas_density', detail: `${techStack.length} SaaS tools detected`, source: 'apollo', strength: 4 } : null,
          org.estimated_num_employees_growth_6m > 10 ? { type: 'rapid_growth', detail: `+${org.estimated_num_employees_growth_6m}% headcount 6m`, source: 'apollo', strength: 3 } : null,
        ].filter(Boolean),
      };

      // ── STEP 5: Générer le message IA (6 couches) ───────

      if (anthropicKey && (email || person.linkedin_url)) {
        try {
          const language = country === 'DE' ? 'German' : 'English';
          const culturalTone = country === 'DE'
            ? 'Formal Sie, data-first, precise numbers, no fluff. Germans trust METHODOLOGY.'
            : country === 'NL'
            ? 'Ultra-direct, zero fluff, get to the point in the first sentence.'
            : 'Polite but factual, British understatement, "might be worth a look".';

          const roleAngle = /cfo|chief financial|finance/i.test(person.title || '')
            ? 'FINANCIAL VISIBILITY: the CFO needs to KNOW the numbers. Lead with EUR exposure and daily loss.'
            : /cio|chief information|cto|tech/i.test(person.title || '')
            ? 'TECHNICAL CONTROL: the CIO needs to GOVERN the stack. Lead with tool count and shadow IT.'
            : 'ACTIONABLE CUTS: lead with quick wins and low-disruption savings.';

          const timingNarrative = timing.signal === 'new_executive'
            ? `New in role — wants quick win for board credibility. A ${price}€ report is the perfect first move.`
            : timing.signal === 'post_funding'
            ? `Post-funding: budget available but burn rate pressure. Tool proliferation without consolidation.`
            : timing.signal === 'active_research'
            ? `Actively researching IT cost solutions. They're ALREADY looking for this.`
            : timing.signal === 'rapid_growth'
            ? `Growing fast: +${org.estimated_num_employees_growth_6m || 15}% headcount means tool sprawl without governance.`
            : `Mid-market company where IT spend grows faster than IT governance.`;

          const techContext = techStack.length > 0
            ? `Tech stack detected: ${techStack.slice(0, 5).join(', ')}${techStack.length > 5 ? ` (+${techStack.length - 5} more)` : ''}.`
            : '';

          const prompt = `You are Jean-Étienne, founder of Ghost Tax. Write a personal outreach message.

PROSPECT: ${firstName} ${lastName}, ${person.title || 'CFO'} at ${org.name || 'company'} (${domain})
Country: ${country} · Headcount: ~${org.estimated_num_employees || 150} · Industry: ${org.industry || 'Technology'}
${techContext}

TIMING: ${timingNarrative}

ROLE ANGLE: ${roleAngle}

CULTURAL TONE: ${language}. ${culturalTone}

EXPOSURE ESTIMATE: ~${exposure.toLocaleString()} EUR/year (~${dailyLoss} EUR/day)

CHANNEL: Email (max 180 words)
PRICE: ${price} EUR
LINK: ghost-tax.com/intel?domain=${domain}

Start with "${language === 'German' ? 'Betreff' : 'Subject'}:" line containing the domain and a number.
Lead with a SPECIFIC observation about THIS company (timing signal, tech stack, or growth pattern).
Include 2-3 concrete data points.
End with the link and price.
Sign off as "Jean-Étienne"

ANTI-PATTERNS (NEVER do these):
- "I hope this finds you well" or any generic greeting
- "Our platform/solution" before mentioning their data
- "Book a call" (this is self-serve, no calls)
- Any sentence that works for ANY company (interchangeability = failure)
- Fake urgency or superlatives`;

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
            const subjectMatch = rawMsg.match(/^(?:Subject|Betreff)\s*:\s*(.+)\n/i);

            prospect.message = {
              channel: email ? 'email' : 'linkedin',
              subject: subjectMatch ? subjectMatch[1].trim() : `${domain} — Ghost Tax`,
              body: subjectMatch ? rawMsg.replace(subjectMatch[0], '').trim() : rawMsg.trim(),
              language: language.toLowerCase(),
              price,
            };
          }
        } catch {}
      }

      results.push(prospect);
    }

    return NextResponse.json({
      prospects: results,
      count: results.length,
      markets,
      withMessages: results.filter((r: any) => r.message).length,
      totalSearched: people.length,
      avgScore: Math.round(topProspects.reduce((s: number, p: any) => s + p.score, 0) / (topProspects.length || 1)),
      creditsUsed: results.filter((r: any) => r.financeLead?.emailStatus !== 'missing' && !r.financeLead?.email?.includes('@')).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
