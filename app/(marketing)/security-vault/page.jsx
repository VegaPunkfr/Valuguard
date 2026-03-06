"use client";
// @ts-nocheck

import { useState, useEffect, useRef } from "react";

/*  VALUGUARD — SECURITY VAULT (US 2026)
    Trust architecture page. SOC2 Type II Readiness.
    Zero-Knowledge Audit protocol. US data residency.
    Converts skeptical CISOs and compliance officers. */

// ── Tokens ─────────────────────────────────────────
const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const RD = "#ef4444";
const GR = "#22c55e";
const TL = "#34d399";
const BD = "rgba(36,48,78,0.32)";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,sans-serif";

const gls = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

// ── Scroll reveal hook ─────────────────────────────
function useReveal(threshold) {
  var ref = useRef(null);
  var [visible, setVisible] = useState(false);
  useEffect(function() {
    var el = ref.current;
    if (!el) return;
    var obs = new IntersectionObserver(
      function(entries) { if (entries[0].isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: threshold || 0.12 }
    );
    obs.observe(el);
    return function() { obs.disconnect(); };
  }, [threshold]);
  return [ref, visible];
}

// ── Panel with scroll animation ────────────────────
function Panel(props) {
  var result = useReveal(0.1);
  var ref = result[0];
  var vis = result[1];
  var delay = props.delay || 0;
  return (
    <div ref={ref} style={Object.assign({}, gls, {
      padding: props.pad || 22,
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(14px)",
      transition: "all 0.55s cubic-bezier(0.16,1,0.3,1) " + delay + "ms",
    }, props.style || {})}>
      {props.children}
    </div>
  );
}

function Tag(props) {
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 600, fontFamily: MO,
      letterSpacing: ".06em", textTransform: "uppercase",
      padding: "4px 10px", borderRadius: 5,
      background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)",
      color: AH,
    }}>
      {props.children}
    </span>
  );
}

function SectionLabel(props) {
  return (
    <span style={{
      display: "block", fontSize: 9, fontWeight: 600, fontFamily: MO,
      letterSpacing: ".14em", textTransform: "uppercase",
      color: A, marginBottom: 10,
    }}>
      {props.children}
    </span>
  );
}

function SectionTitle(props) {
  return (
    <h2 style={{ fontSize: 19, fontWeight: 700, color: T1, lineHeight: 1.2, letterSpacing: "-.01em", marginBottom: 10 }}>
      {props.children}
    </h2>
  );
}

// ── Security commitments data ──────────────────────
var COMMITMENTS = [
  { icon: "🔐", title: "AES-256 Encryption", detail: "All data encrypted at rest (AES-256) and in transit (TLS 1.3). Keys managed by AWS KMS with automatic rotation." },
  { icon: "⏱", title: "30-Day Auto-Purge", detail: "Raw uploaded files are automatically deleted 30 days after processing. Full deletion on request within 72 hours." },
  { icon: "🚪", title: "Row-Level Security", detail: "Every database query is filtered by organization. No user can access another organization's data, even with a valid session." },
  { icon: "📋", title: "Complete Audit Trail", detail: "Every data access, export, and modification is logged. Audit logs exportable on demand for your compliance team." },
  { icon: "🇺🇸", title: "US Data Residency", detail: "All data stored in AWS us-east-1 (Virginia). No data leaves US jurisdiction. No international transfers." },
  { icon: "👤", title: "Dedicated DPO", detail: "security@valuguard.com. Response within 48 hours. Processing records and sub-processor list available on request." },
];

// ── Zero-Knowledge Protocol steps ──────────────────
var ZK_STEPS = [
  { num: "01", title: "You Export", detail: "Download CSV/XLSX from your billing tools. You control exactly what data leaves your systems.", icon: "📤" },
  { num: "02", title: "You Upload", detail: "Encrypted TLS 1.3 upload to our vault. Files never touch our team's machines — automated pipeline only.", icon: "🔒" },
  { num: "03", title: "Engine Analyzes", detail: "Deterministic rule engine processes data in an isolated container. No human reads your raw files.", icon: "⚡" },
  { num: "04", title: "You Receive", detail: "Structured report with anomalies, scores, and recommendations. Raw data purged within 30 days.", icon: "📊" },
];

// ── Sub-processors (compliance transparency) ───────
var SUBPROCESSORS = [
  { name: "AWS (Supabase)", role: "Database, Auth, Storage", location: "us-east-1 (Virginia)", soc2: true },
  { name: "Vercel", role: "Hosting, CDN, Edge Functions", location: "US East", soc2: true },
  { name: "Stripe", role: "Payment processing", location: "US", soc2: true },
  { name: "Resend", role: "Transactional email", location: "US", soc2: true },
  { name: "PostHog", role: "Product analytics", location: "US", soc2: true },
  { name: "Sentry", role: "Error monitoring", location: "US", soc2: true },
];

// ── FAQ data ───────────────────────────────────────
var FAQ_ITEMS = [
  {
    q: "What data do you need for an audit?",
    a: "Billing exports (CSV/XLSX), license inventories, and optionally vendor invoices. We never need login credentials, API keys, OAuth access, or any connection to your production systems.",
  },
  {
    q: "Who can access my data inside Valuguard?",
    a: "Only the automated analysis engine processes your raw data. The assigned analyst reviews the structured output (anomalies, scores) — never the source files. All access is logged.",
  },
  {
    q: "Is Valuguard SOC2 certified?",
    a: "We are SOC2 Type II audit-ready with all controls in place: encryption at rest/transit, RLS, audit logging, access controls, and 30-day auto-purge. Formal certification is in progress (target: Q3 2026). We list our actual controls rather than claiming certifications we don't yet hold.",
  },
  {
    q: "Can I delete my data before the 30-day window?",
    a: "Yes. Request deletion at security@valuguard.com and all data (raw files, processed results, reports) is permanently removed within 72 hours. You'll receive a deletion confirmation.",
  },
  {
    q: "What happens if there's a data breach?",
    a: "Our incident response protocol requires notification within 72 hours per US state breach notification laws. All data is encrypted at rest, so even in the unlikely event of unauthorized access, the data is unreadable without KMS keys.",
  },
];

// ── Honesty block: what we DON'T have yet ──────────
var HONESTY_ITEMS = [
  { text: "SOC2 Type II formal certification", target: "Q3 2026" },
  { text: "ISO 27001 certification", target: "V2" },
  { text: "FedRAMP authorization", target: "V3" },
  { text: "HIPAA BAA (healthcare customers)", target: "V2" },
  { text: "Penetration test report (third-party)", target: "Q2 2026" },
];

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function SecurityVault() {
  var [openFaq, setOpenFaq] = useState(-1);

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1, padding: "0 14px 64px" }}>
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>

        {/* ── HERO ──────────────────────────────── */}
        <header style={{ textAlign: "center", padding: "52px 0 40px" }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: A, fontFamily: MO, marginBottom: 14 }}>
            SECURITY VAULT
          </p>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.025em", marginBottom: 14 }}>
            Your data. <span style={{ color: TL }}>Our obsession.</span>
          </h1>
          <p style={{ fontSize: 15, color: T2, maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
            Secure by architecture, not by promise. We publish our controls,
            our sub-processors, and our limitations. Trust is earned, not claimed.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            {["AES-256", "SOC2 Ready", "US Hosted", "Zero-Knowledge", "30-Day Purge"].map(function(b) {
              return <Tag key={b}>{b}</Tag>;
            })}
          </div>
        </header>

        {/* ── ZERO-KNOWLEDGE PROTOCOL ────────────── */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>01 — ZERO-KNOWLEDGE AUDIT PROTOCOL</SectionLabel>
            <SectionTitle>We analyze your spend without seeing your data.</SectionTitle>
            <p style={{ fontSize: 13, color: T2, lineHeight: 1.6, marginBottom: 18 }}>
              Unlike tools that require OAuth access to your SaaS accounts or install agents on your network,
              Valuguard operates exclusively on <strong style={{ color: T1 }}>billing exports you control</strong>.
              No credentials. No API connections. No agents. Your attack surface stays identical before and after the audit.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {ZK_STEPS.map(function(step) {
                return (
                  <div key={step.num} style={{ padding: "16px 14px", borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(36,48,78,0.22)", position: "relative" }}>
                    <div style={{ fontFamily: MO, fontSize: 28, fontWeight: 800, color: "rgba(59,130,246,0.08)", position: "absolute", top: 10, right: 12 }}>{step.num}</div>
                    <span style={{ fontSize: 22 }}>{step.icon}</span>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: T1, marginTop: 8, marginBottom: 4 }}>{step.title}</h3>
                    <p style={{ fontSize: 11, color: T2, lineHeight: 1.5 }}>{step.detail}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🛡</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: T1 }}>Less access = less risk</p>
                <p style={{ fontSize: 10, color: T3 }}>The Zero-Knowledge protocol is an architectural choice, not a limitation. Your security posture remains unchanged.</p>
              </div>
            </div>
          </Panel>
        </section>

        {/* ── 6 COMMITMENTS ──────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {COMMITMENTS.map(function(c, i) {
              return (
                <Panel key={c.title} delay={i * 60} pad={18}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: T1, marginBottom: 4 }}>{c.title}</h3>
                      <p style={{ fontSize: 11, color: T2, lineHeight: 1.5 }}>{c.detail}</p>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </section>

        {/* ── DATA FLOW ARCHITECTURE ──────────────── */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>02 — DATA FLOW ARCHITECTURE</SectionLabel>
            <SectionTitle>From upload to report — every step encrypted.</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "20px 0", flexWrap: "wrap" }}>
              {[
                { label: "Your Browser", sub: "Local calculation", color: T1, bg: "rgba(59,130,246,0.06)", border: A + "25" },
                null,
                { label: "TLS 1.3", sub: "In-transit encryption", color: TL, bg: "rgba(52,211,153,0.06)", border: TL + "25" },
                null,
                { label: "Supabase Vault", sub: "AES-256 at rest", color: AH, bg: "rgba(59,130,246,0.06)", border: A + "25" },
                null,
                { label: "Analysis Engine", sub: "Isolated container", color: T1, bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.25)" },
                null,
                { label: "Your Report", sub: "Structured output", color: TL, bg: "rgba(52,211,153,0.06)", border: TL + "25" },
              ].map(function(item, i) {
                if (item === null) {
                  return <span key={"arr" + i} style={{ fontSize: 14, color: T3, margin: "0 6px" }}>→</span>;
                }
                return (
                  <div key={item.label} style={{ padding: "10px 14px", borderRadius: 8, background: item.bg, border: "1px solid " + item.border, textAlign: "center", minWidth: 110 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: item.color }}>{item.label}</p>
                    <p style={{ fontSize: 8, color: T3, marginTop: 2 }}>{item.sub}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: 8, color: T3, fontFamily: MO, textTransform: "uppercase", letterSpacing: ".06em" }}>
              <span>Raw files purged at day 30</span>
              <span>·</span>
              <span>No human accesses source files</span>
              <span>·</span>
              <span>All access logged</span>
            </div>
          </Panel>
        </section>

        {/* ── SUB-PROCESSORS TABLE ────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Panel>
              <SectionLabel>03 — SUB-PROCESSORS</SectionLabel>
              <SectionTitle>Full transparency on who handles what.</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", gap: 8, padding: "6px 10px", fontSize: 8, fontFamily: MO, color: T3, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  <span>Provider</span><span>Role</span><span>Location</span><span>SOC2</span>
                </div>
                {SUBPROCESSORS.map(function(sp) {
                  return (
                    <div key={sp.name} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", gap: 8, padding: "8px 10px", borderRadius: 6, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(36,48,78,0.12)", fontSize: 11 }}>
                      <span style={{ color: T1, fontWeight: 600 }}>{sp.name}</span>
                      <span style={{ color: T2 }}>{sp.role}</span>
                      <span style={{ color: T2 }}>{sp.location}</span>
                      <span style={{ color: TL, fontWeight: 700, textAlign: "center" }}>{sp.soc2 ? "✓" : "—"}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Honesty block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Panel delay={80}>
                <SectionLabel>04 — WHAT WE DON'T HAVE YET</SectionLabel>
                <SectionTitle>Honesty over marketing.</SectionTitle>
                <p style={{ fontSize: 12, color: T2, lineHeight: 1.5, marginBottom: 12 }}>
                  We list our limitations upfront. Every item below is on our roadmap with a target date.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {HONESTY_ITEMS.map(function(item, i) {
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(36,48,78,0.12)" }}>
                        <span style={{ fontSize: 11, color: T2 }}>{item.text}</span>
                        <span style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.16)", color: AH }}>{item.target}</span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
              <Panel delay={140}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>⚖️</span>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T1, marginBottom: 2 }}>Why we publish this list</p>
                    <p style={{ fontSize: 10, color: T3, lineHeight: 1.4 }}>
                      Any vendor that claims SOC2 without proof is a red flag.
                      We show you exactly where we are and where we're headed.
                      Trust is built on verified controls, not badge graphics.
                    </p>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </section>

        {/* ── SECURITY FAQ ────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>05 — SECURITY FAQ</SectionLabel>
            <SectionTitle>The real questions. Direct answers.</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {FAQ_ITEMS.map(function(faq, i) {
                var isOpen = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: 8, border: "1px solid " + (isOpen ? A + "30" : "rgba(36,48,78,0.15)"), background: isOpen ? "rgba(59,130,246,0.03)" : "rgba(0,0,0,0.10)", overflow: "hidden", transition: "all 0.2s" }}>
                    <button
                      onClick={function() { setOpenFaq(isOpen ? -1 : i); }}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", color: T1, fontSize: 13, fontWeight: 600, textAlign: "left", fontFamily: SA }}
                    >
                      <span>{faq.q}</span>
                      <span style={{ fontSize: 12, color: T3, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, marginLeft: 10 }}>▼</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 14px 14px", fontSize: 12, color: T2, lineHeight: 1.6 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>

        {/* ── CTA ──────────────────────────────────── */}
        <section>
          <Panel>
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: T1, marginBottom: 6 }}>Questions about security?</p>
              <p style={{ fontSize: 12, color: T2, marginBottom: 16, lineHeight: 1.5, maxWidth: 380, margin: "0 auto 16px" }}>
                Our security team responds within 48 hours. We'll walk through
                our architecture, controls, and compliance roadmap.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <a href="mailto:security@valuguard.com" style={{ display: "inline-block", padding: "11px 22px", borderRadius: 8, background: A, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none" }}>
                  CONTACT SECURITY TEAM
                </a>
                <a href="/en-us/estimator" style={{ display: "inline-block", padding: "11px 22px", borderRadius: 8, border: "1px solid " + BD, background: "transparent", color: T2, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                  RUN GHOST TAX AUDIT →
                </a>
              </div>
            </div>
          </Panel>
        </section>

        {/* ── TRUST FOOTER ─────────────────────────── */}
        <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 10, border: "1px solid " + BD, background: "rgba(11,14,24,0.35)", display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          {[
            { icon: "🛡", title: "SOC2 Type II Ready" },
            { icon: "🔐", title: "Zero-Knowledge Audit" },
            { icon: "🇺🇸", title: "US Data Residency" },
            { icon: "⏱", title: "30-Day Auto-Delete" },
          ].map(function(b) {
            return (
              <div key={b.title} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: T2 }}>
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <span style={{ fontWeight: 600 }}>{b.title}</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}


