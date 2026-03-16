"use client";

/**
 * GHOST TAX — BUNKER DE VALIDATION (Admin Outbound)
 *
 * /admin/outbound?key=ADMIN_SECRET_KEY
 *
 * "Tableau de Chasse" interface:
 *   - Lists all PENDING_REVIEW prospects from osint_prospects
 *   - Shows detected vendors, Shadow Bill amount, CFO target
 *   - Editable email draft (subject + body)
 *   - Approve (→ READY_FOR_OUTREACH) or Reject (→ DEAD) actions
 */

import { useState, useEffect, useCallback } from "react";
import { c, f, panel } from "@/lib/tokens";

const MO = f.mono;
const SA = f.sans;

interface Prospect {
  id: string;
  domain: string;
  company_name: string;
  status: string;
  intent_score: number;
  exposure_low_eur: number;
  exposure_high_eur: number;
  geo_market: string;
  enrichment_data: {
    shadowBill?: {
      detectedSaas: Array<{ name: string; estimatedAnnualEur: number; category: string }>;
      estimatedWasteEur: number;
      totalEstimatedSpendEur: number;
      dailyHemorrhageEur: number;
      confidence: number;
      overlaps: Array<{ group: string; vendors: string[]; wasteEur: number }>;
    };
    cfoTarget?: {
      fullName: string;
      title: string;
      email: string | null;
      source: string;
    };
    emailDraft?: {
      subject: string;
      body: string;
      htmlBody: string;
      language: string;
      market: string;
      tonality: string;
    };
    sourceSignal?: string;
    processedAt?: string;
  };
  status_changed_at: string;
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export default function AdminOutboundPage() {
  const [key, setKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_REVIEW");
  const [actionLog, setActionLog] = useState<string[]>([]);

  // ── Auth check ─────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get("key");
    if (urlKey) {
      setKey(urlKey);
      setAuthenticated(true);
    }
  }, []);

  // ── Load prospects ─────────────────────────────
  const loadProspects = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch(`/api/admin/outbound?key=${encodeURIComponent(key)}&status=${statusFilter}`);
      if (!resp.ok) {
        setError(`HTTP ${resp.status}: ${await resp.text()}`);
        return;
      }
      const data = await resp.json();
      setProspects(data.prospects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [authenticated, key, statusFilter]);

  useEffect(() => { loadProspects(); }, [loadProspects]);

  // ── Actions ────────────────────────────────────
  const updateStatus = async (domain: string, newStatus: string) => {
    try {
      const resp = await fetch("/api/admin/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, domain, status: newStatus, editedSubject: editSubject, editedBody: editBody }),
      });
      if (resp.ok) {
        setActionLog((prev) => [`${new Date().toLocaleTimeString()} — ${domain} → ${newStatus}`, ...prev]);
        loadProspects();
        setEditingId(null);
      }
    } catch {
      // Silently fail
    }
  };

  // ── Auth gate ──────────────────────────────────
  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...panel, padding: 40, maxWidth: 400, textAlign: "center" }}>
          <p style={{ fontFamily: MO, fontSize: 11, color: c.text3, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 16 }}>
            GHOST TAX — ADMIN ACCESS
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setAuthenticated(true)}
            placeholder="ADMIN_SECRET_KEY"
            style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${c.borderS}`, fontFamily: MO, fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
          />
          <button
            onClick={() => setAuthenticated(true)}
            style={{ width: "100%", padding: "12px 20px", borderRadius: 8, border: "none", background: "#0F172A", color: "#fff", fontFamily: SA, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            ENTER BUNKER
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, padding: 24 }}>
      {/* ── Header ──────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ fontFamily: MO, fontSize: 11, color: c.text4, letterSpacing: ".14em", textTransform: "uppercase" }}>
              GHOST TAX — TABLEAU DE CHASSE
            </p>
            <h1 style={{ fontFamily: SA, fontSize: 24, fontWeight: 800, color: c.text1, marginTop: 4 }}>
              International Sniper — Outbound
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["PENDING_REVIEW", "DISCOVERED", "READY_FOR_OUTREACH", "OUTREACH_SENT", "DEAD"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: MO, fontWeight: 600,
                  border: `1px solid ${statusFilter === s ? c.accent : c.border}`,
                  background: statusFilter === s ? c.accent : "transparent",
                  color: statusFilter === s ? "#fff" : c.text3,
                  cursor: "pointer", letterSpacing: ".04em",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ ...panel, padding: 12, marginBottom: 16, background: c.redBg, border: `1px solid ${c.redBd}` }}>
            <p style={{ fontFamily: MO, fontSize: 12, color: c.red }}>{error}</p>
          </div>
        )}

        {loading ? (
          <p style={{ fontFamily: MO, fontSize: 13, color: c.text3, textAlign: "center", padding: 40 }}>Loading prospects...</p>
        ) : prospects.length === 0 ? (
          <p style={{ fontFamily: MO, fontSize: 13, color: c.text3, textAlign: "center", padding: 40 }}>No prospects with status &quot;{statusFilter}&quot;.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {prospects.map((p) => (
              <ProspectCard
                key={p.domain}
                prospect={p}
                isEditing={editingId === p.domain}
                editSubject={editSubject}
                editBody={editBody}
                onToggleEdit={() => {
                  if (editingId === p.domain) {
                    setEditingId(null);
                  } else {
                    setEditingId(p.domain);
                    setEditSubject(p.enrichment_data?.emailDraft?.subject || "");
                    setEditBody(p.enrichment_data?.emailDraft?.body || "");
                  }
                }}
                onEditSubject={setEditSubject}
                onEditBody={setEditBody}
                onApprove={() => updateStatus(p.domain, "READY_FOR_OUTREACH")}
                onReject={() => updateStatus(p.domain, "DEAD")}
              />
            ))}
          </div>
        )}

        {/* ── Action Log ────────────────────── */}
        {actionLog.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <p style={{ fontFamily: MO, fontSize: 10, color: c.text4, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
              ACTION LOG
            </p>
            {actionLog.slice(0, 10).map((log, i) => (
              <p key={i} style={{ fontFamily: MO, fontSize: 11, color: c.text3, marginBottom: 2 }}>
                {log}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  PROSPECT CARD
// ══════════════════════════════════════════════════════

function ProspectCard({
  prospect: p,
  isEditing,
  editSubject,
  editBody,
  onToggleEdit,
  onEditSubject,
  onEditBody,
  onApprove,
  onReject,
}: {
  prospect: Prospect;
  isEditing: boolean;
  editSubject: string;
  editBody: string;
  onToggleEdit: () => void;
  onEditSubject: (s: string) => void;
  onEditBody: (s: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const bill = p.enrichment_data?.shadowBill;
  const cfo = p.enrichment_data?.cfoTarget;
  const draft = p.enrichment_data?.emailDraft;

  return (
    <div style={{ ...panel, padding: 20 }}>
      {/* ── Row 1: Domain + Meta ──────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontFamily: SA, fontSize: 17, fontWeight: 800, color: c.text1, margin: 0 }}>
            {p.company_name || p.domain}
          </h2>
          <span style={{ fontFamily: MO, fontSize: 10, color: c.text4 }}>{p.domain}</span>
          <span style={{
            fontFamily: MO, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
            background: p.status === "PENDING_REVIEW" ? c.amberBg : p.status === "READY_FOR_OUTREACH" ? c.greenBg : c.redBg,
            color: p.status === "PENDING_REVIEW" ? c.amber : p.status === "READY_FOR_OUTREACH" ? c.green : c.red,
            border: `1px solid ${p.status === "PENDING_REVIEW" ? c.amberBd : p.status === "READY_FOR_OUTREACH" ? c.greenBd : c.redBd}`,
            letterSpacing: ".08em",
          }}>
            {p.status}
          </span>
          {p.geo_market && (
            <span style={{ fontFamily: MO, fontSize: 10, color: c.text3, background: c.surface, padding: "2px 6px", borderRadius: 4 }}>
              {p.geo_market}
            </span>
          )}
        </div>
        <span style={{ fontFamily: MO, fontSize: 10, color: c.text4 }}>
          {p.enrichment_data?.processedAt ? new Date(p.enrichment_data.processedAt).toLocaleDateString("en-GB") : "—"}
        </span>
      </div>

      {/* ── Row 2: Shadow Bill + CFO ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={{ background: c.surface, padding: 12, borderRadius: 10, border: `1px solid ${c.border}` }}>
          <p style={{ fontFamily: MO, fontSize: 10, color: c.text4, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
            SHADOW BILL
          </p>
          {bill ? (
            <>
              <p style={{ fontFamily: MO, fontSize: 16, fontWeight: 800, color: c.red }}>
                {fmtEur(bill.estimatedWasteEur)} EUR/yr waste
              </p>
              <p style={{ fontFamily: MO, fontSize: 11, color: c.text3, marginTop: 4 }}>
                {bill.detectedSaas.length} vendors — {fmtEur(bill.totalEstimatedSpendEur)} EUR total — {bill.dailyHemorrhageEur} EUR/day
              </p>
              <p style={{ fontFamily: MO, fontSize: 10, color: c.text4, marginTop: 4 }}>
                {bill.detectedSaas.slice(0, 5).map((v) => v.name).join(", ")}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: MO, fontSize: 12, color: c.text4 }}>No data</p>
          )}
        </div>

        <div style={{ background: c.surface, padding: 12, borderRadius: 10, border: `1px solid ${c.border}` }}>
          <p style={{ fontFamily: MO, fontSize: 10, color: c.text4, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
            CFO TARGET
          </p>
          {cfo ? (
            <>
              <p style={{ fontFamily: SA, fontSize: 14, fontWeight: 700, color: c.text1 }}>
                {cfo.fullName}
              </p>
              <p style={{ fontFamily: MO, fontSize: 11, color: c.text3 }}>
                {cfo.title}
              </p>
              <p style={{ fontFamily: MO, fontSize: 11, color: cfo.email ? c.green : c.amber, marginTop: 4 }}>
                {cfo.email || "No email found"} ({cfo.source})
              </p>
            </>
          ) : (
            <p style={{ fontFamily: MO, fontSize: 12, color: c.text4 }}>No target found</p>
          )}
        </div>
      </div>

      {/* ── Row 3: Email Draft ──────── */}
      {draft && (
        <div style={{ background: "#0F172A", borderRadius: 10, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontFamily: MO, fontSize: 10, color: "#64748B", letterSpacing: ".1em", textTransform: "uppercase" }}>
              EMAIL DRAFT ({draft.language?.toUpperCase()} / {draft.market})
            </p>
            <button onClick={onToggleEdit} style={{
              padding: "4px 10px", borderRadius: 4, border: "1px solid #334155", background: "transparent",
              color: "#94A3B8", fontFamily: MO, fontSize: 10, cursor: "pointer",
            }}>
              {isEditing ? "CLOSE" : "EDIT"}
            </button>
          </div>

          {isEditing ? (
            <>
              <input
                value={editSubject}
                onChange={(e) => onEditSubject(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1E293B", color: "#E2E8F0", fontFamily: MO, fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
              />
              <textarea
                value={editBody}
                onChange={(e) => onEditBody(e.target.value)}
                rows={8}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1E293B", color: "#E2E8F0", fontFamily: MO, fontSize: 12, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" }}
              />
            </>
          ) : (
            <>
              <p style={{ fontFamily: SA, fontSize: 14, fontWeight: 700, color: "#E2E8F0", marginBottom: 8 }}>
                {draft.subject}
              </p>
              <pre style={{ fontFamily: MO, fontSize: 12, color: "#CBD5E1", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>
                {draft.body}
              </pre>
            </>
          )}
        </div>
      )}

      {/* ── Row 4: Actions ─────────── */}
      {p.status === "PENDING_REVIEW" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onApprove} style={{
            flex: 1, padding: "10px 16px", borderRadius: 8, border: "none",
            background: c.green, color: "#fff", fontFamily: SA, fontWeight: 700, fontSize: 13,
            cursor: "pointer", letterSpacing: ".04em",
          }}>
            APPROVE &amp; QUEUE
          </button>
          <button onClick={onReject} style={{
            padding: "10px 16px", borderRadius: 8, border: `1px solid ${c.redBd}`,
            background: "transparent", color: c.red, fontFamily: SA, fontWeight: 700, fontSize: 13,
            cursor: "pointer",
          }}>
            REJECT
          </button>
        </div>
      )}
    </div>
  );
}
