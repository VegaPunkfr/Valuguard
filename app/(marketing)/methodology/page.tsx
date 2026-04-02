"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { trackEvent, EVENTS } from "@/lib/events";
import { c, f } from "@/lib/tokens";

/**
 * GHOST TAX — METHODOLOGY SURFACE
 *
 * Explains the intelligence model in disciplined, executive-safe language.
 * Not a technical whitepaper. Not marketing fluff.
 * A credibility asset for skeptical reviewers.
 * Fully i18n via mp.* keys (EN/FR/DE).
 */

function Sec({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section className="gt-panel" style={{ padding: 24, marginBottom: 16, ...style }}>
      {children}
    </section>
  );
}

function Lab({ children }: { children: React.ReactNode }) {
  return <p className="gt-section-label">{children}</p>;
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 18, fontWeight: 700, color: c.text1, lineHeight: 1.2, marginBottom: 10 }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 10 }}>
      {children}
    </p>
  );
}

export default function Methodology() {
  const { t } = useI18n();
  useEffect(() => { trackEvent(EVENTS.METHODOLOGY_VIEWED); }, []);

  const rules = [
    { rule: t("mp.s2.r1"), desc: t("mp.s2.r1d"), tier: "INFERRED" },
    { rule: t("mp.s2.r2"), desc: t("mp.s2.r2d"), tier: "INFERRED" },
    { rule: t("mp.s2.r3"), desc: t("mp.s2.r3d"), tier: "INFERRED" },
    { rule: t("mp.s2.r4"), desc: t("mp.s2.r4d"), tier: "INFERRED" },
    { rule: t("mp.s2.r5"), desc: t("mp.s2.r5d"), tier: "OBSERVED" },
    { rule: t("mp.s2.r6"), desc: t("mp.s2.r6d"), tier: "ESTIMATED" },
    { rule: t("mp.s2.r7"), desc: t("mp.s2.r7d"), tier: "OBSERVED" },
  ];

  const factors = [
    { factor: t("mp.s4.f1"), weight: t("mp.s4.f1w"), desc: t("mp.s4.f1d") },
    { factor: t("mp.s4.f2"), weight: t("mp.s4.f2w"), desc: t("mp.s4.f2d") },
    { factor: t("mp.s4.f3"), weight: t("mp.s4.f3w"), desc: t("mp.s4.f3d") },
    { factor: t("mp.s4.f4"), weight: t("mp.s4.f4w"), desc: t("mp.s4.f4d") },
  ];

  const boundaries = [
    t("mp.s5.b1"), t("mp.s5.b2"), t("mp.s5.b3"), t("mp.s5.b4"),
    t("mp.s5.b5"), t("mp.s5.b6"), t("mp.s5.b7"),
  ];

  const capabilities = [
    t("mp.s6.c1"), t("mp.s6.c2"), t("mp.s6.c3"),
    t("mp.s6.c4"), t("mp.s6.c5"), t("mp.s6.c6"),
  ];

  const deepenings = [
    { title: t("mp.s7.d1"), desc: t("mp.s7.d1d") },
    { title: t("mp.s7.d2"), desc: t("mp.s7.d2d") },
    { title: t("mp.s7.d3"), desc: t("mp.s7.d3d") },
    { title: t("mp.s7.d4"), desc: t("mp.s7.d4d") },
  ];

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}
         className="gt-container" >
      <style>{`
        @media (max-width: 768px) {
          .gt-about-phase-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .gt-about-phase-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://ghost-tax.com/methodology/#webpage",
        url: "https://ghost-tax.com/methodology",
        name: "Detection Methodology — Ghost Tax",
        description: "How Ghost Tax detects hidden SaaS, AI, and Cloud spend exposure using a 21-phase intelligence pipeline.",
        isPartOf: { "@id": "https://ghost-tax.com/#website" },
        about: { "@id": "https://ghost-tax.com/#organization" },
        inLanguage: "en-US",
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://ghost-tax.com" },
          { "@type": "ListItem", position: 2, name: "Methodology", item: "https://ghost-tax.com/methodology" },
        ],
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "What data does Ghost Tax observe?", acceptedAnswer: { "@type": "Answer", text: "Ghost Tax observes public data only: company domain, publicly referenced technology stack, hiring signals, and user-declared inputs (headcount, spend, industry). No internal systems are accessed at the detection stage." } },
          { "@type": "Question", name: "How does Ghost Tax estimate financial exposure?", acceptedAnswer: { "@type": "Answer", text: "Exposure is estimated by combining detected signals (tool redundancy, license sprawl, etc.) with industry baselines (12-22% of annual spend is typical waste). When declared spend is provided, accuracy improves significantly. All estimates are bounded ranges, never point values." } },
          { "@type": "Question", name: "What is the confidence model?", acceptedAnswer: { "@type": "Answer", text: "Confidence is scored 0-100 across five layers: signal detection, exposure estimation, peer benchmarking, scenario modeling, and causal analysis. The system never claims 100% confidence. When confidence is below 50, language is softened and ranges are widened." } },
          { "@type": "Question", name: "What are the limitations?", acceptedAnswer: { "@type": "Answer", text: "The system has no access to internal billing, contracts, or utilization data. It cannot detect negotiated discounts, multi-year commitments, or usage-based overages. Exposure estimates are structural indicators, not audit-grade findings. Declared spend data materially improves accuracy." } },
        ],
      }) }} />
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>
            {t("back")}
          </a>
        </div>

        <header style={{ padding: "36px 0 32px" }}>
          <p className="gt-section-label" style={{ marginBottom: 12 }}>
            {t("mp.badge")}
          </p>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: 12 }}>
            {t("mp.title")}
          </h1>
          <p style={{ fontSize: 15, color: c.text2, maxWidth: 560, lineHeight: 1.6 }}>
            {t("mp.subtitle")}
          </p>
        </header>

        {/* -- Executive Summary for CFOs -- */}
        <div className="gt-panel" style={{ padding: "20px 24px", marginBottom: 20, borderLeft: `3px solid ${c.green}` }}>
          <p style={{ fontSize: 10, fontFamily: f.mono, color: c.green, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
            {t("mp.exec.label")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.text1, fontFamily: f.mono }}>{t("mp.exec.v1")}</p>
              <p style={{ fontSize: 11, color: c.text3 }}>{t("mp.exec.l1")}</p>
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.text1, fontFamily: f.mono }}>{t("mp.exec.v2")}</p>
              <p style={{ fontSize: 11, color: c.text3 }}>{t("mp.exec.l2")}</p>
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.text1, fontFamily: f.mono }}>{t("mp.exec.v3")}</p>
              <p style={{ fontSize: 11, color: c.text3 }}>{t("mp.exec.l3")}</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginTop: 12 }}>
            {t("mp.exec.summary")}
          </p>
        </div>

        {/* -- PIPELINE ARCHITECTURE (CTO context layer) -- */}
        <div className="gt-panel" style={{ padding: "18px 22px", marginBottom: 16, borderLeft: `3px solid ${c.accent}` }}>
          <p style={{ fontSize: 10, fontFamily: f.mono, color: c.accent, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>
            PIPELINE ARCHITECTURE
          </p>
          <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 12 }}>
            The analysis runs as 21 deterministic phases in strict sequence. Each phase streams as a newline-delimited JSON object (NDJSON) over HTTP — the UI renders incrementally as evidence accumulates. The executive snapshot streams last. Reordering is not permitted.
          </p>
          <div className="gt-about-phase-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {[
              "enrichment", "context", "exposure", "lossVelocity", "costOfDelay", "diagnosis", "causalGraph",
              "proofEngine", "proof", "marketMemory", "peerComparison", "driftMonitor", "correctionMomentum",
              "scenarios", "counterfactual", "decisionFriction", "decisionPressure", "negotiation",
              "confidenceModel", "decisionPack", "executiveSnapshot",
            ].map(function (phase, i) {
              var isLast = i === 20;
              return (
                <div key={phase} style={{
                  padding: "5px 7px", borderRadius: 5,
                  background: isLast ? c.greenBg : c.accentBg,
                  border: "1px solid " + (isLast ? c.greenBd : c.accentBd),
                  textAlign: "center",
                }}>
                  <p style={{
                    fontFamily: f.mono, fontSize: 9, fontWeight: 700,
                    color: isLast ? c.green : c.accent,
                    lineHeight: 1.3,
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p style={{ fontFamily: f.mono, fontSize: 8, color: isLast ? c.green : c.text3, lineHeight: 1.2, marginTop: 2 }}>
                    {phase}
                  </p>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: c.text3, marginTop: 10 }}>
            Source: <span style={{ fontFamily: f.mono }}>lib/analysis.ts</span> (~2100 lines) — server-only, no client-side AI. Streaming endpoint: <span style={{ fontFamily: f.mono }}>app/api/intel/route.ts</span> (maxDuration=60).
          </p>
        </div>

        {/* -- 1. WHAT THE SYSTEM OBSERVES -- */}
        <Sec>
          <Lab>{t("mp.s1.label")}</Lab>
          <H2>{t("mp.s1.title")}</H2>
          <P>{t("mp.s1.p1")}</P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="gt-card" style={{ padding: 14, background: c.greenBg, borderColor: c.greenBd }}>
              <p className="gt-label" style={{ color: c.green, marginBottom: 6 }}>{t("mp.s1.public")}</p>
              <ul style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, paddingLeft: 16, margin: 0 }}>
                <li>{t("mp.s1.pub1")}</li>
                <li>{t("mp.s1.pub2")}</li>
                <li>{t("mp.s1.pub3")}</li>
                <li>{t("mp.s1.pub4")}</li>
              </ul>
            </div>
            <div className="gt-card" style={{ padding: 14, background: c.accentBg, borderColor: c.accentBd }}>
              <p className="gt-label" style={{ color: c.accentHi, marginBottom: 6 }}>{t("mp.s1.declared")}</p>
              <ul style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, paddingLeft: 16, margin: 0 }}>
                <li>{t("mp.s1.dec1")}</li>
                <li>{t("mp.s1.dec2")}</li>
                <li>{t("mp.s1.dec3")}</li>
                <li>{t("mp.s1.dec4")}</li>
              </ul>
            </div>
          </div>
          <P>{t("mp.s1.p2")}</P>
        </Sec>

        {/* -- 2. WHAT THE SYSTEM INFERS -- */}
        <Sec>
          <Lab>{t("mp.s2.label")}</Lab>
          <H2>{t("mp.s2.title")}</H2>
          <P>{t("mp.s2.p1")}</P>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {rules.map((r) => {
              const tierClass = r.tier === "OBSERVED" ? "gt-badge--green" : r.tier === "INFERRED" ? "gt-badge--blue" : "gt-badge--amber";
              return (
                <div key={r.rule} className="gt-inset" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px" }}>
                  <span className={`gt-badge ${tierClass}`} style={{ flexShrink: 0, marginTop: 3 }}>{r.tier}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: c.text1, marginBottom: 1 }}>{r.rule}</p>
                    <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.4 }}>{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <P>{t("mp.s2.p2")}</P>
        </Sec>

        {/* -- 3. WHAT THE SYSTEM ESTIMATES -- */}
        <Sec>
          <Lab>{t("mp.s3.label")}</Lab>
          <H2>{t("mp.s3.title")}</H2>
          <P>{t("mp.s3.p1")}</P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="gt-card" style={{ padding: 14, background: c.amberBg, borderColor: c.amberBd }}>
              <p className="gt-label" style={{ color: c.amber, marginBottom: 6 }}>{t("mp.s3.baseline")}</p>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>{t("mp.s3.baselineText")}</p>
            </div>
            <div className="gt-card" style={{ padding: 14, background: c.amberBg, borderColor: c.amberBd }}>
              <p className="gt-label" style={{ color: c.amber, marginBottom: 6 }}>{t("mp.s3.when")}</p>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>{t("mp.s3.whenText")}</p>
            </div>
          </div>
          <P>{t("mp.s3.p2")}</P>
        </Sec>

        {/* -- 4. CONFIDENCE MODEL -- */}
        <Sec>
          <Lab>{t("mp.s4.label")}</Lab>
          <H2>{t("mp.s4.title")}</H2>
          <P>{t("mp.s4.p1")}</P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {factors.map((item) => (
              <div key={item.factor} className="gt-inset" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: c.text1 }}>{item.factor}</p>
                  <span className="gt-mono" style={{ fontSize: 9, color: c.accentHi }}>{item.weight}</span>
                </div>
                <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.4 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <P>
            {t("mp.s4.p2")}{" "}
            {t("mp.s4.strong")} ({"\u2265"}60), {t("mp.s4.moderate")} ({"\u2265"}35), {t("mp.s4.directional")} (&lt;35).
          </P>
        </Sec>

        {/* -- INLINE CTA (after Confidence Model, section 4) -- */}
        <div style={{
          border: "1px solid rgba(52,211,153,0.3)",
          background: "rgba(52,211,153,0.05)",
          padding: 20,
          borderRadius: 8,
          margin: "32px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.55, margin: 0, maxWidth: 480 }}>
            {t("methodology.ctaInline.text")}
          </p>
          <a href="/intel" className="gt-btn gt-btn-primary" style={{ flexShrink: 0, fontSize: 13, fontWeight: 600 }}>
            {t("methodology.ctaInline.btn")}
          </a>
        </div>

        {/* -- 5. BOUNDARIES & CAVEATS -- */}
        <Sec>
          <Lab>{t("mp.s5.label")}</Lab>
          <H2>{t("mp.s5.title")}</H2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {boundaries.map((b, i) => (
              <div key={i} className="gt-card" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 12px", background: c.redBg, borderColor: c.redBd }}>
                <span style={{ fontSize: 10, color: c.red, flexShrink: 0, marginTop: 1 }}>&#x2717;</span>
                <p style={{ fontSize: 12, color: c.text3, lineHeight: 1.4 }}>{b}</p>
              </div>
            ))}
          </div>
          <P>{t("mp.s5.p1")}</P>
        </Sec>

        {/* -- 6. WHY THE OUTPUT IS DECISION-USEFUL -- */}
        <Sec>
          <Lab>{t("mp.s6.label")}</Lab>
          <H2>{t("mp.s6.title")}</H2>
          <P>{t("mp.s6.p1")}</P>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {capabilities.map((b, i) => (
              <div key={i} className="gt-card" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 12px", background: c.greenBg, borderColor: c.greenBd }}>
                <span style={{ fontSize: 10, color: c.green, flexShrink: 0, marginTop: 1 }}>&#x2713;</span>
                <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.4 }}>{b}</p>
              </div>
            ))}
          </div>
        </Sec>

        {/* -- 7. WHAT DEEPENS AFTER PURCHASE -- */}
        <Sec>
          <Lab>{t("mp.s7.label")}</Lab>
          <H2>{t("mp.s7.title")}</H2>
          <P>{t("mp.s7.p1")}</P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {deepenings.map((item) => (
              <div key={item.title} className="gt-inset" style={{ padding: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: c.text1, marginBottom: 3 }}>{item.title}</p>
                <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.4 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <P>{t("mp.s7.p2")}</P>
        </Sec>

        {/* -- Related research -- */}
        <Sec>
          <p className="gt-label" style={{ marginBottom: 10 }}>{t("mp.related")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href="/intel-benchmarks/saas-ai-cost-exposure" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("mp.link1")} →</a>
            <a href="/intel-benchmarks/shadow-ai-governance" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("mp.link2")} →</a>
            <a href="/intel-benchmarks/cfo-technology-spend-guide" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("mp.link3")} →</a>
          </div>
          <div className="gt-divider" style={{ margin: "12px 0 10px" }} />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="/security-vault" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("mp.link4")} →</a>
            <a href="/procurement" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("mp.link5")} →</a>
            <a href="/intel-benchmarks" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("mp.link6")} →</a>
          </div>
        </Sec>

        {/* -- CTA -- */}
        <Sec style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginBottom: 12 }}>
            {t("mp.cta")}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <a href="/intel" className="gt-btn gt-btn-primary">
              {t("mp.ctaBtn")}
            </a>
            <a href="/security-vault" className="gt-btn gt-btn-ghost">
              {t("mp.ctaBtn2")}
            </a>
          </div>
        </Sec>

      </div>
    </div>
  );
}
