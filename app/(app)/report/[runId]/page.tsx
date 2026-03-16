/**
 * GHOST TAX — RAPPORT POST-PAIEMENT
 *
 * /report/[runId]
 *
 * Displays the full Decision Pack after Rail A purchase.
 * Server component: fetches report from Supabase, renders executive view.
 */

import { createAdminSupabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// ── i18n for server component ───────────────────────────

type Locale = "en" | "fr" | "de";

const REPORT_I18N: Record<Locale, Record<string, string>> = {
  en: {
    label: "GHOST TAX — DECISION PACK",
    downloadPdf: "Download PDF",
    executive: "EXECUTIVE SUMMARY",
    exposure: "ANNUAL EXPOSURE",
    confidence: "CONFIDENCE",
    vendors: "VENDORS DETECTED",
    proofs: "PROOFS COLLECTED",
    vendorBreakdown: "EXPOSURE BY VENDOR",
    proofsCollected: "PROOFS COLLECTED",
    scenarios: "CORRECTIVE SCENARIOS",
    decisionPack: "DECISION PACK",
    "memos.cfo": "CFO MEMO",
    "memos.cio": "CIO BRIEF",
    "memos.board": "BOARD SUMMARY",
    "memos.procurement": "PROCUREMENT BRIEF",
    "upsell.label": "NEXT STEP",
    "upsell.title": "Activate continuous monitoring",
    "upsell.desc": "Detect drift in real time. Automatic alerts before each renewal. Monthly monitoring reports.",
    "upsell.monitor": "Monitoring — €2,000/mo",
    "upsell.setup": "30/60/90 Plan — €2,500",
    "confidence.strong": "STRONG",
    "confidence.moderate": "MODERATE",
    "confidence.directional": "DIRECTIONAL",
    "processing.title": "Report being generated",
    "processing.desc": "analysis is being processed. Your Decision Pack will be ready in 2 minutes.",
    scenario: "Scenario",
    savings: "Savings",
    description: "Your decision intelligence report from Ghost Tax",
  },
  fr: {
    label: "GHOST TAX — DECISION PACK",
    downloadPdf: "Télécharger PDF",
    executive: "SYNTHÈSE EXÉCUTIVE",
    exposure: "EXPOSITION ANNUELLE",
    confidence: "CONFIANCE",
    vendors: "FOURNISSEURS DÉTECTÉS",
    proofs: "PREUVES COLLECTÉES",
    vendorBreakdown: "EXPOSITION PAR FOURNISSEUR",
    proofsCollected: "PREUVES COLLECTÉES",
    scenarios: "SCÉNARIOS CORRECTIFS",
    decisionPack: "DECISION PACK",
    "memos.cfo": "MÉMO CFO",
    "memos.cio": "BRIEF CIO",
    "memos.board": "SYNTHÈSE BOARD",
    "memos.procurement": "BRIEF PROCUREMENT",
    "upsell.label": "PROCHAINE ÉTAPE",
    "upsell.title": "Activez le monitoring continu",
    "upsell.desc": "Détectez les dérives en temps réel. Alertes automatiques avant chaque renouvellement. Rapports mensuels de monitoring.",
    "upsell.monitor": "Monitoring — 2 000 €/mois",
    "upsell.setup": "Plan 30/60/90 — 2 500 €",
    "confidence.strong": "FORTE",
    "confidence.moderate": "MODÉRÉE",
    "confidence.directional": "DIRECTIONNELLE",
    "processing.title": "Rapport en cours de génération",
    "processing.desc": "analyse est en cours de traitement. Votre Decision Pack sera prêt sous 2 minutes.",
    scenario: "Scénario",
    savings: "Économie",
    description: "Votre rapport d'intelligence décisionnelle Ghost Tax",
  },
  de: {
    label: "GHOST TAX — DECISION PACK",
    downloadPdf: "PDF herunterladen",
    executive: "EXECUTIVE SUMMARY",
    exposure: "JÄHRLICHE EXPOSITION",
    confidence: "KONFIDENZ",
    vendors: "ERKANNTE ANBIETER",
    proofs: "GESAMMELTE BEWEISE",
    vendorBreakdown: "EXPOSITION NACH ANBIETER",
    proofsCollected: "GESAMMELTE BEWEISE",
    scenarios: "KORREKTURSZENARIEN",
    decisionPack: "DECISION PACK",
    "memos.cfo": "CFO-MEMO",
    "memos.cio": "CIO-BRIEF",
    "memos.board": "BOARD-ZUSAMMENFASSUNG",
    "memos.procurement": "BESCHAFFUNGS-BRIEF",
    "upsell.label": "NÄCHSTER SCHRITT",
    "upsell.title": "Kontinuierliches Monitoring aktivieren",
    "upsell.desc": "Drift in Echtzeit erkennen. Automatische Alerts vor jeder Verlängerung. Monatliche Monitoring-Berichte.",
    "upsell.monitor": "Monitoring — 2.000 €/Monat",
    "upsell.setup": "30/60/90 Plan — 2.500 €",
    "confidence.strong": "STARK",
    "confidence.moderate": "MODERAT",
    "confidence.directional": "RICHTUNGSWEISEND",
    "processing.title": "Bericht wird generiert",
    "processing.desc": "Analyse wird verarbeitet. Ihr Decision Pack wird in 2 Minuten bereit sein.",
    scenario: "Szenario",
    savings: "Einsparung",
    description: "Ihr Decision Intelligence Bericht von Ghost Tax",
  },
};

function getLocale(audit: any): Locale {
  const raw = (audit?.locale || "en").toString().toLowerCase().slice(0, 2);
  if (raw === "fr") return "fr";
  if (raw === "de") return "de";
  return "en";
}

function rt(locale: Locale, key: string): string {
  return REPORT_I18N[locale][key] || REPORT_I18N["en"][key] || key;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ runId: string }>;
}): Promise<Metadata> {
  const { runId } = await params;
  return {
    title: `Decision Pack — ${runId.slice(0, 8)}`,
    description: "Decision intelligence report — Ghost Tax",
    robots: { index: false, follow: false },
  };
}

// ── Formatting helpers ───────────────────────────────────

function fmtEur(n: number, locale: Locale = "en"): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  const numLocale = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US";
  return Math.round(n).toLocaleString(numLocale);
}

function fmtDate(iso: string, locale: Locale = "en"): string {
  const numLocale = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US";
  return new Date(iso).toLocaleDateString(numLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function confidenceGrade(score: number, locale: Locale = "en"): string {
  if (score >= 60) return rt(locale, "confidence.strong");
  if (score >= 35) return rt(locale, "confidence.moderate");
  return rt(locale, "confidence.directional");
}

function confidenceColor(score: number): string {
  if (score >= 60) return "#059669";
  if (score >= 35) return "#D97706";
  return "#DC2626";
}

// ── Main Page ────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const supabase = createAdminSupabase();

  if (!supabase) {
    return <DevFallback runId={runId} />;
  }

  // Lookup by run_id only — UUID is unguessable, page is noindex
  const { data: audit } = await supabase
    .from("audit_requests")
    .select("*")
    .eq("run_id", runId)
    .single();

  if (!audit) {
    notFound();
  }

  const report = (audit as any).report_data;
  if (!report) {
    const processingLocale = getLocale(audit);
    return <ProcessingState runId={runId} domain={(audit as any).domain} locale={processingLocale} />;
  }

  const locale = getLocale(audit);
  const snapshot = report.executiveSnapshot || {};
  const exposure = snapshot.exposureRangeEur || [0, 0];
  const confidence = snapshot.confidenceScore || 0;
  const proofs = report.proofSignals || [];
  const vendors = report.vendors || [];
  const scenarios = report.scenarios || [];
  const decisionPack = report.decisionPack || {};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        color: "#0F172A",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header Bar */}
      <header
        style={{
          borderBottom: "1px solid #E2E8F0",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        <div>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#0F172A",
              textTransform: "uppercase" as const,
              fontFamily: "monospace",
            }}
          >
            {rt(locale, "label")}
          </span>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
            {(audit as any).domain} | Run {runId.slice(0, 8)} |{" "}
            {fmtDate((audit as any).created_at, locale)}
          </div>
        </div>
        <a
          href={`/api/report/pdf?run_id=${runId}`}
          style={{
            background: "#0F172A",
            color: "#fff",
            padding: "8px 20px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {rt(locale, "downloadPdf")}
        </a>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        {/* ── Executive Snapshot ──────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionLabel>{rt(locale, "executive")}</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <MetricCard
              label={rt(locale, "exposure")}
              value={`${fmtEur(exposure[0], locale)}–${fmtEur(exposure[1], locale)} EUR`}
              color="#DC2626"
            />
            <MetricCard
              label={rt(locale, "confidence")}
              value={`${confidence}/100 — ${confidenceGrade(confidence, locale)}`}
              color={confidenceColor(confidence)}
            />
            <MetricCard
              label={rt(locale, "vendors")}
              value={String(vendors.length || "—")}
              color="#0F172A"
            />
            <MetricCard
              label={rt(locale, "proofs")}
              value={String(proofs.length || "—")}
              color="#0891B2"
            />
          </div>

          {snapshot.headline && (
            <p
              style={{
                fontSize: 15,
                color: "#475569",
                lineHeight: 1.7,
                marginTop: 20,
                maxWidth: 800,
              }}
            >
              {snapshot.headline}
            </p>
          )}
        </section>

        {/* ── Vendor Breakdown ────────────────────── */}
        {vendors.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <SectionLabel>{rt(locale, "vendorBreakdown")}</SectionLabel>
            <div style={{ marginTop: 16 }}>
              {vendors.map((v: any, i: number) => (
                <div
                  key={i}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}
                    >
                      {v.name || v.vendor}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#64748B",
                        marginLeft: 8,
                      }}
                    >
                      {v.category || ""}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" as const }}>
                    {v.exposureEur && (
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#DC2626",
                        }}
                      >
                        {fmtEur(v.exposureEur[0], locale)}–{fmtEur(v.exposureEur[1], locale)}{" "}
                        EUR
                      </span>
                    )}
                    {v.riskLevel && (
                      <span
                        style={{
                          fontSize: 10,
                          color:
                            v.riskLevel === "critical"
                              ? "#DC2626"
                              : v.riskLevel === "high"
                                ? "#D97706"
                                : "#059669",
                          marginLeft: 8,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {v.riskLevel}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Proof Signals ───────────────────────── */}
        {proofs.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <SectionLabel>{rt(locale, "proofsCollected")}</SectionLabel>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 12,
              }}
            >
              {proofs.slice(0, 12).map((p: any, i: number) => (
                <div
                  key={i}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "#0F172A",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {p.source || p.tier || "SIGNAL"}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: "#64748B",
                      }}
                    >
                      conf. {p.confidence || "—"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {p.finding || p.description || p.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Scenarios ───────────────────────────── */}
        {scenarios.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <SectionLabel>{rt(locale, "scenarios")}</SectionLabel>
            <div style={{ marginTop: 16 }}>
              {scenarios.map((s: any, i: number) => (
                <div
                  key={i}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: 20,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0F172A",
                      }}
                    >
                      {s.name || `${rt(locale, "scenario")} ${i + 1}`}
                    </span>
                    {s.savingsEur && (
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#059669",
                        }}
                      >
                        {rt(locale, "savings")} : {fmtEur(s.savingsEur[0], locale)}–
                        {fmtEur(s.savingsEur[1], locale)} EUR
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Decision Pack Downloads ─────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionLabel>{rt(locale, "decisionPack")}</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            {decisionPack.cfoMemo && (
              <PackCard title={rt(locale, "memos.cfo")} content={decisionPack.cfoMemo} />
            )}
            {decisionPack.cioBrief && (
              <PackCard title={rt(locale, "memos.cio")} content={decisionPack.cioBrief} />
            )}
            {decisionPack.boardSlide && (
              <PackCard
                title={rt(locale, "memos.board")}
                content={decisionPack.boardSlide}
              />
            )}
            {decisionPack.procurementBrief && (
              <PackCard
                title={rt(locale, "memos.procurement")}
                content={decisionPack.procurementBrief}
              />
            )}
          </div>
        </section>

        {/* ── Upsell Rail B ──────────────────────── */}
        <section
          style={{
            background:
              "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 32,
            textAlign: "center" as const,
            marginBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "#0F172A",
              textTransform: "uppercase" as const,
              marginBottom: 12,
            }}
          >
            {rt(locale, "upsell.label")}
          </p>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0F172A",
              marginBottom: 12,
            }}
          >
            {rt(locale, "upsell.title")}
          </h3>
          <p
            style={{
              fontSize: 14,
              color: "#475569",
              maxWidth: 500,
              margin: "0 auto 20px",
              lineHeight: 1.7,
            }}
          >
            {rt(locale, "upsell.desc")}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a
              href={`/pricing?ref=report&rail=B_MONITOR&domain=${encodeURIComponent((audit as any).domain)}`}
              style={{
                background: "#0F172A",
                color: "#fff",
                padding: "12px 28px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {rt(locale, "upsell.monitor")}
            </a>
            <a
              href={`/pricing?ref=report&rail=B_SETUP&domain=${encodeURIComponent((audit as any).domain)}`}
              style={{
                background: "transparent",
                color: "#D97706",
                padding: "12px 28px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid #E2E8F0",
              }}
            >
              {rt(locale, "upsell.setup")}
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 10,
        letterSpacing: "0.15em",
        color: "#0F172A",
        textTransform: "uppercase" as const,
        fontFamily: "monospace",
        borderBottom: "1px solid #E2E8F0",
        paddingBottom: 8,
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 8,
        padding: 20,
        textAlign: "center" as const,
      }}
    >
      <p
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          color: "#64748B",
          textTransform: "uppercase" as const,
          margin: "0 0 8px 0",
          fontFamily: "monospace",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 20,
          fontWeight: 800,
          color,
          margin: 0,
          fontFamily: "monospace",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function PackCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div
      style={{
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <p
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          color: "#0F172A",
          textTransform: "uppercase" as const,
          margin: "0 0 10px 0",
          fontFamily: "monospace",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: 12,
          color: "#475569",
          lineHeight: 1.7,
          margin: 0,
          whiteSpace: "pre-wrap" as const,
          maxHeight: 200,
          overflow: "auto",
        }}
      >
        {content}
      </p>
    </div>
  );
}

function ProcessingState({
  runId,
  domain,
  locale = "en",
}: {
  runId: string;
  domain: string;
  locale?: Locale;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center" as const, maxWidth: 400, padding: 32 }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "#0F172A",
            textTransform: "uppercase" as const,
            fontFamily: "monospace",
          }}
        >
          GHOST TAX
        </p>
        <h1
          style={{
            fontSize: 22,
            color: "#0F172A",
            fontWeight: 800,
            margin: "16px 0",
          }}
        >
          {rt(locale, "processing.title")}
        </h1>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
          <strong style={{ color: "#0F172A" }}>{domain}</strong>{" "}
          {rt(locale, "processing.desc")}
        </p>
        <p
          style={{
            fontSize: 11,
            color: "#64748B",
            marginTop: 20,
            fontFamily: "monospace",
          }}
        >
          Run ID: {runId.slice(0, 8)}
        </p>
      </div>
    </div>
  );
}

function DevFallback({ runId }: { runId: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748B",
        fontSize: 14,
      }}
    >
      <div style={{ textAlign: "center" as const }}>
        <p style={{ fontFamily: "monospace", color: "#0F172A", fontSize: 10, letterSpacing: "0.2em" }}>
          DEV MODE
        </p>
        <p style={{ marginTop: 8 }}>Supabase not configured. Run ID: {runId}</p>
      </div>
    </div>
  );
}
