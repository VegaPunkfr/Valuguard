/**
 * GHOST TAX — DATA BRIDGE: Prospects Sync
 *
 * GET /api/command/prospects-sync
 *
 * Pulls osint_prospects from Supabase and returns them
 * in cockpit-compatible format for the GHOST-TAX-COCKPIT-V3.
 * Ordered by intent_score DESC, limited to 200.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { createAdminSupabase } = await import('@/lib/supabase')
    const supabase = createAdminSupabase()

    if (!supabase) {
      return NextResponse.json({ accounts: [], total: 0, source: 'no_db' })
    }

    const { data, error } = await (supabase as any)
      .from('osint_prospects')
      .select('*')
      .order('intent_score', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const accounts = (data || []).map(toAccount)
    return NextResponse.json({ accounts, total: accounts.length, syncedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

function toAccount(p: any) {
  return {
    id: p.id,
    name: p.company_name,
    domain: p.domain,
    industry: p.industry,
    headcount: p.headcount,
    market: p.geo_market,
    locale: p.locale,
    heatScore: p.intent_score,
    exposureLow: p.exposure_low_eur,
    exposureHigh: p.exposure_high_eur,
    status: mapStatus(p.status),
    enriched: !!p.enrichment_data?.context_card,
    draftReady: p.status === 'draft_ready',
    contacted: p.status === 'contacted',
    outreachSentAt: p.outreach_sent_at,
    contextCard: p.enrichment_data?.context_card,
    painPoint: p.enrichment_data?.pain_point,
    hook: p.enrichment_data?.hook,
    draftMessages: p.enrichment_data?.draft_message,
  }
}

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    new: 'New',
    enriched: 'Enriched',
    draft_ready: 'Draft Ready',
    approval_ok: 'Approved',
    contacted: 'Contacted',
    replied: 'Replied',
    disqualified: 'Disqualified',
  }
  return map[status] ?? status
}
