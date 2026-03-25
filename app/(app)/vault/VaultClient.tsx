"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Database } from "@/types/database";

type AuditRequest = Database["public"]["Tables"]["audit_requests"]["Row"];

interface VaultProps {
  userEmail: string;
  auditRequests: AuditRequest[];
}

// ── Design tokens ────────────────────────────────────
const V = "#FFFFFF";
const A = "#0F172A";
const AH = "#1E293B";
const T1 = "#0F172A";
const T2 = "#475569";
const T3 = "#64748B";
const RD = "#DC2626";
const OR = "#3b82f6";
const GR = "#059669";
const TL = "#059669";
const BD = "#E2E8F0";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,sans-serif";

const gl: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

function fmtEur(n: number, short = false, locale = "en"): string {
  if (short && n >= 1e6) return (n / 1e6).toFixed(1) + "M EUR";
  if (short && n >= 1e4) return Math.round(n / 1e3) + "k EUR";
  const numLocale = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US";
  return Math.round(n).toLocaleString(numLocale) + " EUR";
}

function relativeTime(dateStr: string, locale = "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === "fr" ? "maintenant" : locale === "de" ? "jetzt" : "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return locale === "fr" ? `${days}j` : locale === "de" ? `${days}T` : `${days}d`;
  const numLocale = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US";
  return new Date(dateStr).toLocaleDateString(numLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDate(dateStr: string, locale = "en"): string {
  const numLocale = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US";
  return new Date(dateStr).toLocaleDateString(numLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusColor: Record<string, string> = {
  pending: T3,
  paid: AH,
  processing: OR,
  delivered: TL,
  failed: RD,
  followup_scheduled: GR,
  lost: T3,
};

const STATUS_KEYS: Record<string, string> = {
  pending: "vault.status.pending",
  paid: "vault.status.paid",
  processing: "vault.status.processing",
  delivered: "vault.status.delivered",
  failed: "vault.status.failed",
  followup_scheduled: "vault.status.followup",
  lost: "vault.status.lost",
};

// ══════════════════════════════════════════════════
// EMPTY STATE
// ══════════════════════════════════════════════════
function EmptyVault({ t }: { t: (key: string, fallback?: string) => string }) {
  return (
    <div style={{ ...gl, padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>{"\u{1F512}"}</div>
      <p style={{ fontSize: 18, fontWeight: 700, color: T1, marginBottom: 8 }}>
        {t("vault.empty.title")}
      </p>
      <p
        style={{
          fontSize: 13,
          color: T2,
          lineHeight: 1.6,
          maxWidth: 440,
          margin: "0 auto 24px",
        }}
      >
        {t("vault.empty.desc")}
      </p>
      <a
        href="/intel"
        style={{
          display: "inline-block",
          padding: "12px 28px",
          borderRadius: 8,
          background: A,
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".05em",
          textDecoration: "none",
          textTransform: "uppercase" as const,
        }}
      >
        {t("vault.empty.cta")}
      </a>
    </div>
  );
}

// ══════════════════════════════════════════════════
// REPORT DETAIL VIEW
// ══════════════════════════════════════════════════
function ReportDetail({
  report,
  onBack,
  t,
  locale,
}: {
  report: AuditRequest;
  onBack: () => void;
  t: (key: string, fallback?: string) => string;
  locale: string;
}) {
  const reportData = report.report_data as Record<string, unknown> | null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          alignSelf: "flex-start",
          fontSize: 10,
          color: AH,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
          padding: "4px 0",
        }}
      >
        &larr; {t("vault.backToVault")}
      </button>

      {/* Header card */}
      <div style={{ ...gl, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p
              style={{
                fontSize: 9,
                fontFamily: MO,
                fontWeight: 600,
                letterSpacing: ".12em",
                textTransform: "uppercase" as const,
                color: A,
                marginBottom: 6,
              }}
            >
              {t("vault.reportLabel")}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, marginBottom: 4 }}>
              {report.company_name}
            </h2>
            <p style={{ fontSize: 11, color: T3 }}>
              {report.domain ?? report.email} {"\u00B7"} {t("vault.created")}{" "}
              {formatDate(report.created_at, locale)}
            </p>
          </div>
          <span
            style={{
              fontSize: 9,
              fontFamily: MO,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 5,
              background: (statusColor[report.status] ?? T3) + "18",
              border: "1px solid " + (statusColor[report.status] ?? T3) + "30",
              color: statusColor[report.status] ?? T3,
              textTransform: "uppercase" as const,
              letterSpacing: ".04em",
            }}
          >
            {t(STATUS_KEYS[report.status] ?? "vault.status.pending")}
          </span>
        </div>
      </div>

      {/* Metadata grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          {
            label: t("vault.detail.status"),
            value: t(STATUS_KEYS[report.status] ?? "vault.status.pending"),
            color: statusColor[report.status] ?? T3,
          },
          {
            label: t("vault.detail.monthlySpend"),
            value:
              report.estimated_monthly_spend != null && report.estimated_monthly_spend > 0
                ? fmtEur(report.estimated_monthly_spend, false, locale)
                : "--",
            color: T1,
          },
          {
            label: t("vault.detail.headcount"),
            value: report.headcount != null ? report.headcount.toString() : "--",
            color: T1,
          },
          {
            label: t("vault.detail.delivered"),
            value: report.delivered_at ? formatDate(report.delivered_at, locale) : t("vault.detail.notYet"),
            color: report.delivered_at ? TL : T3,
          },
        ].map((item) => (
          <div key={item.label} style={{ ...gl, padding: 14, textAlign: "center" as const }}>
            <p
              style={{
                fontSize: 8,
                color: T3,
                textTransform: "uppercase" as const,
                letterSpacing: ".08em",
                marginBottom: 5,
              }}
            >
              {item.label}
            </p>
            <p
              style={{
                fontFamily: MO,
                fontSize: 14,
                fontWeight: 700,
                color: item.color,
                lineHeight: 1.2,
              }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Run ID and technical metadata */}
      <div style={{ ...gl, padding: 16 }}>
        <p
          style={{
            fontSize: 9,
            fontFamily: MO,
            fontWeight: 600,
            letterSpacing: ".1em",
            textTransform: "uppercase" as const,
            color: T3,
            marginBottom: 10,
          }}
        >
          {t("vault.detail.technical")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: t("vault.detail.runId"), value: report.run_id ?? "N/A" },
            { label: t("vault.detail.locale"), value: report.locale ?? "en-us" },
            { label: t("vault.detail.source"), value: report.source ?? "N/A" },
            { label: t("vault.detail.domain"), value: report.domain ?? "N/A" },
            { label: t("vault.detail.saasCount"), value: report.saas_count?.toString() ?? "N/A" },
            {
              label: t("vault.detail.followUp"),
              value: report.followup_at ? formatDate(report.followup_at, locale) : t("vault.detail.notScheduled"),
            },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #E2E8F0" }}>
              <span style={{ fontSize: 10, color: T3 }}>{row.label}</span>
              <span style={{ fontSize: 10, fontFamily: MO, color: T2 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Report data preview (if available) */}
      {reportData && (
        <div style={{ ...gl, padding: 16 }}>
          <p
            style={{
              fontSize: 9,
              fontFamily: MO,
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase" as const,
              color: TL,
              marginBottom: 10,
            }}
          >
            {t("vault.detail.reportAvailable")}
          </p>
          <p style={{ fontSize: 11, color: T2, lineHeight: 1.5 }}>
            {t("vault.detail.reportAvailableDesc")}
          </p>
        </div>
      )}

      {/* Pain points if available */}
      {report.pain_points && report.pain_points.length > 0 && (
        <div style={{ ...gl, padding: 16 }}>
          <p
            style={{
              fontSize: 9,
              fontFamily: MO,
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase" as const,
              color: T3,
              marginBottom: 10,
            }}
          >
            {t("vault.detail.painPoints")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {report.pain_points.map((pp, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  padding: "4px 10px",
                  borderRadius: 5,
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  color: AH,
                }}
              >
                {pp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
// MAIN VAULT CLIENT
// ══════════════════════════════════════════════════
export default function VaultClient({ userEmail, auditRequests }: VaultProps) {
  const { t, locale } = useI18n();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const selectedReport = selectedReportId
    ? auditRequests.find((ar) => ar.id === selectedReportId) ?? null
    : null;

  const deliveredCount = auditRequests.filter((ar) => ar.status === "delivered").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: V,
        fontFamily: SA,
        color: T1,
        padding: "20px 14px 48px",
      }}
    >
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        {/* ── HEADER ──────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: MO,
                fontWeight: 700,
                letterSpacing: ".06em",
                color: A,
              }}
            >
              GHOST TAX
            </span>
            <span
              style={{
                fontSize: 8,
                color: T3,
                fontFamily: MO,
                padding: "2px 6px",
                borderRadius: 3,
                border: "1px solid " + BD,
              }}
            >
              {t("vault.header")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 8,
                color: TL,
                fontFamily: MO,
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.18)",
              }}
            >
              {t("vault.encrypted")}
            </span>
            {userEmail && (
              <span style={{ fontSize: 9, color: T3, fontFamily: MO }}>{userEmail}</span>
            )}
          </div>
        </div>

        {/* ── KPI STRIP ────────────────────────────── */}
        {auditRequests.length > 0 && !selectedReport && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: t("vault.kpi.totalReports"),
                value: auditRequests.length.toString(),
                color: T1,
              },
              {
                label: t("vault.kpi.delivered"),
                value: deliveredCount.toString(),
                color: TL,
              },
              {
                label: t("vault.kpi.processing"),
                value: auditRequests
                  .filter((ar) => ar.status === "processing" || ar.status === "paid")
                  .length.toString(),
                color: OR,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{ ...gl, padding: 14, textAlign: "center" as const }}
              >
                <p
                  style={{
                    fontSize: 8,
                    color: T3,
                    textTransform: "uppercase" as const,
                    letterSpacing: ".08em",
                    marginBottom: 5,
                  }}
                >
                  {kpi.label}
                </p>
                <p
                  style={{
                    fontFamily: MO,
                    fontSize: 22,
                    fontWeight: 800,
                    color: kpi.color,
                    lineHeight: 1,
                  }}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── REPORT DETAIL or LIST ───────────────── */}
        {selectedReport ? (
          <ReportDetail
            report={selectedReport}
            onBack={() => setSelectedReportId(null)}
            t={t}
            locale={locale}
          />
        ) : auditRequests.length === 0 ? (
          <EmptyVault t={t} />
        ) : (
          <div style={{ ...gl, padding: 18 }}>
            <p
              style={{
                fontSize: 9,
                fontFamily: MO,
                fontWeight: 600,
                letterSpacing: ".12em",
                textTransform: "uppercase" as const,
                color: A,
                marginBottom: 14,
              }}
            >
              {t("vault.yourReports")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditRequests.map((ar, idx) => {
                const col = statusColor[ar.status] ?? T3;
                return (
                  <button
                    key={ar.id}
                    onClick={() => setSelectedReportId(ar.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      borderRadius: 9,
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      cursor: "pointer",
                      textAlign: "left" as const,
                      width: "100%",
                      color: "inherit",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#CBD5E1";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#E2E8F0";
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(59,130,246,0.08)",
                        border: "1px solid rgba(59,130,246,0.20)",
                        fontFamily: MO,
                        fontSize: 13,
                        fontWeight: 800,
                        color: A,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: T1,
                          marginBottom: 3,
                          whiteSpace: "nowrap" as const,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ar.company_name}
                      </p>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: 8,
                            fontFamily: MO,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: col + "12",
                            border: "1px solid " + col + "25",
                            color: col,
                            textTransform: "uppercase" as const,
                          }}
                        >
                          {t(STATUS_KEYS[ar.status] ?? "vault.status.pending")}
                        </span>
                        <span style={{ fontSize: 9, color: T3 }}>
                          {ar.domain ?? ar.email}
                        </span>
                        <span style={{ fontSize: 9, color: T3 }}>
                          {"\u00B7"} {relativeTime(ar.created_at, locale)}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "right" as const,
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column" as const,
                        alignItems: "flex-end",
                        gap: 2,
                      }}
                    >
                      {ar.estimated_monthly_spend != null &&
                        ar.estimated_monthly_spend > 0 && (
                          <p
                            style={{
                              fontFamily: MO,
                              fontSize: 14,
                              fontWeight: 800,
                              color: T2,
                            }}
                          >
                            {fmtEur(ar.estimated_monthly_spend, false, locale)}/mo
                          </p>
                        )}
                      <p
                        style={{
                          fontSize: 9,
                          color: AH,
                          fontWeight: 600,
                        }}
                      >
                        {t("vault.viewDetails")} &rarr;
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TRUST FOOTER ─────────────────────────── */}
        <div
          style={{
            marginTop: 18,
            padding: "11px 14px",
            borderRadius: 10,
            border: "1px solid " + BD,
            background: "#F8FAFC",
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap" as const,
          }}
        >
          {[
            { title: t("vault.trust.soc2") },
            { title: t("vault.trust.zeroKnowledge") },
            { title: t("vault.trust.euData") },
            { title: t("vault.trust.autoDelete") },
          ].map((b) => (
            <div
              key={b.title}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 9,
                color: T2,
              }}
            >
              <span style={{ fontWeight: 600 }}>{b.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
