/**
 * GHOST TAX — AI RESEARCHER: Batch Enrichment Engine
 *
 * POST /api/command/ai-researcher
 *
 * Pipeline Step 2/5.
 * Fetches osint_prospects with intent_score >= 60 and status IN ('new','enriched'),
 * enriches via Apollo, computes Heat Score 2.0, generates context_card/pain_point/hook
 * in prospect's language, upserts enrichment_data JSONB, sets status='enriched'.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ── Heat Score 2.0 Algorithm ────────────────────────────────

interface HeatInput {
  jobSignals: Array<{ title: string; department: string; posted_at?: string }>
  techStack: string[]
  fundingInfo: { amount?: string; round?: string; date?: string } | null
  linkedinGrowth: number // percentage
  headcount: number
  industry: string
}

function computeHeatScoreV2(input: HeatInput): number {
  let score = 0

  // Recruiting signals
  for (const job of input.jobSignals) {
    const title = (job.title || '').toLowerCase()
    const dept = (job.department || '').toLowerCase()

    // Exact finance/tax titles
    if (/tax manager|head of finance|cfo|chief financial/.test(title)) {
      score += 30
    } else if (/finance|accounting|controller/.test(title) || /finance|accounting/.test(dept)) {
      score += 20
    } else if (/it|procurement|legal/.test(dept) || /it|procurement|legal/.test(title)) {
      score += 10
    }

    // Signal freshness
    if (job.posted_at) {
      const daysSince = (Date.now() - new Date(job.posted_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) score += 15
      else if (daysSince < 90) score += 5
      else score -= 15
    }
  }

  // SaaS stack
  if (input.techStack.length > 5) score += 15
  else if (input.techStack.length >= 2) score += 8

  // Funding
  if (input.fundingInfo?.date) {
    const monthsSince = (Date.now() - new Date(input.fundingInfo.date).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsSince < 6) score += 12
    else if (monthsSince < 18) score += 5
  }

  // LinkedIn growth
  if (input.linkedinGrowth > 15) score += 15
  else if (input.linkedinGrowth >= 5) score += 8

  // Sector priority
  const ind = input.industry.toLowerCase()
  if (/saas|tech|fintech|private equity|pe\b/.test(ind)) score += 10

  // Headcount sweet spot
  if (input.headcount >= 100 && input.headcount <= 500) score += 10

  return Math.min(100, Math.max(0, score))
}

// ── Context Card Generator (locale-aware) ───────────────────

function generateContextCard(
  companyName: string,
  industry: string,
  signal: string,
  painPoint: string,
  locale: string,
): string {
  switch (locale) {
    case 'fr':
      return `${companyName} est une entreprise ${industry} qui ${signal}. ${painPoint}`
    case 'de':
      return `${companyName} ist ein ${industry}-Unternehmen, das ${signal}. ${painPoint}`
    case 'nl':
      return `${companyName} is een ${industry}-bedrijf dat ${signal}. ${painPoint}`
    default:
      return `${companyName} is a ${industry} company that ${signal}. ${painPoint}`
  }
}

function generatePainPoint(headcount: number, techCount: number, locale: string): string {
  const exposureRange = `${Math.round(headcount * 0.8)}k-${Math.round(headcount * 2.5)}k`
  switch (locale) {
    case 'fr':
      return `Avec ${techCount}+ outils SaaS et ${headcount} employés, l'exposition ghost tax estimée est de ${exposureRange} EUR/an.`
    case 'de':
      return `Mit ${techCount}+ SaaS-Tools und ${headcount} Mitarbeitern beträgt die geschätzte Ghost-Tax-Exposition ${exposureRange} EUR/Jahr.`
    case 'nl':
      return `Met ${techCount}+ SaaS-tools en ${headcount} medewerkers is de geschatte ghost tax-blootstelling ${exposureRange} EUR/jaar.`
    default:
      return `With ${techCount}+ SaaS tools and ${headcount} employees, estimated ghost tax exposure is ${exposureRange} EUR/year.`
  }
}

function generateHook(signal: string, locale: string): string {
  switch (locale) {
    case 'fr':
      return `Signal détecté : ${signal} — angle d'entrée pour audit financier rapide.`
    case 'de':
      return `Signal erkannt: ${signal} — Einstiegspunkt für schnelles Finanzaudit.`
    case 'nl':
      return `Signaal gedetecteerd: ${signal} — ingang voor snelle financiële audit.`
    default:
      return `Signal detected: ${signal} — entry point for a quick financial audit.`
  }
}

export async function POST() {
  try {
    const { createAdminSupabase } = await import('@/lib/supabase')
    const supabase = createAdminSupabase()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Step 1: Fetch prospects to enrich
    const { data: prospects, error: fetchError } = await (supabase as any)
      .from('osint_prospects')
      .select('*')
      .gte('intent_score', 60)
      .in('status', ['new', 'enriched'])
      .order('intent_score', { ascending: false })
      .limit(50)

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    if (!prospects || prospects.length === 0) {
      return NextResponse.json({ message: 'No prospects to enrich', enriched: 0 })
    }

    const results: Array<{ company: string; domain: string; heatScore: number; painPoint: string; status: string }> = []
    let enrichedCount = 0

    for (const prospect of prospects) {
      try {
        // Step 2: Apollo enrichment
        let apolloData: any = {}
        try {
          const apolloRes = await fetch('https://api.apollo.io/api/v1/organizations/enrich', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': process.env.APOLLO_API_KEY || '',
            },
            body: JSON.stringify({ domain: prospect.domain }),
          })
          if (apolloRes.ok) {
            const apolloJson = await apolloRes.json()
            apolloData = apolloJson.organization || {}
          }
        } catch {
          // Apollo failed — continue with available data
        }

        // Extract Apollo fields
        const techStack = apolloData.technologies || apolloData.current_technologies?.map((t: any) => t.name) || []
        const headcount = apolloData.estimated_num_employees || prospect.headcount || 100
        const industry = apolloData.industry || prospect.industry || 'Technology'
        const fundingEvents = apolloData.funding_events || []
        const linkedinGrowth = apolloData.linkedin_employee_growth_rate_12_month || 0
        const jobSignals = prospect.enrichment_data?.job_signals || []

        // Step 3: Compute Heat Score 2.0
        const latestFunding = fundingEvents.length > 0
          ? { amount: fundingEvents[0].amount, round: fundingEvents[0].funding_round, date: fundingEvents[0].date }
          : null

        const heatScore = computeHeatScoreV2({
          jobSignals,
          techStack,
          fundingInfo: latestFunding,
          linkedinGrowth,
          headcount,
          industry,
        })

        // Step 4: Generate enrichment_data
        const locale = prospect.locale || 'en'
        const mainSignal = jobSignals.length > 0
          ? `is hiring ${jobSignals[0].title}`
          : techStack.length > 5
          ? `runs ${techStack.length}+ SaaS tools`
          : latestFunding
          ? `recently raised ${latestFunding.round || 'funding'}`
          : `operates in ${industry}`

        const painPoint = generatePainPoint(headcount, techStack.length || 5, locale)
        const contextCard = generateContextCard(
          prospect.company_name,
          industry,
          mainSignal,
          painPoint,
          locale,
        )
        const hook = generateHook(mainSignal, locale)

        const enrichmentData = {
          ...(prospect.enrichment_data || {}),
          context_card: contextCard,
          pain_point: painPoint,
          hook,
          tech_stack: techStack,
          job_signals: jobSignals,
          heat_score_v2: heatScore,
          funding_info: latestFunding,
          enriched_at: new Date().toISOString(),
        }

        // Step 5: Upsert Supabase
        const { error: updateError } = await (supabase as any)
          .from('osint_prospects')
          .update({
            enrichment_data: enrichmentData,
            intent_score: heatScore,
            headcount,
            industry,
            status: 'enriched',
          })
          .eq('id', prospect.id)

        if (!updateError) {
          enrichedCount++
          results.push({
            company: prospect.company_name,
            domain: prospect.domain,
            heatScore,
            painPoint,
            status: 'enriched',
          })
        }
      } catch {
        results.push({
          company: prospect.company_name,
          domain: prospect.domain,
          heatScore: prospect.intent_score || 0,
          painPoint: 'Error during enrichment',
          status: 'error',
        })
      }
    }

    return NextResponse.json({
      message: `${enrichedCount} prospects enrichis — prets pour message-forge`,
      enriched: enrichedCount,
      total: prospects.length,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
