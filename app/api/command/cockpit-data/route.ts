/**
 * GHOST TAX — COCKPIT LIVE DATA
 *
 * GET /api/command/cockpit-data
 *
 * Single endpoint that returns everything the cockpit V4 needs:
 * - outreach_leads (prospects pipeline)
 * - osint_prospects (OSINT signals)
 * - vault_sessions (scan funnel)
 * - visitor_intel_pipeline (visitor intel)
 * - audit_requests (revenue data)
 *
 * Auth: x-command-key header must match COMMAND_SECRET or CRON_SECRET
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key =
    req.headers.get("x-command-key") ||
    req.nextUrl.searchParams.get("key") ||
    "";
  const commandSecret = process.env.COMMAND_SECRET || "";
  const cronSecret = process.env.CRON_SECRET || "";

  if (!key || (key !== commandSecret && key !== cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { createAdminSupabase } = await import("@/lib/supabase");
    const supabase = createAdminSupabase();

    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Parallel queries for all data sources
    const [leadsRes, osintRes, vaultRes, visitorsRes, auditsRes] =
      await Promise.all([
        (supabase as any)
          .from("outreach_leads")
          .select(
            "id,email,domain,company_name,headcount,industry,source,status,score,drip_step,next_send_at,last_contacted_at,locale,geo_market,metadata,created_at"
          )
          .order("score", { ascending: false })
          .limit(200),

        (supabase as any)
          .from("osint_prospects")
          .select(
            "id,domain,company_name,industry,headcount,exposure_low_eur,exposure_high_eur,geo_market,intent_score,signals,grade,created_at"
          )
          .order("intent_score", { ascending: false })
          .limit(50),

        (supabase as any)
          .from("vault_sessions")
          .select(
            "id,email,company_name,ghost_tax_annual,headcount,industry,country,entropy_score,peer_percentile,status,created_at,converted_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),

        (supabase as any)
          .from("visitor_intel_pipeline")
          .select(
            "id,company,domain,country,city,visit_score,pages_viewed,high_intent,tech_mentions,status,created_at"
          )
          .order("visit_score", { ascending: false })
          .limit(50),

        (supabase as any)
          .from("audit_requests")
          .select(
            "id,email,company_name,domain,headcount,status,stripe_payment_intent_id,created_at,delivered_at,locale"
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    const leads = leadsRes.data || [];
    const osint = osintRes.data || [];
    const vault = vaultRes.data || [];
    const visitors = visitorsRes.data || [];
    const audits = auditsRes.data || [];

    // Compute revenue stats
    const delivered = audits.filter((a: any) =>
      ["delivered", "followup_scheduled", "report_persisted"].includes(a.status)
    );
    const railACount = delivered.length;
    const railARevenue = railACount * 490;

    return NextResponse.json({
      leads,
      osint,
      vault,
      visitors,
      audits,
      revenue: {
        railACount,
        railARevenue,
        totalAudits: audits.length,
        totalLeads: leads.length,
        totalScans: vault.length,
        hotLeads: leads.filter((l: any) => l.score >= 80).length,
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        leads: [],
        osint: [],
        vault: [],
        visitors: [],
        audits: [],
        revenue: {},
      },
      { status: 500 }
    );
  }
}
