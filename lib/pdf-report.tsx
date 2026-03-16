/**
 * GHOST TAX — PDF DECISION PACK GENERATOR (SERVER-ONLY)
 *
 * Two report formats:
 *   1. GhostTaxReport — Original Rail A/B Decision Intelligence Report (dark theme)
 *   2. ForensicAuditReport — Sprint 3 "Forensic Audit" with TVAR (McKinsey white-paper)
 *
 * Revenue impact: PDF = shareable artifact that sells internally.
 * CFO shares with board → board asks CIO → CIO scopes Rail B.
 * Every PDF is a silent sales agent inside the client org.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { AuditReportPayload, TVARResult, TVARBreakdown } from "@/types/audit";

// ── Types ──────────────────────────────────────────

export type PDFLocale = "en" | "fr" | "de";

export interface PDFReportData {
  companyName: string;
  domain: string;
  generatedAt: string;
  runId: string;
  locale?: PDFLocale;
  // Exposure
  exposureLowEur: number;
  exposureHighEur: number;
  exposureConfidence: number;
  // Loss velocity
  dailyLeakEur: number;
  weeklyLeakEur: number;
  monthlyLeakEur: number;
  // Proof
  observedSignals: number;
  inferredSignals: number;
  estimatedSignals: number;
  topFindings: Array<{
    label: string;
    severity: "critical" | "high" | "medium" | "low";
    eurImpact: [number, number];
  }>;
  // Peer comparison
  peerPercentile: number;
  industryMedianEur: number;
  // Confidence
  overallConfidence: number;
  confidenceGrade: string;
  // Scenarios
  scenarios: Array<{
    name: string;
    savingsEur: [number, number];
    effort: string;
    timeline: string;
  }>;
  // Executive summary
  executiveSummary: string;
}

// ── Localization ──────────────────────────────────

interface PDFStrings {
  subtitle: string;
  subtitleP2: string;
  executiveSummary: string;
  financialExposure: string;
  estimatedAnnualExposure: string;
  confidence: string;
  dailyLeak: string;
  weeklyLeak: string;
  monthlyLeak: string;
  peerPercentile: string;
  confidenceModel: string;
  overallConfidence: string;
  observed: string;
  inferred: string;
  estimated: string;
  total: string;
  signals: string;
  topFindings: string;
  peerComparison: string;
  yourPosition: string;
  industryMedian: string;
  peerAbove: (pct: number) => string;
  peerNormal: string;
  correctiveScenarios: string;
  effort: string;
  ctaTitle: string;
  ctaSub: string;
  confidential: string;
  page: (n: number, total: number) => string;
  currency: string;
  currencySuffix: string;
  perYear: string;
}

const STRINGS: Record<PDFLocale, PDFStrings> = {
  en: {
    subtitle: "Decision Intelligence Report",
    subtitleP2: "Findings & Corrective Scenarios",
    executiveSummary: "EXECUTIVE SUMMARY",
    financialExposure: "FINANCIAL EXPOSURE",
    estimatedAnnualExposure: "Estimated Annual Exposure",
    confidence: "Confidence",
    dailyLeak: "Daily Leak",
    weeklyLeak: "Weekly Leak",
    monthlyLeak: "Monthly Leak",
    peerPercentile: "Peer Percentile",
    confidenceModel: "CONFIDENCE MODEL",
    overallConfidence: "Overall Confidence",
    observed: "Observed",
    inferred: "Inferred",
    estimated: "Estimated",
    total: "Total",
    signals: "signals",
    topFindings: "TOP FINDINGS",
    peerComparison: "PEER COMPARISON",
    yourPosition: "Your Position",
    industryMedian: "Industry Median",
    peerAbove: (pct) => `Your organization spends more than ${pct}% of comparable companies.`,
    peerNormal: "Your organization is within normal spending range for your segment.",
    correctiveScenarios: "CORRECTIVE SCENARIOS",
    effort: "effort",
    ctaTitle: "READY TO ACT ON THESE FINDINGS?",
    ctaSub: "Activate a 30/60/90-day Stabilization Plan — ghost-tax.com/pricing",
    confidential: "GHOST TAX — Confidential",
    page: (n, total) => `Page ${n} of ${total}`,
    currency: "USD",
    currencySuffix: "/yr",
    perYear: "/yr",
  },
  fr: {
    subtitle: "Rapport d'Intelligence Decisionnelle",
    subtitleP2: "Constats & Scenarios Correctifs",
    executiveSummary: "SYNTHESE EXECUTIVE",
    financialExposure: "EXPOSITION FINANCIERE",
    estimatedAnnualExposure: "Exposition Annuelle Estimee",
    confidence: "Confiance",
    dailyLeak: "Fuite Quotidienne",
    weeklyLeak: "Fuite Hebdomadaire",
    monthlyLeak: "Fuite Mensuelle",
    peerPercentile: "Percentile Pairs",
    confidenceModel: "MODELE DE CONFIANCE",
    overallConfidence: "Confiance Globale",
    observed: "Observe",
    inferred: "Infere",
    estimated: "Estime",
    total: "Total",
    signals: "signaux",
    topFindings: "PRINCIPAUX CONSTATS",
    peerComparison: "COMPARAISON AUX PAIRS",
    yourPosition: "Votre Position",
    industryMedian: "Mediane Industrie",
    peerAbove: (pct) => `Votre organisation depense plus que ${pct}% des entreprises comparables.`,
    peerNormal: "Votre organisation se situe dans la norme de depenses de votre segment.",
    correctiveScenarios: "SCENARIOS CORRECTIFS",
    effort: "effort",
    ctaTitle: "PRET A AGIR SUR CES CONSTATS ?",
    ctaSub: "Activez un Plan de Stabilisation 30/60/90 jours — ghost-tax.com/pricing",
    confidential: "GHOST TAX — Confidentiel",
    page: (n, total) => `Page ${n} sur ${total}`,
    currency: "EUR",
    currencySuffix: "/an",
    perYear: "/an",
  },
  de: {
    subtitle: "Decision Intelligence Bericht",
    subtitleP2: "Befunde & Korrekturszenarien",
    executiveSummary: "ZUSAMMENFASSUNG",
    financialExposure: "FINANZIELLE EXPOSITION",
    estimatedAnnualExposure: "Geschaetzte Jaehrliche Exposition",
    confidence: "Konfidenz",
    dailyLeak: "Taeglicher Verlust",
    weeklyLeak: "Woechentlicher Verlust",
    monthlyLeak: "Monatlicher Verlust",
    peerPercentile: "Peer-Perzentil",
    confidenceModel: "KONFIDENZMODELL",
    overallConfidence: "Gesamtkonfidenz",
    observed: "Beobachtet",
    inferred: "Abgeleitet",
    estimated: "Geschaetzt",
    total: "Gesamt",
    signals: "Signale",
    topFindings: "WICHTIGSTE BEFUNDE",
    peerComparison: "PEER-VERGLEICH",
    yourPosition: "Ihre Position",
    industryMedian: "Branchenmedian",
    peerAbove: (pct) => `Ihre Organisation gibt mehr aus als ${pct}% vergleichbarer Unternehmen.`,
    peerNormal: "Ihre Organisation liegt im normalen Ausgabenbereich Ihres Segments.",
    correctiveScenarios: "KORREKTURSZENARIEN",
    effort: "Aufwand",
    ctaTitle: "BEREIT, AUF DIESE BEFUNDE ZU REAGIEREN?",
    ctaSub: "Aktivieren Sie einen 30/60/90-Tage-Stabilisierungsplan — ghost-tax.com/pricing",
    confidential: "GHOST TAX — Vertraulich",
    page: (n, total) => `Seite ${n} von ${total}`,
    currency: "EUR",
    currencySuffix: "/Jahr",
    perYear: "/Jahr",
  },
};

// ── Styles ─────────────────────────────────────────

const c = {
  bg: "#0a0d19",
  surface: "#0e1221",
  panel: "#121828",
  text1: "#e4e9f4",
  text2: "#8d9bb5",
  text3: "#55637d",
  blue: "#3b82f6",
  green: "#34d399",
  amber: "#f59e0b",
  red: "#ef4444",
  border: "#1e2a42",
  white: "#ffffff",
  black: "#060912",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: c.black,
    padding: 40,
    fontFamily: "Helvetica",
    color: c.text1,
    fontSize: 9,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottom: `1px solid ${c.border}`,
    paddingBottom: 16,
  },
  logo: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: c.blue,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 8,
    color: c.text3,
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: "uppercase" as const,
  },
  metaBlock: {
    alignItems: "flex-end" as const,
  },
  metaText: {
    fontSize: 7,
    color: c.text3,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: c.text1,
    marginBottom: 8,
    marginTop: 20,
    letterSpacing: 0.5,
  },
  panel: {
    backgroundColor: c.surface,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    border: `1px solid ${c.border}`,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 7,
    color: c.text3,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  value: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: c.text1,
  },
  bigNumber: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: c.red,
    marginBottom: 2,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: c.panel,
    borderRadius: 4,
    padding: 10,
    border: `1px solid ${c.border}`,
  },
  findingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottom: `1px solid ${c.border}`,
  },
  severityBadge: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  scenarioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottom: `1px solid ${c.border}`,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1px solid ${c.border}`,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 6,
    color: c.text3,
  },
  summaryText: {
    fontSize: 9,
    color: c.text2,
    lineHeight: 1.6,
  },
  confidenceBar: {
    height: 6,
    backgroundColor: c.panel,
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden",
  },
  confidenceFill: {
    height: 6,
    borderRadius: 3,
  },
  ctaBlock: {
    backgroundColor: c.blue,
    borderRadius: 4,
    padding: 14,
    marginTop: 16,
    alignItems: "center" as const,
  },
  ctaText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: c.white,
    letterSpacing: 0.5,
  },
  ctaSub: {
    fontSize: 7,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
});

// ── Helpers ────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString("de-DE");
}

function fmtCurrency(n: number, cur: string): string {
  if (cur === "USD") return `$${fmt(n)}`;
  return `${fmt(n)} ${cur}`;
}

function severityColor(sev: string): string {
  switch (sev) {
    case "critical": return c.red;
    case "high": return c.amber;
    case "medium": return c.text2;
    default: return c.text3;
  }
}

/** Detect locale from domain TLD */
export function detectLocaleFromDomain(domain: string): PDFLocale {
  const d = domain.toLowerCase();
  if (d.endsWith(".de") || d.endsWith(".at") || d.endsWith(".ch")) return "de";
  if (d.endsWith(".fr") || d.endsWith(".be") || d.endsWith(".lu")) return "fr";
  return "en"; // US, NL, and all others get English
}

// ── PDF Document Component ─────────────────────────

function GhostTaxReport({ data }: { data: PDFReportData }) {
  const locale = data.locale || detectLocaleFromDomain(data.domain);
  const t = STRINGS[locale];
  const cur = t.currency;
  const totalSignals = data.observedSignals + data.inferredSignals + data.estimatedSignals;
  const confidenceColor = data.overallConfidence >= 60 ? c.green : data.overallConfidence >= 35 ? c.amber : c.text3;

  return (
    <Document>
      {/* PAGE 1: Executive Summary + Exposure */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.logo}>GHOST TAX</Text>
            <Text style={s.subtitle}>{t.subtitle}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaText}>{data.companyName}</Text>
            <Text style={s.metaText}>{data.domain}</Text>
            <Text style={s.metaText}>Run: {data.runId}</Text>
            <Text style={s.metaText}>{data.generatedAt}</Text>
          </View>
        </View>

        {/* Executive Summary */}
        <Text style={s.sectionTitle}>{t.executiveSummary}</Text>
        <View style={s.panel}>
          <Text style={s.summaryText}>{data.executiveSummary}</Text>
        </View>

        {/* Exposure Headline */}
        <Text style={s.sectionTitle}>{t.financialExposure}</Text>
        <View style={s.panel}>
          <Text style={s.label}>{t.estimatedAnnualExposure}</Text>
          <Text style={s.bigNumber}>
            {fmtCurrency(data.exposureLowEur, cur)}-{fmtCurrency(data.exposureHighEur, cur)}{t.perYear}
          </Text>
          <Text style={{ ...s.metaText, marginTop: 4 }}>
            {t.confidence}: {data.exposureConfidence}% ({data.confidenceGrade})
          </Text>
        </View>

        {/* KPI Grid */}
        <View style={s.kpiGrid}>
          <View style={s.kpiBox}>
            <Text style={s.label}>{t.dailyLeak}</Text>
            <Text style={{ ...s.value, color: c.red }}>{fmtCurrency(data.dailyLeakEur, cur)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.label}>{t.weeklyLeak}</Text>
            <Text style={{ ...s.value, color: c.amber }}>{fmtCurrency(data.weeklyLeakEur, cur)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.label}>{t.monthlyLeak}</Text>
            <Text style={{ ...s.value, color: c.amber }}>{fmtCurrency(data.monthlyLeakEur, cur)}</Text>
          </View>
          <View style={s.kpiBox}>
            <Text style={s.label}>{t.peerPercentile}</Text>
            <Text style={{ ...s.value, color: data.peerPercentile > 60 ? c.red : c.green }}>
              {data.peerPercentile}th
            </Text>
          </View>
        </View>

        {/* Confidence */}
        <Text style={s.sectionTitle}>{t.confidenceModel}</Text>
        <View style={s.panel}>
          <View style={s.row}>
            <Text style={s.label}>{t.overallConfidence}</Text>
            <Text style={{ ...s.value, color: confidenceColor }}>
              {data.overallConfidence}% — {data.confidenceGrade}
            </Text>
          </View>
          <View style={s.confidenceBar}>
            <View style={{
              ...s.confidenceFill,
              width: `${data.overallConfidence}%`,
              backgroundColor: confidenceColor,
            }} />
          </View>
          <View style={{ ...s.row, marginTop: 8 }}>
            <Text style={s.metaText}>{t.observed}: {data.observedSignals}</Text>
            <Text style={s.metaText}>{t.inferred}: {data.inferredSignals}</Text>
            <Text style={s.metaText}>{t.estimated}: {data.estimatedSignals}</Text>
            <Text style={s.metaText}>{t.total}: {totalSignals} {t.signals}</Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>{t.confidential}</Text>
          <Text style={s.footerText}>ghost-tax.com</Text>
          <Text style={s.footerText}>{t.page(1, 2)}</Text>
        </View>
      </Page>

      {/* PAGE 2: Findings + Scenarios */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.logo}>GHOST TAX</Text>
            <Text style={s.subtitle}>{t.subtitleP2}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaText}>{data.companyName}</Text>
          </View>
        </View>

        {/* Top Findings */}
        <Text style={s.sectionTitle}>{t.topFindings}</Text>
        <View style={s.panel}>
          {data.topFindings.slice(0, 8).map((f, i) => (
            <View key={i} style={s.findingRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                <Text style={{
                  ...s.severityBadge,
                  backgroundColor: severityColor(f.severity),
                  color: c.white,
                }}>
                  {f.severity}
                </Text>
                <Text style={{ fontSize: 8, color: c.text1, flex: 1 }}>{f.label}</Text>
              </View>
              <Text style={{ fontSize: 8, color: c.amber, fontFamily: "Helvetica-Bold" }}>
                {fmtCurrency(f.eurImpact[0], cur)}-{fmtCurrency(f.eurImpact[1], cur)}
              </Text>
            </View>
          ))}
        </View>

        {/* Peer Comparison */}
        <Text style={s.sectionTitle}>{t.peerComparison}</Text>
        <View style={s.panel}>
          <View style={s.row}>
            <View>
              <Text style={s.label}>{t.yourPosition}</Text>
              <Text style={{ ...s.value, color: data.peerPercentile > 60 ? c.red : c.green }}>
                {data.peerPercentile}th percentile
              </Text>
            </View>
            <View>
              <Text style={s.label}>{t.industryMedian}</Text>
              <Text style={s.value}>{fmtCurrency(data.industryMedianEur, cur)}{t.perYear}</Text>
            </View>
          </View>
          <Text style={{ ...s.metaText, marginTop: 6 }}>
            {data.peerPercentile > 60
              ? t.peerAbove(data.peerPercentile)
              : t.peerNormal}
          </Text>
        </View>

        {/* Corrective Scenarios */}
        <Text style={s.sectionTitle}>{t.correctiveScenarios}</Text>
        <View style={s.panel}>
          {data.scenarios.slice(0, 4).map((sc, i) => (
            <View key={i} style={s.scenarioRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: c.text1, fontFamily: "Helvetica-Bold" }}>
                  {sc.name}
                </Text>
                <Text style={s.metaText}>
                  {sc.effort} {t.effort} | {sc.timeline}
                </Text>
              </View>
              <Text style={{ fontSize: 9, color: c.green, fontFamily: "Helvetica-Bold" }}>
                {fmtCurrency(sc.savingsEur[0], cur)}-{fmtCurrency(sc.savingsEur[1], cur)}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={s.ctaBlock}>
          <Text style={s.ctaText}>{t.ctaTitle}</Text>
          <Text style={s.ctaSub}>{t.ctaSub}</Text>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>{t.confidential}</Text>
          <Text style={s.footerText}>ghost-tax.com</Text>
          <Text style={s.footerText}>{t.page(2, 2)}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Public API ─────────────────────────────────────

/**
 * Generate a PDF buffer from report data.
 * Locale auto-detected from domain TLD if not specified.
 */
export async function generatePDFReport(data: PDFReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(<GhostTaxReport data={data} />);
  return Buffer.from(buffer);
}

/**
 * Convert DecisionIntelligence result to PDFReportData.
 * Used by the delivery pipeline after analysis completes.
 */
export function toPDFReportData(
  result: Record<string, unknown>,
  companyName: string,
  domain: string,
  runId: string,
  locale?: PDFLocale,
): PDFReportData {
  const exposure = (result.exposure || {}) as Record<string, unknown>;
  const proof = (result.proof || {}) as Record<string, unknown>;
  const peerComparison = (result.peerComparison || {}) as Record<string, unknown>;
  const confidenceModel = (result.confidenceModel || {}) as Record<string, unknown>;
  const scenarios = (result.scenarios || []) as Array<Record<string, unknown>>;
  const executiveSnapshot = (result.executiveSnapshot || {}) as Record<string, unknown>;

  const exposureLow = (exposure.lowEur as number) || 0;
  const exposureHigh = (exposure.highEur as number) || 0;
  const annual = (exposureLow + exposureHigh) / 2;

  return {
    companyName,
    domain,
    generatedAt: new Date().toISOString().split("T")[0],
    runId,
    locale: locale || detectLocaleFromDomain(domain),
    exposureLowEur: exposureLow,
    exposureHighEur: exposureHigh,
    exposureConfidence: (exposure.confidence as number) || 0,
    dailyLeakEur: Math.round(annual / 365),
    weeklyLeakEur: Math.round(annual / 52),
    monthlyLeakEur: Math.round(annual / 12),
    observedSignals: ((proof.observedSignals as unknown[]) || []).length,
    inferredSignals: ((proof.inferredSignals as unknown[]) || []).length,
    estimatedSignals: ((proof.estimatedSignals as unknown[]) || []).length,
    topFindings: (((proof.observedSignals as unknown[]) || [])
      .concat((proof.inferredSignals as unknown[]) || [])
      .slice(0, 8) as Array<Record<string, unknown>>)
      .map((sig) => ({
        label: (sig.label as string) || "Unknown finding",
        severity: (sig.severity as "critical" | "high" | "medium" | "low") || "medium",
        eurImpact: (sig.eurImpact as [number, number]) || [0, 0],
      })),
    peerPercentile: (peerComparison.efficiencyPercentile as number) || 50,
    industryMedianEur: (peerComparison.categoryMedianExposureEur as number) || 0,
    overallConfidence: (confidenceModel.overall as number) || 0,
    confidenceGrade: (confidenceModel.grade as string) || "moderate",
    scenarios: scenarios.slice(0, 4).map((sc) => ({
      name: (sc.name as string) || (sc.label as string) || "Scenario",
      savingsEur: (sc.savingsEur as [number, number]) || (sc.eurImpact as [number, number]) || [0, 0],
      effort: (sc.effort as string) || "medium",
      timeline: (sc.timeline as string) || "30-60 days",
    })),
    executiveSummary: (executiveSnapshot.summary as string) ||
      `Ghost Tax analysis of ${companyName} identified an estimated annual exposure of ${fmt(exposureLow)}-${fmt(exposureHigh)} EUR across SaaS, Cloud, and AI spending. ${((proof.observedSignals as unknown[]) || []).length} observed signals confirm the diagnosis.`,
  };
}

// ══════════════════════════════════════════════════════════
//
//  FORENSIC AUDIT REPORT — McKinsey/Deloitte White Paper
//
//  Sprint 3 : TVAR-powered "Zero-Trust Financial Audit"
//  3 pages : Executive Verdict, Shadow Bill, Recovery Protocol
//
// ══════════════════════════════════════════════════════════

// ── Forensic Types ────────────────────────────────────

export interface ForensicReportData {
  domain: string;
  companyName: string;
  generatedAt: string;
  locale?: PDFLocale;

  // TVAR
  totalValueAtRisk: number;
  tvarBreakdown: TVARBreakdown;
  detectedRedundancies: string[];

  // Urgency
  urgencyScore: number;
  executiveSummary: string;

  // Shadow Bill
  totalAnnualWasteEur: number;
  wasteFactor: number;
  categories: Array<{
    name: string;
    spendEur: number;
    wasteEur: number;
    wastePercent: number;
    vendors: string[];
  }>;

  // Financial Impact
  dailyBleedEur: number;
  ebitdaImpactPoints: number;
  inactionCost12MonthsEur: number;
  recoveryPotential90DaysEur: number;

  // Peer Gap
  peerGapScore: number | null;
  peerGapVerdict: string | null;
}

// ── Forensic Localization ─────────────────────────────

interface ForensicStrings {
  watermark: string;
  reportTitle: string;
  executiveVerdict: string;
  totalValueAtRisk: string;
  perMonth: string;
  urgencyLevel: string;
  urgencyCritical: string;
  urgencyHigh: string;
  urgencyModerate: string;
  shadowBillTitle: string;
  hemorrhageBreakdown: string;
  techWaste: string;
  performanceLoss: string;
  securityExposure: string;
  criticalRedFlags: string;
  categoryAnalysis: string;
  category: string;
  annualSpend: string;
  waste: string;
  tools: string;
  recoveryTitle: string;
  costOfInaction: string;
  coiExplanation: (eur12m: string) => string;
  remediation90: string;
  remediationSub: (eur90: string) => string;
  dailyBleed: string;
  ebitdaImpact: string;
  ctaTitle: string;
  ctaBody: string;
  ctaUrl: string;
  confidential: string;
  page: (n: number, total: number) => string;
}

const FORENSIC_STRINGS: Record<PDFLocale, ForensicStrings> = {
  en: {
    watermark: "CONFIDENTIAL — EXTERNAL AUDIT",
    reportTitle: "Forensic Financial Audit",
    executiveVerdict: "EXECUTIVE VERDICT",
    totalValueAtRisk: "TOTAL VALUE AT RISK",
    perMonth: "/month",
    urgencyLevel: "URGENCY LEVEL",
    urgencyCritical: "CRITICAL — Immediate intervention required",
    urgencyHigh: "HIGH — Action required within 30 days",
    urgencyModerate: "MODERATE — Optimization opportunity identified",
    shadowBillTitle: "THE SHADOW BILL — LOSS ANALYSIS",
    hemorrhageBreakdown: "HEMORRHAGE BREAKDOWN",
    techWaste: "Technology Waste",
    performanceLoss: "Performance Loss",
    securityExposure: "Security Risk Exposure",
    criticalRedFlags: "CRITICAL RED FLAGS",
    categoryAnalysis: "SPEND BY CATEGORY",
    category: "CATEGORY",
    annualSpend: "ANNUAL SPEND",
    waste: "WASTE",
    tools: "TOOLS",
    recoveryTitle: "RECOVERY PROTOCOL & COST OF INACTION",
    costOfInaction: "COST OF INACTION",
    coiExplanation: (eur12m) =>
      `Without intervention, the projected cumulative loss over 12 months is ${eur12m} EUR. This figure accounts for auto-renewal escalation, shadow IT growth, and license creep.`,
    remediation90: "90-DAY RECOVERY POTENTIAL",
    remediationSub: (eur90) =>
      `Conservative estimate: ${eur90} EUR recoverable within the first 90 days through license cleanup, overlap elimination, and vendor renegotiation.`,
    dailyBleed: "Daily Bleed",
    ebitdaImpact: "EBITDA Impact",
    ctaTitle: "UNLOCK THE FULL CORRECTIVE PROTOCOL",
    ctaBody: "Schedule a 30-minute diagnostic call to receive your personalized 30/60/90-day Stabilization Plan.",
    ctaUrl: "ghost-tax.com/contact",
    confidential: "VALUGUARD — Confidential — External Audit",
    page: (n, total) => `Page ${n} of ${total}`,
  },
  fr: {
    watermark: "CONFIDENTIEL — AUDIT EXTERNE",
    reportTitle: "Audit Financier Forensique",
    executiveVerdict: "VERDICT EXECUTIF",
    totalValueAtRisk: "VALEUR TOTALE A RISQUE",
    perMonth: "/mois",
    urgencyLevel: "NIVEAU D'URGENCE",
    urgencyCritical: "CRITIQUE — Intervention immediate requise",
    urgencyHigh: "ELEVE — Action requise sous 30 jours",
    urgencyModerate: "MODERE — Opportunite d'optimisation identifiee",
    shadowBillTitle: "LA FACTURE FANTOME — ANALYSE DES PERTES",
    hemorrhageBreakdown: "DECOMPOSITION DE L'HEMORRAGIE",
    techWaste: "Gaspillage Technologique",
    performanceLoss: "Perte de Performance",
    securityExposure: "Exposition Securitaire",
    criticalRedFlags: "ALERTES CRITIQUES",
    categoryAnalysis: "DEPENSES PAR CATEGORIE",
    category: "CATEGORIE",
    annualSpend: "DEPENSE ANNUELLE",
    waste: "GASPILLAGE",
    tools: "OUTILS",
    recoveryTitle: "PROTOCOLE DE REMEDIATION & COUT DE L'INACTION",
    costOfInaction: "COUT DE L'INACTION",
    coiExplanation: (eur12m) =>
      `Sans intervention, la perte cumulee projetee sur 12 mois est de ${eur12m} EUR. Ce chiffre integre l'escalade tarifaire des renouvellements automatiques, la croissance du Shadow IT et la derive des licences.`,
    remediation90: "POTENTIEL DE RECUPERATION A 90 JOURS",
    remediationSub: (eur90) =>
      `Estimation conservatrice : ${eur90} EUR recuperables dans les 90 premiers jours par nettoyage de licences, elimination des doublons et renegociation fournisseurs.`,
    dailyBleed: "Hemorragie Quotidienne",
    ebitdaImpact: "Impact EBITDA",
    ctaTitle: "DEVERROUILLEZ LE PROTOCOLE CORRECTIF COMPLET",
    ctaBody: "Planifiez un diagnostic de 30 minutes pour recevoir votre Plan de Stabilisation 30/60/90 jours personnalise.",
    ctaUrl: "ghost-tax.com/contact",
    confidential: "VALUGUARD — Confidentiel — Audit Externe",
    page: (n, total) => `Page ${n} sur ${total}`,
  },
  de: {
    watermark: "VERTRAULICH — EXTERNES AUDIT",
    reportTitle: "Forensisches Finanzaudit",
    executiveVerdict: "MANAGEMENT SUMMARY",
    totalValueAtRisk: "GESAMTWERT IM RISIKO",
    perMonth: "/Monat",
    urgencyLevel: "DRINGLICHKEITSSTUFE",
    urgencyCritical: "KRITISCH — Sofortiges Handeln erforderlich",
    urgencyHigh: "HOCH — Massnahmen innerhalb von 30 Tagen erforderlich",
    urgencyModerate: "MITTEL — Optimierungspotenzial identifiziert",
    shadowBillTitle: "DIE SCHATTENRECHNUNG — VERLUSTANALYSE",
    hemorrhageBreakdown: "AUFSCHLUSSELUNG DER VERLUSTE",
    techWaste: "Technologieverschwendung",
    performanceLoss: "Leistungsverlust",
    securityExposure: "Sicherheitsrisiko-Exposition",
    criticalRedFlags: "KRITISCHE WARNSIGNALE",
    categoryAnalysis: "AUSGABEN NACH KATEGORIE",
    category: "KATEGORIE",
    annualSpend: "JAEHRL. AUSGABEN",
    waste: "VERSCHWENDUNG",
    tools: "TOOLS",
    recoveryTitle: "SANIERUNGSPROTOKOLL & KOSTEN DES NICHTSTUNS",
    costOfInaction: "KOSTEN DES NICHTSTUNS",
    coiExplanation: (eur12m) =>
      `Ohne Intervention betraegt der prognostizierte kumulative Verlust ueber 12 Monate ${eur12m} EUR. Diese Zahl beruecksichtigt automatische Vertragsverlaengerungen, Shadow-IT-Wachstum und Lizenz-Drift.`,
    remediation90: "90-TAGE-EINSPARPOTENZIAL",
    remediationSub: (eur90) =>
      `Konservative Schaetzung: ${eur90} EUR innerhalb der ersten 90 Tage durch Lizenzbereinigung, Beseitigung von Ueberschneidungen und Neuverhandlung mit Anbietern erreichbar.`,
    dailyBleed: "Taeglicher Verlust",
    ebitdaImpact: "EBITDA-Auswirkung",
    ctaTitle: "VOLLSTAENDIGES KORREKTURPROTOKOLL FREISCHALTEN",
    ctaBody: "Vereinbaren Sie ein 30-minuetiges Diagnosegespreach fuer Ihren personalisierten 30/60/90-Tage-Stabilisierungsplan.",
    ctaUrl: "ghost-tax.com/contact",
    confidential: "VALUGUARD — Vertraulich — Externes Audit",
    page: (n, total) => `Seite ${n} von ${total}`,
  },
};

// ── Forensic Styles (McKinsey White Paper) ────────────

const fc = {
  white: "#ffffff",
  bg: "#fafafa",
  text: "#1a1a1a",
  textMid: "#4a4a4a",
  textLight: "#7a7a7a",
  red: "#c0392b",
  redLight: "#e74c3c",
  blue: "#2c3e6b",
  blueMid: "#34495e",
  blueLight: "#5d7ea0",
  border: "#d0d0d0",
  borderLight: "#e8e8e8",
  panel: "#f2f2f2",
  watermark: "rgba(180,180,180,0.12)",
};

const fs = StyleSheet.create({
  page: {
    backgroundColor: fc.white,
    padding: 48,
    paddingBottom: 60,
    fontFamily: "Helvetica",
    color: fc.text,
    fontSize: 9,
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: 380,
    left: 80,
    fontSize: 38,
    color: fc.watermark,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 6,
    transform: "rotate(-35deg)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    borderBottom: `2px solid ${fc.text}`,
    paddingBottom: 12,
  },
  logoMark: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: fc.blue,
    letterSpacing: 3,
  },
  reportType: {
    fontSize: 7,
    color: fc.textLight,
    letterSpacing: 2,
    marginTop: 2,
    textTransform: "uppercase" as const,
  },
  metaRight: {
    alignItems: "flex-end" as const,
  },
  metaLine: {
    fontSize: 7,
    color: fc.textLight,
    marginBottom: 1,
  },
  domainHero: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: fc.text,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: fc.textLight,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginTop: 18,
    marginBottom: 6,
  },
  tvarHero: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: fc.red,
    marginBottom: 2,
  },
  tvarUnit: {
    fontSize: 14,
    color: fc.textMid,
    marginBottom: 12,
  },
  urgencyBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: fc.borderLight,
    marginBottom: 4,
  },
  urgencyFill: {
    height: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 9.5,
    color: fc.textMid,
    lineHeight: 1.65,
  },
  panel: {
    backgroundColor: fc.panel,
    borderRadius: 3,
    padding: 12,
    marginBottom: 10,
    border: `1px solid ${fc.borderLight}`,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  barLabel: {
    width: 130,
    fontSize: 8,
    color: fc.textMid,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: fc.borderLight,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  barFill: {
    height: 14,
    borderRadius: 2,
  },
  barValue: {
    width: 70,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: fc.text,
    textAlign: "right" as const,
  },
  redFlag: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottom: `1px solid ${fc.borderLight}`,
  },
  redFlagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: fc.red,
    marginRight: 8,
  },
  redFlagText: {
    fontSize: 8,
    color: fc.text,
    flex: 1,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: `1px solid ${fc.text}`,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottom: `1px solid ${fc.borderLight}`,
  },
  colCat: { width: "25%", fontSize: 8, color: fc.text },
  colSpend: { width: "20%", fontSize: 8, color: fc.textMid, textAlign: "right" as const },
  colWaste: { width: "20%", fontSize: 8, fontFamily: "Helvetica-Bold", color: fc.red, textAlign: "right" as const },
  colTools: { width: "35%", fontSize: 7, color: fc.textLight, paddingLeft: 8 },
  coiNumber: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: fc.red,
    marginBottom: 4,
  },
  recoveryNumber: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: fc.blue,
    marginBottom: 4,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: fc.panel,
    borderRadius: 3,
    padding: 10,
    border: `1px solid ${fc.borderLight}`,
  },
  kpiLabel: {
    fontSize: 6,
    color: fc.textLight,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: fc.text,
  },
  ctaBlock: {
    backgroundColor: fc.blue,
    borderRadius: 4,
    padding: 16,
    marginTop: 20,
    alignItems: "center" as const,
  },
  ctaTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: fc.white,
    letterSpacing: 1,
    marginBottom: 4,
  },
  ctaBody: {
    fontSize: 8,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center" as const,
    marginBottom: 6,
  },
  ctaUrl: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: fc.white,
    textDecoration: "underline",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1px solid ${fc.border}`,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 6,
    color: fc.textLight,
  },
});

// ── Forensic Helpers ──────────────────────────────────

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString("de-DE")}k`;
  return n.toLocaleString("de-DE");
}

function urgencyColor(score: number): string {
  if (score >= 70) return fc.red;
  if (score >= 40) return "#e67e22";
  return fc.blueLight;
}

function urgencyVerdict(score: number, t: ForensicStrings): string {
  if (score >= 70) return t.urgencyCritical;
  if (score >= 40) return t.urgencyHigh;
  return t.urgencyModerate;
}

// ── Forensic Audit Component (3 pages) ────────────────

function ForensicAuditReport({ data }: { data: ForensicReportData }) {
  const locale = data.locale || detectLocaleFromDomain(data.domain);
  const t = FORENSIC_STRINGS[locale];
  const tvarTotal = data.tvarBreakdown.techWaste
    + data.tvarBreakdown.performanceLoss
    + data.tvarBreakdown.securityRiskExposure;
  const maxBreakdown = Math.max(
    data.tvarBreakdown.techWaste,
    data.tvarBreakdown.performanceLoss,
    data.tvarBreakdown.securityRiskExposure,
    1,
  );

  return (
    <Document>
      {/* ═══ PAGE 1 : Executive Summary & Verdict ═══ */}
      <Page size="A4" style={fs.page}>
        <Text style={fs.watermark}>{t.watermark}</Text>

        <View style={fs.header}>
          <View>
            <Text style={fs.logoMark}>VALUGUARD</Text>
            <Text style={fs.reportType}>{t.reportTitle}</Text>
          </View>
          <View style={fs.metaRight}>
            <Text style={fs.metaLine}>{data.companyName}</Text>
            <Text style={fs.metaLine}>{data.generatedAt}</Text>
          </View>
        </View>

        <Text style={fs.domainHero}>{data.domain}</Text>

        <Text style={fs.sectionLabel}>{t.totalValueAtRisk}</Text>
        <Text style={fs.tvarHero}>{fmtEur(data.totalValueAtRisk)} EUR</Text>
        <Text style={fs.tvarUnit}>{t.perMonth}</Text>

        <Text style={fs.sectionLabel}>{t.urgencyLevel}</Text>
        <View style={fs.urgencyBar}>
          <View style={{
            ...fs.urgencyFill,
            width: `${Math.min(100, data.urgencyScore)}%`,
            backgroundColor: urgencyColor(data.urgencyScore),
          }} />
        </View>
        <Text style={{
          ...fs.urgencyText,
          color: urgencyColor(data.urgencyScore),
        }}>
          {data.urgencyScore}/100 — {urgencyVerdict(data.urgencyScore, t)}
        </Text>

        <Text style={fs.sectionLabel}>{t.executiveVerdict}</Text>
        <View style={fs.panel}>
          <Text style={fs.summaryText}>{data.executiveSummary}</Text>
        </View>

        <View style={fs.kpiRow}>
          <View style={fs.kpiBox}>
            <Text style={fs.kpiLabel}>{t.dailyBleed}</Text>
            <Text style={{ ...fs.kpiValue, color: fc.red }}>
              {fmtEur(data.dailyBleedEur)} EUR
            </Text>
          </View>
          <View style={fs.kpiBox}>
            <Text style={fs.kpiLabel}>{t.ebitdaImpact}</Text>
            <Text style={{ ...fs.kpiValue, color: fc.red }}>
              -{data.ebitdaImpactPoints} pts
            </Text>
          </View>
          <View style={fs.kpiBox}>
            <Text style={fs.kpiLabel}>Waste Factor</Text>
            <Text style={{ ...fs.kpiValue, color: data.wasteFactor > 30 ? fc.red : fc.textMid }}>
              {data.wasteFactor}%
            </Text>
          </View>
        </View>

        <View style={fs.footer}>
          <Text style={fs.footerText}>{t.confidential}</Text>
          <Text style={fs.footerText}>{t.page(1, 3)}</Text>
        </View>
      </Page>

      {/* ═══ PAGE 2 : The Shadow Bill ═══ */}
      <Page size="A4" style={fs.page}>
        <Text style={fs.watermark}>{t.watermark}</Text>

        <View style={fs.header}>
          <View>
            <Text style={fs.logoMark}>VALUGUARD</Text>
            <Text style={fs.reportType}>{t.shadowBillTitle}</Text>
          </View>
          <View style={fs.metaRight}>
            <Text style={fs.metaLine}>{data.domain}</Text>
          </View>
        </View>

        {/* Hemorrhage Breakdown (stacked bars) */}
        <Text style={fs.sectionLabel}>{t.hemorrhageBreakdown}</Text>
        <View style={fs.panel}>
          <View style={fs.barRow}>
            <Text style={fs.barLabel}>{t.techWaste}</Text>
            <View style={fs.barTrack}>
              <View style={{
                ...fs.barFill,
                width: `${Math.round((data.tvarBreakdown.techWaste / maxBreakdown) * 100)}%`,
                backgroundColor: fc.red,
              }} />
            </View>
            <Text style={fs.barValue}>{fmtEur(data.tvarBreakdown.techWaste)} EUR</Text>
          </View>
          <View style={fs.barRow}>
            <Text style={fs.barLabel}>{t.performanceLoss}</Text>
            <View style={fs.barTrack}>
              <View style={{
                ...fs.barFill,
                width: `${Math.round((data.tvarBreakdown.performanceLoss / maxBreakdown) * 100)}%`,
                backgroundColor: "#e67e22",
              }} />
            </View>
            <Text style={fs.barValue}>{fmtEur(data.tvarBreakdown.performanceLoss)} EUR</Text>
          </View>
          <View style={fs.barRow}>
            <Text style={fs.barLabel}>{t.securityExposure}</Text>
            <View style={fs.barTrack}>
              <View style={{
                ...fs.barFill,
                width: `${Math.round((data.tvarBreakdown.securityRiskExposure / maxBreakdown) * 100)}%`,
                backgroundColor: fc.blueMid,
              }} />
            </View>
            <Text style={fs.barValue}>{fmtEur(data.tvarBreakdown.securityRiskExposure)} EUR</Text>
          </View>
        </View>

        {/* Red Flags */}
        {data.detectedRedundancies.length > 0 && (
          <>
            <Text style={fs.sectionLabel}>{t.criticalRedFlags}</Text>
            <View style={fs.panel}>
              {data.detectedRedundancies.slice(0, 8).map((flag, i) => (
                <View key={i} style={fs.redFlag}>
                  <View style={fs.redFlagDot} />
                  <Text style={fs.redFlagText}>{flag}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Category Table */}
        <Text style={fs.sectionLabel}>{t.categoryAnalysis}</Text>
        <View style={fs.panel}>
          <View style={fs.tableHeader}>
            <Text style={{ ...fs.colCat, fontFamily: "Helvetica-Bold", fontSize: 7, color: fc.textLight }}>{t.category}</Text>
            <Text style={{ ...fs.colSpend, fontFamily: "Helvetica-Bold", fontSize: 7, color: fc.textLight }}>{t.annualSpend}</Text>
            <Text style={{ ...fs.colWaste, fontSize: 7, color: fc.textLight }}>{t.waste}</Text>
            <Text style={{ ...fs.colTools, fontFamily: "Helvetica-Bold", fontSize: 7, color: fc.textLight }}>{t.tools}</Text>
          </View>
          {data.categories.slice(0, 10).map((cat, i) => (
            <View key={i} style={fs.tableRow}>
              <Text style={fs.colCat}>{cat.name}</Text>
              <Text style={fs.colSpend}>{fmtEur(cat.spendEur)} EUR</Text>
              <Text style={fs.colWaste}>{fmtEur(cat.wasteEur)} ({cat.wastePercent}%)</Text>
              <Text style={fs.colTools}>{cat.vendors.join(", ")}</Text>
            </View>
          ))}
        </View>

        <View style={fs.footer}>
          <Text style={fs.footerText}>{t.confidential}</Text>
          <Text style={fs.footerText}>{t.page(2, 3)}</Text>
        </View>
      </Page>

      {/* ═══ PAGE 3 : Recovery Protocol & COI ═══ */}
      <Page size="A4" style={fs.page}>
        <Text style={fs.watermark}>{t.watermark}</Text>

        <View style={fs.header}>
          <View>
            <Text style={fs.logoMark}>VALUGUARD</Text>
            <Text style={fs.reportType}>{t.recoveryTitle}</Text>
          </View>
          <View style={fs.metaRight}>
            <Text style={fs.metaLine}>{data.domain}</Text>
          </View>
        </View>

        {/* Cost of Inaction */}
        <Text style={fs.sectionLabel}>{t.costOfInaction}</Text>
        <View style={fs.panel}>
          <Text style={fs.coiNumber}>{fmtEur(data.inactionCost12MonthsEur)} EUR</Text>
          <Text style={fs.summaryText}>
            {t.coiExplanation(fmtEur(data.inactionCost12MonthsEur))}
          </Text>
        </View>

        {/* 90-day recovery */}
        <Text style={fs.sectionLabel}>{t.remediation90}</Text>
        <View style={fs.panel}>
          <Text style={fs.recoveryNumber}>{fmtEur(data.recoveryPotential90DaysEur)} EUR</Text>
          <Text style={fs.summaryText}>
            {t.remediationSub(fmtEur(data.recoveryPotential90DaysEur))}
          </Text>
        </View>

        {/* 12-month projection visual */}
        <Text style={fs.sectionLabel}>PROJECTION 12 MOIS</Text>
        <View style={fs.panel}>
          <View style={fs.barRow}>
            <Text style={{ ...fs.barLabel, width: 100 }}>Mois 3</Text>
            <View style={fs.barTrack}>
              <View style={{ ...fs.barFill, width: "25%", backgroundColor: "#e67e22" }} />
            </View>
            <Text style={fs.barValue}>{fmtEur(Math.round(data.inactionCost12MonthsEur * 0.25))} EUR</Text>
          </View>
          <View style={fs.barRow}>
            <Text style={{ ...fs.barLabel, width: 100 }}>Mois 6</Text>
            <View style={fs.barTrack}>
              <View style={{ ...fs.barFill, width: "50%", backgroundColor: "#e67e22" }} />
            </View>
            <Text style={fs.barValue}>{fmtEur(Math.round(data.inactionCost12MonthsEur * 0.50))} EUR</Text>
          </View>
          <View style={fs.barRow}>
            <Text style={{ ...fs.barLabel, width: 100 }}>Mois 12</Text>
            <View style={fs.barTrack}>
              <View style={{ ...fs.barFill, width: "100%", backgroundColor: fc.red }} />
            </View>
            <Text style={fs.barValue}>{fmtEur(data.inactionCost12MonthsEur)} EUR</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={fs.ctaBlock}>
          <Text style={fs.ctaTitle}>{t.ctaTitle}</Text>
          <Text style={fs.ctaBody}>{t.ctaBody}</Text>
          <Text style={fs.ctaUrl}>{t.ctaUrl}</Text>
        </View>

        <View style={fs.footer}>
          <Text style={fs.footerText}>{t.confidential}</Text>
          <Text style={fs.footerText}>{t.page(3, 3)}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Forensic Public API ───────────────────────────────

/**
 * Generate a Forensic Audit PDF buffer from AuditReportPayload.
 */
export async function generateForensicPDF(data: ForensicReportData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ForensicAuditReport data={data} />);
  return Buffer.from(buffer);
}

/**
 * Convert AuditReportPayload → ForensicReportData.
 * Bridge from the orchestrator output to the PDF renderer.
 */
export function toForensicReportData(
  payload: AuditReportPayload,
  companyName?: string,
  locale?: PDFLocale,
): ForensicReportData {
  return {
    domain: payload.domain,
    companyName: companyName ?? payload.domain,
    generatedAt: payload.generatedAt.split("T")[0],
    locale: locale ?? detectLocaleFromDomain(payload.domain),

    totalValueAtRisk: payload.shadowBill.tvar.totalValueAtRisk,
    tvarBreakdown: payload.shadowBill.tvar.breakdown,
    detectedRedundancies: payload.shadowBill.tvar.detectedRedundancies,

    urgencyScore: payload.urgencyScore,
    executiveSummary: payload.executiveSummary,

    totalAnnualWasteEur: payload.shadowBill.totalWasteEur,
    wasteFactor: payload.shadowBill.wasteFactor,
    categories: payload.shadowBill.categories.map((cat) => ({
      name: cat.category,
      spendEur: cat.annualSpendEur,
      wasteEur: cat.wasteEur,
      wastePercent: cat.wastePercent,
      vendors: cat.vendors,
    })),

    dailyBleedEur: payload.financialImpact.dailyBleedEur,
    ebitdaImpactPoints: payload.financialImpact.ebitdaImpactPoints,
    inactionCost12MonthsEur: payload.financialImpact.inactionCost12MonthsEur,
    recoveryPotential90DaysEur: payload.financialImpact.recoveryPotential90DaysEur,

    peerGapScore: payload.peerGap?.gapScore ?? null,
    peerGapVerdict: payload.peerGap?.gapVerdict ?? null,
  };
}
