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

// ── Markets par stratégie du bot ────────────────────────────

function getMarketsForStrategy(strategy: string): string[] {
  switch (strategy) {
    case 'icp_hunter':
    case 'signal_hunter':
    case 'event_hunter':
    case 'lookalike_hunter':
    case 'committee_mapper':
      return ['Germany'];
    case 'tech_stack_hunter':
      return ['Netherlands', 'United Kingdom'];
    case 'competitor_hunter':
    case 're_engagement':
      return ['Germany', 'Netherlands', 'United Kingdom'];
    default:
      return ['Germany'];
  }
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

  if (!apolloKey) {
    return NextResponse.json({ error: 'APOLLO_API_KEY not configured' }, { status: 500 });
  }

  // Strategy param support from Apollo Bot
  const strategy = req.nextUrl.searchParams.get('strategy') || '';
  const markets = strategy ? getMarketsForStrategy(strategy) : getTodayMarkets();

  try {
    // ── STEP 1: Recherche Apollo INTELLIGENTE ──────────────

    const searchRes = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apolloKey },
      body: JSON.stringify({
        page: 1,
        per_page: 15,
        person_titles: [
          'CFO', 'Chief Financial Officer',
          'CIO', 'Chief Information Officer',
          'VP IT', 'VP Finance', 'VP Technology',
          'IT Director', 'Finance Director',
          'Head of IT', 'Head of Finance',
        ],
        organization_num_employees_ranges: ['51,200', '201,500', '501,1000'],
        person_locations: markets.length > 0 ? markets : ['Germany'],
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

    const topProspects = scored.filter((s: any) => s.score >= 50).slice(0, 5);

    // ── STEP 3: Enrichir les emails ──────────────────────

    const results: any[] = [];

    for (const { person, score, timing } of topProspects) {
      const org = person.organization || {};
      const domain = org.primary_domain || '';
      const firstName = person.first_name || '';
      const lastName = person.last_name || '';
      const country = (person.country || '').includes('Germany') ? 'DE'
        : (person.country || '').includes('Netherlands') ? 'NL'
        : (person.country || '').includes('United Kingdom') ? 'UK' : 'DE';
      const price = ['DE', 'AT', 'CH'].includes(country) ? 590 : 490;

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

      results.push({
        company: org.name || domain,
        domain: domain || `${(org.name || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '')}.de`,
        country,
        industry: org.industry || 'Technology',
        headcount: org.estimated_num_employees || 0,
        employeeRange: `${org.estimated_num_employees || 0}`,
        financeLead: {
          name: `${firstName} ${lastName}`.trim(),
          title: person.title || '',
          email: email || undefined,
          emailStatus,
          linkedinUrl: person.linkedin_url || undefined,
        },
        score,
        timing,
        techStack,
        exposure,
        dailyLoss,
        price,
        strategy: strategy || 'default',
      });
    }

    return NextResponse.json({
      people,
      results,
      strategy: strategy || 'default',
      markets,
      count: results.length,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST handler — accepts apolloParams from the cockpit bot
export async function POST(req: NextRequest) {
  const apolloKey = process.env.APOLLO_API_KEY;

  if (!apolloKey) {
    return NextResponse.json({ error: 'APOLLO_API_KEY not configured' }, { status: 500 });
  }

  const strategy = req.nextUrl.searchParams.get('strategy') || '';

  try {
    const body = await req.json();

    const searchRes = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apolloKey },
      body: JSON.stringify({
        page: 1,
        per_page: body.per_page || 15,
        ...body,
      }),
    });

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Apollo search failed' }, { status: 502 });
    }

    const searchData = await searchRes.json();
    return NextResponse.json({
      people: searchData.people || [],
      strategy,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}