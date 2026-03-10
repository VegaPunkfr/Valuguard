import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ── Auth: x-admin-token header must match ADMIN_TOKEN env var ──
  const token = req.headers.get("x-admin-token");
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // ── Parallel queries ──
    const [auditsRes, leadsRes, eventsRes] = await Promise.all([
      (supabase as any)
        .from("audit_requests")
        .select("id,email,company_name,domain,headcount,status,stripe_payment_intent_id,run_id,delivered_at,followup_at,created_at,updated_at,locale,estimated_monthly_spend,saas_count")
        .order("created_at", { ascending: false })
        .limit(200),

      (supabase as any)
        .from("outreach_leads")
        .select("id,email,domain,company_name,headcount,industry,source,status,score,drip_step,next_send_at,last_contacted_at,converted,unsubscribed,created_at,metadata")
        .order("created_at", { ascending: false })
        .limit(500),

      (supabase as any)
        .from("events")
        .select("id,event_name,created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const audits = auditsRes.data || [];
    const leads = leadsRes.data || [];
    const events = eventsRes.data || [];

    // ── Compute stats ──
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const delivered = audits.filter((a: any) =>
      ["delivered", "followup_scheduled", "report_persisted"].includes(a.status)
    );
    const monitoring = audits.filter((a: any) => a.status === "monitoring_active");
    const failed = audits.filter((a: any) => a.status === "failed");

    // Average Rail A price across tiers (weighted toward starter)
    const railARevenue = delivered.length * 1200;
    const railBMRR = monitoring.length * 2000;

    const thisMonthDelivered = delivered.filter((a: any) =>
      new Date(a.created_at) >= thisMonthStart
    );

    const activeLeads = leads.filter((l: any) => l.status === "active" || l.status === "new" || l.status === "contacted");
    const convertedLeads = leads.filter((l: any) => l.converted === true);
    const inDrip = leads.filter((l: any) => !l.converted && !l.unsubscribed && (l.drip_step || 0) > 0);
    const unsubscribed = leads.filter((l: any) => l.unsubscribed === true);

    // Drip funnel by step
    const dripByStep: Record<number, number> = {};
    for (const l of leads) {
      const step = (l as any).drip_step || 0;
      dripByStep[step] = (dripByStep[step] || 0) + 1;
    }

    // Events by type (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentEvents = events.filter((e: any) => new Date(e.created_at) >= thirtyDaysAgo);
    const eventCounts: Record<string, number> = {};
    for (const e of recentEvents) {
      const name = (e as any).event_name;
      eventCounts[name] = (eventCounts[name] || 0) + 1;
    }

    // Locale distribution
    const localeDistrib: Record<string, number> = {};
    for (const a of audits) {
      const loc = (a as any).locale || "en";
      localeDistrib[loc] = (localeDistrib[loc] || 0) + 1;
    }

    const stats = {
      revenue: {
        total: railARevenue + railBMRR,
        railA: railARevenue,
        railBMRR,
        thisMonth: thisMonthDelivered.length * 1200,
        deals: delivered.length,
        monitoringActive: monitoring.length,
      },
      funnel: {
        totalLeads: leads.length,
        activeLeads: activeLeads.length,
        inDrip: inDrip.length,
        converted: convertedLeads.length,
        delivered: delivered.length,
        failed: failed.length,
        unsubscribed: unsubscribed.length,
        conversionRate: leads.length > 0
          ? Math.round((convertedLeads.length / leads.length) * 10000) / 100
          : 0,
      },
      drip: {
        byStep: dripByStep,
        totalInSequence: inDrip.length,
      },
      events: {
        last30Days: recentEvents.length,
        byType: eventCounts,
      },
      locale: localeDistrib,
      target: {
        goal: 7_000_000,
        current: railARevenue + railBMRR,
        percentComplete: Math.round(((railARevenue + railBMRR) / 7_000_000) * 10000) / 100,
      },
    };

    return NextResponse.json({ stats, leads, audits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
