/**
 * GHOST TAX — INTENT-BASED OSINT CRON
 *
 * GET /api/cron/intent-scan
 * Schedule: daily 06:00 UTC (before flywheel at 07:00)
 *
 * Scans the public web for buying intent signals:
 * funding rounds, hiring IT leaders, layoffs, M&A, compliance deadlines.
 * Finds 20-50 qualified prospects per run and injects them into the pipeline.
 *
 * Security: requires CRON_SECRET.
 * Cost: ~$2-5/day in Exa API calls.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes for batch scanning

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = req.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Dynamic import to avoid cold-start overhead if not triggered
    const { scanForIntentSignals, deduplicateAgainstPipeline } = await import("@/lib/intent-scanner");
    const { createAdminSupabase } = await import("@/lib/supabase");
    const { estimateExposure } = await import("@/lib/outreach");

    console.log("[Intent Scan] Starting daily intent scan...");

    // Phase 1: Scan for signals
    const allProspects = await scanForIntentSignals({ maxResults: 50, daysBack: 7 });
    console.log(`[Intent Scan] Found ${allProspects.length} raw prospects`);

    // Phase 2: Deduplicate
    const newProspects = await deduplicateAgainstPipeline(allProspects);
    console.log(`[Intent Scan] ${newProspects.length} new prospects after dedup`);

    // Phase 3: Inject into pipeline
    const db = createAdminSupabase();
    let injected = 0;
    let emailsSent = 0;
    let errors = 0;

    for (const prospect of newProspects) {
      if (prospect.grade === "COOL") continue; // Only inject HOT and WARM

      try {
        // Store in outreach_leads
        if (db) {
          const nextSendAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
          const locale = prospect.geoMarket === "dach" ? "de"
            : prospect.geoMarket === "fr" ? "fr" : "en";

          await (db as any).from("outreach_leads").upsert({
            email: `cfo@${prospect.domain}`, // placeholder — will be enriched
            company: prospect.companyName,
            domain: prospect.domain,
            headcount: prospect.estimatedHeadcount[0],
            industry: prospect.industry,
            locale,
            source: "intent_osint",
            status: "intent_detected",
            drip_step: 0,
            last_sent_at: null,
            next_send_at: nextSendAt,
            unsubscribed: false,
            converted: false,
            geo_market: prospect.geoMarket,
            email_quality: "corporate",
          }, { onConflict: "email", ignoreDuplicates: true });

          injected++;
        }

        // For HOT prospects, also store a vault session for enrichment
        if (prospect.grade === "HOT" && db) {
          const exposure = estimateExposure(
            prospect.estimatedHeadcount[0],
            prospect.industry,
            prospect.geoMarket,
          );

          await (db as any).from("vault_sessions").upsert({
            email: `cfo@${prospect.domain}`,
            domain: prospect.domain,
            company_name: prospect.companyName,
            headcount: prospect.estimatedHeadcount[0],
            industry: prospect.industry,
            ghost_tax_annual: exposure.annual,
            ghost_tax_low: exposure.low,
            ghost_tax_high: exposure.high,
            entropy_score: exposure.entropyScore,
            peer_percentile: exposure.peerPercentile,
            status: "intent_detected",
            session_data: {
              source: "intent_osint",
              signals: prospect.signals.map(s => ({
                category: s.category,
                evidence: s.evidence.slice(0, 200),
                strength: s.strength,
              })),
              intentScore: prospect.intentScore,
              grade: prospect.grade,
              detectedAt: prospect.detectedAt,
            },
          }, { onConflict: "email", ignoreDuplicates: true });
        }
      } catch (err) {
        errors++;
        console.error(`[Intent Scan] Failed to inject ${prospect.domain}:`, err);
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      rawProspects: allProspects.length,
      afterDedup: newProspects.length,
      injected,
      emailsSent,
      errors,
      byGrade: {
        hot: newProspects.filter(p => p.grade === "HOT").length,
        warm: newProspects.filter(p => p.grade === "WARM").length,
        cool: newProspects.filter(p => p.grade === "COOL").length,
      },
      byGeo: {
        us: newProspects.filter(p => p.geoMarket === "us").length,
        dach: newProspects.filter(p => p.geoMarket === "dach").length,
        fr: newProspects.filter(p => p.geoMarket === "fr").length,
        eu: newProspects.filter(p => p.geoMarket === "eu").length,
        other: newProspects.filter(p => p.geoMarket === "other").length,
      },
    };

    console.log(`[Intent Scan] Complete: ${injected} injected, ${errors} errors`, result.byGrade);
    return NextResponse.json(result);

  } catch (err) {
    const message = err instanceof Error ? err.message : "Intent scan failed";
    console.error("[Intent Scan] Fatal:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
