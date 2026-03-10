/**
 * GHOST TAX — RAPPORT POST-PAIEMENT
 *
 * /report/[runId]
 *
 * Displays the full Decision Pack after Rail A purchase.
 * Server component: fetches report from Supabase, renders executive view.
 */

import { createServerSupabase } from "@/lib/supabase";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ runId: string }>;
}): Promise<Metadata> {
  const { runId } = await params;
  return {
    title: `Decision Pack — ${runId.slice(0, 8)}`,
    description: "Votre rapport d'intelligence décisionnelle Ghost Tax",
    robots: { index: false, follow: false },
  };
}

// ── Formatting helpers ───────────────────────────────────

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return Math.round(n).toLocaleString("fr-FR");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function confidenceGrade(score: number): string {
  if (score >= 60) return "FORTE";
  if (score >= 35) return "MODÉRÉE";
  return "DIRECTIONNELLE";
}

function confidenceColor(score: number): string {
  if (score >= 60) return "#34d399";
  if (score >= 35) return "#f59e0b";
  return "#ef4444";
}

// ── Main Page ────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const supabase = await createServerSupabase();

  if (!supabase) {
    return <DevFallback runId={runId} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(`/?redirect=/report/${runId}`);
  }

  // Fetch the audit request + report
  const { data: audit } = await supabase
    .from("audit_requests")
    .select("*")
    .eq("run_id", runId)
    .eq("email", user.email)
    .single();

  if (!audit) {
    notFound();
  }

  const report = (audit as any).report_data;
  if (!report) {
    return <ProcessingState runId={runId} domain={(audit as any).domain} />;
  }

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
        background: "#060912",
        color: "#e4e9f4",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header Bar */}
      <header
        style={{
          borderBottom: "1px solid rgba(36,48,78,0.28)",
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
              color: "#3b82f6",
              textTransform: "uppercase" as const,
              fontFamily: "monospace",
            }}
          >
            GHOST TAX — DECISION PACK
          </span>
          <div style={{ fontSize: 13, color: "#55637d", marginTop: 4 }}>
            {(audit as any).domain} | Run {runId.slice(0, 8)} |{" "}
            {fmtDate((audit as any).created_at)}
          </div>
        </div>
        <a
          href={`/api/report/pdf?run_id=${runId}`}
          style={{
            background: "#3b82f6",
            color: "#fff",
            padding: "8px 20px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Télécharger PDF
        </a>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        {/* ── Executive Snapshot ──────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionLabel>SYNTHÈSE EXÉCUTIVE</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <MetricCard
              label="EXPOSITION ANNUELLE"
              value={`${fmtEur(exposure[0])}–${fmtEur(exposure[1])} EUR`}
              color="#ef4444"
            />
            <MetricCard
              label="CONFIANCE"
              value={`${confidence}/100 — ${confidenceGrade(confidence)}`}
              color={confidenceColor(confidence)}
            />
            <MetricCard
              label="FOURNISSEURS DÉTECTÉS"
              value={String(vendors.length || "—")}
              color="#3b82f6"
            />
            <MetricCard
              label="PREUVES COLLECTÉES"
              value={String(proofs.length || "—")}
              color="#22d3ee"
            />
          </div>

          {snapshot.headline && (
            <p
              style={{
                fontSize: 15,
                color: "#8d9bb5",
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
            <SectionLabel>EXPOSITION PAR FOURNISSEUR</SectionLabel>
            <div style={{ marginTop: 16 }}>
              {vendors.map((v: any, i: number) => (
                <div
                  key={i}
                  style={{
                    background: "#0a0d19",
                    border: "1px solid rgba(36,48,78,0.28)",
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
                      style={{ fontSize: 14, fontWeight: 600, color: "#e4e9f4" }}
                    >
                      {v.name || v.vendor}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#55637d",
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
                          color: "#ef4444",
                        }}
                      >
                        {fmtEur(v.exposureEur[0])}–{fmtEur(v.exposureEur[1])}{" "}
                        EUR
                      </span>
                    )}
                    {v.riskLevel && (
                      <span
                        style={{
                          fontSize: 10,
                          color:
                            v.riskLevel === "critical"
                              ? "#ef4444"
                              : v.riskLevel === "high"
                                ? "#f59e0b"
                                : "#34d399",
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
            <SectionLabel>PREUVES COLLECTÉES</SectionLabel>
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
                    background: "#0a0d19",
                    border: "1px solid rgba(36,48,78,0.28)",
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
                        color: "#3b82f6",
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
                        color: "#55637d",
                      }}
                    >
                      conf. {p.confidence || "—"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#8d9bb5",
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
            <SectionLabel>SCÉNARIOS CORRECTIFS</SectionLabel>
            <div style={{ marginTop: 16 }}>
              {scenarios.map((s: any, i: number) => (
                <div
                  key={i}
                  style={{
                    background: "#0a0d19",
                    border: "1px solid rgba(36,48,78,0.28)",
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
                        color: "#e4e9f4",
                      }}
                    >
                      {s.name || `Scénario ${i + 1}`}
                    </span>
                    {s.savingsEur && (
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#34d399",
                        }}
                      >
                        Économie : {fmtEur(s.savingsEur[0])}–
                        {fmtEur(s.savingsEur[1])} EUR
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#8d9bb5",
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
          <SectionLabel>DECISION PACK</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            {decisionPack.cfoMemo && (
              <PackCard title="MÉMO CFO" content={decisionPack.cfoMemo} />
            )}
            {decisionPack.cioBrief && (
              <PackCard title="BRIEF CIO" content={decisionPack.cioBrief} />
            )}
            {decisionPack.boardSlide && (
              <PackCard
                title="SYNTHÈSE BOARD"
                content={decisionPack.boardSlide}
              />
            )}
            {decisionPack.procurementBrief && (
              <PackCard
                title="BRIEF PROCUREMENT"
                content={decisionPack.procurementBrief}
              />
            )}
          </div>
        </section>

        {/* ── Upsell Rail B ──────────────────────── */}
        <section
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))",
            border: "1px solid rgba(59,130,246,0.2)",
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
              color: "#3b82f6",
              textTransform: "uppercase" as const,
              marginBottom: 12,
            }}
          >
            PROCHAINE ÉTAPE
          </p>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#e4e9f4",
              marginBottom: 12,
            }}
          >
            Activez le monitoring continu
          </h3>
          <p
            style={{
              fontSize: 14,
              color: "#8d9bb5",
              maxWidth: 500,
              margin: "0 auto 20px",
              lineHeight: 1.7,
            }}
          >
            Détectez les dérives en temps réel. Alertes automatiques avant chaque
            renouvellement. Rapports mensuels de monitoring.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a
              href={`/pricing?ref=report&rail=B_MONITOR&domain=${encodeURIComponent((audit as any).domain)}`}
              style={{
                background: "#3b82f6",
                color: "#fff",
                padding: "12px 28px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Monitoring — 2 000 EUR/mois
            </a>
            <a
              href={`/pricing?ref=report&rail=B_SETUP&domain=${encodeURIComponent((audit as any).domain)}`}
              style={{
                background: "transparent",
                color: "#f59e0b",
                padding: "12px 28px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              Plan 30/60/90 — 2 500 EUR
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
        color: "#3b82f6",
        textTransform: "uppercase" as const,
        fontFamily: "monospace",
        borderBottom: "1px solid rgba(36,48,78,0.28)",
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
        background: "#0a0d19",
        border: "1px solid rgba(36,48,78,0.28)",
        borderRadius: 8,
        padding: 20,
        textAlign: "center" as const,
      }}
    >
      <p
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          color: "#55637d",
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
        background: "#0a0d19",
        border: "1px solid rgba(36,48,78,0.28)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <p
        style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          color: "#3b82f6",
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
          color: "#8d9bb5",
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
}: {
  runId: string;
  domain: string;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060912",
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
            color: "#3b82f6",
            textTransform: "uppercase" as const,
            fontFamily: "monospace",
          }}
        >
          GHOST TAX
        </p>
        <h1
          style={{
            fontSize: 22,
            color: "#e4e9f4",
            fontWeight: 800,
            margin: "16px 0",
          }}
        >
          Rapport en cours de génération
        </h1>
        <p style={{ fontSize: 14, color: "#8d9bb5", lineHeight: 1.7 }}>
          L&apos;analyse de <strong style={{ color: "#e4e9f4" }}>{domain}</strong>{" "}
          est en cours de traitement. Votre Decision Pack sera prêt sous 2
          minutes.
        </p>
        <p
          style={{
            fontSize: 11,
            color: "#55637d",
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
        background: "#060912",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#55637d",
        fontSize: 14,
      }}
    >
      <div style={{ textAlign: "center" as const }}>
        <p style={{ fontFamily: "monospace", color: "#3b82f6", fontSize: 10, letterSpacing: "0.2em" }}>
          DEV MODE
        </p>
        <p style={{ marginTop: 8 }}>Supabase non configuré. Run ID: {runId}</p>
      </div>
    </div>
  );
}
