/**
 * GHOST TAX — REVENUE INTELLIGENCE ENGINE (SERVER-ONLY)
 *
 * Real-time visibility into pipeline health, conversion rates,
 * cohort analysis, and revenue forecasting.
 *
 * Data sources:
 *   - audit_requests: revenue, deal flow, delivery state
 *   - outreach_leads: pipeline, conviction, drip state
 *   - vault_sessions: scan activity (if table exists)
 *   - events: funnel engagement, viral metrics
 *
 * All monetary values in EUR unless noted otherwise.
 */

import { createAdminSupabase } from "@/lib/supabase";
import { REVENUE_MODEL, RAIL_A_PRICE, RAILS } from "@/lib/pricing";

// ── Types ─────────────────────────────────────────────────

export interface RevenueDashboard {
  mrr: number;
  arr: number;
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  growthRate: number;

  pipeline: {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    avgConviction: number;
    totalPipelineValueEur: number;
    buyingCommittees: number;
  };

  funnel: {
    scansToday: number;
    scansThisWeek: number;
    scansThisMonth: number;
    checkoutsStarted: number;
    checkoutsCompleted: number;
    conversionRate: number;
    avgDealSize: number;
    avgTimeToClose: number;
  };

  emailHealth: {
    sentToday: number;
    sentThisWeek: number;
    openRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    deliverabilityScore: number;
  };

  viral: {
    kFactor: number;
    referralScans: number;
    competitorScans: number;
    boardShares: number;
    viralRevenue: number;
  };

  cronHealth: {
    allHealthy: boolean;
    lastRuns: Record<string, { ranAt: string; success: boolean; duration: number }>;
    failedInLast24h: string[];
  };

  targets: {
    monthlyTarget: number;
    monthlyActual: number;
    progressPercent: number;
    onTrack: boolean;
    projectedMonthEnd: number;
  };

  generatedAt: string;
}

export interface PipelineMetrics {
  totalLeads: number;
  byGrade: { hot: number; warm: number; cool: number; cold: number };
  totalPipelineValueEur: number;
  weightedPipelineEur: number;
  avgConviction: number;
  buyingCommittees: number;
  topDomains: { domain: string; score: number; headcount: number }[];
}

export interface FunnelMetrics {
  period: string;
  scans: number;
  checkoutsStarted: number;
  checkoutsCompleted: number;
  scanToCheckoutRate: number;
  checkoutToPaymentRate: number;
  overallConversionRate: number;
  avgDealSize: number;
  avgTimeToClose: number;
  revenueInPeriod: number;
}

export interface CohortData {
  cohort: string; // YYYY-MM
  leadsEntered: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  avgDealSize: number;
  ltv: number;
  retainedMonth1: number;
  retainedMonth2: number;
  retainedMonth3: number;
}

export interface ForecastData {
  months: ForecastMonth[];
  totalProjected: number;
  confidenceBand: { low: number; high: number };
  assumptions: string[];
}

interface ForecastMonth {
  month: string; // YYYY-MM
  projectedRevenue: number;
  projectedDeals: number;
  projectedMRR: number;
  cumulativeRevenue: number;
  target: number;
  cumulativeTarget: number;
}

export interface CronHealthReport {
  allHealthy: boolean;
  crons: CronStatus[];
  failedInLast24h: string[];
}

interface CronStatus {
  name: string;
  path: string;
  schedule: string;
  expectedIntervalMinutes: number;
  lastRunAt: string | null;
  lastSuccess: boolean;
  lastDurationMs: number;
  healthy: boolean;
  overdueMinutes: number;
}

// ── Cron schedule definitions ─────────────────────────────

const CRON_DEFINITIONS = [
  { name: "master", path: "/api/cron/master", schedule: "0 6 * * *", intervalMin: 1440 },
  { name: "intent-scan", path: "/api/cron/intent-scan", schedule: "0 6 * * *", intervalMin: 1440 },
  { name: "checkout-recovery", path: "/api/cron/checkout-recovery", schedule: "0 */4 * * *", intervalMin: 240 },
  { name: "flywheel", path: "/api/cron/flywheel", schedule: "0 7 * * *", intervalMin: 1440 },
  { name: "retry-webhooks", path: "/api/cron/retry-webhooks", schedule: "*/5 * * * *", intervalMin: 5 },
  { name: "followup", path: "/api/cron/followup", schedule: "0 9 * * *", intervalMin: 1440 },
  { name: "outreach", path: "/api/cron/outreach", schedule: "0 10 * * *", intervalMin: 1440 },
  { name: "visitor-intel", path: "/api/cron/visitor-intel", schedule: "0 */6 * * *", intervalMin: 360 },
  { name: "osint-worker", path: "/api/cron/osint-worker", schedule: "0 3 * * 0", intervalMin: 10080 },
  { name: "drip", path: "/api/cron/drip", schedule: "0 */4 * * *", intervalMin: 240 },
];

// ── Revenue target milestones (from pricing.ts REVENUE_MODEL) ──

const REVENUE_TARGETS: { month: number; mrr: number; cumulative: number }[] = [
  { month: 3, mrr: 4_000, cumulative: 70_000 },
  { month: 6, mrr: 40_000, cumulative: 470_000 },
  { month: 9, mrr: 100_000, cumulative: 1_100_000 },
  { month: 12, mrr: 200_000, cumulative: 2_200_000 },
  { month: 15, mrr: 280_000, cumulative: 3_500_000 },
  { month: 18, mrr: 350_000, cumulative: 5_100_000 },
];

// ── Helpers ───────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Estimate deal size from audit request metadata */
function estimateDealSize(audit: any): number {
  // Check metadata for amount
  if (audit.metadata?.amount) return parseInt(audit.metadata.amount) || 0;
  // Check price field
  if (audit.price) return audit.price;
  // Infer from headcount/tier
  const headcount = audit.headcount || 0;
  return RAIL_A_PRICE.eur;
}

/** Estimate lead pipeline value based on conviction score */
function estimateLeadValue(lead: any): number {
  const score = lead.score || 0;
  const baseDeal = RAIL_A_PRICE.eur;

  // Weight by conviction (score 0-100 maps to probability)
  return Math.round(baseDeal * (score / 100));
}

// ── Core Query Layer ─────────────────────────────────────

async function fetchAudits() {
  const supabase = createAdminSupabase();
  if (!supabase) return [];
  const { data } = await (supabase as any)
    .from("audit_requests")
    .select("id,email,company_name,domain,headcount,status,stripe_payment_intent_id,run_id,delivered_at,followup_at,created_at,updated_at,locale,estimated_monthly_spend,saas_count,metadata,price,rail")
    .order("created_at", { ascending: false })
    .limit(2000);
  return data || [];
}

async function fetchLeads() {
  const supabase = createAdminSupabase();
  if (!supabase) return [];
  const { data } = await (supabase as any)
    .from("outreach_leads")
    .select("id,email,domain,company_name,headcount,industry,source,status,score,drip_step,next_send_at,last_contacted_at,converted,unsubscribed,created_at,metadata,conviction_score,estimated_deal_size")
    .order("created_at", { ascending: false })
    .limit(5000);
  return data || [];
}

async function fetchEvents(sinceDays: number = 90) {
  const supabase = createAdminSupabase();
  if (!supabase) return [];
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await (supabase as any)
    .from("events")
    .select("id,event_name,properties,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10000);
  return data || [];
}

async function fetchVaultSessions(sinceDays: number = 90) {
  const supabase = createAdminSupabase();
  if (!supabase) return [];
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data } = await (supabase as any)
      .from("vault_sessions")
      .select("id,email,domain,company_name,headcount,industry,created_at,checkout_started_at,stripe_payment_intent_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    return data || [];
  } catch {
    // Table may not exist
    return [];
  }
}

async function fetchCronRuns() {
  const supabase = createAdminSupabase();
  if (!supabase) return [];
  try {
    const { data } = await (supabase as any)
      .from("cron_runs")
      .select("id,cron_name,started_at,completed_at,success,duration_ms,error_message")
      .order("started_at", { ascending: false })
      .limit(200);
    return data || [];
  } catch {
    // Table may not exist — cron_runs is optional
    return [];
  }
}

async function fetchEmailStats() {
  const supabase = createAdminSupabase();
  if (!supabase) return { sent: [], bounces: 0, unsubscribes: 0 };
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await (supabase as any)
      .from("email_logs")
      .select("id,type,status,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    return { sent: data || [], bounces: 0, unsubscribes: 0 };
  } catch {
    return { sent: [], bounces: 0, unsubscribes: 0 };
  }
}

// ── Revenue Computation ──────────────────────────────────

const PAID_STATUSES = new Set(["delivered", "followup_scheduled", "report_persisted", "monitoring_active"]);
const MONITORING_STATUSES = new Set(["monitoring_active"]);

function computeRevenueMetrics(audits: any[]) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const paid = audits.filter((a: any) => PAID_STATUSES.has(a.status));
  const monitoring = audits.filter((a: any) => MONITORING_STATUSES.has(a.status));

  // Total revenue from paid deals
  let totalRevenue = 0;
  for (const a of paid) {
    totalRevenue += estimateDealSize(a);
  }

  // MRR from monitoring subscriptions
  const mrr = monitoring.length * RAILS.B_MONITOR.price_eur;
  const arr = mrr * 12;

  // This month revenue
  const thisMonthPaid = paid.filter((a: any) => new Date(a.created_at) >= thisMonthStart);
  let revenueThisMonth = 0;
  for (const a of thisMonthPaid) {
    revenueThisMonth += estimateDealSize(a);
  }
  revenueThisMonth += mrr; // Include MRR

  // Last month revenue
  const lastMonthPaid = paid.filter((a: any) => {
    const d = new Date(a.created_at);
    return d >= lastMonthStart && d < thisMonthStart;
  });
  let revenueLastMonth = 0;
  for (const a of lastMonthPaid) {
    revenueLastMonth += estimateDealSize(a);
  }
  revenueLastMonth += mrr; // Approximate

  // MoM growth
  const growthRate = revenueLastMonth > 0
    ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 10000) / 100
    : revenueThisMonth > 0 ? 100 : 0;

  return { mrr, arr, totalRevenue, revenueThisMonth, revenueLastMonth, growthRate };
}

// ── Pipeline Computation ─────────────────────────────────

function computePipeline(leads: any[]): RevenueDashboard["pipeline"] {
  const active = leads.filter((l: any) => !l.converted && !l.unsubscribed);

  let hotLeads = 0, warmLeads = 0, coldLeads = 0;
  let totalScore = 0;
  let totalPipelineValue = 0;
  const domainStakeholders: Record<string, number> = {};

  for (const l of active) {
    const score = l.conviction_score || l.score || 0;
    totalScore += score;

    if (score >= 80) hotLeads++;
    else if (score >= 50) warmLeads++;
    else coldLeads++;

    totalPipelineValue += estimateLeadValue(l);

    // Track buying committees (2+ stakeholders per domain)
    if (l.domain) {
      domainStakeholders[l.domain] = (domainStakeholders[l.domain] || 0) + 1;
    }
  }

  const buyingCommittees = Object.values(domainStakeholders).filter((c) => c >= 2).length;
  const avgConviction = active.length > 0 ? Math.round(totalScore / active.length) : 0;

  return {
    totalLeads: active.length,
    hotLeads,
    warmLeads,
    coldLeads,
    avgConviction,
    totalPipelineValueEur: totalPipelineValue,
    buyingCommittees,
  };
}

// ── Funnel Computation ───────────────────────────────────

function computeFunnel(
  audits: any[],
  events: any[],
  sessions: any[],
  periodStart: Date
): RevenueDashboard["funnel"] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  // Scans from vault_sessions or events
  const scansToday = sessions.filter((s: any) => new Date(s.created_at) >= todayStart).length;
  const scansThisWeek = sessions.filter((s: any) => new Date(s.created_at) >= weekStart).length;
  const scansThisMonth = sessions.filter((s: any) => new Date(s.created_at) >= monthStart).length;

  // If no vault_sessions, estimate from events
  const scanEventsMonth = scansThisMonth || events.filter(
    (e: any) => e.event_name === "intel.detection_started" && new Date(e.created_at) >= monthStart
  ).length;

  // Checkout events
  const checkoutEvents = events.filter(
    (e: any) => (e.event_name === "conversion.checkout_started" || e.event_name === "conversion.checkout_after_trust") &&
    new Date(e.created_at) >= periodStart
  );
  const checkoutsStarted = checkoutEvents.length || sessions.filter((s: any) =>
    s.checkout_started_at && new Date(s.created_at) >= periodStart
  ).length;

  // Completed checkouts = paid audits
  const paidInPeriod = audits.filter((a: any) =>
    PAID_STATUSES.has(a.status) && new Date(a.created_at) >= periodStart
  );
  const checkoutsCompleted = paidInPeriod.length;

  // Conversion rate: scan → paid
  const totalScansInPeriod = scanEventsMonth || scansThisMonth || 1;
  const conversionRate = totalScansInPeriod > 0
    ? Math.round((checkoutsCompleted / totalScansInPeriod) * 10000) / 100
    : 0;

  // Average deal size
  let totalDealValue = 0;
  for (const a of paidInPeriod) {
    totalDealValue += estimateDealSize(a);
  }
  const avgDealSize = checkoutsCompleted > 0 ? Math.round(totalDealValue / checkoutsCompleted) : 0;

  // Average time to close
  let totalDays = 0;
  let closedWithScan = 0;
  for (const a of paidInPeriod) {
    if (a.domain) {
      // Find matching session
      const session = sessions.find((s: any) => s.domain === a.domain);
      if (session) {
        const days = daysBetween(new Date(session.created_at), new Date(a.created_at));
        totalDays += days;
        closedWithScan++;
      }
    }
  }
  const avgTimeToClose = closedWithScan > 0 ? Math.round(totalDays / closedWithScan) : 0;

  return {
    scansToday: scansToday || 0,
    scansThisWeek: scansThisWeek || 0,
    scansThisMonth: scansThisMonth || scanEventsMonth,
    checkoutsStarted,
    checkoutsCompleted,
    conversionRate,
    avgDealSize,
    avgTimeToClose,
  };
}

// ── Email Health ─────────────────────────────────────────

function computeEmailHealth(
  emailData: { sent: any[]; bounces: number; unsubscribes: number },
  leads: any[],
  events: any[]
): RevenueDashboard["emailHealth"] {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);

  const sentEmails = emailData.sent;
  const sentToday = sentEmails.filter((e: any) => new Date(e.created_at) >= todayStart).length;
  const sentThisWeek = sentEmails.filter((e: any) => new Date(e.created_at) >= weekStart).length;

  // Estimate from drip activity if no email_logs
  const dripLeads = leads.filter((l: any) => l.last_contacted_at);
  const recentDrips = dripLeads.filter((l: any) => new Date(l.last_contacted_at) >= weekStart).length;
  const effectiveSentWeek = sentThisWeek || recentDrips;

  // Bounce rate estimate
  const totalLeads = leads.length || 1;
  const unsubscribed = leads.filter((l: any) => l.unsubscribed).length;
  const unsubscribeRate = Math.round((unsubscribed / totalLeads) * 10000) / 100;

  // Open rate — estimate from conversion events
  const openEvents = events.filter((e: any) =>
    e.event_name?.includes("viewed") || e.event_name?.includes("clicked")
  ).length;
  const estimatedSent = sentEmails.length || dripLeads.length || 1;
  const openRate = Math.min(85, Math.round((openEvents / estimatedSent) * 100));

  // Bounce rate: typically 2-5% for cold outreach
  const bounceRate = sentEmails.length > 0
    ? Math.round((emailData.bounces / sentEmails.length) * 10000) / 100
    : 2.5; // Default estimate

  // Deliverability score (0-100)
  const deliverabilityScore = Math.max(0, Math.min(100,
    100 - (bounceRate * 5) - (unsubscribeRate * 3)
  ));

  return {
    sentToday: sentToday || 0,
    sentThisWeek: effectiveSentWeek,
    openRate,
    bounceRate,
    unsubscribeRate,
    deliverabilityScore: Math.round(deliverabilityScore),
  };
}

// ── Viral Metrics ────────────────────────────────────────

function computeViralMetrics(events: any[], audits: any[]): RevenueDashboard["viral"] {
  const viralEvents = {
    referralScans: 0,
    competitorScans: 0,
    boardShares: 0,
  };

  for (const e of events) {
    const name = e.event_name || "";
    if (name.includes("referral") || name.includes("share")) viralEvents.referralScans++;
    if (name.includes("competitor")) viralEvents.competitorScans++;
    if (name.includes("board") || name === "circulation.board_copied") viralEvents.boardShares++;
  }

  // Memo copies = viral signal (CFO sharing with team)
  const memoCopies = events.filter((e: any) =>
    e.event_name?.includes("memo_copied") ||
    e.event_name?.includes("procurement_copied") ||
    e.event_name?.includes("board_copied")
  ).length;

  // K-factor: (invitations per user) * (conversion rate of invitations)
  // Proxy: memo copies * conversion rate
  const totalPaid = audits.filter((a: any) => PAID_STATUSES.has(a.status)).length;
  const invitationsPerUser = totalPaid > 0 ? (memoCopies + viralEvents.boardShares) / totalPaid : 0;
  const viralConversionRate = 0.05; // Conservative 5% estimate
  const kFactor = Math.round(invitationsPerUser * viralConversionRate * 100) / 100;

  // Viral revenue estimate
  const viralRevenue = Math.round(viralEvents.referralScans * RAIL_A_PRICE.eur * 0.04); // 4% conversion

  return {
    kFactor,
    referralScans: viralEvents.referralScans,
    competitorScans: viralEvents.competitorScans,
    boardShares: viralEvents.boardShares + memoCopies,
    viralRevenue,
  };
}

// ── Cron Health ──────────────────────────────────────────

function computeCronHealth(cronRuns: any[]): RevenueDashboard["cronHealth"] {
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  const lastRuns: Record<string, { ranAt: string; success: boolean; duration: number }> = {};
  const failedInLast24h: string[] = [];

  for (const def of CRON_DEFINITIONS) {
    // Find the most recent run for this cron
    const runs = cronRuns.filter((r: any) => r.cron_name === def.name);
    const latest = runs[0]; // Already sorted desc

    if (latest) {
      lastRuns[def.name] = {
        ranAt: latest.started_at || latest.completed_at,
        success: latest.success !== false,
        duration: latest.duration_ms || 0,
      };

      // Check for failures in last 24h
      const recentFails = runs.filter((r: any) =>
        r.success === false && new Date(r.started_at).getTime() > twentyFourHoursAgo
      );
      if (recentFails.length > 0) {
        failedInLast24h.push(def.name);
      }
    } else {
      // No runs recorded — may be healthy (cron_runs table is optional)
      lastRuns[def.name] = {
        ranAt: "never",
        success: true,
        duration: 0,
      };
    }
  }

  const allHealthy = failedInLast24h.length === 0;

  return { allHealthy, lastRuns, failedInLast24h };
}

// ── Targets Computation ──────────────────────────────────

function computeTargets(revenueThisMonth: number): RevenueDashboard["targets"] {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Find current target based on months since product launch
  // Assume launch was January 2026 (adjust as needed)
  const launchDate = new Date(2026, 0, 1);
  const monthsSinceLaunch = Math.max(1,
    (now.getFullYear() - launchDate.getFullYear()) * 12 +
    (now.getMonth() - launchDate.getMonth())
  );

  // Interpolate target from milestones
  let monthlyTarget = 4_000; // Default month 3 target
  for (let i = 0; i < REVENUE_TARGETS.length; i++) {
    if (monthsSinceLaunch <= REVENUE_TARGETS[i].month) {
      const prev = i > 0 ? REVENUE_TARGETS[i - 1] : { month: 0, mrr: 0 };
      const curr = REVENUE_TARGETS[i];
      const progress = (monthsSinceLaunch - prev.month) / (curr.month - prev.month);
      monthlyTarget = Math.round(prev.mrr + (curr.mrr - prev.mrr) * progress);
      break;
    }
    if (i === REVENUE_TARGETS.length - 1) {
      monthlyTarget = REVENUE_TARGETS[i].mrr;
    }
  }

  const progressPercent = monthlyTarget > 0
    ? Math.round((revenueThisMonth / monthlyTarget) * 10000) / 100
    : 0;

  // Project month-end based on daily run rate
  const dailyRate = dayOfMonth > 0 ? revenueThisMonth / dayOfMonth : 0;
  const projectedMonthEnd = Math.round(dailyRate * daysInMonth);

  const onTrack = projectedMonthEnd >= monthlyTarget * 0.8; // 80% threshold

  return {
    monthlyTarget,
    monthlyActual: revenueThisMonth,
    progressPercent,
    onTrack,
    projectedMonthEnd,
  };
}

// ── Public API ────────────────────────────────────────────

export async function getRevenueDashboard(): Promise<RevenueDashboard> {
  const [audits, leads, events, sessions, cronRuns, emailData] = await Promise.all([
    fetchAudits(),
    fetchLeads(),
    fetchEvents(90),
    fetchVaultSessions(90),
    fetchCronRuns(),
    fetchEmailStats(),
  ]);

  const now = new Date();
  const monthStart = startOfMonth(now);

  const revenue = computeRevenueMetrics(audits);
  const pipeline = computePipeline(leads);
  const funnel = computeFunnel(audits, events, sessions, monthStart);
  const emailHealth = computeEmailHealth(emailData, leads, events);
  const viral = computeViralMetrics(events, audits);
  const cronHealth = computeCronHealth(cronRuns);
  const targets = computeTargets(revenue.revenueThisMonth);

  return {
    ...revenue,
    pipeline,
    funnel,
    emailHealth,
    viral,
    cronHealth,
    targets,
    generatedAt: new Date().toISOString(),
  };
}

export async function getPipelineValue(): Promise<PipelineMetrics> {
  const leads = await fetchLeads();
  const active = leads.filter((l: any) => !l.converted && !l.unsubscribed);

  let hot = 0, warm = 0, cool = 0, cold = 0;
  let totalScore = 0;
  let totalPipelineValue = 0;
  let weightedPipeline = 0;
  const domainStakeholders: Record<string, number> = {};
  const topDomainsMap: Map<string, { score: number; headcount: number }> = new Map();

  for (const l of active) {
    const score = l.conviction_score || l.score || 0;
    totalScore += score;

    if (score >= 80) hot++;
    else if (score >= 60) warm++;
    else if (score >= 40) cool++;
    else cold++;

    const dealSize = l.estimated_deal_size || estimateLeadValue(l);
    totalPipelineValue += dealSize;
    weightedPipeline += Math.round(dealSize * (score / 100));

    if (l.domain) {
      domainStakeholders[l.domain] = (domainStakeholders[l.domain] || 0) + 1;
      if (!topDomainsMap.has(l.domain) || score > (topDomainsMap.get(l.domain)?.score || 0)) {
        topDomainsMap.set(l.domain, { score, headcount: l.headcount || 0 });
      }
    }
  }

  const buyingCommittees = Object.values(domainStakeholders).filter((c) => c >= 2).length;
  const avgConviction = active.length > 0 ? Math.round(totalScore / active.length) : 0;

  // Top domains by score
  const topDomains = Array.from(topDomainsMap.entries())
    .map(([domain, data]) => ({ domain, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return {
    totalLeads: active.length,
    byGrade: { hot, warm, cool, cold },
    totalPipelineValueEur: totalPipelineValue,
    weightedPipelineEur: weightedPipeline,
    avgConviction,
    buyingCommittees,
    topDomains,
  };
}

export async function getFunnelMetrics(
  period: "day" | "week" | "month" | "quarter"
): Promise<FunnelMetrics> {
  const now = new Date();
  let periodStart: Date;
  switch (period) {
    case "day": periodStart = startOfDay(now); break;
    case "week": periodStart = startOfWeek(now); break;
    case "month": periodStart = startOfMonth(now); break;
    case "quarter": periodStart = startOfQuarter(now); break;
  }

  const [audits, events, sessions] = await Promise.all([
    fetchAudits(),
    fetchEvents(90),
    fetchVaultSessions(90),
  ]);

  const periodAudits = audits.filter((a: any) => new Date(a.created_at) >= periodStart);
  const periodEvents = events.filter((e: any) => new Date(e.created_at) >= periodStart);
  const periodSessions = sessions.filter((s: any) => new Date(s.created_at) >= periodStart);

  const scans = periodSessions.length ||
    periodEvents.filter((e: any) => e.event_name === "intel.detection_started").length;

  const checkoutsStarted = periodEvents.filter((e: any) =>
    e.event_name === "conversion.checkout_started" ||
    e.event_name === "conversion.checkout_after_trust"
  ).length || periodSessions.filter((s: any) => s.checkout_started_at).length;

  const paid = periodAudits.filter((a: any) => PAID_STATUSES.has(a.status));
  const checkoutsCompleted = paid.length;

  const scanToCheckoutRate = scans > 0 ? Math.round((checkoutsStarted / scans) * 10000) / 100 : 0;
  const checkoutToPaymentRate = checkoutsStarted > 0 ? Math.round((checkoutsCompleted / checkoutsStarted) * 10000) / 100 : 0;
  const overallConversionRate = scans > 0 ? Math.round((checkoutsCompleted / scans) * 10000) / 100 : 0;

  let totalRevInPeriod = 0;
  for (const a of paid) {
    totalRevInPeriod += estimateDealSize(a);
  }
  const avgDealSize = checkoutsCompleted > 0 ? Math.round(totalRevInPeriod / checkoutsCompleted) : 0;

  // Time to close
  let totalDays = 0;
  let matched = 0;
  for (const a of paid) {
    if (a.domain) {
      const session = sessions.find((s: any) => s.domain === a.domain);
      if (session) {
        totalDays += daysBetween(new Date(session.created_at), new Date(a.created_at));
        matched++;
      }
    }
  }

  return {
    period,
    scans,
    checkoutsStarted,
    checkoutsCompleted,
    scanToCheckoutRate,
    checkoutToPaymentRate,
    overallConversionRate,
    avgDealSize,
    avgTimeToClose: matched > 0 ? Math.round(totalDays / matched) : 0,
    revenueInPeriod: totalRevInPeriod,
  };
}

export async function getCohortAnalysis(): Promise<CohortData[]> {
  const [audits, leads] = await Promise.all([fetchAudits(), fetchLeads()]);

  // Group leads by month of creation
  const cohorts: Map<string, {
    leads: any[];
    audits: any[];
  }> = new Map();

  for (const l of leads) {
    const key = monthKey(new Date(l.created_at));
    if (!cohorts.has(key)) cohorts.set(key, { leads: [], audits: [] });
    cohorts.get(key)!.leads.push(l);
  }

  // Match audits to cohorts by email/domain
  for (const a of audits) {
    const key = monthKey(new Date(a.created_at));
    if (!cohorts.has(key)) cohorts.set(key, { leads: [], audits: [] });
    cohorts.get(key)!.audits.push(a);
  }

  const result: CohortData[] = [];

  for (const [month, data] of cohorts) {
    const leadsEntered = data.leads.length;
    const conversions = data.leads.filter((l: any) => l.converted).length +
      data.audits.filter((a: any) => PAID_STATUSES.has(a.status)).length;

    let revenue = 0;
    for (const a of data.audits.filter((a: any) => PAID_STATUSES.has(a.status))) {
      revenue += estimateDealSize(a);
    }

    const conversionRate = leadsEntered > 0 ? Math.round((conversions / leadsEntered) * 10000) / 100 : 0;
    const avgDealSize = conversions > 0 ? Math.round(revenue / conversions) : 0;

    // Retention: leads still active after 1/2/3 months
    const cohortDate = new Date(month + "-01");
    const m1 = new Date(cohortDate); m1.setMonth(m1.getMonth() + 1);
    const m2 = new Date(cohortDate); m2.setMonth(m2.getMonth() + 2);
    const m3 = new Date(cohortDate); m3.setMonth(m3.getMonth() + 3);
    const now = new Date();

    const retainedMonth1 = now >= m1
      ? data.leads.filter((l: any) => !l.unsubscribed || new Date(l.updated_at || l.created_at) >= m1).length
      : leadsEntered;
    const retainedMonth2 = now >= m2
      ? data.leads.filter((l: any) => !l.unsubscribed || new Date(l.updated_at || l.created_at) >= m2).length
      : leadsEntered;
    const retainedMonth3 = now >= m3
      ? data.leads.filter((l: any) => !l.unsubscribed || new Date(l.updated_at || l.created_at) >= m3).length
      : leadsEntered;

    // LTV estimate: revenue + potential Rail B upsell
    const upsellPotential = conversions * RAILS.B_STABILIZE.price_eur * (REVENUE_MODEL.conversion_targets.detect_to_stabilize);
    const ltv = conversions > 0 ? Math.round((revenue + upsellPotential) / conversions) : 0;

    result.push({
      cohort: month,
      leadsEntered,
      conversions,
      conversionRate,
      revenue,
      avgDealSize,
      ltv,
      retainedMonth1,
      retainedMonth2,
      retainedMonth3,
    });
  }

  return result.sort((a, b) => b.cohort.localeCompare(a.cohort));
}

export async function getRevenueForecast(months: number = 6): Promise<ForecastData> {
  const audits = await fetchAudits();
  const now = new Date();

  // Calculate historical monthly revenue
  const monthlyRevenue: Record<string, number> = {};
  const monthlyDeals: Record<string, number> = {};
  for (const a of audits) {
    if (!PAID_STATUSES.has(a.status)) continue;
    const key = monthKey(new Date(a.created_at));
    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + estimateDealSize(a);
    monthlyDeals[key] = (monthlyDeals[key] || 0) + 1;
  }

  // Calculate growth rate from last 3 months
  const sortedMonths = Object.keys(monthlyRevenue).sort();
  const recentMonths = sortedMonths.slice(-3);
  let avgGrowthRate = 0.15; // Default 15% MoM

  if (recentMonths.length >= 2) {
    let totalGrowth = 0;
    let growthPeriods = 0;
    for (let i = 1; i < recentMonths.length; i++) {
      const prev = monthlyRevenue[recentMonths[i - 1]] || 0;
      const curr = monthlyRevenue[recentMonths[i]] || 0;
      if (prev > 0) {
        totalGrowth += (curr - prev) / prev;
        growthPeriods++;
      }
    }
    if (growthPeriods > 0) {
      avgGrowthRate = totalGrowth / growthPeriods;
    }
  }

  // Last month's revenue as base
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const baseRevenue = monthlyRevenue[lastMonthKey] || 0;
  const baseDeals = monthlyDeals[lastMonthKey] || 0;

  // Project forward
  const forecastMonths: ForecastMonth[] = [];
  let cumulative = Object.values(monthlyRevenue).reduce((s, v) => s + v, 0);
  let currentRevenue = baseRevenue;
  let currentDeals = baseDeals;

  // Calculate cumulative target up to now
  const launchDate = new Date(2026, 0, 1);
  const monthsSinceLaunch = Math.max(1,
    (now.getFullYear() - launchDate.getFullYear()) * 12 + (now.getMonth() - launchDate.getMonth())
  );

  for (let i = 1; i <= months; i++) {
    const projMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = monthKey(projMonth);

    // Apply growth with diminishing acceleration
    const growthMultiplier = Math.max(1, 1 + avgGrowthRate * Math.pow(0.95, i));
    currentRevenue = Math.round(currentRevenue * growthMultiplier);
    currentDeals = Math.max(1, Math.round(currentDeals * growthMultiplier));
    cumulative += currentRevenue;

    // Get target for this month
    const forecastMonth = monthsSinceLaunch + i;
    let target = 0;
    let cumulativeTarget = 0;
    for (const t of REVENUE_TARGETS) {
      if (forecastMonth <= t.month) {
        const prev = REVENUE_TARGETS.find((rt) => rt.month < t.month) || { month: 0, mrr: 0, cumulative: 0 };
        const progress = (forecastMonth - prev.month) / (t.month - prev.month);
        target = Math.round(prev.mrr + (t.mrr - prev.mrr) * progress);
        cumulativeTarget = Math.round(prev.cumulative + (t.cumulative - prev.cumulative) * progress);
        break;
      }
    }

    forecastMonths.push({
      month: key,
      projectedRevenue: currentRevenue,
      projectedDeals: currentDeals,
      projectedMRR: Math.round(currentRevenue * 0.3), // 30% recurring estimate
      cumulativeRevenue: cumulative,
      target,
      cumulativeTarget,
    });
  }

  const totalProjected = forecastMonths.reduce((s, m) => s + m.projectedRevenue, 0);

  return {
    months: forecastMonths,
    totalProjected,
    confidenceBand: {
      low: Math.round(totalProjected * 0.6),
      high: Math.round(totalProjected * 1.4),
    },
    assumptions: [
      `Base growth rate: ${Math.round(avgGrowthRate * 100)}% MoM (from last ${recentMonths.length} months)`,
      `Growth decay: 5% per month (conservative dampening)`,
      `Base month revenue: ${baseRevenue.toLocaleString("de-DE")} EUR`,
      `Base month deals: ${baseDeals}`,
      `Rail A avg deal: ${REVENUE_MODEL.blended_arpu.rail_a_avg} EUR`,
      `Scan → Paid conversion target: ${REVENUE_MODEL.conversion_targets.scan_to_detect * 100}%`,
      `Rail A → Rail B upsell target: ${REVENUE_MODEL.conversion_targets.detect_to_stabilize * 100}%`,
    ],
  };
}

export async function getCronHealth(): Promise<CronHealthReport> {
  const cronRuns = await fetchCronRuns();
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  const crons: CronStatus[] = [];
  const failedInLast24h: string[] = [];

  for (const def of CRON_DEFINITIONS) {
    const runs = cronRuns.filter((r: any) => r.cron_name === def.name);
    const latest = runs[0];

    let lastRunAt: string | null = null;
    let lastSuccess = true;
    let lastDurationMs = 0;
    let overdueMinutes = 0;

    if (latest) {
      lastRunAt = latest.started_at || latest.completed_at;
      lastSuccess = latest.success !== false;
      lastDurationMs = latest.duration_ms || 0;

      const lastRunTime = new Date(lastRunAt!).getTime();
      const expectedNextRun = lastRunTime + def.intervalMin * 60 * 1000;
      if (now > expectedNextRun) {
        overdueMinutes = Math.round((now - expectedNextRun) / 60000);
      }

      // Check for failures
      const recentFails = runs.filter((r: any) =>
        r.success === false && new Date(r.started_at).getTime() > twentyFourHoursAgo
      );
      if (recentFails.length > 0) {
        failedInLast24h.push(def.name);
      }
    }

    // Healthy if: ran recently and succeeded
    const healthy = lastSuccess && overdueMinutes < def.intervalMin * 2;

    crons.push({
      name: def.name,
      path: def.path,
      schedule: def.schedule,
      expectedIntervalMinutes: def.intervalMin,
      lastRunAt,
      lastSuccess,
      lastDurationMs,
      healthy,
      overdueMinutes,
    });
  }

  return {
    allHealthy: failedInLast24h.length === 0 && crons.every((c) => c.healthy),
    crons,
    failedInLast24h,
  };
}
