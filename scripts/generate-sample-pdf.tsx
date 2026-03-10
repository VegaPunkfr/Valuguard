/**
 * Script to generate sample Ghost Tax PDF reports in 3 languages.
 * Run: npx tsx scripts/generate-sample-pdf.tsx
 */

import { generatePDFReport, type PDFReportData, type PDFLocale } from "../lib/pdf-report";
import { writeFileSync } from "fs";
import { resolve } from "path";

const baseSample: Omit<PDFReportData, "companyName" | "domain" | "locale" | "executiveSummary"> = {
  generatedAt: "2026-03-10",
  runId: "gt_run_8f3k2m9x",
  exposureLowEur: 127000,
  exposureHighEur: 340000,
  exposureConfidence: 72,
  dailyLeakEur: 639,
  weeklyLeakEur: 4481,
  monthlyLeakEur: 19458,
  observedSignals: 12,
  inferredSignals: 8,
  estimatedSignals: 5,
  topFindings: [
    { label: "Duplicate CRM subscriptions (Salesforce + HubSpot)", severity: "critical", eurImpact: [42000, 68000] },
    { label: "Unused Slack Enterprise licenses (38% idle seats)", severity: "critical", eurImpact: [28000, 45000] },
    { label: "AWS Reserved Instance underutilization", severity: "high", eurImpact: [18000, 32000] },
    { label: "Shadow IT: 14 unsanctioned SaaS tools detected", severity: "high", eurImpact: [15000, 28000] },
    { label: "Zoom Enterprise vs Teams overlap", severity: "medium", eurImpact: [8000, 14000] },
    { label: "Datadog monitoring tier overprovision", severity: "medium", eurImpact: [6000, 12000] },
    { label: "Jira + Asana project management redundancy", severity: "medium", eurImpact: [5000, 9000] },
    { label: "GitHub Enterprise seats for inactive developers", severity: "low", eurImpact: [3000, 6000] },
  ],
  peerPercentile: 73,
  industryMedianEur: 89000,
  overallConfidence: 72,
  confidenceGrade: "strong",
  scenarios: [
    { name: "Quick Wins (license cleanup + dedup)", savingsEur: [45000, 78000], effort: "low", timeline: "30 days" },
    { name: "Vendor Consolidation (CRM + PM tools)", savingsEur: [68000, 120000], effort: "medium", timeline: "60-90 days" },
    { name: "Cloud FinOps (RI optimization)", savingsEur: [18000, 42000], effort: "medium", timeline: "45-60 days" },
    { name: "Full Stabilization Protocol", savingsEur: [95000, 210000], effort: "high", timeline: "90-120 days" },
  ],
};

const samples: Array<{ locale: PDFLocale; company: string; domain: string; summary: string }> = [
  {
    locale: "en",
    company: "TechFlow Inc.",
    domain: "techflow.com",
    summary: "Ghost Tax analysis of TechFlow Inc. identified an estimated annual financial exposure of $127k-$340k across 47 detected SaaS, Cloud, and AI vendors. 12 observed signals confirm duplicate subscriptions, 38% idle Slack Enterprise seats, and 14 unsanctioned shadow IT tools. The organization spends more than 73% of comparable mid-market technology companies. A full stabilization protocol projects $95k-$210k in annual savings over 90-120 days.",
  },
  {
    locale: "fr",
    company: "DataVision SAS",
    domain: "datavision.fr",
    summary: "L'analyse Ghost Tax de DataVision SAS a identifie une exposition financiere annuelle estimee de 127k-340k EUR sur 47 fournisseurs SaaS, Cloud et IA detectes. 12 signaux observes confirment des abonnements en double (CRM, videoconference), 38% de licences Slack Enterprise inutilisees et 14 outils Shadow IT non autorises. L'organisation depense plus que 73% des entreprises comparables. Un protocole de stabilisation complet projette 95k-210k EUR d'economies annuelles sur 90-120 jours.",
  },
  {
    locale: "de",
    company: "Acme Technologies GmbH",
    domain: "acme-tech.de",
    summary: "Die Ghost Tax Analyse der Acme Technologies GmbH hat eine geschaetzte jaehrliche Finanzexposition von 127k-340k EUR ueber 47 erkannte SaaS-, Cloud- und KI-Anbieter identifiziert. 12 beobachtete Signale bestaetigen doppelte Abonnements (CRM, Videokonferenz), 38% ungenutzte Slack Enterprise Lizenzen und 14 nicht genehmigte Shadow-IT-Tools. Die Organisation gibt mehr aus als 73% vergleichbarer mittelstaendischer Technologieunternehmen. Ein vollstaendiges Stabilisierungsprotokoll projiziert 95k-210k EUR jaehrliche Einsparungen ueber 90-120 Tage.",
  },
];

async function main() {
  const outputDir = resolve(__dirname, "..");

  for (const s of samples) {
    const data: PDFReportData = {
      ...baseSample,
      companyName: s.company,
      domain: s.domain,
      locale: s.locale,
      executiveSummary: s.summary,
    };

    console.log(`Generating ${s.locale.toUpperCase()} PDF for ${s.company}...`);
    const buffer = await generatePDFReport(data);
    const filename = `sample-report-${s.locale}.pdf`;
    writeFileSync(resolve(outputDir, filename), buffer);
    console.log(`  -> ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  console.log("\nDone! Check project root for sample-report-en.pdf, sample-report-fr.pdf, sample-report-de.pdf");
}

main().catch(console.error);
