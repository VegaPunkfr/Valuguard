/**
 * GHOST TAX — COCKPIT SYNC API
 *
 * GET /api/command/sync
 *
 * Pulls Sarah's real prospects from Supabase (dev-to-cash DB)
 * and returns them in cockpit Account format.
 *
 * The cockpit calls this on load to refresh its data.
 * No more static seed data — real pipeline from Sarah.
 */

import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Auth check
  const cookieKey = request.cookies.get('gt-command-key')?.value;
  const queryKey = request.nextUrl.searchParams.get('key');
  const secret = process.env.COMMAND_SECRET;

  // Allow if authenticated via cookie or key (or no secret configured)
  if (secret && cookieKey !== secret && queryKey !== secret) {
    // Also allow from same origin without key
    const referer = request.headers.get('referer') || '';
    if (!referer.includes('command.ghost-tax.com') && !referer.includes('localhost') && !referer.includes('valuguard-cockpit.vercel.app')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { createAdminSupabase } = await import('@/lib/supabase');
    const supabase = createAdminSupabase();

    if (!supabase) {
      return NextResponse.json({ accounts: [], source: 'no_db' });
    }

    // Pull prospects from Sarah's Supabase table
    const { data: prospects } = await (supabase as any)
      .from('prospects')
      .select('*')
      .order('derniere_interaction', { ascending: false })
      .limit(100);

    if (!prospects || prospects.length === 0) {
      return NextResponse.json({ accounts: [], source: 'empty' });
    }

    // Convert Sarah's prospect format → cockpit Account format
    const accounts = prospects.map((p: any) => {
      const domain = p.email?.split('@')[1] || p.entreprise?.toLowerCase().replace(/\s+/g, '') + '.com' || 'unknown.com';
      const score = Math.min(25, Math.round((p.score_opportunite || 0) / 4));

      // Map Sarah status → cockpit status
      const statusMap: Record<string, string> = {
        nouveau: 'new',
        engaged: 'reviewing',
        interested: 'qualified',
        proposal: 'outreach_ready',
        negotiating: 'contacted',
        closed: 'contacted',
        lost: 'dropped',
        stalled: 'dropped',
      };

      // Map score → attackability
      const attackability = p.score_opportunite >= 70 ? 'now'
        : p.score_opportunite >= 40 ? 'soon'
        : p.score_opportunite >= 20 ? 'later'
        : 'blocked';

      // Map score → conviction
      const conviction = p.score_opportunite >= 80 ? 'very_high'
        : p.score_opportunite >= 60 ? 'high'
        : p.score_opportunite >= 40 ? 'moderate'
        : 'low';

      return {
        id: p.id || domain.replace(/\./g, '-'),
        company: p.entreprise || domain,
        domain,
        country: detectCountry(domain, p.email),
        industry: 'Unknown',
        employeeRange: 'Unknown',
        website: `https://${domain}`,
        status: statusMap[p.statut] || 'new',
        score,
        tier: score >= 15 ? 1 : score >= 8 ? 2 : 3,
        attackability,
        dealPotential: (p.valeur_estimee || 490) >= 4900 ? 'high' : (p.valeur_estimee || 490) >= 490 ? 'medium' : 'low',
        conviction,
        solofit: 'good',
        financeLead: {
          name: p.contact || 'Unknown',
          title: p.role || 'Finance',
          email: p.email || undefined,
          emailStatus: p.email ? 'likely_valid' : 'missing',
          emailSource: 'enrichment',
        },
        signals: [
          {
            type: 'intent',
            detail: `Source: ${p.source || 'sarah'}. Score: ${p.score_opportunite || 0}/100.`,
            source: 'sarah',
            date: p.derniere_interaction?.split('T')[0] || new Date().toISOString().split('T')[0],
            strength: Math.min(5, Math.round((p.score_opportunite || 0) / 20)),
          },
        ],
        mainSignal: `Sarah prospect — ${p.source || 'auto-detected'} (score ${p.score_opportunite || 0}/100)`,
        whyNow: p.objection_principale || 'Detected by Sarah — qualify further.',
        hypothesis: {
          summary: `${p.entreprise || domain} detected as potential prospect by Sarah.`,
          whyItMatters: 'Auto-detected prospect — needs manual qualification.',
          hiddenExposure: [],
          proofNeeded: 'Run Exa scan to validate hypothesis.',
        },
        strengths: p.score_opportunite >= 60 ? ['High Sarah score', 'Auto-detected'] : ['Auto-detected'],
        weaknesses: ['Needs manual qualification', 'No scan yet'],
        scan: undefined,
        outreach: [],
        timeline: [
          {
            type: 'account_created',
            detail: `Synced from Sarah (${p.source || 'auto'})`,
            date: p.created_at || new Date().toISOString(),
          },
        ],
        executionLog: [],
        nextAction: 'Qualify — run Exa scan, identify CFO, validate hypothesis.',
        revenueEstimate: p.valeur_estimee || 490,
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.derniere_interaction || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      accounts,
      count: accounts.length,
      source: 'supabase',
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      accounts: [],
      source: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

function detectCountry(domain: string, email?: string): string {
  const tld = domain.split('.').pop()?.toLowerCase();
  if (tld === 'de' || tld === 'at' || tld === 'ch') return 'DE';
  if (tld === 'nl') return 'NL';
  if (tld === 'uk' || tld === 'co') return 'UK';
  if (tld === 'fr' || tld === 'be') return 'FR';
  return 'US';
}
