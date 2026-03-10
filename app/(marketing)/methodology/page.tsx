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

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}
         className="gt-container" >
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
            DETECTION METHODOLOGY
          </p>
          <h1 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: 12 }}>
            How the system detects, classifies, and bounds financial exposure.
          </h1>
          <p style={{ fontSize: 15, color: c.text2, maxWidth: 560, lineHeight: 1.6 }}>
            This page explains what the engine observes, what it infers, what it estimates, and how confidence is formed. We publish our methodology, our limitations, and our boundaries.
          </p>
        </header>

        {/* -- 1. WHAT THE SYSTEM OBSERVES -- */}
        <Sec>
          <Lab>01 — WHAT THE SYSTEM OBSERVES</Lab>
          <H2>Direct signals from public sources and declared inputs.</H2>
          <P>
            The system collects observable data from two channels: public web enrichment (via Exa neural search) and user-declared inputs.
          </P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="gt-card" style={{ padding: 14, background: c.greenBg, borderColor: c.greenBd }}>
              <p className="gt-label" style={{ color: c.green, marginBottom: 6 }}>PUBLIC ENRICHMENT</p>
              <ul style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, paddingLeft: 16, margin: 0 }}>
                <li>Technology stack mentions (job postings, integrations pages, press)</li>
                <li>Hiring velocity signals (open roles mentioning specific tools)</li>
                <li>Vendor partnership announcements</li>
                <li>Public tech blog references</li>
              </ul>
            </div>
            <div className="gt-card" style={{ padding: 14, background: c.accentBg, borderColor: c.accentBd }}>
              <p className="gt-label" style={{ color: c.accentHi, marginBottom: 6 }}>USER-DECLARED INPUTS</p>
              <ul style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, paddingLeft: 16, margin: 0 }}>
                <li>Company domain (required)</li>
                <li>Headcount (optional — improves accuracy)</li>
                <li>Monthly IT spend in EUR (optional — materially improves confidence)</li>
                <li>Industry classification (optional)</li>
              </ul>
            </div>
          </div>
          <P>
            Observed signals carry the highest evidence weight. When the system can directly verify a technology mention from multiple public sources, that signal is classified as &ldquo;observed.&rdquo;
          </P>
        </Sec>

        {/* -- 2. WHAT THE SYSTEM INFERS -- */}
        <Sec>
          <Lab>02 — WHAT THE SYSTEM INFERS</Lab>
          <H2>Structural patterns derived from the technology footprint.</H2>
          <P>
            When the public enrichment reveals a company&rsquo;s technology stack, the system applies heuristic rules to detect structural patterns that commonly correlate with financial exposure.
          </P>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {[
              { rule: "AI Tool Redundancy", desc: "Multiple overlapping AI tools (e.g., OpenAI + Anthropic + GitHub Copilot) suggest capability duplication.", tier: "INFERRED" },
              { rule: "Observability Overlap", desc: "Multiple monitoring/analytics platforms (e.g., Datadog + Amplitude) indicate feature overlap.", tier: "INFERRED" },
              { rule: "Plan Oversize", desc: "Enterprise-tier tools detected for organizations below 50 employees.", tier: "INFERRED" },
              { rule: "Multi-Cloud Waste", desc: "Multiple cloud providers suggest underutilized commitments.", tier: "INFERRED" },
              { rule: "Shadow IT Risk", desc: "Rapid hiring signals correlate with ungoverned tool adoption.", tier: "OBSERVED" },
              { rule: "License Sprawl", desc: "Large tool footprints carry statistically predictable inactive license rates.", tier: "ESTIMATED" },
              { rule: "Elevated Per-Employee Spend", desc: "Declared spend exceeding industry median per-employee benchmarks.", tier: "OBSERVED" },
            ].map((r) => {
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
          <P>
            Inferred signals are always labeled as such. They are never presented as observed facts. Each carries bounded impact ranges, not point estimates.
          </P>
        </Sec>

        {/* -- 3. WHAT THE SYSTEM ESTIMATES -- */}
        <Sec>
          <Lab>03 — WHAT THE SYSTEM ESTIMATES</Lab>
          <H2>Financial projections from industry baselines.</H2>
          <P>
            When signal-level data is insufficient, the system falls back to industry-calibrated baselines to produce bounded exposure estimates.
          </P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div className="gt-card" style={{ padding: 14, background: c.amberBg, borderColor: c.amberBd }}>
              <p className="gt-label" style={{ color: c.amber, marginBottom: 6 }}>BASELINE MODEL</p>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>
                12&ndash;22% of annual IT spend is the typical &ldquo;Ghost Tax&rdquo; range for organizations with 50&ndash;500 employees. Source: Flexera 2024, Zylo 2024, Gartner 2025 composite.
              </p>
            </div>
            <div className="gt-card" style={{ padding: 14, background: c.amberBg, borderColor: c.amberBd }}>
              <p className="gt-label" style={{ color: c.amber, marginBottom: 6 }}>WHEN BASELINES ARE USED</p>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.5 }}>
                When no monthly spend is declared, the system estimates it at ~380 EUR/employee/month. This is clearly marked as &ldquo;estimated&rdquo; and carries the lowest confidence tier.
              </p>
            </div>
          </div>
          <P>
            Estimated outputs always carry the lowest confidence scores and are explicitly separated from observed and inferred signals in the proof architecture.
          </P>
        </Sec>

        {/* -- 4. CONFIDENCE MODEL -- */}
        <Sec>
          <Lab>04 — CONFIDENCE MODEL</Lab>
          <H2>Numeric confidence, not qualitative labels.</H2>
          <P>
            Every output carries a numeric confidence score from 0 to 100. This score is derived from four weighted inputs:
          </P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { factor: "Exa enrichment depth", weight: "Up to 25 points", desc: "More public signals = higher confidence in technology footprint." },
              { factor: "Vector memory matches", weight: "Up to 20 points", desc: "Similar historical cases in the knowledge base improve accuracy." },
              { factor: "Detected signal count", weight: "Up to 30 points", desc: "More independent signals = stronger convergence." },
              { factor: "Declared spend data", weight: "15 points", desc: "User-provided spend data materially improves exposure accuracy." },
            ].map((item) => (
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
            The system never claims 100/100 confidence. Maximum is capped at 95. Below 30, results include an explicit limitation warning. Benchmark quality is classified as &ldquo;strong&rdquo; ({"\u2265"}60), &ldquo;moderate&rdquo; ({"\u2265"}35), or &ldquo;weak&rdquo; (below 35).
          </P>
        </Sec>

        {/* -- 5. BOUNDARIES & CAVEATS -- */}
        <Sec>
          <Lab>05 — BOUNDARIES AND CAVEATS</Lab>
          <H2>What the system does not do.</H2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {[
              "Does not access internal billing systems, ERP, or vendor APIs.",
              "Does not read contracts, invoices, or utilization logs.",
              "Does not perform real-time monitoring or continuous scanning.",
              "Does not provide department-level or per-user attribution.",
              "Does not use neural networks or ML models — all detection is deterministic and heuristic.",
              "Cannot detect exposure patterns that leave no public signal.",
              "Actual exposure may differ from estimates — ranges reflect structural uncertainty.",
            ].map((b, i) => (
              <div key={i} className="gt-card" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 12px", background: c.redBg, borderColor: c.redBd }}>
                <span style={{ fontSize: 10, color: c.red, flexShrink: 0, marginTop: 1 }}>&#x2717;</span>
                <p style={{ fontSize: 12, color: c.text3, lineHeight: 1.4 }}>{b}</p>
              </div>
            ))}
          </div>
          <P>
            These limitations are displayed in the analysis output itself, not hidden in fine print.
          </P>
        </Sec>

        {/* -- 6. WHY THE OUTPUT IS DECISION-USEFUL -- */}
        <Sec>
          <Lab>06 — WHY THE OUTPUT IS DECISION-USEFUL</Lab>
          <H2>Useful without internal ledger access. More useful with it.</H2>
          <P>
            The public/self-serve analysis works from publicly available signals and optional declared inputs. This is sufficient to:
          </P>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {[
              "Identify the likely shape and magnitude of financial exposure.",
              "Classify signals by evidence tier so the buyer knows what is proven vs projected.",
              "Produce bounded ranges that are directionally reliable for budget conversations.",
              "Generate stakeholder memos that frame the case for internal circulation.",
              "Create competitive pressure via peer benchmarking (when data is sufficient).",
              "Quantify the cost of inaction through loss velocity.",
            ].map((b, i) => (
              <div key={i} className="gt-card" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 12px", background: c.greenBg, borderColor: c.greenBd }}>
                <span style={{ fontSize: 10, color: c.green, flexShrink: 0, marginTop: 1 }}>&#x2713;</span>
                <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.4 }}>{b}</p>
              </div>
            ))}
          </div>
        </Sec>

        {/* -- 7. WHAT DEEPENS AFTER PURCHASE -- */}
        <Sec>
          <Lab>07 — WHAT DEEPENS IN THE PAID CORRECTIVE PROTOCOL</Lab>
          <H2>Internal data intake unlocks precision the public analysis cannot reach.</H2>
          <P>
            The paid corrective protocol (from $990) adds a structured data intake phase where the organization provides billing exports, license inventories, and vendor contracts. This enables:
          </P>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { title: "Vendor-level corrective actions", desc: "Specific renegotiation, downgrade, and consolidation recommendations per vendor." },
              { title: "Utilization-based license audit", desc: "Inactive and underutilized seats identified with exact counts." },
              { title: "Contract timeline analysis", desc: "Renewal dates, auto-renewal clauses, and negotiation windows mapped." },
              { title: "Implementation support", desc: "Sequenced action plan with owner assignment and timeline." },
            ].map((item) => (
              <div key={item.title} className="gt-inset" style={{ padding: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: c.text1, marginBottom: 3 }}>{item.title}</p>
                <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.4 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <P>
            The paid protocol does not replace the public analysis — it deepens it. Confidence scores increase materially when internal data is available.
          </P>
        </Sec>

        {/* -- Related research -- */}
        <Sec>
          <p className="gt-label" style={{ marginBottom: 10 }}>Related research</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href="/intel-benchmarks/saas-ai-cost-exposure" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>SaaS & AI Cost Exposure by Industry →</a>
            <a href="/intel-benchmarks/shadow-ai-governance" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>Shadow AI Governance: Detection & Cost Impact →</a>
            <a href="/intel-benchmarks/cfo-technology-spend-guide" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>CFO Guide to Technology Spend Exposure →</a>
          </div>
          <div className="gt-divider" style={{ margin: "12px 0 10px" }} />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="/security-vault" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>Security & Data Handling →</a>
            <a href="/procurement" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>Procurement Guide →</a>
            <a href="/intel-benchmarks" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>All Intelligence Benchmarks →</a>
          </div>
        </Sec>

        {/* -- CTA -- */}
        <Sec style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginBottom: 12 }}>
            Test the methodology on a real domain.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <a href="/intel" className="gt-btn gt-btn-primary">
              ENTER DECISION ROOM
            </a>
            <a href="/security-vault" className="gt-btn gt-btn-ghost">
              Security & Data Handling
            </a>
          </div>
        </Sec>

      </div>
    </div>
  );
}
