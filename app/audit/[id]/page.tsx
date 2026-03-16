/**
 * GHOST TAX — DYNAMIC FORENSIC AUDIT REPORT
 *
 * /audit/[id] — Server-rendered audit page.
 *
 * Pipeline:
 *   1. Decode domain from [id] param
 *   2. Load EnrichmentPayload from Supabase (encrypted)
 *   3. Re-compute TVAR + FinancialImpact + PeerGap (fast, pure compute)
 *   4. Check 14-day expiry
 *   5. Render AuditReportClient with full payload
 *
 * Security: noindex, 14-day TTL, encrypted storage.
 */

import { Metadata } from "next";
import { loadAuditResult } from "@/lib/db/osint-storage";
import { calculateShadowCost } from "@/lib/engines/shadow-cost";
import { computeFinancialImpact } from "@/lib/engines/revenue-intel";
import { analyzePeerGap } from "@/lib/engines/peer-gap";
import type { AuditReportPayload } from "@/types/audit";
import AuditReportClient from "./AuditReportClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const domain = decodeURIComponent(id);
  return {
    title: `Forensic Audit — ${domain} | Ghost Tax`,
    description: `Confidential financial audit for ${domain}. Total Value At Risk analysis.`,
    robots: { index: false, follow: false },
  };
}

const EXPIRY_DAYS = 14;

export default async function AuditPage({ params }: Props) {
  const { id } = await params;
  const domain = decodeURIComponent(id)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  if (!domain.includes(".") || domain.length < 3) {
    return <ErrorState message="Invalid audit identifier." />;
  }

  // ── Load encrypted data ──
  const stored = await loadAuditResult(domain);
  if (!stored || !stored.infrastructure) {
    return <ErrorState message="Audit not found. This report may have been deleted or never generated." />;
  }

  // ── Expiry check ──
  const enrichedAt = stored.enrichedAt
    ? new Date(stored.enrichedAt)
    : new Date(stored.infrastructure.scannedAt);
  const ageMs = Date.now() - enrichedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays > EXPIRY_DAYS) {
    return <ExpiredState domain={domain} daysAgo={Math.round(ageDays)} />;
  }

  // ── Re-compute analysis layers (fast, pure compute) ──
  const infra = stored.infrastructure;
  const shadowBill = await calculateShadowCost(infra);
  const metrics = {
    domain,
    estimatedHeadcount: infra.estimatedHeadcount,
    industry: "default",
  };
  const financialImpact = computeFinancialImpact(shadowBill, metrics);

  let peerGap: import("@/types/audit").PeerGapScore | null = null;
  try {
    peerGap = await analyzePeerGap(domain, "default", infra.detectedVendors);
  } catch {
    // Non-fatal
  }

  // ── Build urgency + summary ──
  const urgencyScore = computeUrgency(shadowBill, financialImpact, peerGap);

  const payload: AuditReportPayload = {
    domain,
    generatedAt: enrichedAt.toISOString(),
    executionMs: 0,
    version: "3.0",
    decisionMaker: stored.decisionMaker ?? null,
    shadowBill,
    financialImpact,
    peerGap,
    urgencyScore,
    executiveSummary: buildSummary(domain, shadowBill, financialImpact, urgencyScore),
    warnings: [],
  };

  return <AuditReportClient payload={payload} />;
}

// ── Urgency computation (mirrors audit-orchestrator) ──

function computeUrgency(
  sb: AuditReportPayload["shadowBill"],
  fi: AuditReportPayload["financialImpact"],
  pg: AuditReportPayload["peerGap"],
): number {
  let score = 0;
  score += Math.min(25, Math.round(sb.wasteFactor * 0.4));
  const tvarK = sb.tvar.totalValueAtRisk / 1000;
  if (tvarK > 100) score += 20;
  else if (tvarK > 50) score += 15;
  else if (tvarK > 20) score += 10;
  else score += 5;
  score += Math.min(10, sb.tvar.detectedRedundancies.length * 3);
  if (fi.dailyBleedEur > 500) score += 20;
  else if (fi.dailyBleedEur > 200) score += 14;
  else if (fi.dailyBleedEur > 50) score += 8;
  else score += 3;
  score += Math.min(15, Math.round(fi.ebitdaImpactPoints * 3));
  if (pg) score += Math.min(10, Math.round(pg.gapScore * 0.15));
  return Math.min(100, Math.max(0, score));
}

function buildSummary(
  domain: string,
  sb: AuditReportPayload["shadowBill"],
  fi: AuditReportPayload["financialImpact"],
  urgency: number,
): string {
  const wasteK = Math.round(sb.totalWasteEur / 1000);
  const tvarK = Math.round(sb.tvar.totalValueAtRisk / 1000);
  const daily = fi.dailyBleedEur;
  if (urgency >= 70) {
    return `${domain} : TVAR ${tvarK}k EUR/mois — ${wasteK}k EUR/an de gaspillage SaaS, ${daily} EUR/jour d'hémorragie. Intervention immédiate requise.`;
  }
  if (urgency >= 40) {
    return `${domain} : Valeur Totale à Risque ${tvarK}k EUR/mois — ${wasteK}k EUR/an non optimisé. Audit correctif recommandé sous 30 jours.`;
  }
  return `${domain} : TVAR ${tvarK}k EUR/mois — ${wasteK}k EUR/an d'optimisation identifiée.`;
}

// ── Error / Expired states ──

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-[#3b4a6b] text-5xl font-mono mb-4">404</div>
        <p className="text-[#64748B] text-sm">{message}</p>
      </div>
    </div>
  );
}

function ExpiredState({ domain, daysAgo }: { domain: string; daysAgo: number }) {
  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 rounded-full bg-[#1a1020] border border-[#ef444440] flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V4m0 0L9 7m3-3l3 3" />
          </svg>
        </div>
        <h1 className="text-white text-xl font-semibold mb-2">Report Expired</h1>
        <p className="text-[#64748B] text-sm mb-1">
          The forensic audit for <span className="text-[#94A3B8] font-mono">{domain}</span> was generated {daysAgo} days ago.
        </p>
        <p className="text-[#64748B] text-sm mb-6">
          For security, reports expire after 14 days. Request a fresh analysis.
        </p>
        <a
          href="/contact"
          className="inline-block px-6 py-3 bg-[#3b82f6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563eb] transition-colors"
        >
          Request New Audit
        </a>
      </div>
    </div>
  );
}
