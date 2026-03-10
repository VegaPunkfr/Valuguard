/**
 * GHOST TAX — PDF DECISION PACK GENERATOR (SERVER-ONLY)
 *
 * Generates institutional-grade PDF reports for Rail A/B deliverables.
 * Localized: EN (US/NL), FR, DE (DACH) — language, currency, CTA.
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
