"use client";
import { useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

/*  GHOST TAX — BOARD REPORT GENERATOR (2026)
    Creates a downloadable executive summary for the C-suite.
    Pre-filled with Ghost Tax diagnostic data.
    Formats: preview on-screen + download as .txt
    Locale-aware: USD ($) for EN, EUR (€) for FR/DE. */

type FmtLocale = "en" | "fr" | "de";

function fmt(n: number, short?: boolean, locale: FmtLocale = "en") {
  if (locale === "en") {
    if (short && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    if (short && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
    return "$" + Math.round(n).toLocaleString("en-US");
  }
  // FR/DE → EUR
  if (short && n >= 1e6) return (n / 1e6).toFixed(1) + "M €";
  if (short && n >= 1e4) return Math.round(n / 1e3) + "k €";
  const numStr = locale === "fr"
    ? Math.round(n).toLocaleString("fr-FR")
    : Math.round(n).toLocaleString("de-DE");
  return numStr + " €";
}

// -- Report labels by locale --
const REPORT_LABELS: Record<FmtLocale, Record<string, string>> = {
  en: {
    title: "GHOST TAX — EXECUTIVE GHOST TAX SUMMARY",
    confidential: "Confidential — Prepared",
    profile: "COMPANY PROFILE",
    company: "Company:",
    industry: "Industry:",
    headcount: "Headcount:",
    employees: "employees",
    saasTools: "SaaS Tools:",
    activeSubs: "active subscriptions",
    monthlyIT: "Monthly IT:",
    assessment: "GHOST TAX ASSESSMENT",
    annualGT: "Annual Ghost Tax:",
    midpoint: "midpoint",
    entropyScore: "Entropy Score:",
    critical: "CRITICAL",
    elevated: "ELEVATED",
    healthy: "HEALTHY",
    entropyCoeff: "Entropy Coeff:",
    coordDrag: "organizational coordination drag",
    peerPos: "Peer Position:",
    lessEfficient: "less efficient than",
    auditROI: "Audit ROI:",
    investment: "investment",
    recoverable: "recoverable",
    topActions: "TOP RECOVERY ACTIONS (ranked by savings/effort)",
    savings: "Savings:",
    effort: "Effort:",
    timeline: "Timeline:",
    days: "days",
    totalRecoverable: "Total Recoverable (conservative 60%):",
    shadowAI: "Shadow AI Redundancy:",
    trajectory: "24-MONTH COST TRAJECTORY",
    colTimeline: "Timeline",
    colWithout: "Without Action",
    colWith: "With Governance",
    colDelta: "Delta",
    now: "Now",
    months6: "6 months",
    months12: "12 months",
    months24: "24 months",
    cumSavings: "Cumulative 24-month savings:",
    costMultiple: "x the cost of an initial audit.",
    nextStep: "RECOMMENDED NEXT STEP",
    step1: "1. Schedule a Ghost Tax Priority Audit",
    step2: "2. Receive full anomaly report within 48 hours",
    step3: "3. Implement top 3 quick wins (est.",
    step3suffix: "/yr recovered)",
    step4: "4. Typical first-quarter ROI: 15-40x",
    contact: "Contact: audits@ghost-tax.com | ghost-tax.com",
    trust: "SOC2-Certified Infrastructure | Zero-Knowledge Audit | EU + US Data Residency",
  },
  fr: {
    title: "GHOST TAX — RÉSUMÉ EXÉCUTIF",
    confidential: "Confidentiel — Préparé le",
    profile: "PROFIL DE L'ENTREPRISE",
    company: "Entreprise :",
    industry: "Secteur :",
    headcount: "Effectif :",
    employees: "employés",
    saasTools: "Outils SaaS :",
    activeSubs: "abonnements actifs",
    monthlyIT: "IT Mensuel :",
    assessment: "ÉVALUATION GHOST TAX",
    annualGT: "Ghost Tax Annuelle :",
    midpoint: "médiane",
    entropyScore: "Score d'Entropie :",
    critical: "CRITIQUE",
    elevated: "ÉLEVÉ",
    healthy: "SAIN",
    entropyCoeff: "Coeff. Entropie :",
    coordDrag: "friction de coordination organisationnelle",
    peerPos: "Position Peer :",
    lessEfficient: "moins efficient que",
    auditROI: "ROI Audit :",
    investment: "investissement",
    recoverable: "récupérable",
    topActions: "ACTIONS DE RÉCUPÉRATION PRIORITAIRES (classées par économies/effort)",
    savings: "Économies :",
    effort: "Effort :",
    timeline: "Délai :",
    days: "jours",
    totalRecoverable: "Total Récupérable (conservateur 60%) :",
    shadowAI: "Redondance IA Fantôme :",
    trajectory: "TRAJECTOIRE DE COÛTS 24 MOIS",
    colTimeline: "Période",
    colWithout: "Sans Action",
    colWith: "Avec Gouvernance",
    colDelta: "Écart",
    now: "Maintenant",
    months6: "6 mois",
    months12: "12 mois",
    months24: "24 mois",
    cumSavings: "Économies cumulées sur 24 mois :",
    costMultiple: "x le coût d'un audit initial.",
    nextStep: "PROCHAINE ÉTAPE RECOMMANDÉE",
    step1: "1. Planifier un Audit Prioritaire Ghost Tax",
    step2: "2. Recevoir le rapport complet sous 48 heures",
    step3: "3. Implémenter les 3 gains rapides (est.",
    step3suffix: "/an récupérés)",
    step4: "4. ROI typique au premier trimestre : 15-40x",
    contact: "Contact : audits@ghost-tax.com | ghost-tax.com",
    trust: "Infrastructure SOC2 | Audit Zero-Knowledge | Hébergement EU",
  },
  de: {
    title: "GHOST TAX — EXECUTIVE ZUSAMMENFASSUNG",
    confidential: "Vertraulich — Erstellt am",
    profile: "UNTERNEHMENSPROFIL",
    company: "Unternehmen:",
    industry: "Branche:",
    headcount: "Mitarbeiter:",
    employees: "Mitarbeiter",
    saasTools: "SaaS-Tools:",
    activeSubs: "aktive Abonnements",
    monthlyIT: "Monatliche IT:",
    assessment: "GHOST TAX BEWERTUNG",
    annualGT: "Jährliche Ghost Tax:",
    midpoint: "Mittelwert",
    entropyScore: "Entropie-Score:",
    critical: "KRITISCH",
    elevated: "ERHÖHT",
    healthy: "GESUND",
    entropyCoeff: "Entropie-Koeff.:",
    coordDrag: "organisatorischer Koordinationswiderstand",
    peerPos: "Peer-Position:",
    lessEfficient: "weniger effizient als",
    auditROI: "Audit-ROI:",
    investment: "Investition",
    recoverable: "rückholbar",
    topActions: "TOP-RÜCKGEWINNUNGSMASSNAHMEN (nach Einsparung/Aufwand)",
    savings: "Einsparung:",
    effort: "Aufwand:",
    timeline: "Zeitrahmen:",
    days: "Tage",
    totalRecoverable: "Gesamt Rückholbar (konservativ 60%):",
    shadowAI: "Schatten-KI-Redundanz:",
    trajectory: "24-MONATS-KOSTENPROGNOSE",
    colTimeline: "Zeitraum",
    colWithout: "Ohne Maßnahmen",
    colWith: "Mit Governance",
    colDelta: "Differenz",
    now: "Jetzt",
    months6: "6 Monate",
    months12: "12 Monate",
    months24: "24 Monate",
    cumSavings: "Kumulative 24-Monats-Einsparungen:",
    costMultiple: "x die Kosten eines initialen Audits.",
    nextStep: "EMPFOHLENER NÄCHSTER SCHRITT",
    step1: "1. Ghost Tax Prioritäts-Audit planen",
    step2: "2. Vollständigen Anomaliebericht in 48h erhalten",
    step3: "3. Top 3 Quick Wins umsetzen (ca.",
    step3suffix: "/Jahr rückholbar)",
    step4: "4. Typischer ROI im ersten Quartal: 15-40x",
    contact: "Kontakt: audits@ghost-tax.com | ghost-tax.com",
    trust: "SOC2-Infrastruktur | Zero-Knowledge-Audit | EU-Hosting",
  },
};

// -- Report generator --
function buildReport(cfg: any, locale: FmtLocale = "en") {
  const L = REPORT_LABELS[locale];
  const f = (n: number, short?: boolean) => fmt(n, short, locale);
  const auditPrice = locale === "en" ? "$490" : "490 €";

  const dateLocale = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US";
  const date = new Date().toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" });
  const lines: string[] = [];

  lines.push("══════════════════════════════════════════════════════════");
  lines.push("   " + L.title);
  lines.push("   " + L.confidential + " " + date);
  lines.push("══════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(L.profile);
  lines.push("  " + pad(L.company, 19) + cfg.company);
  lines.push("  " + pad(L.industry, 19) + cfg.industry);
  lines.push("  " + pad(L.headcount, 19) + cfg.headcount + " " + L.employees);
  lines.push("  " + pad(L.saasTools, 19) + cfg.tools + " " + L.activeSubs);
  lines.push("  " + pad(L.monthlyIT, 19) + f(cfg.monthlyIT) + " (SaaS " + f(cfg.saas) + " + Cloud " + f(cfg.cloud) + " + AI " + f(cfg.ai) + ")");
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push(L.assessment);
  lines.push("  " + L.annualGT + "   " + f(cfg.ghostTaxLow) + " – " + f(cfg.ghostTaxHigh) + " (" + L.midpoint + ": " + f(cfg.ghostTaxMid) + ")");
  lines.push("  " + L.entropyScore + "      " + cfg.entropyScore + "/100 (" + (cfg.entropyScore >= 61 ? L.critical : cfg.entropyScore >= 31 ? L.elevated : L.healthy) + ")");
  lines.push("  " + L.entropyCoeff + "      kappa = " + cfg.kappa.toFixed(3) + " (" + L.coordDrag + ")");
  lines.push("  " + L.peerPos + "      P" + cfg.peerPct + " — " + L.lessEfficient + " " + cfg.peerPct + "% of " + cfg.peerLabel);
  lines.push("  " + L.auditROI + "          " + cfg.roi + "x (" + auditPrice + " " + L.investment + " -> " + f(cfg.recoverable, true) + " " + L.recoverable + ")");
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push(L.topActions);
  lines.push("");

  cfg.actions.forEach((a: any, i: number) => {
    lines.push("  " + (i + 1) + ". " + a.label);
    lines.push("     " + L.savings + " " + f(a.savings, true) + "/yr | " + L.effort + " " + a.effort + " | " + L.timeline + " ~" + a.days + " " + L.days);
    lines.push("");
  });

  lines.push("  " + L.totalRecoverable + " " + f(cfg.recoverable) + "/yr");
  lines.push("  " + L.shadowAI + "                  " + f(cfg.shadowRedundancy, true) + "/yr");
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push(L.trajectory);
  lines.push("");
  lines.push("  " + pad(L.colTimeline, 18) + pad(L.colWithout, 18) + pad(L.colWith, 19) + L.colDelta);
  lines.push("  " + pad(L.now, 18) + pad(f(cfg.burnNow), 18) + pad(f(cfg.burnNow), 19) + "—");
  lines.push("  " + pad(L.months6, 18) + pad(f(cfg.burn6u), 18) + pad(f(cfg.burn6g), 19) + f(cfg.burn6u - cfg.burn6g, true));
  lines.push("  " + pad(L.months12, 18) + pad(f(cfg.burn12u), 18) + pad(f(cfg.burn12g), 19) + f(cfg.burn12u - cfg.burn12g, true));
  lines.push("  " + pad(L.months24, 18) + pad(f(cfg.burn24u), 18) + pad(f(cfg.burn24g), 19) + f(cfg.burn24u - cfg.burn24g, true));
  lines.push("");
  lines.push("  " + L.cumSavings + " " + f(cfg.savings24));
  lines.push("  " + Math.round(cfg.savings24 / 490) + L.costMultiple);
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push(L.nextStep);
  lines.push("");
  lines.push("  " + L.step1 + " (" + auditPrice + ")");
  lines.push("  " + L.step2);
  lines.push("  " + L.step3 + " " + f(cfg.actions.slice(0, 3).reduce((s: number, a: any) => s + a.savings, 0), true) + L.step3suffix);
  lines.push("  " + L.step4);
  lines.push("");
  lines.push("  " + L.contact);
  lines.push("  " + L.trust);
  lines.push("══════════════════════════════════════════════════════════");

  return lines.join("\n");
}

function pad(str: string, width: number) {
  while (str.length < width) str = str + " ";
  return str;
}

// -- Download handler --
function downloadTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ====================================================
// MAIN
// ====================================================
export default function BoardReport() {
  const { t, locale } = useI18n();
  const [cfg, setCfg] = useState({
    company: "Acme Corp",
    industry: "SaaS / Tech",
    headcount: 150,
    tools: 62,
    saas: 38000,
    cloud: 15000,
    ai: 11000,
    monthlyIT: 64000,
    ghostTaxLow: 134000,
    ghostTaxMid: 178000,
    ghostTaxHigh: 205000,
    entropyScore: 72,
    kappa: 0.132,
    peerPct: 78,
    peerLabel: "SaaS scale-ups",
    roi: 18.2,
    recoverable: 106800,
    shadowRedundancy: 38400,
    burnNow: 64000,
    burn6u: 78400, burn6g: 68200,
    burn12u: 96000, burn12g: 72600,
    burn24u: 144000, burn24g: 82100,
    savings24: 412000,
    actions: [
      { label: "Deactivate 23 unused Figma licenses", savings: 27600, effort: "Easy", days: 3 },
      { label: "Consolidate 3 AI writing tools to 1", savings: 19200, effort: "Moderate", days: 10 },
      { label: "Downgrade Salesforce Enterprise to Pro", savings: 14400, effort: "Easy", days: 5 },
      { label: "Renegotiate AWS commitment at renewal", savings: 12000, effort: "Moderate", days: 14 },
      { label: "Eliminate duplicate analytics stack", savings: 9600, effort: "Moderate", days: 7 },
    ],
  });

  const reportText = useMemo(() => buildReport(cfg, locale as FmtLocale), [cfg, locale]);

  const handleDownload = useCallback(() => {
    const filename = "ghost-tax-report-" + cfg.company.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + new Date().toISOString().slice(0, 10) + ".txt";
    downloadTxt(reportText, filename);
  }, [reportText, cfg.company]);

  function updField(key: string, val: string | number) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "24px 14px 48px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* -- RETOUR -- */}
        <div style={{ marginBottom: 14 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("back")}</a>
        </div>

        {/* -- HEADER -- */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="gt-mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: c.accent }}>GHOST TAX</span>
            <span className="gt-badge gt-badge--muted">{t("roi.badge")}</span>
          </div>
          <button onClick={handleDownload} className="gt-btn gt-btn-green" style={{ fontSize: 10 }}>
            {"\u2193"} {t("roi.download")}
          </button>
        </div>

        {/* -- EDIT FIELDS -- */}
        <div className="gt-panel" style={{ padding: 16, marginBottom: 14 }}>
          <p className="gt-section-label" style={{ marginBottom: 10 }}>
            {t("roi.customize")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { key: "company", label: t("roi.field.company"), type: "text" },
              { key: "industry", label: t("roi.field.industry"), type: "text" },
              { key: "headcount", label: t("roi.field.headcount"), type: "number" },
            ].map((field) => (
              <div key={field.key}>
                <label className="gt-label" style={{ marginBottom: 3 }}>{field.label}</label>
                <input
                  type={field.type}
                  value={(cfg as any)[field.key]}
                  onChange={(e) => { updField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value); }}
                  className="gt-input gt-input-mono"
                />
              </div>
            ))}
          </div>
        </div>

        {/* -- REPORT PREVIEW -- */}
        <div className="gt-panel" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p className="gt-label">{t("roi.preview")}</p>
            <span className="gt-mono gt-muted" style={{ fontSize: 8 }}>
              {reportText.split("\n").length} {t("roi.lines")}
            </span>
          </div>
          <pre style={{
            fontFamily: f.mono,
            fontSize: 9.5,
            lineHeight: 1.65,
            color: c.text2,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#121828",
            padding: 16,
            borderRadius: 9,
            border: "1px solid " + c.border,
            maxHeight: 480,
            overflow: "auto",
          }}>
            {reportText}
          </pre>
        </div>

        {/* -- ACTION BAR -- */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button onClick={handleDownload} className="gt-btn gt-btn-primary">
            {t("roi.download")} {"\u2193"}
          </button>
          <button
            onClick={() => { if (navigator.clipboard) { navigator.clipboard.writeText(reportText); } }}
            className="gt-btn gt-btn-ghost">
            {t("roi.copy")}
          </button>
        </div>

        {/* -- FORMAT NOTE -- */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 9, color: c.text3, lineHeight: 1.5 }}>
            {t("roi.format")}
          </p>
        </div>

        {/* -- TRUST FOOTER -- */}
        <div className="gt-card" style={{ marginTop: 18, padding: "11px 14px", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {[
            { icon: "\u{1F6E1}", title: t("trustfooter.soc2") },
            { icon: "\u{1F510}", title: t("trustfooter.zk") },
            { icon: "\u{1F1FA}\u{1F1F8}", title: t("trustfooter.us") },
            { icon: "\u23F1", title: t("trustfooter.purge") },
          ].map((b) => (
            <div key={b.title} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: c.text2 }}>
              <span style={{ fontSize: 13 }}>{b.icon}</span>
              <span style={{ fontWeight: 600 }}>{b.title}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
