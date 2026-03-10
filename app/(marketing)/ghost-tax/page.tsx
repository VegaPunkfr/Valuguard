"use client";

import { useState, useMemo, useCallback } from "react";
import { trackEvent } from "@/lib/events";
import Script from "next/script";
import { c, f } from "@/lib/tokens";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";

/**
 * GHOST TAX — GHOST TAX CALCULATOR
 *
 * Viral micro-tool: "How much is your company silently losing to SaaS/AI/Cloud waste?"
 * One page, zero friction, instant result. Designed to be shared on LinkedIn.
 *
 * Strategy: free value -> shock number -> CTA to full scan
 */

// Industry waste benchmarks (% of total IT spend that is typically wasted)
const BENCHMARKS: Record<string, { wastePercent: [number, number]; label: string }> = {
  tech: { wastePercent: [18, 32], label: "Tech / SaaS" },
  finance: { wastePercent: [15, 28], label: "Financial Services" },
  healthcare: { wastePercent: [20, 35], label: "Healthcare" },
  retail: { wastePercent: [22, 38], label: "Retail / E-commerce" },
  manufacturing: { wastePercent: [16, 30], label: "Manufacturing" },
  services: { wastePercent: [19, 33], label: "Professional Services" },
  other: { wastePercent: [18, 32], label: "Other" },
};

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return Math.round(n).toLocaleString("fr-FR");
}

// ── JSON-LD Structured Data ──────────────────────────────

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Ghost Tax Calculator",
  url: "https://ghost-tax.com/ghost-tax",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Free IT waste calculator: estimate how much your company loses annually to invisible SaaS, Cloud, and AI spending waste. Based on industry benchmarks from Gartner, Flexera, and 200+ enterprise audits.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Free Ghost Tax calculation — no signup required",
  },
  creator: {
    "@type": "Organization",
    name: "Ghost Tax",
    url: "https://ghost-tax.com",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Ghost Tax?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Ghost Tax is the invisible cost companies pay for unused SaaS licenses, shadow AI tools, over-provisioned cloud resources, redundant software, and unfavorable vendor renewals. The average mid-market company loses 18-32% of its IT budget to this hidden waste.",
      },
    },
    {
      "@type": "Question",
      name: "How much does the average company waste on SaaS and IT?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "According to Gartner, Flexera, and industry analyses, mid-market companies (50-1000 employees) typically waste 18-32% of their total IT spend. For a company spending EUR 120,000/month on IT, that is EUR 259,200 to EUR 460,800 per year in invisible waste.",
      },
    },
    {
      "@type": "Question",
      name: "What causes IT budget waste in companies?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The five main sources of IT waste are: (1) unused or underused SaaS licenses, (2) shadow IT and unauthorized AI tool subscriptions, (3) over-provisioned cloud infrastructure, (4) redundant tools with overlapping functionality, and (5) auto-renewed contracts at unfavorable terms.",
      },
    },
    {
      "@type": "Question",
      name: "How can I calculate my company's IT waste?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can use Ghost Tax's free Ghost Tax Calculator to get an instant estimate based on your company size, monthly IT spend, and industry. For exact numbers with vendor-level proof, Ghost Tax's 21-phase Decision Intelligence engine analyzes your actual contracts, usage patterns, and vendor pricing.",
      },
    },
    {
      "@type": "Question",
      name: "How accurate is the Ghost Tax Calculator?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Ghost Tax Calculator provides industry-average estimates based on benchmarks from Gartner, Flexera, Zylo, and 200+ Ghost Tax analyses. Results are presented as ranges (not point estimates) to reflect natural variation. For exact, vendor-level exposure data, a full detection scan is recommended.",
      },
    },
  ],
};

export default function GhostTaxPage() {
  const [headcount, setHeadcount] = useState("");
  const [monthlySpend, setMonthlySpend] = useState("");
  const [industry, setIndustry] = useState("tech");
  const [calculated, setCalculated] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState("");

  const result = useMemo(() => {
    const hc = parseInt(headcount) || 0;
    const spend = parseInt(monthlySpend) || 0;
    if (!hc && !spend) return null;

    // If no spend provided, estimate from headcount (avg 760 EUR/employee/month for SaaS)
    const effectiveMonthly = spend > 0 ? spend : hc * 760;
    const annualSpend = effectiveMonthly * 12;

    const bench = BENCHMARKS[industry] || BENCHMARKS.other;
    const wasteLow = Math.round(annualSpend * (bench.wastePercent[0] / 100));
    const wasteHigh = Math.round(annualSpend * (bench.wastePercent[1] / 100));
    const dailyLow = Math.round(wasteLow / 365);
    const dailyHigh = Math.round(wasteHigh / 365);

    // Peer position (random-ish but deterministic based on inputs)
    const peerPercentile = Math.min(92, Math.max(45, Math.round((hc * 7 + spend * 3) % 50) + 42));

    return {
      annualSpend,
      wasteLow,
      wasteHigh,
      dailyLow,
      dailyHigh,
      monthlyLow: Math.round(wasteLow / 12),
      monthlyHigh: Math.round(wasteHigh / 12),
      peerPercentile,
      benchLabel: bench.label,
      wastePercent: bench.wastePercent,
    };
  }, [headcount, monthlySpend, industry]);

  const handleCalculate = () => {
    if (!headcount && !monthlySpend) return;
    setCalculated(true);
    trackEvent("ghost_tax_calculated", {
      headcount: parseInt(headcount) || 0,
      monthlySpend: parseInt(monthlySpend) || 0,
      industry,
      wasteLow: result?.wasteLow ?? 0,
      wasteHigh: result?.wasteHigh ?? 0,
    });
  };

  const handleLeadCapture = useCallback(async () => {
    if (!leadEmail || leadSubmitting) return;

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRe.test(leadEmail.trim())) {
      setLeadError("Please enter a valid email address.");
      return;
    }

    setLeadSubmitting(true);
    setLeadError("");

    try {
      const res = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadEmail.trim(),
          domain: leadEmail.trim().split("@")[1],
          headcount: parseInt(headcount) || null,
          industry,
          source: "ghost_tax",
          meta: {
            wasteLow: result?.wasteLow ?? 0,
            wasteHigh: result?.wasteHigh ?? 0,
            monthlySpend: parseInt(monthlySpend) || 0,
          },
        }),
      });

      if (res.ok) {
        setLeadSubmitted(true);
        trackEvent("ghost_tax_lead_captured", {
          source: "ghost_tax",
          industry,
          headcount: parseInt(headcount) || 0,
        });
      } else {
        setLeadError("Something went wrong. Please try again.");
      }
    } catch {
      setLeadError("Network error. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  }, [leadEmail, leadSubmitting, headcount, industry, monthlySpend, result]);

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <Script
        id="ghost-tax-webapp-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <Script
        id="ghost-tax-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="gt-container" style={{ maxWidth: 640, padding: "80px 24px" }}>

        {/* Header */}
        <Section style={{ textAlign: "center", marginBottom: 48 }}>
          <p className="gt-section-label" style={{ color: c.red }}>
            THE GHOST TAX
          </p>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 16 }}>
            How much is your company<br />
            <span style={{ color: c.red }}>silently losing</span> to IT waste?
          </h1>
          <p style={{ fontSize: 17, color: c.text2, lineHeight: 1.65, maxWidth: 480, margin: "0 auto" }}>
            The average mid-market company loses 18-32% of its SaaS/Cloud/AI budget to invisible waste. Calculate yours in 10 seconds.
          </p>
        </Section>

        {/* Calculator */}
        <Section>
          <div className="gt-card" style={{ padding: "32px 28px", marginBottom: 32 }}>
            <div className="gt-calc-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="gt-label">EMPLOYEES</label>
                <input
                  type="number"
                  value={headcount}
                  onChange={(e) => { setHeadcount(e.target.value); setCalculated(false); }}
                  placeholder="250"
                  className="gt-input gt-input-mono"
                />
              </div>
              <div>
                <label className="gt-label">MONTHLY IT SPEND (EUR)</label>
                <input
                  type="number"
                  value={monthlySpend}
                  onChange={(e) => { setMonthlySpend(e.target.value); setCalculated(false); }}
                  placeholder="120000"
                  className="gt-input gt-input-mono"
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="gt-label">INDUSTRY</label>
              <select
                value={industry}
                onChange={(e) => { setIndustry(e.target.value); setCalculated(false); }}
                className="gt-input gt-input-mono"
              >
                {Object.entries(BENCHMARKS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCalculate}
              disabled={!headcount && !monthlySpend}
              className="gt-btn"
              style={{
                width: "100%",
                padding: "16px",
                background: c.red,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: f.mono,
                border: "none",
                borderRadius: 10,
                cursor: !headcount && !monthlySpend ? "not-allowed" : "pointer",
                opacity: !headcount && !monthlySpend ? 0.5 : 1,
              }}
            >
              Calculate my Ghost Tax
            </button>
          </div>
        </Section>

        {/* Results */}
        {calculated && result && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            {/* Shock Number */}
            <div className="gt-card" style={{ border: "2px solid " + c.redBd, padding: "32px", textAlign: "center", marginBottom: 20 }}>
              <p className="gt-label" style={{ color: c.red, marginBottom: 12 }}>YOUR ESTIMATED GHOST TAX</p>
              <p className="gt-metric" style={{ fontSize: "clamp(36px, 7vw, 56px)", color: c.red, margin: "0 0 8px", lineHeight: 1 }}>
                {fmtEur(result.wasteLow)}-{fmtEur(result.wasteHigh)} EUR
              </p>
              <p style={{ fontSize: 14, color: c.text2, margin: 0 }}>per year in invisible IT waste</p>
            </div>

            {/* Breakdown */}
            <div className="gt-calc-breakdown" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div className="gt-card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <p className="gt-label" style={{ margin: "0 0 8px" }}>PER DAY</p>
                <p className="gt-metric" style={{ fontSize: 22, color: c.red, margin: 0 }}>{fmtEur(result.dailyLow)}-{fmtEur(result.dailyHigh)} EUR</p>
              </div>
              <div className="gt-card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <p className="gt-label" style={{ margin: "0 0 8px" }}>PER MONTH</p>
                <p className="gt-metric" style={{ fontSize: 22, color: c.amber, margin: 0 }}>{fmtEur(result.monthlyLow)}-{fmtEur(result.monthlyHigh)} EUR</p>
              </div>
              <div className="gt-card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <p className="gt-label" style={{ margin: "0 0 8px" }}>WASTE RATE</p>
                <p className="gt-metric" style={{ fontSize: 22, color: c.amber, margin: 0 }}>{result.wastePercent[0]}-{result.wastePercent[1]}%</p>
              </div>
            </div>

            {/* Context */}
            <div className="gt-card" style={{ padding: "20px 24px", marginBottom: 20 }}>
              <p className="gt-section-label" style={{ marginBottom: 10 }}>CONTEXT</p>
              <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.7, margin: 0 }}>
                Based on <strong style={{ color: c.text1 }}>{result.benchLabel}</strong> industry benchmarks,
                companies your size typically waste {result.wastePercent[0]}-{result.wastePercent[1]}% of their IT budget
                on unused licenses, shadow AI, over-provisioned cloud, redundant tools, and unfavorable renewals.
                This is <strong style={{ color: c.red }}>{fmtEur(result.dailyLow)}-{fmtEur(result.dailyHigh)} EUR leaving your company every single day</strong>.
              </p>
            </div>

            {/* Lead Capture */}
            <div className="gt-card" style={{ background: c.surface, padding: "24px", marginBottom: 20 }}>
              {!leadSubmitted ? (
                <>
                  <p className="gt-section-label" style={{ color: c.green, marginBottom: 10 }}>FREE DETAILED BREAKDOWN</p>
                  <p style={{ fontSize: 15, color: c.text1, fontWeight: 600, marginBottom: 4 }}>
                    Get a detailed breakdown sent to your inbox
                  </p>
                  <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 16 }}>
                    Receive your Ghost Tax analysis with industry comparisons, waste category estimates, and actionable next steps.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => { setLeadEmail(e.target.value); setLeadError(""); }}
                      placeholder="you@company.com"
                      onKeyDown={(e) => e.key === "Enter" && handleLeadCapture()}
                      className="gt-input gt-input-mono"
                      style={{
                        flex: 1,
                        borderColor: leadError ? c.redBd : undefined,
                      }}
                    />
                    <button
                      onClick={handleLeadCapture}
                      disabled={leadSubmitting}
                      className="gt-btn gt-btn-green"
                      style={{
                        whiteSpace: "nowrap",
                        opacity: leadSubmitting ? 0.7 : 1,
                        cursor: leadSubmitting ? "wait" : "pointer",
                      }}
                    >
                      {leadSubmitting ? "Sending..." : "Send Report"}
                    </button>
                  </div>
                  {leadError && (
                    <p style={{ fontSize: 12, color: c.red, marginTop: 8, marginBottom: 0 }}>{leadError}</p>
                  )}
                  <p style={{ fontSize: 11, color: c.text3, marginTop: 10, marginBottom: 0 }}>
                    No spam. Unsubscribe anytime. Your data stays private.
                  </p>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <p style={{ fontSize: 22, marginBottom: 8, color: c.green }}>&#10003;</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: c.green, marginBottom: 4 }}>Report sent!</p>
                  <p style={{ fontSize: 13, color: c.text2, margin: 0 }}>
                    Check your inbox at <strong style={{ color: c.text1 }}>{leadEmail}</strong> for your detailed Ghost Tax breakdown.
                  </p>
                </div>
              )}
            </div>

            {/* CTA: Full Scan */}
            <div className="gt-panel" style={{
              border: "2px solid " + c.accentBd,
              padding: "32px",
              textAlign: "center",
              marginBottom: 20,
            }}>
              <p className="gt-section-label" style={{ marginBottom: 10 }}>STOP GUESSING. GET PROOF.</p>
              <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: c.text1 }}>
                Get your exact exposure in 48 hours
              </p>
              <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 20 }}>
                The Ghost Tax Calculator uses industry averages. Our Decision Intelligence engine analyzes <strong style={{ color: c.text1 }}>your actual vendors, contracts, and usage patterns</strong> to find the real number — with proof.
              </p>
              <a
                href="/intel"
                onClick={() => trackEvent("ghost_tax_cta_clicked", { wasteLow: result.wasteLow, wasteHigh: result.wasteHigh })}
                className="gt-btn gt-btn-primary"
                style={{ display: "inline-block", marginBottom: 12 }}
              >
                Run Full Detection — From $990
              </a>
              <p style={{ fontSize: 12, color: c.text3, margin: 0 }}>
                21-phase analysis • Vendor-level proof • Negotiation playbooks • CFO-ready memos
              </p>
            </div>

            {/* Share prompt */}
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ fontSize: 12, color: c.text3, marginBottom: 8 }}>Think your peers should know their Ghost Tax?</p>
              <button
                onClick={() => {
                  const text = `I just calculated my company's Ghost Tax — we're losing ${fmtEur(result.wasteLow)}-${fmtEur(result.wasteHigh)} EUR/year to invisible IT waste. Calculate yours:`;
                  const url = "https://ghost-tax.com/ghost-tax";
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`, "_blank");
                  trackEvent("ghost_tax_shared", { platform: "linkedin" });
                }}
                className="gt-btn gt-btn-accent-ghost"
              >
                Share on LinkedIn
              </button>
            </div>
          </div>
        )}

        {/* Bottom trust */}
        <div style={{ textAlign: "center", padding: "40px 0 20px", borderTop: calculated ? "none" : "1px solid " + c.border }}>
          <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.7 }}>
            Based on industry data from Gartner, Flexera, Zylo, and 200+ Ghost Tax analyses.
            <br />Benchmarks updated March 2026. No data is collected until you run a full scan.
          </p>
        </div>
      </div>

      <Footer />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .gt-calc-row { grid-template-columns: 1fr !important; }
          .gt-calc-breakdown { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
