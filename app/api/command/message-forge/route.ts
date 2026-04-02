/**
 * GHOST TAX — MESSAGE FORGE: Personalized Sequence Generator
 *
 * POST /api/command/message-forge
 *
 * Pipeline Step 3/5.
 * Takes enriched prospects (status='enriched', context_card exists),
 * generates d0/d2/d7 message sequences in prospect's language,
 * stores in enrichment_data.draft_message, sets status='draft_ready'.
 *
 * Anti-template rules enforced:
 * - References SPECIFIC detected signal
 * - Mentions estimated exposure amount
 * - d0 < 80 words, d2 < 60 words, d7 < 30 words
 * - Written in prospect's locale
 * - Ends with open question
 * - Never starts with "Je" or "Bonjour [Prénom],"
 * - Never mentions "solution", "plateforme", "logiciel"
 * - No bullet points
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ── Message Templates by Locale ─────────────────────────────

interface ProspectData {
  company_name: string
  domain: string
  locale: string
  exposure_low_eur: number
  exposure_high_eur: number
  industry: string
  headcount: number
  enrichment_data: {
    context_card: string
    pain_point: string
    hook: string
    tech_stack?: string[]
    job_signals?: Array<{ title: string }>
    funding_info?: { round?: string; amount?: string }
  }
}

function generateD0(p: ProspectData): string {
  const low = Math.round((p.exposure_low_eur || p.headcount * 800) / 1000)
  const high = Math.round((p.exposure_high_eur || p.headcount * 2500) / 1000)
  const signal = extractSignal(p)

  switch (p.locale) {
    case 'fr':
      return `${signal} chez ${p.company_name}, ca represente souvent entre ${low}k EUR et ${high}k EUR de ghost tax annuel. Avez-vous deja quantifie ce que vos licences inutilisees coutent reellement ?`
    case 'de':
      return `${signal} bei ${p.company_name} deutet auf ${low}k-${high}k EUR jahrliche Ghost Tax hin. Haben Sie schon einmal beziffert, was ungenutzte Lizenzen tatsachlich kosten?`
    case 'nl':
      return `${signal} bij ${p.company_name} wijst op ${low}k-${high}k EUR aan jaarlijkse ghost tax. Heeft u ooit berekend wat ongebruikte licenties werkelijk kosten?`
    default:
      return `${signal} at ${p.company_name} suggests ${low}k-${high}k EUR in annual ghost tax. Have you ever quantified what unused licenses actually cost?`
  }
}

function generateD2(p: ProspectData): string {
  const industry = p.industry || 'B2B tech'

  switch (p.locale) {
    case 'fr':
      return `Les entreprises ${industry} comme ${p.company_name} recuperent en moyenne 60-80% de ces montants en 90 jours. Un diagnostic de 48h suffit pour savoir si c'est votre cas ?`
    case 'de':
      return `${industry}-Unternehmen wie ${p.company_name} holen durchschnittlich 60-80% dieser Betrage innerhalb von 90 Tagen zuruck. Wurde eine 48h-Diagnostik Sinn machen?`
    case 'nl':
      return `${industry}-bedrijven zoals ${p.company_name} recupereren gemiddeld 60-80% van deze bedragen binnen 90 dagen. Zou een 48u-diagnose zinvol zijn?`
    default:
      return `${industry} companies like ${p.company_name} typically recover 60-80% of these amounts within 90 days. Would a 48h diagnostic make sense?`
  }
}

function generateD7(p: ProspectData): string {
  switch (p.locale) {
    case 'fr':
      return `Pas le bon moment — pas de souci. Je reste dispo si ca devient une priorite.`
    case 'de':
      return `Kein guter Zeitpunkt — kein Problem. Ich bin da, wenn es Prioritat wird.`
    case 'nl':
      return `Niet het juiste moment — geen probleem. Ik sta klaar wanneer het prioriteit wordt.`
    default:
      return `No worries if timing's off — happy to reconnect when it makes sense.`
  }
}

function extractSignal(p: ProspectData): string {
  const ed = p.enrichment_data

  if (ed?.job_signals?.length) {
    const job = ed.job_signals[0]
    switch (p.locale) {
      case 'fr': return `Le recrutement d'un ${job.title}`
      case 'de': return `Die Einstellung eines ${job.title}`
      case 'nl': return `De werving van een ${job.title}`
      default: return `Hiring a ${job.title}`
    }
  }

  if (ed?.tech_stack && ed.tech_stack.length > 5) {
    switch (p.locale) {
      case 'fr': return `Un stack de ${ed.tech_stack.length}+ outils SaaS`
      case 'de': return `Ein Stack von ${ed.tech_stack.length}+ SaaS-Tools`
      case 'nl': return `Een stack van ${ed.tech_stack.length}+ SaaS-tools`
      default: return `A stack of ${ed.tech_stack.length}+ SaaS tools`
    }
  }

  if (ed?.funding_info?.round) {
    switch (p.locale) {
      case 'fr': return `Une levee de fonds recente (${ed.funding_info.round})`
      case 'de': return `Eine kurzliche Finanzierungsrunde (${ed.funding_info.round})`
      case 'nl': return `Een recente financieringsronde (${ed.funding_info.round})`
      default: return `A recent funding round (${ed.funding_info.round})`
    }
  }

  switch (p.locale) {
    case 'fr': return `La croissance rapide`
    case 'de': return `Das schnelle Wachstum`
    case 'nl': return `De snelle groei`
    default: return `Rapid growth`
  }
}

export async function POST() {
  try {
    const { createAdminSupabase } = await import('@/lib/supabase')
    const supabase = createAdminSupabase()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Fetch enriched prospects with context_card
    const { data: prospects, error: fetchError } = await (supabase as any)
      .from('osint_prospects')
      .select('*')
      .eq('status', 'enriched')
      .not('enrichment_data->context_card', 'is', null)
      .order('intent_score', { ascending: false })

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    if (!prospects || prospects.length === 0) {
      return NextResponse.json({ message: 'No enriched prospects found', generated: 0 })
    }

    const results: Array<{ company: string; domain: string; d0: string; d2: string; d7: string; status: string }> = []
    let generatedCount = 0

    for (const prospect of prospects) {
      try {
        const p: ProspectData = {
          company_name: prospect.company_name,
          domain: prospect.domain,
          locale: prospect.locale || 'en',
          exposure_low_eur: prospect.exposure_low_eur || (prospect.headcount || 100) * 800,
          exposure_high_eur: prospect.exposure_high_eur || (prospect.headcount || 100) * 2500,
          industry: prospect.industry || 'Technology',
          headcount: prospect.headcount || 100,
          enrichment_data: prospect.enrichment_data || {},
        }

        const d0 = generateD0(p)
        const d2 = generateD2(p)
        const d7 = generateD7(p)

        // Store in enrichment_data.draft_message
        const updatedEnrichment = {
          ...(prospect.enrichment_data || {}),
          draft_message: { d0, d2, d7 },
          messages_generated_at: new Date().toISOString(),
        }

        const { error: updateError } = await (supabase as any)
          .from('osint_prospects')
          .update({
            enrichment_data: updatedEnrichment,
            status: 'draft_ready',
          })
          .eq('id', prospect.id)

        if (!updateError) {
          generatedCount++
          results.push({ company: prospect.company_name, domain: prospect.domain, d0, d2, d7, status: 'draft_ready' })
        }
      } catch {
        results.push({
          company: prospect.company_name,
          domain: prospect.domain,
          d0: '', d2: '', d7: '',
          status: 'error',
        })
      }
    }

    return NextResponse.json({
      message: `${generatedCount} sequences generees — pretes pour approval-queue`,
      generated: generatedCount,
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
