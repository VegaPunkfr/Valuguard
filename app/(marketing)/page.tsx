"use client";

import { useState, useEffect, useRef } from "react";

/*  VALUGUARD — LANDING PAGE (US 2026 FINAL)
    Homepage conversion hub. Every section has one job:
    move the CFO from "what is this" to "RECLAIM NOW".
    100% USD. Zero French. Zero Euro. */

const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const RD = "#ef4444";
const OR = "#f59e0b";
const TL = "#34d399";
const BD = "rgba(36,48,78,0.32)";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,sans-serif";

const gl = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

// ── Scroll reveal ──────────────────────────────────
function useReveal(th: number) {
  const ref = useRef<HTMLElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(function () {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      function (entries) { if (entries[0].isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: th || 0.1 }
    );
    obs.observe(el);
    return function () { obs.disconnect(); };
  }, [th]);
  return [ref, vis] as const;
}

function Section(props: { delay?: number; style?: React.CSSProperties; children: React.ReactNode }) {
  const result = useReveal(0.08);
  const ref = result[0];
  const vis = result[1];
  const d = props.delay || 0;
  return (
    <section ref={ref as React.Ref<HTMLElement>} style={Object.assign({
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(18px)",
      transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) " + d + "ms",
      marginBottom: 48,
    }, props.style || {})}>
      {props.children}
    </section>
  );
}

function Label(props: { children: React.ReactNode }) {
  return (
    <span style={{ display: "block", fontSize: 9, fontWeight: 600, fontFamily: MO, letterSpacing: ".14em", textTransform: "uppercase", color: A, marginBottom: 10 }}>
      {props.children}
    </span>
  );
}

// ── Detection engine categories ────────────────────
const DETECTIONS = [
  { icon: "👻", title: "Inactive Licenses", desc: "Seats paid for employees who left or stopped using the tool 90+ days ago." },
  { icon: "🔄", title: "Redundant Tools", desc: "Multiple tools solving the same problem. 3 AI writing apps? That's a Ghost Tax." },
  { icon: "📐", title: "Oversized Plans", desc: "Enterprise plans purchased for teams that only need Pro-level features." },
  { icon: "🏴", title: "Shadow IT", desc: "Tools purchased without IT approval. No negotiation. No volume discounts." },
  { icon: "🤖", title: "AI Cost Drift", desc: "API token consumption growing exponentially with zero governance or budget caps." },
  { icon: "📉", title: "Commitment Waste", desc: "Annual contracts utilized at less than 60% capacity. Money locked and lost." },
];

// ── How it works steps ─────────────────────────────
const STEPS = [
  { num: "01", title: "Export", desc: "Download billing CSVs from your tools. You control what leaves your systems.", time: "5 min" },
  { num: "02", title: "Upload", desc: "Encrypted upload to our vault. Zero-Knowledge protocol — no API access needed.", time: "2 min" },
  { num: "03", title: "Analyze", desc: "8 deterministic detectors scan for 12 leak types. Results in under 48 hours.", time: "48 hrs" },
  { num: "04", title: "Reclaim", desc: "Ranked recovery plan with exact dollar amounts. Present to your board same day.", time: "Instant" },
];

// ── Pricing tiers ──────────────────────────────────
const PRICING = [
  {
    name: "Ghost Tax Audit",
    price: "$990",
    period: "one-time",
    desc: "Full diagnostic of your SaaS, Cloud, and AI spend.",
    features: ["12-type anomaly detection", "Entropy score + peer benchmarking", "5 prioritized recovery actions", "Board-ready executive summary", "48-hour turnaround"],
    cta: "RECLAIM NOW",
    highlight: true,
  },
  {
    name: "Continuous Monitoring",
    price: "$490",
    period: "/month",
    desc: "Ongoing leak detection and governance alerts.",
    features: ["Monthly automated scans", "New anomaly alerts", "Trend tracking dashboard", "Quarterly strategy review", "Dedicated recovery specialist"],
    cta: "CONTACT SALES",
    highlight: false,
  },
  {
    name: "Premium",
    price: "$990",
    period: "/month",
    desc: "Full-service FinOps governance for scaling teams.",
    features: ["Everything in Monitoring", "Vendor negotiation support", "Contract renewal calendar", "AI spend governance framework", "Executive FinOps reporting"],
    cta: "CONTACT SALES",
    highlight: false,
  },
];

// ── FAQ ────────────────────────────────────────────
const FAQ = [
  { q: "How much does a typical company save?", a: "Companies with 50-500 employees typically find 15-25% of their IT spend is recoverable. For a $50k/month budget, that's $90k-$150k per year." },
  { q: "What data do you need?", a: "Billing exports (CSV/XLSX) and license inventories. We never need login credentials, API keys, or access to your production systems." },
  { q: "How is this different from doing it in a spreadsheet?", a: "Spreadsheets can't detect Shadow AI redundancy, calculate organizational entropy, or benchmark you against 7 industry verticals. Our engine runs 8 detectors across 12 leak types in seconds." },
  { q: "Is my data safe?", a: "AES-256 encryption at rest, TLS 1.3 in transit. US data residency (Virginia). Auto-deleted after 30 days. SOC2 Type II audit-ready. See our Security Vault for full details." },
  { q: "What if the audit doesn't find enough savings?", a: "If our audit identifies less than 3x its cost in recoverable spend, we'll work with you until it does — or refund the difference. We've never had to." },
  { q: "How long does it take?", a: "You export and upload in under 10 minutes. We deliver the full report within 48 hours. Top recovery actions can be implemented within a week." },
];

// ── Trust numbers ──────────────────────────────────
const TRUST_STATS = [
  { value: "18x", label: "Average audit ROI" },
  { value: "12", label: "Leak types detected" },
  { value: "48hr", label: "Report delivery" },
  { value: "$0", label: "System access required" },
];

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(-1);

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1 }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 16px" }}>

        {/* ═══════ NAVBAR ═══════ */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid " + BD }}>
          <span style={{ fontSize: 12, fontFamily: MO, fontWeight: 700, letterSpacing: ".06em", color: A }}>VALUGUARD</span>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {["Methodology", "Pricing", "Security"].map(function (item) {
              return <a key={item} href={"#" + item.toLowerCase()} style={{ fontSize: 12, color: T2, textDecoration: "none", fontWeight: 500 }}>{item}</a>;
            })}
            <span style={{ fontSize: 8, fontFamily: MO, color: T3, padding: "3px 7px", borderRadius: 4, border: "1px solid " + BD }}>⌘K</span>
            <a href="#audit" style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: A, padding: "7px 16px", borderRadius: 7, textDecoration: "none", letterSpacing: ".03em" }}>
              START AUDIT
            </a>
          </div>
        </nav>

        {/* ═══════ HERO ═══════ */}
        <Section style={{ textAlign: "center", paddingTop: 64, paddingBottom: 48 }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: A, fontFamily: MO, marginBottom: 16 }}>
            AI SPEND LEAK MONITOR
          </p>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-.03em", marginBottom: 16, maxWidth: 700, margin: "0 auto 16px" }}>
            Expose your{" "}
            <span style={{ color: RD }}>AI Ghost Tax.</span>
            <br />
            Reclaim your margin in{" "}
            <span style={{ fontFamily: MO, color: TL }}>0.00s.</span>
          </h1>
          <p style={{ fontSize: 16, color: T2, maxWidth: 520, margin: "0 auto 28px", lineHeight: 1.6 }}>
            SaaS sprawl, Shadow AI, and ungoverned cloud spend are silently draining 15-25% of your IT budget.
            We find it, quantify it, and show you exactly how to get it back.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <a href="#audit" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none" }}>
              EXPOSE MY GHOST TAX →
            </a>
            <a href="#sample" style={{ display: "inline-block", padding: "14px 24px", borderRadius: 8, border: "1px solid " + BD, color: T2, fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
              See a sample report
            </a>
          </div>
        </Section>

        {/* ═══════ TRUST STRIP ═══════ */}
        <Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {TRUST_STATS.map(function (stat) {
              return (
                <div key={stat.label} style={Object.assign({}, gl, { padding: 16, textAlign: "center" as const })}>
                  <p style={{ fontFamily: MO, fontSize: 26, fontWeight: 800, color: AH, lineHeight: 1 }}>{stat.value}</p>
                  <p style={{ fontSize: 10, color: T3, marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{stat.label}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ═══════ THE PROBLEM ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>THE SILENT MARGIN KILLER</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, lineHeight: 1.2 }}>
              Every month you wait, <span style={{ color: RD }}>the Ghost Tax compounds.</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
              {[
                { amt: "$2,400/mo", label: "Average wasted on inactive licenses", color: RD },
                { amt: "$1,800/mo", label: "Lost to duplicate & overlapping tools", color: OR },
                { amt: "$3,100/mo", label: "Burned by ungoverned AI consumption", color: RD },
              ].map(function (item) {
                return (
                  <div key={item.label} style={{ padding: 16, borderRadius: 9, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)", textAlign: "center" }}>
                    <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: item.color, marginBottom: 6 }}>{item.amt}</p>
                    <p style={{ fontSize: 11, color: T2, lineHeight: 1.4 }}>{item.label}</p>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: T3, textAlign: "center", marginTop: 16, fontFamily: MO }}>
              Based on median findings across 50-500 employee companies. Source: Flexera, Zylo, Gartner 2024-25.
            </p>
          </div>
        </Section>

        {/* ═══════ DETECTION ENGINE ═══════ */}
        <Section>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Label>WHAT OUR ENGINE DETECTS</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>12 leak types. 8 detectors. Zero blind spots.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {DETECTIONS.map(function (d) {
              return (
                <div key={d.title} style={Object.assign({}, gl, { padding: 16 })}>
                  <span style={{ fontSize: 22 }}>{d.icon}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T1, marginTop: 8, marginBottom: 4 }}>{d.title}</h3>
                  <p style={{ fontSize: 11, color: T2, lineHeight: 1.5 }}>{d.desc}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>HOW IT WORKS</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>From CSV to board report in 48 hours.</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {STEPS.map(function (step) {
                return (
                  <div key={step.num} style={{ padding: 16, borderRadius: 10, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)", position: "relative" }}>
                    <div style={{ fontFamily: MO, fontSize: 32, fontWeight: 800, color: "rgba(59,130,246,0.08)", position: "absolute", top: 10, right: 14 }}>{step.num}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: T1, marginBottom: 4 }}>{step.title}</h3>
                    <p style={{ fontSize: 11, color: T2, lineHeight: 1.5, marginBottom: 8 }}>{step.desc}</p>
                    <span style={{ fontSize: 9, fontFamily: MO, color: TL, fontWeight: 600 }}>{step.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══════ PRICING ═══════ */}
        <Section>
          <div id="pricing" style={{ textAlign: "center", marginBottom: 20 }}>
            <Label>PRICING</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Transparent. No surprises. ROI guaranteed.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {PRICING.map(function (tier) {
              return (
                <div key={tier.name} style={Object.assign({}, gl, {
                  padding: 22,
                  borderColor: tier.highlight ? TL + "40" : BD,
                  position: "relative" as const,
                })}>
                  {tier.highlight && (
                    <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontFamily: MO, fontWeight: 700, padding: "3px 10px", borderRadius: 4, background: TL, color: V, letterSpacing: ".06em", textTransform: "uppercase" }}>
                      MOST POPULAR
                    </div>
                  )}
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T1, marginBottom: 8 }}>{tier.name}</h3>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontFamily: MO, fontSize: 30, fontWeight: 800, color: tier.highlight ? TL : AH }}>{tier.price}</span>
                    <span style={{ fontSize: 12, color: T3 }}>{tier.period}</span>
                  </div>
                  <p style={{ fontSize: 11, color: T2, lineHeight: 1.5, marginBottom: 14 }}>{tier.desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {tier.features.map(function (f) {
                      return (
                        <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T2 }}>
                          <span style={{ color: TL, fontSize: 10, fontWeight: 700 }}>✓</span>
                          {f}
                        </div>
                      );
                    })}
                  </div>
                  <button style={{
                    width: "100%", padding: "11px", borderRadius: 7, border: "none",
                    background: tier.highlight ? TL : "rgba(59,130,246,0.08)",
                    color: tier.highlight ? V : AH,
                    fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                    cursor: "pointer",
                  }}>
                    {tier.cta}
                  </button>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 10, color: T3, textAlign: "center", marginTop: 14 }}>
            All prices in USD. Annual billing available at 20% discount for Monitoring and Premium.
          </p>
        </Section>

        {/* ═══════ FAQ ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 24 })}>
            <Label>FREQUENTLY ASKED</Label>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>The real questions. Direct answers.</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {FAQ.map(function (item, i) {
                const open = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: 8, border: "1px solid " + (open ? A + "28" : "rgba(36,48,78,0.14)"), background: open ? "rgba(59,130,246,0.03)" : "rgba(0,0,0,0.08)", overflow: "hidden", transition: "all 0.2s" }}>
                    <button
                      onClick={function () { setOpenFaq(open ? -1 : i); }}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", color: T1, fontSize: 13, fontWeight: 600, textAlign: "left", fontFamily: SA }}
                    >
                      <span>{item.q}</span>
                      <span style={{ fontSize: 11, color: T3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, marginLeft: 10 }}>▼</span>
                    </button>
                    {open && (
                      <div style={{ padding: "0 14px 14px", fontSize: 12, color: T2, lineHeight: 1.6 }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══════ FINAL CTA ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 32, textAlign: "center" as const })}>
            <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: RD, marginBottom: 8 }}>
              EVERY MONTH WITHOUT AN AUDIT COSTS YOU $7,300+ ON AVERAGE
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
              Stop the bleeding. <span style={{ color: TL }}>Reclaim your margin.</span>
            </h2>
            <p style={{ fontSize: 14, color: T2, maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.5 }}>
              The Ghost Tax Audit pays for itself within the first week.
              Average ROI: 18x. Typical recovery: $100k+ per year.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <a id="audit" href="/estimator" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none" }}>
                EXPOSE MY GHOST TAX — $990
              </a>
              <a href="mailto:audits@valuguard.com" style={{ display: "inline-block", padding: "14px 22px", borderRadius: 8, border: "1px solid " + BD, color: T2, fontSize: 13, textDecoration: "none" }}>
                Talk to an expert
              </a>
            </div>
          </div>
        </Section>

        {/* ═══════ FOOTER ═══════ */}
        <footer style={{ borderTop: "1px solid " + BD, padding: "32px 0", marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
            <div>
              <span style={{ fontSize: 12, fontFamily: MO, fontWeight: 700, color: A, letterSpacing: ".06em" }}>VALUGUARD</span>
              <p style={{ fontSize: 11, color: T3, marginTop: 6, maxWidth: 240, lineHeight: 1.5 }}>
                AI Spend Leak Monitor. We reveal where money leaks, how much it costs, and what to fix first.
              </p>
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Product</p>
                {["Ghost Tax Audit", "Methodology", "Sample Report", "Pricing"].map(function (link) {
                  return <p key={link} style={{ fontSize: 11, color: T2, marginBottom: 5 }}>{link}</p>;
                })}
              </div>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Trust</p>
                {["Security Vault", "Privacy Policy", "Terms of Service", "Contact DPO"].map(function (link) {
                  return <p key={link} style={{ fontSize: 11, color: T2, marginBottom: 5 }}>{link}</p>;
                })}
              </div>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Resources</p>
                {["FinOps Glossary", "Leak Patterns Library", "Blog", "ROI Calculator"].map(function (link) {
                  return <p key={link} style={{ fontSize: 11, color: T2, marginBottom: 5 }}>{link}</p>;
                })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid " + BD, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { icon: "🛡", title: "SOC2 Type II Ready" },
                { icon: "🔐", title: "Zero-Knowledge" },
                { icon: "🇺🇸", title: "US Hosted" },
                { icon: "⏱", title: "30-Day Purge" },
              ].map(function (b) {
                return (
                  <span key={b.title} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: T3 }}>
                    <span style={{ fontSize: 12 }}>{b.icon}</span>{b.title}
                  </span>
                );
              })}
            </div>
            <p style={{ fontSize: 9, color: T3 }}>
              © 2026 Valuguard Inc. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
