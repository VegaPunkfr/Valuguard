/**
 * GHOST TAX — S4: INTELLIGENCE PULSE
 *
 * POST /api/pulse
 * Auth: Bearer CRON_SECRET
 *
 * Orchestrates daily intelligence cycle:
 *   1. Run master cron stages (parallel batches with dependencies)
 *   2. Query pipeline stats (Supabase)
 *   3. Compile daily brief
 *   4. Send via Telegram (if bot configured)
 *   5. Adapt to day of week (Monday = weekly retro, Friday = weekly summary)
 *
 * Returns structured brief JSON regardless of Telegram availability.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

export const maxDuration = 300;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com").trim();
const CRON_SECRET = process.env.CRON_SECRET?.trim();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim();

// ── Auth ─────────────────────────────────────────────

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

// ── Cron Runner ──────────────────────────────────────

interface StageResult {
  stage: string;
  success: boolean;
  durationMs: number;
  data?: Record<string, unknown>;
  error?: string;
}

async function runCronStage(path: string): Promise<StageResult> {
  const start = Date.now();
  const name = path.split("/").pop() || path;
  try {
    const res = await fetch(`${SITE_URL}${path}`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json().catch(() => ({}));
    return { stage: name, success: res.ok, durationMs: Date.now() - start, data };
  } catch (err) {
    return { stage: name, success: false, durationMs: Date.now() - start, error: String(err) };
  }
}

// ── Pipeline Stats ───────────────────────────────────

interface PipelineStats {
  totalAudits: number;
  deliveredAudits: number;
  monthlyRevenue: number;
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  inDrip: number;
  recentEvents: { type: string; count: number }[];
  overnightPayments: number;
  overnightAbandons: number;
  overnightScans: number;
  overnightLeads: number;
}

async function queryPipelineStats(): Promise<PipelineStats | null> {
  const supabase = createAdminSupabase();
  if (!supabase) return null;

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  try {
    const [auditsRes, leadsRes, recentEventsRes] = await Promise.all([
      (supabase as any)
        .from("audit_requests")
        .select("id,status,stripe_payment_intent_id,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      (supabase as any)
        .from("outreach_leads")
        .select("id,status,converted,drip_step,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      (supabase as any)
        .from("vault_sessions")
        .select("id,created_at")
        .gte("created_at", yesterday)
        .limit(100),
    ]);

    const audits = auditsRes.data || [];
    const leads = leadsRes.data || [];
    const recentSessions = recentEventsRes.data || [];

    const delivered = audits.filter((a: any) =>
      ["delivered", "followup_scheduled", "report_persisted"].includes(a.status)
    );
    const monthlyDelivered = delivered.filter((a: any) =>
      a.created_at >= monthStart
    );
    const overnightPaid = audits.filter((a: any) =>
      a.created_at >= yesterday && a.stripe_payment_intent_id
    );

    const activeLeads = leads.filter((l: any) => ["active", "new", "contacted"].includes(l.status));
    const convertedLeads = leads.filter((l: any) => l.converted === true);
    const inDrip = leads.filter((l: any) => !l.converted && (l.drip_step || 0) > 0);
    const overnightLeads = leads.filter((l: any) => l.created_at >= yesterday);

    return {
      totalAudits: audits.length,
      deliveredAudits: delivered.length,
      monthlyRevenue: monthlyDelivered.length * 490,
      totalLeads: leads.length,
      activeLeads: activeLeads.length,
      convertedLeads: convertedLeads.length,
      inDrip: inDrip.length,
      recentEvents: [],
      overnightPayments: overnightPaid.length,
      overnightAbandons: 0,
      overnightScans: recentSessions.length,
      overnightLeads: overnightLeads.length,
    };
  } catch {
    return null;
  }
}

// ── Brief Compiler ───────────────────────────────────

interface DailyBrief {
  date: string;
  dayOfWeek: string;
  isMonday: boolean;
  isFriday: boolean;
  pipeline: PipelineStats | null;
  cronResults: StageResult[];
  cronSummary: { total: number; succeeded: number; failed: number; durationMs: number };
  priorities: string[];
  alerts: string[];
  telegramSent: boolean;
}

function compileBrief(
  stats: PipelineStats | null,
  cronResults: StageResult[],
): DailyBrief {
  const now = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = days[now.getUTCDay()];
  const isMonday = now.getUTCDay() === 1;
  const isFriday = now.getUTCDay() === 5;

  const succeeded = cronResults.filter(s => s.success).length;
  const failed = cronResults.filter(s => !s.success).length;
  const totalDuration = cronResults.reduce((sum, s) => sum + s.durationMs, 0);

  // Priorities
  const priorities: string[] = [];
  if (stats) {
    if (stats.overnightPayments > 0) priorities.push(`${stats.overnightPayments} new payment(s) overnight — follow up immediately`);
    if (stats.overnightScans > 0) priorities.push(`${stats.overnightScans} scan(s) overnight — review for hot leads`);
    if (stats.overnightLeads > 0) priorities.push(`${stats.overnightLeads} new lead(s) — enrich via Apollo`);
    if (stats.activeLeads > 10) priorities.push(`${stats.activeLeads} active leads in pipeline — prioritize outreach`);
  }
  if (priorities.length === 0) priorities.push("No overnight activity — consider running international sniper");

  // Alerts
  const alerts: string[] = [];
  if (failed > 0) {
    const failedNames = cronResults.filter(s => !s.success).map(s => s.stage);
    alerts.push(`CRON FAILURES: ${failedNames.join(", ")}`);
  }
  if (stats && stats.overnightAbandons > 2) {
    alerts.push(`${stats.overnightAbandons} checkout abandonments — investigate pricing or UX`);
  }

  return {
    date: now.toISOString().split("T")[0],
    dayOfWeek,
    isMonday,
    isFriday,
    pipeline: stats,
    cronResults,
    cronSummary: { total: cronResults.length, succeeded, failed, durationMs: totalDuration },
    priorities,
    alerts,
    telegramSent: false,
  };
}

// ── Telegram Sender ──────────────────────────────────

function formatTelegramBrief(brief: DailyBrief): string {
  const lines: string[] = [];

  lines.push(`🌅 GHOST TAX — MORNING PULSE`);
  lines.push(`${brief.dayOfWeek}, ${brief.date}`);
  lines.push("");

  if (brief.pipeline) {
    const p = brief.pipeline;
    lines.push("📊 PIPELINE");
    lines.push(`• Audits delivered: ${p.deliveredAudits}`);
    lines.push(`• Active leads: ${p.activeLeads}`);
    lines.push(`• In drip: ${p.inDrip}`);
    lines.push(`• MTD revenue: €${p.monthlyRevenue.toLocaleString()}`);
    lines.push("");

    if (p.overnightPayments || p.overnightScans || p.overnightLeads) {
      lines.push("🌙 OVERNIGHT");
      if (p.overnightPayments) lines.push(`• 💰 ${p.overnightPayments} payment(s)`);
      if (p.overnightScans) lines.push(`• 🔍 ${p.overnightScans} scan(s)`);
      if (p.overnightLeads) lines.push(`• 📥 ${p.overnightLeads} new lead(s)`);
      lines.push("");
    }
  }

  lines.push("⚡ CRONS");
  lines.push(`• ${brief.cronSummary.succeeded}/${brief.cronSummary.total} stages OK (${Math.round(brief.cronSummary.durationMs / 1000)}s)`);
  if (brief.cronSummary.failed > 0) {
    lines.push(`• ❌ Failed: ${brief.cronResults.filter(s => !s.success).map(s => s.stage).join(", ")}`);
  }
  lines.push("");

  if (brief.priorities.length > 0) {
    lines.push("🎯 PRIORITIES");
    brief.priorities.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
    lines.push("");
  }

  if (brief.alerts.length > 0) {
    lines.push("⚠️ ALERTS");
    brief.alerts.forEach(a => lines.push(`• ${a}`));
    lines.push("");
  }

  if (brief.isMonday) {
    lines.push("📅 MONDAY — Weekly planning. Review pipeline, set 5 attack targets.");
  }
  if (brief.isFriday) {
    lines.push("📅 FRIDAY — Weekly review. Check conversion rates, prep next week.");
  }

  return lines.join("\n");
}

async function sendTelegram(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Main Handler ─────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pulseStart = Date.now();
  console.log("[Pulse] ═══════════════════════════════════════════");
  console.log("[Pulse] Intelligence Pulse starting...");

  // ── Batch 1: Independent crons (parallel) ──────────
  const batch1 = await Promise.all([
    runCronStage("/api/cron/intent-scan"),
    runCronStage("/api/cron/visitor-intel"),
    runCronStage("/api/cron/osint"),
  ]);

  // ── Batch 2: Depends on Batch 1 (sequential) ──────
  const batch2 = await Promise.all([
    runCronStage("/api/cron/flywheel"),
    runCronStage("/api/cron/international-sniper"),
  ]);

  // ── Batch 3: Outreach (parallel) ──────────────────
  const batch3 = await Promise.all([
    runCronStage("/api/cron/drip"),
    runCronStage("/api/cron/checkout-recovery"),
    runCronStage("/api/cron/followup"),
  ]);

  // ── Outreach window (separate for EU business hours) ──
  const batch4 = await Promise.all([
    runCronStage("/api/cron/outreach"),
    runCronStage("/api/cron/retry-webhooks"),
  ]);

  const allResults = [...batch1, ...batch2, ...batch3, ...batch4];

  // Monday: add weekly OSINT worker
  const now = new Date();
  if (now.getUTCDay() === 1) {
    const osintWorker = await runCronStage("/api/cron/osint-worker");
    allResults.push(osintWorker);
  }

  // ── Pipeline stats ─────────────────────────────────
  const stats = await queryPipelineStats();

  // ── Compile brief ──────────────────────────────────
  const brief = compileBrief(stats, allResults);

  // ── Send Telegram ──────────────────────────────────
  const telegramText = formatTelegramBrief(brief);
  brief.telegramSent = await sendTelegram(telegramText);

  const totalDuration = Date.now() - pulseStart;

  console.log(`[Pulse] Complete: ${brief.cronSummary.succeeded}/${brief.cronSummary.total} crons OK | Telegram: ${brief.telegramSent} | ${totalDuration}ms`);
  console.log("[Pulse] ═══════════════════════════════════════════");

  return NextResponse.json({
    ...brief,
    totalDurationMs: totalDuration,
    telegramMessage: telegramText,
  });
}
