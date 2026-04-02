/**
 * GHOST TAX — DATA BRIDGE: Reply Received
 *
 * POST /api/command/reply-received
 *
 * Marks a prospect as 'replied' in Supabase.
 * Called when a prospect responds to outreach.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { prospectId } = await req.json()

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
      .update({ status: 'replied' })
      .eq('id', prospectId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
