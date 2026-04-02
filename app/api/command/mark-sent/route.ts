/**
 * GHOST TAX — DATA BRIDGE: Mark Sent
 *
 * POST /api/command/mark-sent
 *
 * Marks a prospect as 'contacted' in Supabase and logs the outreach.
 * Called by approval-queue after Apollo enrollment succeeds.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { prospectId, sequence, apolloContactId } = await req.json()

    if (!prospectId) {
      return NextResponse.json({ error: 'Missing prospectId' }, { status: 400 })
    }

    const { createAdminSupabase } = await import('@/lib/supabase')
    const supabase = createAdminSupabase()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { error } = await (supabase as any)
      .from('osint_prospects')
      .update({
        status: 'contacted',
        outreach_sent_at: new Date().toISOString(),
      })
      .eq('id', prospectId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await (supabase as any).from('outreach_log').insert({
      prospect_id: prospectId,
      sequence: sequence || null,
      apollo_contact_id: apolloContactId || null,
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
