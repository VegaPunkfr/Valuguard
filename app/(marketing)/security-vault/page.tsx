"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { trackEvent, EVENTS } from "@/lib/events";
import { c, f } from "@/lib/tokens";

/*  GHOST TAX — SECURITY VAULT (US 2026)
    Trust architecture page. SOC2-Ready Infrastructure.
    Zero-Knowledge Audit protocol. US data residency.
    Converts skeptical CISOs and compliance officers. */

// -- Scroll reveal hook --
function useReveal(threshold?: number): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: threshold || 0.12 }
    );
    obs.observe(el);
    return () => { obs.disconnect(); };
  }, [threshold]);
  return [ref, visible];
}

// -- Panel with scroll animation --
function Panel({ children, delay = 0, pad = 22, style }: { children: React.ReactNode; delay?: number; pad?: number; style?: React.CSSProperties }) {
  const [ref, vis] = useReveal(0.1);
  return (
    <div ref={ref} className="gt-panel" style={{
      padding: pad,
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(14px)",
      transition: `all 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="gt-badge gt-badge--blue">{children}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="gt-section-label">{children}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 19, fontWeight: 700, color: c.text1, lineHeight: 1.2, letterSpacing: "-.01em", marginBottom: 10 }}>
      {children}
    </h2>
  );
}

// ====================================================
// MAIN
// ====================================================
export default function SecurityVault() {
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState(-1);
  useEffect(() => { trackEvent(EVENTS.SECURITY_VIEWED); }, []);

  // -- Security commitments data --
  const COMMITMENTS = [
    { icon: "\u{1F510}", title: t("vault.commit.1.title"), detail: t("vault.commit.1.desc") },
    { icon: "\u23F1", title: t("vault.commit.2.title"), detail: t("vault.commit.2.desc") },
    { icon: "\u{1F6AA}", title: t("vault.commit.3.title"), detail: t("vault.commit.3.desc") },
    { icon: "\u{1F4CB}", title: t("vault.commit.4.title"), detail: t("vault.commit.4.desc") },
    { icon: "\u{1F1FA}\u{1F1F8}", title: t("vault.commit.5.title"), detail: t("vault.commit.5.desc") },
    { icon: "\u{1F464}", title: t("vault.commit.6.title"), detail: t("vault.commit.6.desc") },
  ];

  // -- Zero-Knowledge Protocol steps --
  const ZK_STEPS = [
    { num: "01", title: t("vault.zk.step1"), detail: t("vault.zk.step1d"), icon: "\u{1F4E4}" },
    { num: "02", title: t("vault.zk.step2"), detail: t("vault.zk.step2d"), icon: "\u{1F512}" },
    { num: "03", title: t("vault.zk.step3"), detail: t("vault.zk.step3d"), icon: "\u26A1" },
    { num: "04", title: t("vault.zk.step4"), detail: t("vault.zk.step4d"), icon: "\u{1F4CA}" },
  ];

  // -- Sub-processors --
  const SUBPROCESSORS = [
    { name: "AWS (Supabase)", role: t("vault.sub.aws"), location: t("vault.sub.loc.virginia"), soc2: true },
    { name: "Vercel", role: t("vault.sub.vercel"), location: t("vault.sub.loc.useast"), soc2: true },
    { name: "Stripe", role: t("vault.sub.stripe"), location: t("vault.sub.loc.us"), soc2: true },
    { name: "Resend", role: t("vault.sub.resend"), location: t("vault.sub.loc.us"), soc2: true },
    { name: "PostHog", role: t("vault.sub.posthog"), location: t("vault.sub.loc.us"), soc2: true },
    { name: "Sentry", role: t("vault.sub.sentry"), location: t("vault.sub.loc.us"), soc2: true },
  ];

  // -- FAQ data --
  const FAQ_ITEMS = [
    { q: t("vault.faq.q1"), a: t("vault.faq.a1") },
    { q: t("vault.faq.q2"), a: t("vault.faq.a2") },
    { q: t("vault.faq.q3"), a: t("vault.faq.a3") },
    { q: t("vault.faq.q4"), a: t("vault.faq.a4") },
    { q: t("vault.faq.q5"), a: t("vault.faq.a5") },
  ];

  // -- Honesty block --
  const HONESTY_ITEMS = [
    { text: t("vault.hon.1"), target: "Q3 2026" },
    { text: t("vault.hon.2"), target: "V2" },
    { text: t("vault.hon.3"), target: "V3" },
    { text: t("vault.hon.4"), target: "V2" },
    { text: t("vault.hon.5"), target: "Q2 2026" },
  ];

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}>
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>

        {/* -- RETOUR -- */}
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("back")}</a>
        </div>

        {/* -- HERO -- */}
        <header style={{ textAlign: "center", padding: "36px 0 40px" }}>
          <p className="gt-section-label" style={{ marginBottom: 14 }}>
            {t("vault.badge")}
          </p>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.025em", marginBottom: 14 }}>
            {t("vault.title1")} <span style={{ color: c.green }}>{t("vault.title2")}</span>
          </h1>
          <p style={{ fontSize: 15, color: c.text2, maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
            {t("vault.subtitle")}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            {[t("vault.tags.1"), t("vault.tags.2"), t("vault.tags.3"), t("vault.tags.4"), t("vault.tags.5")].map((b) => (
              <Tag key={b}>{b}</Tag>
            ))}
          </div>
        </header>

        {/* -- ZERO-KNOWLEDGE PROTOCOL -- */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>{t("vault.s1.label")}</SectionLabel>
            <SectionTitle>{t("vault.s1.title")}</SectionTitle>
            <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 18 }}>
              {t("vault.s1.desc")}
              {" "}<strong style={{ color: c.text1 }}>{t("vault.s1.descb")}</strong>
              {t("vault.s1.descc")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {ZK_STEPS.map((step) => (
                <div key={step.num} className="gt-inset" style={{ padding: "16px 14px", position: "relative" }}>
                  <div className="gt-mono" style={{ fontSize: 28, fontWeight: 800, color: c.accentBg, position: "absolute", top: 10, right: 12 }}>{step.num}</div>
                  <span style={{ fontSize: 22 }}>{step.icon}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginTop: 8, marginBottom: 4 }}>{step.title}</h3>
                  <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{step.detail}</p>
                </div>
              ))}
            </div>
            <div className="gt-card" style={{ marginTop: 16, padding: "10px 14px", background: c.greenBg, borderColor: c.greenBd, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{"\u{1F6E1}"}</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: c.text1 }}>{t("vault.zk.trust")}</p>
                <p style={{ fontSize: 10, color: c.text3 }}>{t("vault.zk.trustsub")}</p>
              </div>
            </div>
          </Panel>
        </section>

        {/* -- 6 COMMITMENTS -- */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {COMMITMENTS.map((item, i) => (
              <Panel key={item.title} delay={i * 60} pad={18}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{item.title}</h3>
                    <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{item.detail}</p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </section>

        {/* -- DATA FLOW ARCHITECTURE -- */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>{t("vault.s2.label")}</SectionLabel>
            <SectionTitle>{t("vault.s2.title")}</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "20px 0", flexWrap: "wrap" }}>
              {[
                { label: t("vault.flow.browser"), sub: t("vault.flow.browsersub"), color: c.text1, bg: c.accentBg, border: c.accentBd },
                null,
                { label: t("vault.flow.tls"), sub: t("vault.flow.tlssub"), color: c.green, bg: c.greenBg, border: c.greenBd },
                null,
                { label: t("vault.flow.vault"), sub: t("vault.flow.vaultsub"), color: c.accentHi, bg: c.accentBg, border: c.accentBd },
                null,
                { label: t("vault.flow.engine"), sub: t("vault.flow.enginesub"), color: c.text1, bg: c.amberBg, border: c.amberBd },
                null,
                { label: t("vault.flow.report"), sub: t("vault.flow.reportsub"), color: c.green, bg: c.greenBg, border: c.greenBd },
              ].map((item, i) => {
                if (item === null) {
                  return <span key={"arr" + i} style={{ fontSize: 14, color: c.text3, margin: "0 6px" }}>{"\u2192"}</span>;
                }
                return (
                  <div key={item.label} style={{ padding: "10px 14px", borderRadius: 8, background: item.bg, border: "1px solid " + item.border, textAlign: "center", minWidth: 110 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: item.color }}>{item.label}</p>
                    <p style={{ fontSize: 8, color: c.text3, marginTop: 2 }}>{item.sub}</p>
                  </div>
                );
              })}
            </div>
            <div className="gt-mono" style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: 8, color: c.text3, textTransform: "uppercase", letterSpacing: ".06em" }}>
              <span>{t("vault.flow.note1")}</span>
              <span>{"\u00B7"}</span>
              <span>{t("vault.flow.note2")}</span>
              <span>{"\u00B7"}</span>
              <span>{t("vault.flow.note3")}</span>
            </div>
          </Panel>
        </section>

        {/* -- DATA HANDLING MATRIX -- */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>{t("vault.dh.label")}</SectionLabel>
            <SectionTitle>{t("vault.dh.title")}</SectionTitle>
            <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 16 }}>
              {t("vault.dh.desc")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Header */}
              <div className="gt-label" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr 1fr 60px", gap: 8, padding: "8px 10px" }}>
                <span>{t("vault.dh.col.type")}</span><span>{t("vault.dh.col.source")}</span><span>{t("vault.dh.col.use")}</span><span>{t("vault.dh.col.storage")}</span><span>{t("vault.dh.col.required")}</span>
              </div>
              {[
                { type: t("vault.dh.r1.type"), source: t("vault.dh.r1.source"), use: t("vault.dh.r1.use"), storage: t("vault.dh.r1.storage"), req: true },
                { type: t("vault.dh.r2.type"), source: t("vault.dh.r2.source"), use: t("vault.dh.r2.use"), storage: t("vault.dh.r2.storage"), req: false },
                { type: t("vault.dh.r3.type"), source: t("vault.dh.r3.source"), use: t("vault.dh.r3.use"), storage: t("vault.dh.r3.storage"), req: false },
                { type: t("vault.dh.r4.type"), source: t("vault.dh.r4.source"), use: t("vault.dh.r4.use"), storage: t("vault.dh.r4.storage"), req: false },
                { type: t("vault.dh.r5.type"), source: t("vault.dh.r5.source"), use: t("vault.dh.r5.use"), storage: t("vault.dh.r5.storage"), req: false },
                { type: t("vault.dh.r6.type"), source: t("vault.dh.r6.source"), use: t("vault.dh.r6.use"), storage: t("vault.dh.r6.storage"), req: false },
                { type: t("vault.dh.r7.type"), source: t("vault.dh.r7.source"), use: t("vault.dh.r7.use"), storage: t("vault.dh.r7.storage"), req: "Auto" as const },
                { type: t("vault.dh.r8.type"), source: t("vault.dh.r8.source"), use: t("vault.dh.r8.use"), storage: t("vault.dh.r8.storage"), req: "Auto" as const },
                { type: t("vault.dh.r9.type"), source: t("vault.dh.r9.source"), use: t("vault.dh.r9.use"), storage: t("vault.dh.r9.storage"), req: false },
              ].map((row, i) => (
                <div key={i} className="gt-inset" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr 1fr 60px", gap: 8, padding: "8px 10px", fontSize: 11, alignItems: "center", background: i % 2 === 0 ? "#F8FAFC" : "#F1F5F9" }}>
                  <span style={{ color: c.text1, fontWeight: 600 }}>{row.type}</span>
                  <span style={{ color: c.text2 }}>{row.source}</span>
                  <span style={{ color: c.text2, fontSize: 10 }}>{row.use}</span>
                  <span style={{ color: c.text3, fontSize: 10 }}>{row.storage}</span>
                  <span className="gt-mono" style={{ textAlign: "center", fontSize: 9, fontWeight: 600, color: row.req === true ? c.green : row.req === "Auto" ? c.accentHi : c.text3 }}>
                    {row.req === true ? t("vault.dh.yes") : row.req === "Auto" ? t("vault.dh.auto") : t("vault.dh.no")}
                  </span>
                </div>
              ))}
            </div>
            <div className="gt-card" style={{ marginTop: 14, padding: "10px 14px", background: c.greenBg, borderColor: c.greenBd }}>
              <p style={{ fontSize: 10, color: c.text2, lineHeight: 1.5 }}>
                <strong style={{ color: c.text1 }}>{t("vault.dh.retention.label")}</strong> {t("vault.dh.retention.desc")}
              </p>
            </div>
          </Panel>
        </section>

        {/* -- SUB-PROCESSORS TABLE -- */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Panel>
              <SectionLabel>{t("vault.s3.label")}</SectionLabel>
              <SectionTitle>{t("vault.s3.title")}</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <div className="gt-label" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", gap: 8, padding: "6px 10px" }}>
                  <span>{t("vault.table.provider")}</span><span>{t("vault.table.role")}</span><span>{t("vault.table.location")}</span><span>SOC2</span>
                </div>
                {SUBPROCESSORS.map((sp) => (
                  <div key={sp.name} className="gt-inset" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 40px", gap: 8, padding: "8px 10px", fontSize: 11 }}>
                    <span style={{ color: c.text1, fontWeight: 600 }}>{sp.name}</span>
                    <span style={{ color: c.text2 }}>{sp.role}</span>
                    <span style={{ color: c.text2 }}>{sp.location}</span>
                    <span style={{ color: c.green, fontWeight: 700, textAlign: "center" }}>{sp.soc2 ? "\u2713" : "\u2014"}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Honesty block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Panel delay={80}>
                <SectionLabel>{t("vault.s4.label")}</SectionLabel>
                <SectionTitle>{t("vault.s4.title")}</SectionTitle>
                <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.5, marginBottom: 12 }}>
                  {t("vault.s4.desc")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {HONESTY_ITEMS.map((item, i) => (
                    <div key={i} className="gt-inset" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}>
                      <span style={{ fontSize: 11, color: c.text2 }}>{item.text}</span>
                      <span className="gt-badge gt-badge--blue">{item.target}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel delay={140}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{"\u2696\uFE0F"}</span>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: c.text1, marginBottom: 2 }}>{t("vault.hon.why.title")}</p>
                    <p style={{ fontSize: 10, color: c.text3, lineHeight: 1.4 }}>
                      {t("vault.hon.why.desc")}
                    </p>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </section>

        {/* -- SECURITY FAQ -- */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>{t("vault.s5.label")}</SectionLabel>
            <SectionTitle>{t("vault.s5.title")}</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {FAQ_ITEMS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} style={{ borderRadius: 8, border: "1px solid " + (isOpen ? c.accentBd : c.border), background: isOpen ? c.accentBg : "#F8FAFC", overflow: "hidden", transition: "all 0.2s" }}>
                    <button
                      onClick={() => { setOpenFaq(isOpen ? -1 : i); }}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "none", border: "none", cursor: "pointer", color: c.text1, fontSize: 13, fontWeight: 600, textAlign: "left", fontFamily: f.sans }}
                    >
                      <span>{faq.q}</span>
                      <span style={{ fontSize: 12, color: c.text3, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, marginLeft: 10 }}>{"\u25BC"}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 14px 14px", fontSize: 12, color: c.text2, lineHeight: 1.6 }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>

        {/* -- DPA — Data Processing Agreement -- */}
        <section style={{ marginBottom: 40 }}>
          <Panel>
            <SectionLabel>{t("vault.dpa.label")}</SectionLabel>
            <SectionTitle>{t("vault.dpa.title")}</SectionTitle>
            <div className="gt-card" style={{ marginTop: 12, padding: "14px 16px", background: c.accentBg, borderColor: c.accentBd, borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.7 }}>
                {t("vault.dpa.desc")}
              </p>
            </div>
          </Panel>
        </section>

        {/* -- EU DATA FLOW -- */}
        <section style={{ marginBottom: 40 }}>
          <Panel delay={40}>
            <SectionLabel>{t("vault.subprocessors.eu.label")}</SectionLabel>
            <SectionTitle>{t("vault.subprocessors.eu.title")}</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              <div className="gt-label" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, padding: "6px 10px" }}>
                <span>{t("vault.table.provider")}</span><span>{t("vault.table.role")}</span>
              </div>
              {[
                { name: t("vault.subprocessors.eu.sub1.name"), role: t("vault.subprocessors.eu.sub1.role") },
                { name: t("vault.subprocessors.eu.sub2.name"), role: t("vault.subprocessors.eu.sub2.role") },
                { name: t("vault.subprocessors.eu.sub3.name"), role: t("vault.subprocessors.eu.sub3.role") },
                { name: t("vault.subprocessors.eu.sub4.name"), role: t("vault.subprocessors.eu.sub4.role") },
              ].map((sp) => (
                <div key={sp.name} className="gt-inset" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, padding: "8px 10px", fontSize: 11, alignItems: "center" }}>
                  <span style={{ color: c.text1, fontWeight: 600, fontFamily: f.mono }}>{sp.name}</span>
                  <span style={{ color: c.text2 }}>{sp.role}</span>
                </div>
              ))}
            </div>
            <div className="gt-card" style={{ marginTop: 12, padding: "10px 14px", background: c.greenBg, borderColor: c.greenBd }}>
              <p style={{ fontSize: 10, color: c.text3, lineHeight: 1.5 }}>
                Input: Domain (public) {"\u2192"} Exa Neural Search (public data) {"\u2192"} Analysis Pipeline (21 phases, server-side) {"\u2192"} Report (Supabase, AES-256) {"\u2192"} Delivery (Resend). Retention: 90 days, automatic deletion. No client system data accessed.
              </p>
            </div>
          </Panel>
        </section>

        {/* -- EU AI ACT -- */}
        <section style={{ marginBottom: 40 }}>
          <Panel delay={80}>
            <SectionLabel>{t("vault.euai.label")}</SectionLabel>
            <SectionTitle>{t("vault.euai.title")}</SectionTitle>
            <div className="gt-card" style={{ marginTop: 12, padding: "14px 16px", background: c.greenBg, borderColor: c.greenBd, borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.7 }}>
                {t("vault.euai.desc")}
              </p>
            </div>
          </Panel>
        </section>

        {/* -- SOC2 ETA -- */}
        <section style={{ marginBottom: 40 }}>
          <Panel delay={120}>
            <div className="gt-card" style={{ padding: "14px 16px", background: c.amberBg, border: "1px solid " + c.amberBd, borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{"\u231B"}</span>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.7 }}>
                {t("security.soc2eta")}
              </p>
            </div>
          </Panel>
        </section>

        {/* -- CTA -- */}
        <section>
          <Panel>
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: c.text1, marginBottom: 6 }}>{t("vault.cta.text")}</p>
              <p style={{ fontSize: 12, color: c.text2, marginBottom: 16, lineHeight: 1.5, maxWidth: 380, margin: "0 auto 16px" }}>
                {t("vault.cta.sub")}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <a href="mailto:security@ghost-tax.com" className="gt-btn gt-btn-primary">
                  {t("vault.cta")}
                </a>
                <a href="/intel" className="gt-btn gt-btn-ghost">
                  {t("vault.cta2")} {"\u2192"}
                </a>
              </div>
            </div>
          </Panel>
        </section>

        {/* -- Related research -- */}
        <section style={{ marginBottom: 40, marginTop: 20 }}>
          <Panel>
            <p className="gt-label" style={{ marginBottom: 10 }}>{t("vault.related.label")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <a href="/intel-benchmarks/saas-ai-cost-exposure" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("vault.related.link1")} {"\u2192"}</a>
              <a href="/intel-benchmarks/shadow-ai-governance" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("vault.related.link2")} {"\u2192"}</a>
              <a href="/intel-benchmarks/cfo-technology-spend-guide" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("vault.related.link3")} {"\u2192"}</a>
            </div>
            <div className="gt-divider" style={{ margin: "12px 0 10px" }} />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <a href="/methodology" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("vault.related.link4")} {"\u2192"}</a>
              <a href="/procurement" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("vault.related.link5")} {"\u2192"}</a>
              <a href="/intel-benchmarks" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("vault.related.link6")} {"\u2192"}</a>
            </div>
          </Panel>
        </section>

        {/* -- TRUST FOOTER -- */}
        <div className="gt-card" style={{ marginTop: 20, padding: "12px 14px", display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          {[
            { icon: "\u{1F6E1}", title: t("trustfooter.soc2") },
            { icon: "\u{1F510}", title: t("trustfooter.zk") },
            { icon: "\u{1F1FA}\u{1F1F8}", title: t("trustfooter.us") },
            { icon: "\u23F1", title: t("trustfooter.purge") },
          ].map((b) => (
            <div key={b.title} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: c.text2 }}>
              <span style={{ fontSize: 14 }}>{b.icon}</span>
              <span style={{ fontWeight: 600 }}>{b.title}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
