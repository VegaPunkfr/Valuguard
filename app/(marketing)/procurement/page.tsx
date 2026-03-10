"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { trackEvent, EVENTS } from "@/lib/events";
import { c, f, inset } from "@/lib/tokens";
import Footer from "@/components/ui/footer";

/* ── GHOST TAX — PROCUREMENT & DECISION SCOPE ────────────────────────
   Buyer-enablement surface for procurement, finance, and security reviewers.
   Combines vendor review material with decision scope clarity.
   Designed to be forwarded internally or printed. */

function Lab({ children }: { children: React.ReactNode }) {
  return <span className="gt-section-label">{children}</span>;
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 19,
        fontWeight: 700,
        color: c.text1,
        lineHeight: 1.2,
        letterSpacing: "-.01em",
        marginBottom: 10,
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.65, marginBottom: 12 }}>{children}</p>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="gt-panel" style={{ padding: 22, ...style }}>
      {children}
    </div>
  );
}

function StageRow({
  stage,
  name,
  price,
  scope,
  data,
  delivery,
}: {
  stage: string;
  name: string;
  price: string;
  scope: string;
  data: string;
  delivery: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 1.2fr 0.8fr 1.4fr 1.2fr 1fr",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 8,
        background: "rgba(0,0,0,0.12)",
        border: `1px solid ${c.border}`,
        alignItems: "start",
        fontSize: 11,
      }}
    >
      <span style={{ fontFamily: f.mono, fontWeight: 700, color: c.accentHi, fontSize: 10 }}>
        {stage}
      </span>
      <div>
        <span style={{ color: c.text1, fontWeight: 600, display: "block" }}>{name}</span>
      </div>
      <span style={{ color: c.green, fontWeight: 600, fontFamily: f.mono, fontSize: 10 }}>
        {price}
      </span>
      <span style={{ color: c.text2, fontSize: 10, lineHeight: 1.5 }}>{scope}</span>
      <span style={{ color: c.text3, fontSize: 10, lineHeight: 1.5 }}>{data}</span>
      <span style={{ color: c.text2, fontSize: 10 }}>{delivery}</span>
    </div>
  );
}

export default function ProcurementPage() {
  const { t } = useI18n();
  useEffect(() => {
    trackEvent(EVENTS.PROCUREMENT_VIEWED);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: c.bg,
        fontFamily: f.sans,
        color: c.text1,
        padding: "0 14px 64px",
      }}
    >
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>
        {/* Back */}
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>
            {t("back")}
          </a>
        </div>

        {/* Hero */}
        <header style={{ textAlign: "center", padding: "36px 0 40px" }}>
          <p className="gt-section-label" style={{ marginBottom: 14 }}>
            PROCUREMENT &amp; DECISION SCOPE
          </p>
          <h1
            style={{
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-.025em",
              marginBottom: 14,
            }}
          >
            Vendor Review &amp; Product Scope
          </h1>
          <P>
            Everything a procurement lead, finance controller, or security reviewer needs to evaluate
            Ghost Tax. Designed to be forwarded or printed.
          </P>
        </header>

        {/* 1. PRODUCT SUMMARY */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <Lab>PRODUCT SUMMARY</Lab>
            <H2>What Ghost Tax Does</H2>
            <P>
              Ghost Tax is a decision acceleration system for SaaS, AI, and cloud spend. It detects
              financial exposure from redundant subscriptions, unmanaged AI tools, and unoptimized
              cloud contracts — then structures the path to correction.
            </P>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Category", value: "SaaS & Cloud Financial Intelligence" },
                {
                  label: "Deployment",
                  value: "Web application — no agent install, no integration required",
                },
                {
                  label: "Data access",
                  value: "Public sources only at self-serve stage. No internal system access.",
                },
              ].map(function (item) {
                return (
                  <div
                    key={item.label}
                    style={{
                      ...inset,
                      padding: "10px 14px",
                    }}
                  >
                    <p className="gt-label" style={{ marginBottom: 4 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 12, color: c.text1, fontWeight: 500, lineHeight: 1.4 }}>
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* 2. COMMERCIAL STAGES */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <Lab>COMMERCIAL STAGES</Lab>
            <H2>Product Ladder</H2>
            <P>
              Four stages, each with clear scope, data requirements, and deliverables. You decide how
              deep to go.
            </P>
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1.2fr 0.8fr 1.4fr 1.2fr 1fr",
                gap: 10,
                padding: "8px 14px",
                fontSize: 8,
                fontFamily: f.mono,
                color: c.text3,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 4,
              }}
            >
              <span>Stage</span>
              <span>Name</span>
              <span>Price</span>
              <span>Scope</span>
              <span>Data Required</span>
              <span>Delivery</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <StageRow
                stage="PUBLIC"
                name="Decision Room"
                price="Free"
                scope="Automated exposure detection from public signals. Diagnosis, loss velocity, peer benchmark, scenarios."
                data="Company domain only. Optional: name, industry, headcount, spend."
                delivery="Real-time streaming — instant"
              />
              <StageRow
                stage="RAIL A"
                name="Corrective Protocol"
                price="From $990"
                scope="Deep corrective analysis. Structured remediation plan with prioritized actions, ownership mapping, payback projections."
                data="Same as public + optional internal context shared during intake."
                delivery="48 hours"
              />
              <StageRow
                stage="RAIL B"
                name="Stabilization 30/60/90"
                price="Scoped"
                scope="Hands-on stabilization plan. 30/60/90-day intervention roadmap. Vendor renegotiation guidance. Budget reallocation."
                data="Internal spend data, contract inventory, org context."
                delivery="Scoped engagement"
              />
              <StageRow
                stage="RAIL C"
                name="Stabilization Mission"
                price="Custom"
                scope="Private institutional engagement. Full operational correction. Embedded advisory."
                data="Full access as agreed under NDA."
                delivery="Custom timeline"
              />
            </div>
          </Card>
        </section>

        {/* 3. TYPICAL BUYERS */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <Lab>TYPICAL BUYERS</Lab>
            <H2>Who Evaluates This</H2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                {
                  role: "CFO / VP Finance",
                  reason:
                    "Needs visibility into unmanaged spend categories (SaaS, AI, cloud) that sit outside traditional ERP reporting.",
                },
                {
                  role: "CIO / IT Director",
                  reason:
                    "Wants to detect shadow IT and tool sprawl without deploying agents or requiring SSO integration.",
                },
                {
                  role: "Procurement Lead",
                  reason:
                    "Evaluating vendor for initial detection before committing to a full SaaS management platform.",
                },
                {
                  role: "CISO / Security",
                  reason:
                    "Needs to verify data handling, sub-processors, and access scope before approval.",
                },
              ].map(function (item) {
                return (
                  <div
                    key={item.role}
                    style={{
                      ...inset,
                      padding: "14px 16px",
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 700, color: c.text1, marginBottom: 4 }}>
                      {item.role}
                    </p>
                    <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{item.reason}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* 4. WHAT YOU GET BEFORE / AFTER PURCHASE */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card>
              <Lab>BEFORE PURCHASE</Lab>
              <H2>Free Detection Output</H2>
              <P>What the public Decision Room delivers — no account, no payment.</P>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  "Signal-based exposure diagnosis",
                  "Annual exposure range (low\u2013high)",
                  "Loss velocity: daily through yearly leakage",
                  "Peer benchmark positioning (when data permits)",
                  "Correction momentum & decision pressure score",
                  "Three forward scenarios (drift / partial / full correction)",
                  "Evidence-tiered confidence (observed / inferred / estimated)",
                ].map(function (item) {
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "6px 0",
                      }}
                    >
                      <span
                        style={{
                          color: c.green,
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        +
                      </span>
                      <span style={{ fontSize: 11, color: c.text2, lineHeight: 1.4 }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <Lab>AFTER PURCHASE — RAIL A</Lab>
              <H2>Corrective Protocol</H2>
              <P>What deepens when you commit to the paid detection (from $990).</P>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  "Deeper signal sourcing with extended enrichment window",
                  "Prioritized corrective action list with ownership mapping",
                  "Vendor-specific remediation guidance",
                  "Payback timeline projections",
                  "Exportable decision pack for internal distribution",
                  "Confidence uplift from additional data sources",
                  "48-hour delivery — structured for executive presentation",
                ].map(function (item) {
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "6px 0",
                      }}
                    >
                      <span
                        style={{
                          color: c.accentHi,
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        +
                      </span>
                      <span style={{ fontSize: 11, color: c.text2, lineHeight: 1.4 }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </section>

        {/* 5. SECURITY HANDOFF */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <Lab>SECURITY &amp; COMPLIANCE</Lab>
            <H2>Security Review Pointers</H2>
            <P>
              For detailed security posture, data handling matrix, sub-processor list, and compliance
              roadmap:
            </P>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="/security-vault"
                className="gt-btn gt-btn-accent-ghost"
                style={{ textDecoration: "none", fontSize: 12 }}
              >
                Security &amp; Data Handling &rarr;
              </a>
              <a
                href="/methodology"
                className="gt-btn gt-btn-ghost"
                style={{ textDecoration: "none", fontSize: 12 }}
              >
                Methodology &amp; Model Transparency &rarr;
              </a>
            </div>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 10,
              }}
            >
              {[
                { label: "Internal access", value: "None at self-serve stage" },
                { label: "Agent install", value: "Not required" },
                { label: "SSO / integration", value: "Not required" },
                { label: "Data residency", value: "US (AWS us-east-1)" },
              ].map(function (item) {
                return (
                  <div
                    key={item.label}
                    style={{
                      ...inset,
                      padding: "10px 12px",
                    }}
                  >
                    <p className="gt-label" style={{ marginBottom: 3 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 11, color: c.text1, fontWeight: 500 }}>{item.value}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Related research */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <p className="gt-label" style={{ marginBottom: 10 }}>
              Related research
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <a
                href="/intel-benchmarks/saas-ai-cost-exposure"
                style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
              >
                SaaS &amp; AI Cost Exposure by Industry &rarr;
              </a>
              <a
                href="/intel-benchmarks/shadow-ai-governance"
                style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
              >
                Shadow AI Governance: Detection &amp; Cost Impact &rarr;
              </a>
              <a
                href="/intel-benchmarks/cfo-technology-spend-guide"
                style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
              >
                CFO Guide to Technology Spend Exposure &rarr;
              </a>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                marginTop: 12,
                paddingTop: 10,
                borderTop: `1px solid ${c.border}`,
              }}
            >
              <a
                href="/methodology"
                style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
              >
                Detection Methodology &rarr;
              </a>
              <a
                href="/security-vault"
                style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
              >
                Security &amp; Data Handling &rarr;
              </a>
              <a
                href="/intel-benchmarks"
                style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
              >
                All Intelligence Benchmarks &rarr;
              </a>
            </div>
          </Card>
        </section>

        {/* 6. CONTACT / CTA */}
        <section>
          <Card style={{ textAlign: "center" as const, padding: "28px 22px" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: c.text1, marginBottom: 6 }}>
              Ready to evaluate?
            </p>
            <P>
              Start with the free detection. If the output is useful, the paid protocol is one click
              away.
            </P>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
              <a
                href="/intel"
                className="gt-btn gt-btn-primary"
                style={{ textDecoration: "none", fontSize: 11 }}
              >
                Run Detection
              </a>
              <a
                href="mailto:audits@ghost-tax.com"
                className="gt-btn gt-btn-ghost"
                style={{ textDecoration: "none", fontSize: 11 }}
              >
                Contact for Rail B/C &rarr;
              </a>
            </div>
          </Card>
        </section>

        {/* Print styles */}
        <style>{`
          @media print {
            body { background: #fff !important; color: #111 !important; }
            div { box-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
          }
        `}</style>
      </div>
      <Footer />
    </div>
  );
}
