"use client";
// @ts-nocheck

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

/*  VALUGUARD — SECURITY VAULT (US 2026)
    Trust architecture page. SOC2 Type II Readiness.
    Zero-Knowledge Audit protocol. US data residency.
    Converts skeptical CISOs and compliance officers. */

// ── Tokens ─────────────────────────────────────────
var V = "#060912";
var A = "#3b82f6";
var AH = "#60a5fa";
var T1 = "#e0e6f2";
var T2 = "#8d9bb5";
var T3 = "#55637d";
var RD = "#ef4444";
var GR = "#22c55e";
var TL = "#34d399";
var BD = "rgba(36,48,78,0.32)";
var MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
var SA = "system-ui,-apple-system,sans-serif";

var gls = {
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

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function SecurityVault() {
  var { t } = useI18n();
  var [openFaq, setOpenFaq] = useState(-1);

  // ── Security commitments data ──────────────────────
  var COMMITMENTS = [
    { icon: "🔐", title: t("vault.commit.1.title"), detail: t("vault.commit.1.desc") },
    { icon: "⏱", title: t("vault.commit.2.title"), detail: t("vault.commit.2.desc") },
    { icon: "🚪", title: t("vault.commit.3.title"), detail: t("vault.commit.3.desc") },
    { icon: "📋", title: t("vault.commit.4.title"), detail: t("vault.commit.4.desc") },
    { icon: "🇺🇸", title: t("vault.commit.5.title"), detail: t("vault.commit.5.desc") },
    { icon: "👤", title: t("vault.commit.6.title"), detail: t("vault.commit.6.desc") },
  ];

  // ── Zero-Knowledge Protocol steps ──────────────────
  var ZK_STEPS = [
    { num: "01", title: t("vault.zk.step1"), detail: t("vault.zk.step1d"), icon: "📤" },
    { num: "02", title: t("vault.zk.step2"), detail: t("vault.zk.step2d"), icon: "🔒" },
    { num: "03", title: t("vault.zk.step3"), detail: t("vault.zk.step3d"), icon: "⚡" },
    { num: "04", title: t("vault.zk.step4"), detail: t("vault.zk.step4d"), icon: "📊" },
  ];

  // ── Sub-processors (compliance transparency) ───────
  var SUBPROCESSORS = [
    { name: "AWS (Supabase)", role: t("vault.sub.aws"), location: t("vault.sub.loc.virginia"), soc2: true },
    { name: "Vercel", role: t("vault.sub.vercel"), location: t("vault.sub.loc.useast"), soc2: true },
    { name: "Stripe", role: t("vault.sub.stripe"), location: t("vault.sub.loc.us"), soc2: true },
    { name: "Resend", role: t("vault.sub.resend"), location: t("vault.sub.loc.us"), soc2: true },
    { name: "PostHog", role: t("vault.sub.posthog"), location: t("vault.sub.loc.us"), soc2: true },
    { name: "Sentry", role: t("vault.sub.sentry"), location: t("vault.sub.loc.us"), soc2: true },
  ];

  // ── FAQ data ───────────────────────────────────────
  var FAQ_ITEMS = [
    { q: t("vault.faq.q1"), a: t("vault.faq.a1") },
    { q: t("vault.faq.q2"), a: t("vault.faq.a2") },
    { q: t("vault.faq.q3"), a: t("vault.faq.a3") },
    { q: t("vault.faq.q4"), a: t("vault.faq.a4") },
    { q: t("vault.faq.q5"), a: t("vault.faq.a5") },
  ];

  // ── Honesty block: what we DON'T have yet ──────────
  var HONESTY_ITEMS = [
    { text: t("vault.hon.1"), target: "Q3 2026" },
    { text: t("vault.hon.2"), target: "V2" },
    { text: t("vault.hon.3"), target: "V3" },
    { text: t("vault.hon.4"), target: "V2" },
    { text: t("vault.hon.5"), target: "Q2 2026" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1, padding: "0 14px 64px" }}>
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>

        {/* ── RETOUR ─────────────────────────────── */}
        <div style={{ paddingTop: 16 }}><a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T2, textDecoration: "none", padding: "6px 12px", borderRadius: 6, border: "1px solid " + BD, background: "rgba(11,14,24,0.5)" }}>{t("back")}</a></div>

        {/* ── HERO ──────────────────────────────── */}
        <header style={{ textAlign: "center", padding: "36px 0 40px" }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: A, fontFamily: MO, marginBottom: 14 }}>
            {t("vault.badge")}
          </p>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.025em", marginBottom: 14 }}>
            {t("vault.title1")} <span style={{ color: TL }}>{t("vault.title2")}</span>
          </h1>
          <p style={{ fontSize: 15, color: T2, maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
            {t("vault.subtitle")}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            {[t("vault.tags.1"), t("vault.tags.2"), t("vault.tags.3"), t("vault.tags.4"), t("vault.tags.5")].map(function(b) {
              return <Tag key={b}>{b}</Tag>;
            })}
          </div>
        </header>

        {/* ── ZERO-KNOWLEDGE PROTOCOL ────────────── */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>{t("vault.s1.label")}</SectionLabel>
            <SectionTitle>{t("vault.s1.title")}</SectionTitle>
            <p style={{ fontSize: 13, color: T2, lineHeight: 1.6, marginBottom: 18 }}>
              {t("vault.s1.desc")}
              {" "}<strong style={{ color: T1 }}>{t("vault.s1.descb")}</strong>
              {t("vault.s1.descc")}
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
                <p style={{ fontSize: 11, fontWeight: 600, color: T1 }}>{t("vault.zk.trust")}</p>
                <p style={{ fontSize: 10, color: T3 }}>{t("vault.zk.trustsub")}</p>
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
            <SectionLabel>{t("vault.s2.label")}</SectionLabel>
            <SectionTitle>{t("vault.s2.title")}</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "20px 0", flexWrap: "wrap" }}>
              {[
                { label: t("vault.flow.browser"), sub: t("vault.flow.browsersub"), color: T1, bg: "rgba(59,130,246,0.06)", border: A + "25" },
                null,
                { label: t("vault.flow.tls"), sub: t("vault.flow.tlssub"), color: TL, bg: "rgba(52,211,153,0.06)", border: TL + "25" },
                null,
                { label: t("vault.flow.vault"), sub: t("vault.flow.vaultsub"), color: AH, bg: "rgba(59,130,246,0.06)", border: A + "25" },
                null,
                { label: t("vault.flow.engine"), sub: t("vault.flow.enginesub"), color: T1, bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.25)" },
                null,
                { label: t("vault.flow.report"), sub: t("vault.flow.reportsub"), color: TL, bg: "rgba(52,211,153,0.06)", border: TL + "25" },
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
              <span>{t("vault.flow.note1")}</span>
              <span>·</span>
              <span>{t("vault.flow.note2")}</span>
              <span>·</span>
              <span>{t("vault.flow.note3")}</span>
            </div>
          </Panel>
        </section>

        {/* ── SUB-PROCESSORS TABLE ────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Panel>
              <SectionLabel>{t("vault.s3.label")}</SectionLabel>
              <SectionTitle>{t("vault.s3.title")}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", gap: 8, padding: "6px 10px", fontSize: 8, fontFamily: MO, color: T3, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  <span>{t("vault.table.provider")}</span><span>{t("vault.table.role")}</span><span>{t("vault.table.location")}</span><span>SOC2</span>
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
                <SectionLabel>{t("vault.s4.label")}</SectionLabel>
                <SectionTitle>{t("vault.s4.title")}</SectionTitle>
                <p style={{ fontSize: 12, color: T2, lineHeight: 1.5, marginBottom: 12 }}>
                  {t("vault.s4.desc")}
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
                    <p style={{ fontSize: 11, fontWeight: 600, color: T1, marginBottom: 2 }}>{t("vault.hon.why.title")}</p>
                    <p style={{ fontSize: 10, color: T3, lineHeight: 1.4 }}>
                      {t("vault.hon.why.desc")}
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
            <SectionLabel>{t("vault.s5.label")}</SectionLabel>
            <SectionTitle>{t("vault.s5.title")}</SectionTitle>
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
              <p style={{ fontSize: 15, fontWeight: 700, color: T1, marginBottom: 6 }}>{t("vault.cta.text")}</p>
              <p style={{ fontSize: 12, color: T2, marginBottom: 16, lineHeight: 1.5, maxWidth: 380, margin: "0 auto 16px" }}>
                {t("vault.cta.sub")}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <a href="mailto:security@valuguard.com" style={{ display: "inline-block", padding: "11px 22px", borderRadius: 8, background: A, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none" }}>
                  {t("vault.cta")}
                </a>
                <a href="/estimator" style={{ display: "inline-block", padding: "11px 22px", borderRadius: 8, border: "1px solid " + BD, background: "transparent", color: T2, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                  {t("vault.cta2")} →
                </a>
              </div>
            </div>
          </Panel>
        </section>

        {/* ── TRUST FOOTER ─────────────────────────── */}
        <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 10, border: "1px solid " + BD, background: "rgba(11,14,24,0.35)", display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          {[
            { icon: "🛡", title: t("trustfooter.soc2") },
            { icon: "🔐", title: t("trustfooter.zk") },
            { icon: "🇺🇸", title: t("trustfooter.us") },
            { icon: "⏱", title: t("trustfooter.purge") },
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
