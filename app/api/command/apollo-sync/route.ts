/**
 * GHOST TAX — APOLLO BRIDGE: Prospect Search & Import
 *
 * POST /api/command/apollo-sync
 *
 * Searches Apollo.io for contacts matching ICP filters,
 * transforms them into cockpit-compatible prospects.
 * Bridges Apollo data → Ghost Tax Command Center (Cockpit v3).
 *
 * Body: {
 *   filters: { countries, industries, minEmployees, maxEmployees, titles },
 *   limit: number (max 100)
 * }
 *
 * Returns: { prospects, total, credits_used }
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ── Rate limiter (in-memory, 5 req/min) ─────────────
const calls: number[] = []
function isRateLimited(): boolean {
  const now = Date.now()
  const windowMs = 60_000
  while (calls.length > 0 && calls[0]! < now - windowMs) calls.shift()
  if (calls.length >= 5) return true
  calls.push(now)
  return false
}

// ── Auth check ──────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get('x-command-key') || ''
  const secret = process.env.CRON_SECRET || process.env.COMMAND_KEY || ''
  return secret.length > 0 && key === secret
}

// ── Types ───────────────────────────────────────────
interface ApolloFilters {
  countries?: string[]
  industries?: string[]
  minEmployees?: number
  maxEmployees?: number
  titles?: string[]
}

interface ProspectFromApollo {
  domain: string
  company: string
  contactName: string
  contactTitle: string
  contactEmail: string | null
  contactLinkedin: string | null
  headcount: number
  industry: string
  country: string
  source: 'apollo'
  apolloId: string
  signals: string[]
}

export async function POST(req: NextRequest) {
  // Auth
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  if (isRateLimited()) {
    return NextResponse.json({ error: 'Rate limited — max 5 requests/min' }, { status: 429 })
  }

  // API key check
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'APOLLO_API_KEY not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const filters: ApolloFilters = body.filters || {}
    const limit = Math.min(Math.max(body.limit || 25, 1), 100)

    // Build Apollo search payload
    const apolloPayload: Record<string, unknown> = {
      page: 1,
      per_page: limit,
      person_titles: filters.titles || [
        'CFO', 'Chief Financial Officer',
        'CIO', 'Chief Information Officer',
        'VP IT', 'VP Information Technology',
        'Head of Procurement', 'Procurement Director',
        'IT Director', 'Director of IT',
      ],
    }

    if (filters.countries?.length) {
      apolloPayload.person_locations = filters.countries
    }

    if (filters.minEmployees || filters.maxEmployees) {
      apolloPayload.organization_num_employees_ranges = [
        `${filters.minEmployees || 50},${filters.maxEmployees || 1000}`,
      ]
    }

    if (filters.industries?.length) {
      apolloPayload.organization_industry_tag_ids = filters.industries
    }

    // Call Apollo API
    const apolloRes = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(apolloPayload),
    })

    if (!apolloRes.ok) {
      const errText = await apolloRes.text().catch(() => 'Unknown Apollo error')
      return NextResponse.json(
        { error: `Apollo API error (${apolloRes.status}): ${errText.slice(0, 200)}` },
        { status: 502 },
      )
    }

    const apolloData = await apolloRes.json()
    const people = apolloData.people || []

    // Transform to Ghost Tax prospect format
    const prospects: ProspectFromApollo[] = people
      .filter((p: any) => p.organization?.primary_domain)
      .map((p: any) => ({
        domain: p.organization.primary_domain,
        company: p.organization.name || p.organization.primary_domain,
        contactName: [p.first_name, p.last_name].filter(Boolean).join(' '),
        contactTitle: p.title || '',
        contactEmail: p.email_status === 'verified' ? p.email : null,
        contactLinkedin: p.linkedin_url || null,
        headcount: p.organization.estimated_num_employees || 0,
        industry: p.organization.industry || '',
        country: p.organization.country || p.country || '',
        source: 'apollo' as const,
        apolloId: p.id,
        signals: extractSignals(p),
      }))

    // Deduplicate by domain (keep highest-ranked contact per company)
    const seen = new Map<string, ProspectFromApollo>()
    for (const prospect of prospects) {
      const existing = seen.get(prospect.domain)
      if (!existing || rankTitle(prospect.contactTitle) > rankTitle(existing.contactTitle)) {
        seen.set(prospect.domain, prospect)
      }
    }

    const deduplicated = Array.from(seen.values())

    return NextResponse.json({
      prospects: deduplicated,
      total: deduplicated.length,
      credits_used: people.length,
      raw_total: apolloData.pagination?.total_entries || 0,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

// ── Helpers ─────────────────────────────────────────

function extractSignals(person: any): string[] {
  const signals: string[] = []
  const org = person.organization || {}

  if (org.funding_total && org.funding_total > 0) signals.push('recent_funding')
  if (org.latest_funding_round_date) {
    const fundingDate = new Date(org.latest_funding_round_date)
    const monthsAgo = (Date.now() - fundingDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsAgo < 12) signals.push('funding_last_12mo')
  }
  if (org.estimated_num_employees > 200) signals.push('mid_market')
  if (org.estimated_num_employees > 500) signals.push('upper_mid_market')

  // Intent signals from Apollo (if available)
  if (person.intent_strength === 'high') signals.push('high_intent')
  if (person.intent_strength === 'medium') signals.push('medium_intent')

  // Technology signals
  const techTags = org.technology_names || []
  if (techTags.some((t: string) => /salesforce|hubspot/i.test(t))) signals.push('crm_user')
  if (techTags.some((t: string) => /aws|azure|gcp|google cloud/i.test(t))) signals.push('cloud_user')
  if (techTags.some((t: string) => /slack|teams/i.test(t))) signals.push('collab_tools')

  return signals
}

function rankTitle(title: string): number {
  const t = title.toLowerCase()
  if (/\bcfo\b|chief financial/i.test(t)) return 10
  if (/\bcio\b|chief information/i.test(t)) return 9
  if (/\bvp\b.*\b(it|tech|finance|procurement)/i.test(t)) return 8
  if (/\bdirector\b.*\b(it|tech|procurement)/i.test(t)) return 7
  if (/\bhead\b.*\b(procurement|it|finance)/i.test(t)) return 6
  if (/\bprocurement\b/i.test(t)) return 5
  return 1
}
