"use client";

import { useState, useMemo } from "react";
import type { Database } from "@/types/database";

type AuditRequest = Database["public"]["Tables"]["audit_requests"]["Row"];
type VaultSession = Database["public"]["Tables"]["vault_sessions"]["Row"];

interface DashboardProps {
  userEmail: string;
  companyName: string;
  auditRequests: AuditRequest[];
  vaultSessions: VaultSession[];
}

// ── Design tokens ────────────────────────────────────
const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const RD = "#ef4444";
const OR = "#f59e0b";
const GR = "#22c55e";
const TL = "#34d399";
const BD = "rgba(36,48,78,0.32)";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,sans-serif";

const gl: React.CSSProperties = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

function fmt(n: number, short = false): string {
  if (short && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (short && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n).toLocaleString("en-US");
}

function fmtEur(n: number, short = false): string {
  if (short && n >= 1e6) return (n / 1e6).toFixed(1) + "M EUR";
  if (short && n >= 1e4) return Math.round(n / 1e3) + "k EUR";
  return Math.round(n).toLocaleString("en-US") + " EUR";
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 30) return days + "d ago";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

const statusLabel: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  delivered: "Delivered",
  failed: "Failed",
  followup_scheduled: "Follow-up",
  lost: "Lost",
};

// ── Sidebar navigation ─────────────────────────────
const NAV = [
  { id: "overview", icon: "\u{1F4CA}", label: "Overview" },
  { id: "reports", icon: "\u{1F4CB}", label: "Reports" },
  { id: "leads", icon: "\u{1F465}", label: "Leads" },
  { id: "intel", icon: "\u{1F50D}", label: "Detection", href: "/intel" },
  { id: "vault", icon: "\u{1F512}", label: "Vault", href: "/vault" },
] as const;

// ══════════════════════════════════════════════════
// EMPTY STATE
// ══════════════════════════════════════════════════
function EmptyState() {
  return (
    <div style={{ ...gl, padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>{"\u{1F50D}"}</div>
      <p style={{ fontSize: 18, fontWeight: 700, color: T1, marginBottom: 8 }}>
        No data yet
      </p>
      <p style={{ fontSize: 13, color: T2, lineHeight: 1.6, maxWidth: 420, margin: "0 auto 24px" }}>
        Run your first Ghost Tax detection to populate this dashboard with real intelligence
        on your IT spending exposure.
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
        RUN FIRST SCAN
      </a>
    </div>
  );
}

// ══════════════════════════════════════════════════
// MAIN CLIENT COMPONENT
// ══════════════════════════════════════════════════
export default function DashboardClient({
  userEmail,
  companyName,
  auditRequests,
  vaultSessions,
}: DashboardProps) {
  const [page, setPage] = useState<string>("overview");

  const isEmpty = auditRequests.length === 0 && vaultSessions.length === 0;

  // Derived metrics from real data
  const deliveredReports = useMemo(
    () => auditRequests.filter((ar) => ar.status === "delivered"),
    [auditRequests]
  );

  const totalLeads = vaultSessions.length;

  // Aggregate ghost tax from vault sessions
  const totalGhostTax = useMemo(
    () =>
      vaultSessions.reduce(
        (sum, vs) => sum + (vs.ghost_tax_annual ?? 0),
        0
      ),
    [vaultSessions]
  );

  const totalRecoverable = useMemo(
    () =>
      vaultSessions.reduce(
        (sum, vs) => sum + (vs.recoverable_annual ?? 0),
        0
      ),
    [vaultSessions]
  );

  const avgEntropyScore = useMemo(() => {
    const scored = vaultSessions.filter((vs) => vs.entropy_score != null);
    if (scored.length === 0) return null;
    return Math.round(
      scored.reduce((s, vs) => s + (vs.entropy_score ?? 0), 0) / scored.length
    );
  }, [vaultSessions]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: V, fontFamily: SA, color: T1 }}>
      {/* ── SIDEBAR ───────────────────────────────── */}
      <aside
        style={{
          width: 200,
          borderRight: "1px solid " + BD,
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          flexShrink: 0,
          background: "rgba(6,9,18,0.9)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, paddingLeft: 8 }}>
          <span style={{ fontSize: 11, fontFamily: MO, fontWeight: 700, letterSpacing: ".06em", color: A }}>
            GHOST TAX
          </span>
        </div>
        {NAV.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if ("href" in item && item.href) {
                  window.location.href = item.href;
                } else {
                  setPage(item.id);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 10px",
                borderRadius: 7,
                border: "none",
                width: "100%",
                background: active ? "rgba(59,130,246,0.10)" : "transparent",
                color: active ? T1 : T2,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                textAlign: "left" as const,
                transition: "all 0.1s",
              }}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <div
          style={{
            padding: "10px 10px",
            borderRadius: 7,
            background: "rgba(0,0,0,0.15)",
            border: "1px solid " + BD,
          }}
        >
          <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".06em", marginBottom: 4 }}>
            {companyName ? companyName.toUpperCase() : "YOUR COMPANY"}
          </p>
          <p style={{ fontSize: 10, color: T2 }}>{userEmail || "Not signed in"}</p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────── */}
      <main style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
        {/* ── TOPBAR ──────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
              {page === "overview"
                ? "Dashboard"
                : page === "reports"
                ? "Reports"
                : page === "leads"
                ? "Leads"
                : page.charAt(0).toUpperCase() + page.slice(1)}
            </h1>
            <p style={{ fontSize: 11, color: T3 }}>
              {auditRequests.length > 0
                ? "Last activity: " + relativeTime(auditRequests[0].updated_at)
                : "No activity yet"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a
              href="/intel"
              style={{
                padding: "7px 14px",
                borderRadius: 6,
                border: "none",
                background: A,
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".04em",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              NEW SCAN
            </a>
          </div>
        </div>

        {/* ═══════ OVERVIEW PAGE ═══════ */}
        {page === "overview" && (
          <>
            {isEmpty ? (
              <EmptyState />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* KPI Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                  {[
                    {
                      label: "Total Reports",
                      value: auditRequests.length.toString(),
                      color: T1,
                    },
                    {
                      label: "Delivered",
                      value: deliveredReports.length.toString(),
                      color: TL,
                    },
                    {
                      label: "Ghost Tax Detected",
                      value: totalGhostTax > 0 ? fmtEur(totalGhostTax, true) : "--",
                      color: totalGhostTax > 0 ? RD : T3,
                    },
                    {
                      label: "Avg Entropy Score",
                      value: avgEntropyScore != null ? avgEntropyScore + "/100" : "--",
                      color:
                        avgEntropyScore != null
                          ? avgEntropyScore >= 61
                            ? RD
                            : avgEntropyScore >= 31
                            ? OR
                            : GR
                          : T3,
                    },
                    {
                      label: "Recoverable",
                      value: totalRecoverable > 0 ? fmtEur(totalRecoverable, true) : "--",
                      color: totalRecoverable > 0 ? TL : T3,
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} style={{ ...gl, padding: 14, textAlign: "center" as const }}>
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
                          fontSize: 20,
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

                {/* Two-column: Recent Reports + Leads */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {/* Recent audit requests */}
                  <div style={{ ...gl, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: T3 }}>
                        RECENT REPORTS
                      </p>
                      <button
                        onClick={() => setPage("reports")}
                        style={{ fontSize: 9, color: AH, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                      >
                        VIEW ALL
                      </button>
                    </div>
                    {auditRequests.length === 0 ? (
                      <p style={{ fontSize: 11, color: T3, padding: "12px 0" }}>No reports yet</p>
                    ) : (
                      auditRequests.slice(0, 5).map((ar) => {
                        const col = statusColor[ar.status] ?? T3;
                        return (
                          <div
                            key={ar.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 0",
                              borderBottom: "1px solid rgba(36,48,78,0.12)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 8,
                                fontFamily: MO,
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 3,
                                background: col + "15",
                                border: "1px solid " + col + "25",
                                color: col,
                                textTransform: "uppercase" as const,
                                letterSpacing: ".04em",
                              }}
                            >
                              {statusLabel[ar.status] ?? ar.status}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: 11,
                                  color: T1,
                                  fontWeight: 500,
                                  whiteSpace: "nowrap" as const,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {ar.company_name}
                              </p>
                              <p style={{ fontSize: 9, color: T3 }}>
                                {ar.domain ?? ar.email} {"\u00B7"} {relativeTime(ar.created_at)}
                              </p>
                            </div>
                            {ar.run_id && (
                              <span
                                style={{
                                  fontFamily: MO,
                                  fontSize: 8,
                                  color: T3,
                                  flexShrink: 0,
                                }}
                              >
                                {ar.run_id.slice(0, 8)}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Recent vault sessions (leads) */}
                  <div style={{ ...gl, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase" as const, color: T3 }}>
                        RECENT LEADS
                      </p>
                      <button
                        onClick={() => setPage("leads")}
                        style={{ fontSize: 9, color: AH, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                      >
                        VIEW ALL
                      </button>
                    </div>
                    {vaultSessions.length === 0 ? (
                      <p style={{ fontSize: 11, color: T3, padding: "12px 0" }}>No leads captured yet</p>
                    ) : (
                      vaultSessions.slice(0, 5).map((vs) => (
                        <div
                          key={vs.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(36,48,78,0.12)",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 11,
                                color: T1,
                                fontWeight: 500,
                                whiteSpace: "nowrap" as const,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {vs.company_name}
                            </p>
                            <p style={{ fontSize: 9, color: T3 }}>
                              {vs.email} {"\u00B7"} {relativeTime(vs.created_at)}
                            </p>
                          </div>
                          {vs.ghost_tax_annual != null && vs.ghost_tax_annual > 0 && (
                            <span
                              style={{
                                fontFamily: MO,
                                fontSize: 12,
                                fontWeight: 700,
                                color: RD,
                                flexShrink: 0,
                              }}
                            >
                              {fmtEur(vs.ghost_tax_annual, true)}
                            </span>
                          )}
                          {vs.entropy_score != null && (
                            <span
                              style={{
                                fontFamily: MO,
                                fontSize: 10,
                                color:
                                  vs.entropy_score >= 61
                                    ? RD
                                    : vs.entropy_score >= 31
                                    ? OR
                                    : GR,
                                flexShrink: 0,
                              }}
                            >
                              {vs.entropy_score}/100
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════ REPORTS PAGE ═══════ */}
        {page === "reports" && (
          <div style={{ ...gl, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>
                {auditRequests.length} audit request{auditRequests.length !== 1 ? "s" : ""}
              </p>
            </div>
            {auditRequests.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {auditRequests.map((ar) => {
                  const col = statusColor[ar.status] ?? T3;
                  return (
                    <div
                      key={ar.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 14px",
                        borderRadius: 8,
                        background: "rgba(0,0,0,0.12)",
                        border: "1px solid rgba(36,48,78,0.14)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 8,
                          fontFamily: MO,
                          fontWeight: 600,
                          padding: "3px 7px",
                          borderRadius: 4,
                          background: col + "18",
                          border: "1px solid " + col + "30",
                          color: col,
                          textTransform: "uppercase" as const,
                          letterSpacing: ".04em",
                          flexShrink: 0,
                        }}
                      >
                        {statusLabel[ar.status] ?? ar.status}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: T1, marginBottom: 2 }}>
                          {ar.company_name}
                        </p>
                        <p style={{ fontSize: 10, color: T3 }}>
                          {ar.domain ?? ar.email} {"\u00B7"} {ar.run_id ? "Run: " + ar.run_id.slice(0, 12) : "No run ID"}{" "}
                          {"\u00B7"} {relativeTime(ar.created_at)}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                        {ar.estimated_monthly_spend != null && ar.estimated_monthly_spend > 0 && (
                          <p style={{ fontFamily: MO, fontSize: 12, fontWeight: 700, color: T2 }}>
                            {fmtEur(ar.estimated_monthly_spend)}/mo
                          </p>
                        )}
                        {ar.delivered_at && (
                          <p style={{ fontSize: 8, color: TL }}>
                            Delivered {relativeTime(ar.delivered_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════ LEADS PAGE ═══════ */}
        {page === "leads" && (
          <div style={{ ...gl, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>
                {totalLeads} lead{totalLeads !== 1 ? "s" : ""} captured
              </p>
            </div>
            {vaultSessions.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vaultSessions.map((vs) => (
                  <div
                    key={vs.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 14px",
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.12)",
                      border: "1px solid rgba(36,48,78,0.14)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 8,
                        fontFamily: MO,
                        fontWeight: 600,
                        padding: "3px 7px",
                        borderRadius: 4,
                        background:
                          vs.status === "converted"
                            ? TL + "18"
                            : vs.status === "qualified"
                            ? AH + "18"
                            : "rgba(0,0,0,0.12)",
                        border:
                          "1px solid " +
                          (vs.status === "converted"
                            ? TL + "30"
                            : vs.status === "qualified"
                            ? AH + "30"
                            : BD),
                        color:
                          vs.status === "converted"
                            ? TL
                            : vs.status === "qualified"
                            ? AH
                            : T3,
                        textTransform: "uppercase" as const,
                        letterSpacing: ".04em",
                        flexShrink: 0,
                      }}
                    >
                      {vs.status}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T1, marginBottom: 2 }}>
                        {vs.company_name}
                      </p>
                      <p style={{ fontSize: 10, color: T3 }}>
                        {vs.email} {"\u00B7"}{" "}
                        {vs.headcount ? vs.headcount + " employees" : ""}
                        {vs.industry ? " \u00B7 " + vs.industry : ""} {"\u00B7"}{" "}
                        {relativeTime(vs.created_at)}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" as const, flexShrink: 0, display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: 2 }}>
                      {vs.ghost_tax_annual != null && vs.ghost_tax_annual > 0 && (
                        <p style={{ fontFamily: MO, fontSize: 14, fontWeight: 800, color: RD }}>
                          {fmtEur(vs.ghost_tax_annual, true)}/yr
                        </p>
                      )}
                      {vs.entropy_score != null && (
                        <p
                          style={{
                            fontSize: 9,
                            fontFamily: MO,
                            color:
                              vs.entropy_score >= 61
                                ? RD
                                : vs.entropy_score >= 31
                                ? OR
                                : GR,
                          }}
                        >
                          Entropy: {vs.entropy_score}/100
                        </p>
                      )}
                      {vs.monthly_spend_total != null && vs.monthly_spend_total > 0 && (
                        <p style={{ fontSize: 8, color: T3 }}>
                          Spend: {fmtEur(vs.monthly_spend_total)}/mo
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
