/**
 * GHOST TAX — APPROVAL QUEUE: Human Validation + Apollo Enrollment
 *
 * GET  /api/command/approval-queue  → List draft_ready prospects for review
 * POST /api/command/approval-queue  → Process approval/rejection/skip actions
 *
 * Pipeline Step 4/5.
 * Presents d0/d2/d7 messages for human review.
 * On approval: creates Apollo contact, enrolls in sequence, marks as contacted.
 * On rejection: marks as disqualified with reason.
 */

import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'

// ── GET: Fetch the approval queue ───────────────────────────

export async function GET() {
  try {
    const { createAdminSupabase } = await import('@/lib/supabase')
    const supabase = createAdminSupabase()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: prospects, error } = await (supabase as any)
      .from('osint_prospects')
      .select('*')
      .eq('status', 'draft_ready')
      .order('intent_score', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const queue = (prospects || []).map((p: any) => ({
      id: p.id,
      company_name: p.company_name,
      domain: p.domain,
      intent_score: p.intent_score,
      geo_market: p.geo_market,
      headcount: p.headcount,
      exposure_low: p.exposure_low_eur,
      exposure_high: p.exposure_high_eur,
      hook: p.enrichment_data?.hook,
      pain_point: p.enrichment_data?.pain_point,
      d0: p.enrichment_data?.draft_message?.d0,
      d2: p.enrichment_data?.draft_message?.d2,
      d7: p.enrichment_data?.draft_message?.d7,
      locale: p.locale,
    }))

    return NextResponse.json({ queue, total: queue.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

// ── POST: Process approval actions ──────────────────────────

interface ApprovalAction {
  prospectId: string
  action: 'approve' | 'reject' | 'skip' | 'approve_all'
  reason?: string  // For rejection
  editedMessages?: { d0?: string; d2?: string; d7?: string }  // For edit before approve
}

export async function POST(req: NextRequest) {
  try {
    const body: ApprovalAction = await req.json()

    const { createAdminSupabase } = await import('@/lib/supabase')
    const supabase = createAdminSupabase()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Handle approve_all
    if (body.action === 'approve_all') {
      return handleApproveAll(supabase)
    }

    if (!body.prospectId) {
      return NextResponse.json({ error: 'Missing prospectId' }, { status: 400 })
    }

    switch (body.action) {
      case 'approve':
        return handleApprove(supabase, body.prospectId, body.editedMessages)
      case 'reject':
        return handleReject(supabase, body.prospectId, body.reason)
      case 'skip':
        return NextResponse.json({ success: true, action: 'skipped', prospectId: body.prospectId })
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

// ── Approve: Apollo contact + sequence enrollment ───────────

async function handleApprove(
  supabase: any,
  prospectId: string,
  editedMessages?: { d0?: string; d2?: string; d7?: string },
) {
  // Get the prospect
  const { data: prospect } = await supabase
    .from('osint_prospects')
    .select('*')
    .eq('id', prospectId)
    .single()

  if (!prospect) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  }

  // If messages were edited, update them first
  if (editedMessages) {
    const currentEnrichment = prospect.enrichment_data || {}
    const updatedDraft = {
      ...currentEnrichment.draft_message,
      ...editedMessages,
    }
    await supabase
      .from('osint_prospects')
      .update({
        enrichment_data: { ...currentEnrichment, draft_message: updatedDraft },
      })
      .eq('id', prospectId)
  }

  // Step 1: Search/create Apollo contact
  let apolloContactId: string | null = null
  let apolloError: string | null = null

  const apolloKey = process.env.APOLLO_API_KEY
  if (apolloKey) {
    try {
      // Search for existing contact
      const searchRes = await fetch('https://api.apollo.io/api/v1/contacts/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apolloKey },
        body: JSON.stringify({
          q_organization_domains: prospect.domain,
          per_page: 1,
        }),
      })

      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (searchData.contacts?.length > 0) {
          apolloContactId = searchData.contacts[0].id
        }
      }

      // Create contact if not found
      if (!apolloContactId && prospect.contact_email) {
        const createRes = await fetch('https://api.apollo.io/api/v1/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': apolloKey },
          body: JSON.stringify({
            first_name: prospect.contact_name?.split(' ')[0] || '',
            last_name: prospect.contact_name?.split(' ').slice(1).join(' ') || '',
            email: prospect.contact_email,
            organization_name: prospect.company_name,
            website_url: `https://${prospect.domain}`,
          }),
        })

        if (createRes.ok) {
          const createData = await createRes.json()
          apolloContactId = createData.contact?.id
        }
      }

      // Step 2: Find and enroll in sequence
      if (apolloContactId) {
        const geoMarket = (prospect.geo_market || '').toUpperCase()
        const campaignsRes = await fetch('https://api.apollo.io/api/v1/emailer_campaigns/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': apolloKey },
          body: JSON.stringify({ per_page: 20 }),
        })

        if (campaignsRes.ok) {
          const campaignsData = await campaignsRes.json()
          const campaigns = campaignsData.emailer_campaigns || []

          // Find sequence matching geo market
          const matchingCampaign = campaigns.find((c: any) => {
            const name = (c.name || '').toUpperCase()
            return c.active && (
              name.includes(geoMarket) ||
              (geoMarket === 'DE' && name.includes('GERMANY')) ||
              (geoMarket === 'UK' && (name.includes('UK') || name.includes('UNITED KINGDOM'))) ||
              (geoMarket === 'NL' && name.includes('NETHERLANDS')) ||
              (geoMarket === 'US' && name.includes('US'))
            )
          }) || campaigns.find((c: any) => c.active) // Fallback to any active

          if (matchingCampaign) {
            // Step 3: Enroll contact in sequence
            await fetch('https://api.apollo.io/api/v1/emailer_campaigns/add_contact_ids', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': apolloKey },
              body: JSON.stringify({
                id: matchingCampaign.id,
                contact_ids: [apolloContactId],
              }),
            })
          }
        }
      }
    } catch (e) {
      apolloError = e instanceof Error ? e.message : 'Apollo API error'
    }
  }

  // Step 4: Update Supabase
  const newStatus = apolloError ? 'approval_ok' : 'contacted'

  await supabase
    .from('osint_prospects')
    .update({
      status: newStatus,
      outreach_sent_at: apolloError ? null : new Date().toISOString(),
    })
    .eq('id', prospectId)

  // Log outreach
  if (!apolloError) {
    await supabase.from('outreach_log').insert({
      prospect_id: prospectId,
      sequence: 'apollo_auto',
      apollo_contact_id: apolloContactId,
      sent_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({
    success: true,
    action: 'approved',
    prospectId,
    apolloContactId,
    status: newStatus,
    apolloError,
  })
}

// ── Reject ──────────────────────────────────────────────────

async function handleReject(supabase: any, prospectId: string, reason?: string) {
  const { error } = await supabase
    .from('osint_prospects')
    .update({
      status: 'disqualified',
      enrichment_data: supabase.rpc ? undefined : undefined, // Keep existing data
    })
    .eq('id', prospectId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Store rejection reason in enrichment_data
  if (reason) {
    const { data: prospect } = await supabase
      .from('osint_prospects')
      .select('enrichment_data')
      .eq('id', prospectId)
      .single()

    if (prospect) {
      await supabase
        .from('osint_prospects')
        .update({
          enrichment_data: {
            ...(prospect.enrichment_data || {}),
            rejection_reason: reason,
            rejected_at: new Date().toISOString(),
          },
        })
        .eq('id', prospectId)
    }
  }

  return NextResponse.json({ success: true, action: 'rejected', prospectId, reason })
}

// ── Approve All ─────────────────────────────────────────────

async function handleApproveAll(supabase: any) {
  const { data: prospects } = await supabase
    .from('osint_prospects')
    .select('id')
    .eq('status', 'draft_ready')

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ message: 'No prospects to approve', approved: 0 })
  }

  let approved = 0
  let errors = 0
  const results: Array<{ prospectId: string; status: string; error?: string }> = []

  for (const p of prospects) {
    const res = await handleApprove(supabase, p.id)
    const json = await res.json()

    if (json.success) {
      approved++
      results.push({ prospectId: p.id, status: json.status })
    } else {
      errors++
      results.push({ prospectId: p.id, status: 'error', error: json.apolloError || json.error })
    }
  }

  return NextResponse.json({
    message: `Session terminee: ${approved} approuves, ${errors} erreurs`,
    approved,
    errors,
    skipped: 0,
    total: prospects.length,
    results,
  })
}
