"use client";

/**
 * GHOST TAX — TROJAN VAULT CLIENT COMPONENT
 *
 * The "terrifying executive dashboard" that hooks CFOs.
 *
 * Layout:
 *   [HEADER] Domain + scan timestamp + vendor count
 *   [PREVIEW] 3 vendors shown in clear (the hook)
 *   [BLUR-LOCK] Rest of vendors + Shadow Bill + Overlaps (blurred)
 *   [GATE] Email input to unlock full audit
 *   [FOOTER] Trust signals + methodology
 */

import { useState, useCallback } from "react";
import { c, f, panel } from "@/lib/tokens";
import type { ShadowBill, ShadowBillVendor, OverlapFlag } from "@/lib/shadow-bill";

const MO = f.mono;
const SA = f.sans;

// ── Category labels ──────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  productivity: "Productivity", crm: "CRM & Sales", communication: "Communication",
  observability: "Monitoring", analytics: "Analytics", cloud_infra: "Cloud",
  dev_tools: "Dev Tools", ai_llm: "AI / LLM", design: "Design",
  security: "Security", marketing: "Marketing & Support", hr: "HR / People",
  finance: "Finance", database: "Database", storage: "Storage",
  email: "Email & Workspace", cdn: "CDN / Edge", identity: "Identity / SSO",
  ci_cd: "CI/CD", other: "Enterprise",
};

// ── Format EUR ───────────────────────────────────────
function fmtEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

interface Props {
  domain: string;
  bill: ShadowBill | null;
  error: string | null;
}

export default function TrojanVaultClient({ domain, bill, error }: Props) {
  const [email, setEmail] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleUnlock = useCallback(async () => {
    if (!email.trim() || !email.includes("@") || !email.includes(".")) return;

    // Block free email providers
    const freeProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "protonmail.com", "mail.com"];
    const emailDomain = email.split("@")[1]?.toLowerCase();
    if (freeProviders.includes(emailDomain || "")) {
      alert("Please use your professional email address.");
      return;
    }

    setSubmitting(true);
    try {
      // Fire lead capture to vault_sessions
      await fetch("/api/vault/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          domain,
          source: "shadow_audit",
          shadow_bill_preview: true,
        }),
      }).catch(() => {});

      setUnlocked(true);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [email, domain]);

  // ── Error state ────────────────────────────────
  if (error || !bill) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ ...panel, padding: 40, maxWidth: 500, textAlign: "center" }}>
          <p style={{ fontFamily: MO, fontSize: 13, color: c.text3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 12 }}>
            SHADOW AUDIT
          </p>
          <h1 style={{ fontFamily: SA, fontSize: 22, fontWeight: 800, color: c.text1, marginBottom: 16 }}>
            {domain}
          </h1>
          <p style={{ fontFamily: SA, fontSize: 14, color: c.text3 }}>
            {error === "Analysis failed"
              ? "Unable to retrieve certificate transparency data for this domain. The domain may not have public SSL certificates, or crt.sh may be temporarily unavailable."
              : "Scan could not be completed. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  const hasVendors = bill.detectedVendors.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: c.bg }}>
      {/* ── HEADER ─────────────────────────────── */}
      <header style={{ background: "#0F172A", color: "#fff", padding: "48px 24px 40px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontFamily: MO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#94A3B8" }}>
              GHOST TAX — SHADOW AUDIT
            </span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: bill.detectedVendors.length > 5 ? "#EF4444" : "#F59E0B", display: "inline-block" }} />
          </div>

          <h1 style={{ fontFamily: SA, fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Public Software Footprint
          </h1>
          <p style={{ fontFamily: MO, fontSize: 18, color: "#E2E8F0", fontWeight: 600 }}>
            {domain}
          </p>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 32, marginTop: 28, flexWrap: "wrap" }}>
            <StatBox label="SaaS Detected" value={String(bill.detectedVendors.length)} color="#F59E0B" />
            <StatBox label="Subdomains Parsed" value={String(bill.totalSubdomains)} color="#94A3B8" />
            <StatBox label="Overlaps" value={String(bill.overlaps.length)} color={bill.overlaps.length > 0 ? "#EF4444" : "#22C55E"} />
            <StatBox
              label="Est. Annual Spend"
              value={hasVendors ? `${fmtEur(bill.totalEstimatedSpendEur[0])}-${fmtEur(bill.totalEstimatedSpendEur[1])} EUR` : "—"}
              color="#F59E0B"
            />
          </div>

          <p style={{ fontFamily: MO, fontSize: 10, color: "#64748B", marginTop: 20 }}>
            Scanned {bill.scannedAt ? new Date(bill.scannedAt).toLocaleDateString("en-GB") : "now"} via Certificate Transparency logs — {bill.executionMs}ms — Confidence: {bill.confidence}/100
          </p>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────── */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 80px" }}>
        {!hasVendors ? (
          <div style={{ ...panel, padding: 40, textAlign: "center" }}>
            <p style={{ fontFamily: SA, fontSize: 16, color: c.text2 }}>
              No SaaS vendor signatures detected in the CT logs for <strong>{domain}</strong>.
            </p>
            <p style={{ fontFamily: SA, fontSize: 13, color: c.text3, marginTop: 12 }}>
              This domain may have limited public certificate exposure, or uses wildcard certificates that mask individual services.
            </p>
          </div>
        ) : (
          <>
            {/* ── SECTION: Preview Vendors (visible) ── */}
            <SectionLabel>Detected SaaS Vendors</SectionLabel>
            <p style={{ fontFamily: SA, fontSize: 13, color: c.text3, marginBottom: 20 }}>
              The following vendors were identified in <strong>{domain}</strong>&apos;s public certificate transparency records.
            </p>

            {bill.previewVendors.map((v, i) => (
              <VendorCard key={v.id} vendor={v} index={i + 1} />
            ))}

            {/* ── SECTION: Locked Content ─────────── */}
            {bill.lockedVendorCount > 0 && !unlocked && (
              <div style={{ position: "relative", marginTop: 24 }}>
                {/* Blurred preview of locked vendors */}
                <div style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
                  {bill.detectedVendors.slice(3, 6).map((v, i) => (
                    <VendorCard key={v.id} vendor={v} index={i + 4} />
                  ))}

                  {/* Shadow Bill teaser */}
                  <div style={{ ...panel, padding: 28, marginTop: 16 }}>
                    <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: c.red }}>
                      {fmtEur(bill.totalProbableWasteEur[0])}-{fmtEur(bill.totalProbableWasteEur[1])} EUR/an
                    </p>
                    <p style={{ fontFamily: SA, fontSize: 13, color: c.text2, marginTop: 4 }}>
                      Estimated probable waste from overlaps &amp; under-utilization
                    </p>
                  </div>
                </div>

                {/* ── LOCK OVERLAY ─────────────────── */}
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(2px)",
                  borderRadius: 18,
                  zIndex: 10,
                }}>
                  <div style={{ ...panel, padding: 32, maxWidth: 420, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: c.redBg, border: `1px solid ${c.redBd}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <span style={{ fontSize: 22 }}>&#128274;</span>
                    </div>
                    <p style={{ fontFamily: SA, fontSize: 18, fontWeight: 800, color: c.text1, marginBottom: 6 }}>
                      {bill.lockedVendorCount} more vendors detected
                    </p>
                    <p style={{ fontFamily: SA, fontSize: 13, color: c.text3, marginBottom: 20, lineHeight: 1.5 }}>
                      Full Shadow Bill, overlap analysis, and waste estimation require your professional email.
                    </p>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                      placeholder="cfo@company.com"
                      style={{
                        width: "100%", padding: "14px 16px", borderRadius: 10,
                        border: `1px solid ${c.borderS}`, background: "#fff",
                        fontSize: 15, fontFamily: MO, color: c.text1,
                        outline: "none", boxSizing: "border-box",
                        marginBottom: 12,
                      }}
                    />
                    <button
                      onClick={handleUnlock}
                      disabled={submitting || !email.includes("@")}
                      style={{
                        width: "100%", padding: "14px 24px", borderRadius: 10,
                        border: "none", background: "#0F172A", color: "#fff",
                        fontSize: 14, fontWeight: 700, fontFamily: SA,
                        letterSpacing: ".04em", textTransform: "uppercase",
                        cursor: submitting ? "wait" : "pointer",
                        opacity: !email.includes("@") ? 0.5 : 1,
                      }}
                    >
                      {submitting ? "Unlocking..." : "Unlock Full Audit"}
                    </button>

                    <p style={{ fontFamily: SA, fontSize: 10, color: c.text4, marginTop: 10 }}>
                      Professional email only. No free providers.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION: Unlocked Full Results ───── */}
            {unlocked && (
              <>
                {submitted && (
                  <div style={{ ...panel, padding: 16, marginBottom: 20, background: c.greenBg, border: `1px solid ${c.greenBd}` }}>
                    <p style={{ fontFamily: SA, fontSize: 13, color: c.green, fontWeight: 600 }}>
                      Full audit unlocked. A detailed report will be sent to {email}.
                    </p>
                  </div>
                )}

                {/* All remaining vendors */}
                {bill.detectedVendors.slice(3).map((v, i) => (
                  <VendorCard key={v.id} vendor={v} index={i + 4} />
                ))}

                {/* Overlaps */}
                {bill.overlaps.length > 0 && (
                  <>
                    <SectionLabel style={{ marginTop: 32 }}>Overlap Analysis — Redundant Tools</SectionLabel>
                    {bill.overlaps.map((o, i) => (
                      <OverlapCard key={i} overlap={o} />
                    ))}
                  </>
                )}

                {/* The Shadow Bill */}
                <SectionLabel style={{ marginTop: 32 }}>The Shadow Bill</SectionLabel>
                <div style={{ ...panel, padding: 28 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <BillMetric
                      label="Estimated Annual SaaS Spend"
                      value={`${fmtEur(bill.totalEstimatedSpendEur[0])}-${fmtEur(bill.totalEstimatedSpendEur[1])} EUR`}
                      color={c.text1}
                    />
                    <BillMetric
                      label="Probable Waste (Overlaps + Under-use)"
                      value={`${fmtEur(bill.totalProbableWasteEur[0])}-${fmtEur(bill.totalProbableWasteEur[1])} EUR`}
                      color={c.red}
                    />
                    <BillMetric
                      label="Waste Ratio"
                      value={`~${bill.wastePercent}%`}
                      color={bill.wastePercent > 25 ? c.red : c.amber}
                    />
                    <BillMetric
                      label="Stack Complexity"
                      value={`${bill.stackComplexity}/100`}
                      color={bill.stackComplexity > 50 ? c.amber : c.green}
                    />
                  </div>

                  <div style={{ marginTop: 20, padding: 16, background: c.redBg, border: `1px solid ${c.redBd}`, borderRadius: 10 }}>
                    <p style={{ fontFamily: SA, fontSize: 13, color: c.red, fontWeight: 700, marginBottom: 4 }}>
                      Daily cost of inaction
                    </p>
                    <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: c.red }}>
                      {fmtEur(Math.round(bill.totalProbableWasteEur[0] / 365))}-{fmtEur(Math.round(bill.totalProbableWasteEur[1] / 365))} EUR/day
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div style={{ ...panel, padding: 28, marginTop: 24, textAlign: "center", background: "#0F172A", border: "none" }}>
                  <p style={{ fontFamily: SA, fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                    Want the full Decision Intelligence report?
                  </p>
                  <p style={{ fontFamily: SA, fontSize: 13, color: "#94A3B8", marginBottom: 20 }}>
                    21-phase analysis with proof-backed exposure, negotiation playbooks, and a CFO-ready Decision Pack.
                  </p>
                  <a
                    href={`/intel?domain=${encodeURIComponent(domain)}`}
                    style={{
                      display: "inline-block", padding: "14px 32px", borderRadius: 10,
                      background: "#fff", color: "#0F172A",
                      fontSize: 14, fontWeight: 700, fontFamily: SA,
                      textDecoration: "none", letterSpacing: ".04em",
                    }}
                  >
                    RUN FULL DETECTION — FREE
                  </a>
                </div>
              </>
            )}

            {/* ── Methodology ──────────────────────── */}
            <div style={{ marginTop: 40, padding: "0 4px" }}>
              <p style={{ fontFamily: MO, fontSize: 10, color: c.text4, lineHeight: 1.7 }}>
                <strong>Methodology.</strong> This analysis uses Certificate Transparency (CT) logs — a public, append-only ledger
                maintained by certificate authorities. Every SSL/TLS certificate issued for your domain and subdomains is logged.
                We parse these records to identify SaaS vendor subdomains (e.g., <code>jira.{domain}</code>, <code>okta.{domain}</code>).
                Cost estimates use published enterprise pricing at median company size. Overlap waste is calculated at category-level
                when 2+ tools serve the same function. Confidence is capped at 85 — we never over-claim.
                No credentials, no access, no agents installed. Public data only.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ══════════════════════════════════════════════════════

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p style={{ fontFamily: MO, fontSize: 10, color: "#64748B", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: MO, fontSize: 11, fontWeight: 700, color: c.accent,
      letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14,
      ...style,
    }}>
      {children}
    </p>
  );
}

function VendorCard({ vendor, index }: { vendor: ShadowBillVendor; index: number }) {
  return (
    <div style={{
      ...panel, padding: "18px 20px", marginBottom: 10,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        <span style={{
          fontFamily: MO, fontSize: 11, fontWeight: 800, color: c.text4,
          width: 28, textAlign: "right",
        }}>
          #{index}
        </span>
        <div>
          <p style={{ fontFamily: SA, fontSize: 15, fontWeight: 700, color: c.text1 }}>
            {vendor.name}
          </p>
          <p style={{ fontFamily: MO, fontSize: 11, color: c.text3 }}>
            {CATEGORY_LABELS[vendor.category] || vendor.category} — via <code style={{ fontSize: 10 }}>{vendor.subdomain}</code>
          </p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: c.amber }}>
          {fmtEur(vendor.estimatedAnnualEur[0])}-{fmtEur(vendor.estimatedAnnualEur[1])} EUR/yr
        </p>
        <p style={{ fontFamily: MO, fontSize: 10, color: c.text4 }}>
          ~{vendor.avgSeatCostEur} EUR/seat/yr
        </p>
      </div>
    </div>
  );
}

function OverlapCard({ overlap }: { overlap: OverlapFlag }) {
  return (
    <div style={{
      ...panel, padding: "18px 20px", marginBottom: 10,
      borderLeft: `3px solid ${c.red}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ fontFamily: SA, fontSize: 14, fontWeight: 700, color: c.red }}>
          {CATEGORY_LABELS[overlap.category] || overlap.category} — {overlap.wastePercent}% waste
        </p>
        <p style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: c.red }}>
          {fmtEur(overlap.estimatedWasteEur[0])}-{fmtEur(overlap.estimatedWasteEur[1])} EUR/yr
        </p>
      </div>
      <p style={{ fontFamily: SA, fontSize: 12, color: c.text3, marginBottom: 6 }}>
        Overlapping: {overlap.vendors.join(" + ")}
      </p>
      <p style={{ fontFamily: SA, fontSize: 11, color: c.text4 }}>
        {overlap.explanation}
      </p>
    </div>
  );
}

function BillMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 16, background: c.surface, borderRadius: 10, border: `1px solid ${c.border}` }}>
      <p style={{ fontFamily: MO, fontSize: 10, color: c.text4, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}
