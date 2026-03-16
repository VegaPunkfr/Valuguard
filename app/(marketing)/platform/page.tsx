"use client";

import { ArrowRight, Globe, Cpu, FileText, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f, inset } from "@/lib/tokens";
import Section from "@/components/ui/section";

// Technical constants — not i18n (architecture facts, not UX copy)
const PIPELINE_PHASES = [
  { num: "01", key: "enrichment",        label: "Enrichment",          desc: "Exa neural search: 10+ geo-aware queries, 200+ vendors across 20 categories. Intent detection (8 types)." },
  { num: "02", key: "context",           label: "Context",             desc: "Company profile normalization. Industry/size/region mapping. Declared vs inferred signals separated." },
  { num: "03", key: "exposure",          label: "Exposure",            desc: "12 leakage types detected. EUR range calculation using market baselines and headcount priors." },
  { num: "04", key: "lossVelocity",      label: "Loss Velocity",       desc: "Daily/weekly/monthly/annual compound cost-of-inaction. Not linear — drift-adjusted." },
  { num: "05", key: "costOfDelay",       label: "Cost of Delay",       desc: "Time-value model: compound cost of deferring correction. Decision pressure score." },
  { num: "06", key: "diagnosis",         label: "Diagnosis",           desc: "Root cause classification across 7 structural drivers. Evidence tier: observed / inferred / estimated." },
  { num: "07", key: "causalGraph",       label: "Causal Graph",        desc: "Symptom-to-driver chain. Dominant cause isolation. Confidence-weighted arc scoring." },
  { num: "08", key: "proofEngine",       label: "Proof Engine",        desc: "Signal aggregation. Source attribution. Confidence 0-85 (never 100). Grade: strong / moderate / directional." },
  { num: "09", key: "proof",             label: "Proof",               desc: "Finalized evidence surface. Signals ranked by reliability. Separation of tiers enforced." },
  { num: "10", key: "marketMemory",      label: "Market Memory",       desc: "pgvector HNSW index (6 categories). Baseline comparison against 200+ vendor price points." },
  { num: "11", key: "peerComparison",    label: "Peer Comparison",     desc: "7-vertical benchmark. Percentile positioning. Spend-per-employee normalization." },
  { num: "12", key: "driftMonitor",      label: "Drift Monitor",       desc: "Vendor/category drift detection. Window compression. Historical trend scoring." },
  { num: "13", key: "correctionMomentum", label: "Correction Momentum", desc: "Feasibility scoring for corrective actions. Organizational friction model." },
  { num: "14", key: "scenarios",         label: "Scenarios",           desc: "3 forward paths: drift / partial correction / full correction. NPV for each." },
  { num: "15", key: "counterfactual",    label: "Counterfactual",      desc: "What happens if nothing changes. Compound exposure model at 6/12/24 months." },
  { num: "16", key: "decisionFriction",  label: "Decision Friction",   desc: "Organizational blockers to correction. Prioritization difficulty. Ownership ambiguity." },
  { num: "17", key: "decisionPressure",  label: "Decision Pressure",   desc: "Urgency composite: renewal windows, drift velocity, confidence grade, market timing." },
  { num: "18", key: "negotiation",       label: "Negotiation",         desc: "10+ vendor-specific playbooks. Leverage points, timing, benchmark pricing, script templates." },
  { num: "19", key: "confidenceModel",   label: "Confidence Model",    desc: "Final confidence assembly. Weakest layer sets ceiling. 5-layer scoring matrix." },
  { num: "20", key: "decisionPack",      label: "Decision Pack",       desc: "4-document assembly: CFO memo, CIO brief, Board one-pager, Procurement action plan." },
  { num: "21", key: "executiveSnapshot", label: "Executive Snapshot",  desc: "Earned summary — streams LAST. Evidence before conclusions is doctrine." },
];

const TECH_STACK = [
  { layer: "STREAMING",    tech: "NDJSON over HTTP",        detail: "21 phases stream incrementally. Each phase emits a JSON line. No polling, no waiting for full completion." },
  { layer: "VECTOR DB",    tech: "pgvector + HNSW index",   detail: "Supabase PostgreSQL 15. 1536-dim OpenAI embeddings (text-embedding-3-small). 6 category indexes." },
  { layer: "ENRICHMENT",   tech: "Exa Neural Search API",   detail: "200+ vendors, 20 categories, 10+ geo-aware queries per analysis. Intent detection across 8 signal types." },
  { layer: "RUNTIME",      tech: "Next.js 15 App Router",   detail: "Server-only intelligence in lib/analysis.ts (~2100 lines). No client-side AI. maxDuration=60 on Vercel." },
  { layer: "EMBEDDINGS",   tech: "OpenAI text-embedding-3-small", detail: "1536 dimensions. Used for market memory similarity search and peer cluster matching." },
  { layer: "DATABASE",     tech: "Supabase (PostgreSQL 15)", detail: "RLS on all tables. Three-tier client (browser / server / admin). Migrations 001-003 applied." },
];

export default function PlatformPage() {
  const { t } = useI18n();

  const modules = [
    { num: "01", title: t("platform.mod1.title"), desc: t("platform.mod1.desc"), color: c.red },
    { num: "02", title: t("platform.mod2.title"), desc: t("platform.mod2.desc"), color: c.amber },
    { num: "03", title: t("platform.mod3.title"), desc: t("platform.mod3.desc"), color: c.accent },
    { num: "04", title: t("platform.mod4.title"), desc: t("platform.mod4.desc"), color: c.green },
    { num: "05", title: t("platform.mod5.title"), desc: t("platform.mod5.desc"), color: c.accentHi },
    { num: "06", title: t("platform.mod6.title"), desc: t("platform.mod6.desc"), color: c.green },
  ];

  const workflow = [
    { step: "01", title: t("platform.flow1.title"), desc: t("platform.flow1.desc") },
    { step: "02", title: t("platform.flow2.title"), desc: t("platform.flow2.desc") },
    { step: "03", title: t("platform.flow3.title"), desc: t("platform.flow3.desc") },
    { step: "04", title: t("platform.flow4.title"), desc: t("platform.flow4.desc") },
  ];

  const differentiators = [
    { title: t("platform.diff1.title"), desc: t("platform.diff1.desc") },
    { title: t("platform.diff2.title"), desc: t("platform.diff2.desc") },
    { title: t("platform.diff3.title"), desc: t("platform.diff3.desc") },
    { title: t("platform.diff4.title"), desc: t("platform.diff4.desc") },
  ];

  const howItWorksSteps = [
    {
      icon: Globe,
      title: t("platform.howItWorks.step1.title"),
      desc: t("platform.howItWorks.step1.desc"),
      num: "01",
    },
    {
      icon: Cpu,
      title: t("platform.howItWorks.step2.title"),
      desc: t("platform.howItWorks.step2.desc"),
      num: "02",
    },
    {
      icon: FileText,
      title: t("platform.howItWorks.step3.title"),
      desc: t("platform.howItWorks.step3.desc"),
      num: "03",
    },
  ];

  const timeline = [
    { time: t("platform.timeline.t0"), desc: t("platform.timeline.t0.desc"), progress: 0 },
    { time: t("platform.timeline.t1"), desc: t("platform.timeline.t1.desc"), progress: 25 },
    { time: t("platform.timeline.t2"), desc: t("platform.timeline.t2.desc"), progress: 65 },
    { time: t("platform.timeline.t3"), desc: t("platform.timeline.t3.desc"), progress: 100 },
  ];

  const deliverables = [
    {
      title: t("platform.deliverables.cfo.title"),
      desc: t("platform.deliverables.cfo.desc"),
      color: c.red,
      audience: "CFO",
    },
    {
      title: t("platform.deliverables.cio.title"),
      desc: t("platform.deliverables.cio.desc"),
      color: c.accent,
      audience: "CIO",
    },
    {
      title: t("platform.deliverables.board.title"),
      desc: t("platform.deliverables.board.desc"),
      color: c.amber,
      audience: "BOARD",
    },
    {
      title: t("platform.deliverables.procurement.title"),
      desc: t("platform.deliverables.procurement.desc"),
      color: c.green,
      audience: "PROCUREMENT",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div className="gt-container">

        {/* Hero */}
        <Section style={{ textAlign: "center", paddingTop: 80, paddingBottom: 20 }}>
          <p className="gt-section-label">{t("platform.label")}</p>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.035em", marginBottom: 16, maxWidth: 700, margin: "0 auto 16px" }}>
            {t("platform.title")}
          </h1>
          <p style={{ fontSize: 18, color: c.text2, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.6 }}>
            {t("platform.sub")}
          </p>
        </Section>

        {/* How It Works — 3-step visual flow */}
        <Section style={{ paddingTop: 60, paddingBottom: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p className="gt-section-label">{t("platform.howItWorks.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" }}>
              {t("platform.howItWorks.title")}
            </h2>
          </div>

          <div className="vg-hiw-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "stretch", position: "relative" }}>
            {howItWorksSteps.map(function (step, idx) {
              const Icon = step.icon;
              return (
                <div key={step.num} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {/* Connector arrow between steps */}
                  {idx < howItWorksSteps.length - 1 && (
                    <div className="vg-hiw-arrow" style={{
                      position: "absolute", right: -12, top: 52, zIndex: 2,
                      color: c.text4,
                    }}>
                      <ChevronRight size={24} />
                    </div>
                  )}
                  <div className="gt-card" style={{
                    padding: "32px 24px", textAlign: "center", width: "100%",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
                    position: "relative", overflow: "hidden",
                  }}>
                    {/* Step number watermark */}
                    <span style={{
                      fontFamily: f.mono, fontSize: 64, fontWeight: 800,
                      color: c.accentBg, position: "absolute", top: 8, right: 16,
                      lineHeight: 1, userSelect: "none",
                    }}>
                      {step.num}
                    </span>

                    {/* Icon container */}
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: c.accentBg,
                      border: "1px solid " + c.accentBd,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative", zIndex: 1,
                    }}>
                      <Icon size={24} style={{ color: c.accent }} />
                    </div>

                    <p style={{ fontSize: 17, fontWeight: 700, color: c.text1, position: "relative", zIndex: 1 }}>
                      {step.title}
                    </p>
                    <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, position: "relative", zIndex: 1 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Technical Architecture — 21-phase pipeline (CTO layer) */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label" style={{ marginBottom: 8 }}>{t("platform.pipeline.label")}</p>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
              {t("platform.pipeline.title")}
            </h2>
            <p style={{ fontSize: 14, color: c.text2, maxWidth: 640, lineHeight: 1.6, marginBottom: 28 }}>
              {t("platform.pipeline.sub")}
            </p>

            <div className="vg-pipeline-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {PIPELINE_PHASES.map(function (phase) {
                return (
                  <div key={phase.key} style={{ ...inset, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
                    <span style={{
                      position: "absolute", top: 6, right: 10,
                      fontFamily: f.mono, fontSize: 28, fontWeight: 800,
                      color: c.accentBg, lineHeight: 1, userSelect: "none",
                    }}>
                      {phase.num}
                    </span>
                    <p style={{
                      fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                      color: c.accent, letterSpacing: ".08em",
                      textTransform: "uppercase", marginBottom: 4,
                    }}>
                      {phase.label}
                    </p>
                    <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.5 }}>
                      {phase.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: c.accentBg, border: "1px solid " + c.accentBd, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: f.mono, fontSize: 10, fontWeight: 700, color: c.accent, letterSpacing: ".1em" }}>{t("platform.pipeline.badge.label")}</span>
              <span style={{ fontSize: 12, color: c.text2 }}>{t("platform.pipeline.badge.desc")}</span>
            </div>
          </div>
        </Section>

        {/* Tech Stack — CTO due-diligence layer */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label" style={{ marginBottom: 8 }}>{t("platform.techstack.label")}</p>
            <h2 style={{ fontSize: "clamp(20px, 2.5vw, 26px)", fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em" }}>
              {t("platform.techstack.title")}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TECH_STACK.map(function (item) {
                return (
                  <div key={item.layer} style={{ ...inset, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <span style={{
                      fontFamily: f.mono, fontSize: 9, fontWeight: 700, color: c.text3,
                      letterSpacing: ".12em", textTransform: "uppercase", width: 96,
                      flexShrink: 0, paddingTop: 2,
                    }}>
                      {item.layer}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: f.mono, fontSize: 12, fontWeight: 700, color: c.accentHi, marginBottom: 3 }}>
                        {item.tech}
                      </p>
                      <p style={{ fontSize: 12, color: c.text3, lineHeight: 1.5 }}>
                        {item.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/security-vault" style={{ fontSize: 11, fontFamily: f.mono, color: c.text3, textDecoration: "none" }}>
                Security architecture &rarr;
              </a>
              <a href="/methodology" style={{ fontSize: 11, fontFamily: f.mono, color: c.text3, textDecoration: "none" }}>
                Detection methodology &rarr;
              </a>
            </div>
          </div>
        </Section>

        {/* Delivery Timeline */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">{t("platform.timeline.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 8, letterSpacing: "-0.02em" }}>
              {t("platform.timeline.title")}
            </h2>
            <p style={{ fontSize: 15, color: c.text2, maxWidth: 600, lineHeight: 1.6, marginBottom: 36 }}>
              {t("platform.timeline.sub")}
            </p>

            {/* Timeline track */}
            <div style={{ position: "relative", padding: "0 0 20px" }}>
              {/* Background track */}
              <div className="vg-timeline-track" style={{
                position: "relative", height: 3,
                background: c.border, borderRadius: 2,
                marginBottom: 0,
              }}>
                {/* Filled portion */}
                <div style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  background: "linear-gradient(90deg, " + c.accent + ", " + c.green + ")",
                  borderRadius: 2, opacity: 0.4,
                }} />
              </div>

              {/* Timeline nodes */}
              <div className="vg-timeline-nodes" style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                marginTop: -6, position: "relative",
              }}>
                {timeline.map(function (node, idx) {
                  var isFirst = idx === 0;
                  var isLast = idx === timeline.length - 1;
                  var dotColor = isLast ? c.green : c.accent;
                  return (
                    <div key={idx} style={{
                      display: "flex", flexDirection: "column",
                      alignItems: isFirst ? "flex-start" : isLast ? "flex-end" : "center",
                    }}>
                      {/* Dot on track */}
                      <div style={{
                        width: 12, height: 12, borderRadius: "50%",
                        background: dotColor,
                        border: "2px solid " + c.bg,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        marginBottom: 12,
                      }} />
                      <p style={{
                        fontFamily: f.mono, fontSize: 12, fontWeight: 700,
                        color: isLast ? c.green : c.accent,
                        letterSpacing: ".06em", marginBottom: 4,
                        textAlign: isFirst ? "left" : isLast ? "right" : "center",
                      }}>
                        {node.time}
                      </p>
                      <p style={{
                        fontSize: 13, color: c.text2, lineHeight: 1.4,
                        textAlign: isFirst ? "left" : isLast ? "right" : "center",
                        maxWidth: 160,
                      }}>
                        {node.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* Decision Pack — Output Preview */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p className="gt-section-label">{t("platform.deliverables.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" }}>
              {t("platform.deliverables.title")}
            </h2>
            <p style={{ fontSize: 17, color: c.text2, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
              {t("platform.deliverables.sub")}
            </p>
          </div>

          <div className="vg-deliverables-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {deliverables.map(function (item) {
              return (
                <div key={item.audience} className="gt-card" style={{
                  padding: "28px 24px", position: "relative", overflow: "hidden",
                }}>
                  {/* Color accent bar */}
                  <div style={{
                    position: "absolute", top: 0, left: 0,
                    width: "100%", height: 2,
                    background: item.color, opacity: 0.5,
                  }} />
                  {/* Audience badge */}
                  <span style={{
                    fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                    color: item.color, letterSpacing: ".12em",
                    opacity: 0.7, display: "block", marginBottom: 10,
                  }}>
                    {item.audience}
                  </span>
                  <p style={{ fontSize: 17, fontWeight: 700, color: c.text1, marginBottom: 8 }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* How it works (existing 4-step workflow) */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">{t("platform.workflow.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 28, letterSpacing: "-0.02em" }}>
              {t("platform.workflow.title")}
            </h2>

            <div className="vg-flow-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {workflow.map(function (item) {
                return (
                  <div key={item.step} style={{ ...inset, padding: "24px 18px", position: "relative" }}>
                    <span style={{ fontFamily: f.mono, fontSize: 36, fontWeight: 800, color: c.accentBg, position: "absolute", top: 10, right: 14 }}>
                      {item.step}
                    </span>
                    <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{item.title}</p>
                    <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Intelligence modules */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p className="gt-section-label">{t("platform.modules.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" }}>
              {t("platform.modules.title")}
            </h2>
            <p style={{ fontSize: 17, color: c.text2, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              {t("platform.modules.sub")}
            </p>
          </div>

          <div className="vg-modules-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {modules.map(function (mod) {
              return (
                <div key={mod.num} className="gt-card" style={{ padding: "28px 24px", position: "relative" }}>
                  <div style={{ width: 2, height: 24, background: mod.color, borderRadius: 2, marginBottom: 14, opacity: 0.6 }} />
                  <p style={{ fontSize: 10, fontFamily: f.mono, fontWeight: 700, color: mod.color, letterSpacing: ".1em", marginBottom: 8, opacity: 0.7 }}>
                    {t("platform.modulePrefix")} {mod.num}
                  </p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{mod.title}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Differentiators */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">{t("platform.diff.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 28, letterSpacing: "-0.02em" }}>
              {t("platform.diff.title")}
            </h2>

            <div className="vg-diff-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {differentiators.map(function (d) {
                return (
                  <div key={d.title} style={{ ...inset, padding: "20px" }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 6 }}>{d.title}</p>
                    <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{d.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Security & compliance */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "32px 28px" }}>
            <p className="gt-section-label">{t("platform.security.label")}</p>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em" }}>
              {t("platform.security.title")}
            </h2>
            <div className="vg-security-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: t("platform.sec1.label"), desc: t("platform.sec1.desc") },
                { label: t("platform.sec2.label"), desc: t("platform.sec2.desc") },
                { label: t("platform.sec3.label"), desc: t("platform.sec3.desc") },
                { label: t("platform.sec4.label"), desc: t("platform.sec4.desc") },
              ].map(function (item) {
                return (
                  <div key={item.label} style={{ ...inset, padding: "16px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, color: c.accent, letterSpacing: ".06em", marginBottom: 6 }}>{item.label}</p>
                    <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.45 }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <a href="/security-vault" style={{ fontSize: 13, fontFamily: f.mono, color: c.text3, textDecoration: "none" }}>
                {t("platform.security.link")} &rarr;
              </a>
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "48px 40px", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {t("platform.cta.title")}
            </h2>
            <p style={{ fontSize: 16, color: c.text2, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 }}>
              {t("platform.cta.sub")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <a href="/intel" className="gt-btn gt-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t("platform.cta.primary")} <ArrowRight size={16} />
              </a>
              <a href="/pricing" className="gt-btn gt-btn-ghost" style={{ textDecoration: "none" }}>
                {t("platform.cta.secondary")}
              </a>
            </div>
          </div>
        </Section>

      </div>

      <style>{`
        @media (max-width: 768px) {
          .vg-flow-grid { grid-template-columns: 1fr 1fr !important; }
          .vg-modules-grid { grid-template-columns: 1fr !important; }
          .vg-diff-grid { grid-template-columns: 1fr !important; }
          .vg-security-grid { grid-template-columns: 1fr 1fr !important; }
          .vg-hiw-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .vg-hiw-arrow { display: none !important; }
          .vg-deliverables-grid { grid-template-columns: 1fr !important; }
          .vg-timeline-nodes { grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
          .vg-timeline-nodes > div { align-items: flex-start !important; }
          .vg-timeline-nodes p { text-align: left !important; }
          .vg-timeline-track { display: none; }
          .vg-pipeline-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .vg-flow-grid { grid-template-columns: 1fr !important; }
          .vg-security-grid { grid-template-columns: 1fr !important; }
          .vg-timeline-nodes { grid-template-columns: 1fr !important; }
          .vg-pipeline-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
