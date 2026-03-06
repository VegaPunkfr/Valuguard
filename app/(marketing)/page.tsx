"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

/*  VALUGUARD — LANDING PAGE (i18n: EN/FR/DE)
    Navbar is in layout.tsx (global sticky).
    Framer Motion scroll reveals. Social proof. Testimonials.
    Pricing: $990 audit, $490/mo essentials, $990/mo guardian. */

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

// ── Framer Motion scroll reveal ────────────────────
const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function Section(props: { delay?: number; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: (props.delay || 0) / 1000 }}
      style={Object.assign({ marginBottom: 48 }, props.style || {})}
    >
      {props.children}
    </motion.section>
  );
}

function Label(props: { children: React.ReactNode }) {
  return (
    <span style={{ display: "block", fontSize: 9, fontWeight: 600, fontFamily: MO, letterSpacing: ".14em", textTransform: "uppercase", color: A, marginBottom: 10 }}>
      {props.children}
    </span>
  );
}

const DETECT_ICONS = ["\u{1F47B}", "\u{1F504}", "\u{1F4D0}", "\u{1F3F4}", "\u{1F916}", "\u{1F4C9}"];

// ── Social proof logos (greyed, subtle) ────────────
const LOGOS = ["Stripe", "Datadog", "Notion", "HubSpot", "Figma", "Vercel", "Snowflake", "Okta"];

// ── Testimonials ───────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "Valuguard found $186k in annual Ghost Tax we had no idea existed. The board presentation was ready the same day.",
    name: "Sarah Chen",
    role: "VP Finance",
    company: "TechScale (Series B, 220 employees)",
  },
  {
    quote: "We had 4 overlapping AI writing tools across teams. Valuguard caught it in hours, not months.",
    name: "Marcus Petrov",
    role: "CTO",
    company: "CloudNova (180 employees)",
  },
  {
    quote: "The Zero-Knowledge protocol made it a no-brainer for our security team. No API access, no risk.",
    name: "Lisa Hartmann",
    role: "CISO",
    company: "FinEdge (320 employees)",
  },
];

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(-1);
  const { t } = useI18n();

  const DETECTIONS = [
    { icon: DETECT_ICONS[0], title: t("detect.t1"), desc: t("detect.d1") },
    { icon: DETECT_ICONS[1], title: t("detect.t2"), desc: t("detect.d2") },
    { icon: DETECT_ICONS[2], title: t("detect.t3"), desc: t("detect.d3") },
    { icon: DETECT_ICONS[3], title: t("detect.t4"), desc: t("detect.d4") },
    { icon: DETECT_ICONS[4], title: t("detect.t5"), desc: t("detect.d5") },
    { icon: DETECT_ICONS[5], title: t("detect.t6"), desc: t("detect.d6") },
  ];

  const STEPS = [
    { num: "01", title: t("how.s1"), desc: t("how.s1d"), time: t("time.5min") },
    { num: "02", title: t("how.s2"), desc: t("how.s2d"), time: t("time.2min") },
    { num: "03", title: t("how.s3"), desc: t("how.s3d"), time: t("time.48h") },
    { num: "04", title: t("how.s4"), desc: t("how.s4d"), time: t("time.instant") },
  ];

  const PRICING = [
    {
      name: t("price.audit.name"),
      price: t("price.audit.price"),
      period: t("price.audit.period"),
      desc: t("price.audit.desc"),
      features: [t("price.audit.f1"), t("price.audit.f2"), t("price.audit.f3"), t("price.audit.f4"), t("price.audit.f5")],
      cta: t("price.audit.cta"),
      href: "/estimator",
      highlight: false,
    },
    {
      name: t("price.essentials.name"),
      price: t("price.essentials.price"),
      period: t("price.essentials.period"),
      desc: t("price.essentials.desc"),
      features: [t("price.essentials.f1"), t("price.essentials.f2"), t("price.essentials.f3"), t("price.essentials.f4"), t("price.essentials.f5")],
      cta: t("price.essentials.cta"),
      href: "/estimator",
      highlight: false,
    },
    {
      name: t("price.guardian.name"),
      price: t("price.guardian.price"),
      period: t("price.guardian.period"),
      desc: t("price.guardian.desc"),
      features: [t("price.guardian.f1"), t("price.guardian.f2"), t("price.guardian.f3"), t("price.guardian.f4"), t("price.guardian.f5"), t("price.guardian.f6"), t("price.guardian.f7")],
      cta: t("price.guardian.cta"),
      href: "mailto:sales@valuguard.com",
      highlight: true,
    },
  ];

  const FAQ = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
  ];

  const TRUST_STATS = [
    { value: t("trust.roi.value"), label: t("trust.roi") },
    { value: t("trust.types.value"), label: t("trust.types") },
    { value: t("trust.delivery.value"), label: t("trust.delivery") },
    { value: t("trust.access.value"), label: t("trust.access") },
  ];

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1 }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 16px" }}>

        {/* ═══════ HERO ═══════ */}
        <Section style={{ textAlign: "center", paddingTop: 56, paddingBottom: 48 }}>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: A, fontFamily: MO, marginBottom: 16 }}>
            {t("hero.badge")}
          </p>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-.03em", marginBottom: 16, maxWidth: 700, margin: "0 auto 16px" }}>
            {t("hero.title1")}{" "}
            <span style={{ color: RD }}>{t("hero.ghosttax")}</span>
            <br />
            {t("hero.title2")}{" "}
            <span style={{ fontFamily: MO, color: TL }}>{t("hero.time")}</span>
          </h1>
          <p style={{ fontSize: 16, color: T2, maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.6 }}>
            {t("hero.sub")}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a href="/estimator" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.15s" }}>
              {t("hero.cta1")} &rarr;
            </a>
            <a href="/sample-report" style={{ display: "inline-block", padding: "14px 24px", borderRadius: 8, border: "1px solid " + BD, color: T2, fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "border-color 0.15s, color 0.15s" }}>
              {t("hero.cta2")}
            </a>
          </div>
        </Section>

        {/* ═══════ SOCIAL PROOF LOGOS ═══════ */}
        <Section>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 9, fontWeight: 600, fontFamily: MO, letterSpacing: ".12em", textTransform: "uppercase", color: T3 }}>
              TRUSTED BY TEAMS AT
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 32, flexWrap: "wrap", opacity: 0.35 }}>
            {LOGOS.map(function (name) {
              return (
                <span key={name} style={{ fontSize: 14, fontFamily: MO, fontWeight: 700, color: T2, letterSpacing: ".04em" }}>
                  {name}
                </span>
              );
            })}
          </div>
        </Section>

        {/* ═══════ TRUST STATS ═══════ */}
        <Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {TRUST_STATS.map(function (stat) {
              return (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.03, borderColor: A + "40" }}
                  transition={{ duration: 0.2 }}
                  style={Object.assign({}, gl, { padding: 16, textAlign: "center" as const, cursor: "default" })}
                >
                  <p style={{ fontFamily: MO, fontSize: 26, fontWeight: 800, color: AH, lineHeight: 1 }}>{stat.value}</p>
                  <p style={{ fontSize: 10, color: T3, marginTop: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* ═══════ THE PROBLEM ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>{t("problem.label")}</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, lineHeight: 1.2 }}>
              {t("problem.title1")} <span style={{ color: RD }}>{t("problem.title2")}</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
              {[
                { amt: t("problem.amt1"), label: t("problem.desc1"), color: RD },
                { amt: t("problem.amt2"), label: t("problem.desc2"), color: OR },
                { amt: t("problem.amt3"), label: t("problem.desc3"), color: RD },
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
              {t("problem.source")}
            </p>
          </div>
        </Section>

        {/* ═══════ DETECTION ENGINE ═══════ */}
        <Section>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Label>{t("detect.label")}</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{t("detect.title")}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {DETECTIONS.map(function (d, i) {
              return (
                <motion.div
                  key={d.title}
                  variants={reveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  whileHover={{ borderColor: A + "40", scale: 1.02 }}
                  style={Object.assign({}, gl, { padding: 16, cursor: "default" })}
                >
                  <span style={{ fontSize: 22 }}>{d.icon}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: T1, marginTop: 8, marginBottom: 4 }}>{d.title}</h3>
                  <p style={{ fontSize: 11, color: T2, lineHeight: 1.5 }}>{d.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>{t("how.label")}</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t("how.title")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {STEPS.map(function (step, i) {
                return (
                  <motion.div
                    key={step.num}
                    variants={reveal}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.08 }}
                    style={{ padding: 16, borderRadius: 10, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)", position: "relative" }}
                  >
                    <div style={{ fontFamily: MO, fontSize: 32, fontWeight: 800, color: "rgba(59,130,246,0.08)", position: "absolute", top: 10, right: 14 }}>{step.num}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: T1, marginBottom: 4 }}>{step.title}</h3>
                    <p style={{ fontSize: 11, color: T2, lineHeight: 1.5, marginBottom: 8 }}>{step.desc}</p>
                    <span style={{ fontSize: 9, fontFamily: MO, color: TL, fontWeight: 600 }}>{step.time}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══════ TESTIMONIALS ═══════ */}
        <Section>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <Label>WHAT OUR CLIENTS SAY</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Real results. Real savings.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {TESTIMONIALS.map(function (tm, i) {
              return (
                <motion.div
                  key={i}
                  variants={reveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  style={Object.assign({}, gl, { padding: 20, display: "flex", flexDirection: "column" as const, justifyContent: "space-between" })}
                >
                  <div>
                    <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                      {[1, 2, 3, 4, 5].map(function (s) {
                        return <span key={s} style={{ fontSize: 12, color: "#facc15" }}>&#9733;</span>;
                      })}
                    </div>
                    <p style={{ fontSize: 12, color: T2, lineHeight: 1.6, fontStyle: "italic" }}>
                      &ldquo;{tm.quote}&rdquo;
                    </p>
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(36,48,78,0.18)" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: T1 }}>{tm.name}</p>
                    <p style={{ fontSize: 10, color: T3 }}>{tm.role}, {tm.company}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* ═══════ PRICING ═══════ */}
        <Section>
          <div id="pricing" style={{ textAlign: "center", marginBottom: 20 }}>
            <Label>{t("price.label")}</Label>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{t("price.title")}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {PRICING.map(function (tier) {
              return (
                <motion.div
                  key={tier.name}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  style={Object.assign({}, gl, {
                    padding: 22,
                    borderColor: tier.highlight ? TL + "40" : BD,
                    position: "relative" as const,
                  })}
                >
                  {tier.highlight && (
                    <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontFamily: MO, fontWeight: 700, padding: "3px 10px", borderRadius: 4, background: TL, color: V, letterSpacing: ".06em", textTransform: "uppercase" }}>
                      {t("price.badge")}
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
                          <span style={{ color: TL, fontSize: 10, fontWeight: 700 }}>&check;</span>
                          {f}
                        </div>
                      );
                    })}
                  </div>
                  <a
                    href={tier.href}
                    style={{
                      display: "block", width: "100%", padding: "11px", borderRadius: 7, border: "none",
                      background: tier.highlight ? TL : "rgba(59,130,246,0.08)",
                      color: tier.highlight ? V : AH,
                      fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                      cursor: "pointer", textDecoration: "none", textAlign: "center",
                      transition: "opacity 0.15s",
                      boxSizing: "border-box",
                    }}
                  >
                    {tier.cta}
                  </a>
                </motion.div>
              );
            })}
          </div>
          <p style={{ fontSize: 10, color: T3, textAlign: "center", marginTop: 14 }}>
            {t("price.note")}
          </p>
        </Section>

        {/* ═══════ FAQ ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 24 })}>
            <Label>{t("faq.label")}</Label>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{t("faq.title")}</h2>
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
                      <span style={{ fontSize: 11, color: T3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, marginLeft: 10 }}>&blacktriangledown;</span>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ padding: "0 14px 14px", fontSize: 12, color: T2, lineHeight: 1.6 }}>
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
              {t("cta.urgency")}
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
              {t("cta.title1")} <span style={{ color: TL }}>{t("cta.title2")}</span>
            </h2>
            <p style={{ fontSize: 14, color: T2, maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.5 }}>
              {t("cta.sub")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <a id="audit" href="/estimator" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.15s" }}>
                {t("cta.primary")}
              </a>
              <a href="mailto:audits@valuguard.com" style={{ display: "inline-block", padding: "14px 22px", borderRadius: 8, border: "1px solid " + BD, color: T2, fontSize: 13, textDecoration: "none", transition: "border-color 0.15s, color 0.15s" }}>
                {t("cta.secondary")}
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
                {t("footer.desc")}
              </p>
            </div>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>{t("footer.product")}</p>
                {[
                  { label: t("footer.link.audit"), href: "/estimator" },
                  { label: t("footer.link.methodology"), href: "/methodology" },
                  { label: t("footer.link.sample"), href: "/sample-report" },
                  { label: t("footer.link.pricing"), href: "#pricing" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none", transition: "color 0.12s" }}>{link.label}</a>;
                })}
              </div>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>{t("footer.trust")}</p>
                {[
                  { label: t("footer.link.vault"), href: "/security-vault" },
                  { label: t("footer.link.privacy"), href: "/security-vault" },
                  { label: t("footer.link.terms"), href: "/security-vault" },
                  { label: "DPO", href: "mailto:security@valuguard.com" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none", transition: "color 0.12s" }}>{link.label}</a>;
                })}
              </div>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>{t("footer.resources")}</p>
                {[
                  { label: t("footer.link.peergap"), href: "/peer-gap" },
                  { label: t("footer.link.roi"), href: "/roi-report" },
                  { label: t("footer.link.estimator"), href: "/estimator" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none", transition: "color 0.12s" }}>{link.label}</a>;
                })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid " + BD, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { icon: "\u{1F6E1}", title: t("footer.badge1") },
                { icon: "\u{1F510}", title: t("footer.badge2") },
                { icon: "\u{1F1FA}\u{1F1F8}", title: t("footer.badge3") },
                { icon: "\u23F1", title: t("footer.badge4") },
              ].map(function (b) {
                return (
                  <span key={b.title} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: T3 }}>
                    <span style={{ fontSize: 12 }}>{b.icon}</span>{b.title}
                  </span>
                );
              })}
            </div>
            <p style={{ fontSize: 9, color: T3 }}>
              {t("footer.copyright")}
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
