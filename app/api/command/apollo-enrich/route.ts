/**
 * GHOST TAX — APOLLO BRIDGE: Buying Committee Enrichment
 *
 * POST /api/command/apollo-enrich
 *
 * Given a domain, searches Apollo for the buying committee:
 * CFO, CIO, Procurement, IT Director — the 4 decision-makers
 * Ghost Tax needs to activate multi-stakeholder selling.
 *
 * Body: { domain: string }
 * Returns: { domain, company, committee: [{ role, name, title, email, linkedin }] }
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ── Rate limiter (in-memory, 10 req/min) ────────────
const calls: number[] = []
function isRateLimited(): boolean {
  const now = Date.now()
  const windowMs = 60_000
  while (calls.length > 0 && calls[0]! < now - windowMs) calls.shift()
  if (calls.length >= 10) return true
  calls.push(now)
  return false
}

// ── Auth ────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get('x-command-key') || ''
  const secret = process.env.CRON_SECRET || process.env.COMMAND_KEY || ''
  return secret.length > 0 && key === secret
}

// ── Role mapping ────────────────────────────────────
const BUYING_ROLES = [
  {
    role: 'CFO',
    titles: ['CFO', 'Chief Financial Officer', 'VP Finance', 'Finance Director', 'Head of Finance'],
  },
  {
    role: 'CIO',
    titles: ['CIO', 'Chief Information Officer', 'VP IT', 'VP Technology', 'Head of IT', 'Chief Technology Officer', 'CTO'],
  },
  {
    role: 'Procurement',
    titles: ['Head of Procurement', 'Procurement Director', 'VP Procurement', 'Chief Procurement Officer', 'Purchasing Director'],
  },
  {
    role: 'IT Director',
    titles: ['IT Director', 'Director of IT', 'Director of Technology', 'IT Manager', 'Infrastructure Director'],
  },
]

interface CommitteeMember {
  role: string
  name: string
  title: string
  email: string | null
  linkedin: string | null
  seniority: string
  apolloId: string
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isRateLimited()) {
    return NextResponse.json({ error: 'Rate limited — max 10 requests/min' }, { status: 429 })
  }

  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'APOLLO_API_KEY not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const domain = (body.domain || '').trim().toLowerCase()

    if (!domain || domain.length < 3 || !domain.includes('.')) {
      return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
    }

    // Search Apollo for all decision-maker titles at this domain
    const allTitles = BUYING_ROLES.flatMap(r => r.titles)

    const apolloRes = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        page: 1,
        per_page: 20,
        person_titles: allTitles,
        q_organization_domains: domain,
      }),
    })

    if (!apolloRes.ok) {
      const errText = await apolloRes.text().catch(() => '')
      return NextResponse.json(
        { error: `Apollo API error (${apolloRes.status}): ${errText.slice(0, 200)}` },
        { status: 502 },
      )
    }

    const apolloData = await apolloRes.json()
    const people = apolloData.people || []

    // Map people to buying committee roles
    const committee: CommitteeMember[] = []
    const assignedRoles = new Set<string>()

    for (const roleConfig of BUYING_ROLES) {
      // Find the best match for this role
      const candidates = people.filter((p: any) => {
        const title = (p.title || '').toLowerCase()
        return roleConfig.titles.some(t => title.includes(t.toLowerCase()))
      })

      if (candidates.length > 0) {
        // Pick the most senior candidate
        const best = candidates.sort((a: any, b: any) => {
          const seniorityOrder = ['c_suite', 'vp', 'director', 'manager', 'individual_contributor']
          const aIdx = seniorityOrder.indexOf(a.seniority || 'individual_contributor')
          const bIdx = seniorityOrder.indexOf(b.seniority || 'individual_contributor')
          return aIdx - bIdx
        })[0]

        if (!assignedRoles.has(best.id)) {
          committee.push({
            role: roleConfig.role,
            name: [best.first_name, best.last_name].filter(Boolean).join(' '),
            title: best.title || '',
            email: best.email_status === 'verified' ? best.email : null,
            linkedin: best.linkedin_url || null,
            seniority: best.seniority || 'unknown',
            apolloId: best.id,
          })
          assignedRoles.add(best.id)
        }
      }
    }

    // Company info from first result
    const orgData = people[0]?.organization || {}

    return NextResponse.json({
      domain,
      company: orgData.name || domain,
      headcount: orgData.estimated_num_employees || null,
      industry: orgData.industry || null,
      committee,
      committee_size: committee.length,
      coverage: `${committee.length}/${BUYING_ROLES.length} roles identified`,
      credits_used: people.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
