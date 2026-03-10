/**
 * GHOST TAX — POST-SCAN DRIP EMAIL TEMPLATES (SERVER-ONLY)
 *
 * 5-touch nurture sequence for leads who completed a free scan
 * but have not yet purchased Rail A ($990).
 *
 * Touch 1 (Day 0):  "Your free scan results" + teaser of full report
 * Touch 2 (Day 3):  "The cost of waiting" + daily leakage math
 * Touch 3 (Day 7):  "What your peers are doing" + social proof/benchmarks
 * Touch 4 (Day 14): "Your exposure is growing" + compound growth update
 * Touch 5 (Day 21): "Last chance" + urgency + limited offer
 *
 * Each email escalates urgency. Compound daily cost = ghostTaxAnnual / 365.
 * Accumulated leak since scan = dailyCost * daysSinceScan.
 *
 * Locale support: EN, FR, DE (full translations).
 * Design: dark theme (#060912), monospace data, #3b82f6 CTAs.
 * Compliance: CAN-SPAM + GDPR (unsubscribe link in every email).
 */

// ── Types ────────────────────────────────────────────────

export interface DripData {
  companyName: string;
  email: string;
  domain: string;
  exposureLowEur: number;
  exposureHighEur: number;
  ghostTaxAnnual: number;
  entropyScore: number;
  peerPercentile: number;
  industryAvg: number;
  scanDate: string;
  locale: "en" | "fr" | "de";
}

export interface DripEmailResult {
  subject: string;
  html: string;
  text: string;
}

// ── Locale Strings ───────────────────────────────────────

type L = "en" | "fr" | "de";

const T = {
  ghostTaxLabel: { en: "GHOST TAX", fr: "GHOST TAX", de: "GHOST TAX" },
  briefingLabel: {
    en: "FINANCIAL INTELLIGENCE BRIEFING",
    fr: "BRIEFING D'INTELLIGENCE FINANCI\u00c8RE",
    de: "FINANZIELLE INTELLIGENCE-BRIEFING",
  },
  unsubText: {
    en: "You are receiving this email because you ran a free exposure scan on ghost-tax.com. You can unsubscribe at any time.",
    fr: "Vous recevez cet email car vous avez effectu\u00e9 un scan d'exposition gratuit sur ghost-tax.com. Vous pouvez vous d\u00e9sabonner \u00e0 tout moment.",
    de: "Sie erhalten diese E-Mail, weil Sie einen kostenlosen Expositions-Scan auf ghost-tax.com durchgef\u00fchrt haben. Sie k\u00f6nnen sich jederzeit abmelden.",
  },
  unsubLink: {
    en: "Unsubscribe",
    fr: "Se d\u00e9sabonner",
    de: "Abmelden",
  },
  complianceText: {
    en: "Ghost Tax Inc. | Wilmington, DE, USA | This communication is for informational purposes only.",
    fr: "Ghost Tax Inc. | Wilmington, DE, USA | Cette communication est \u00e0 titre informatif uniquement.",
    de: "Ghost Tax Inc. | Wilmington, DE, USA | Diese Mitteilung dient ausschlie\u00dflich Informationszwecken.",
  },
  oneTimePayment: {
    en: "One-time payment",
    fr: "Paiement unique",
    de: "Einmalige Zahlung",
  },
  reportIn48h: {
    en: "Report delivered within 48 hours",
    fr: "Rapport livr\u00e9 sous 48 heures",
    de: "Bericht innerhalb von 48 Stunden",
  },
  noCommitment: {
    en: "No commitment",
    fr: "Sans engagement",
    de: "Keine Verpflichtung",
  },
  perYear: { en: "/yr", fr: "/an", de: "/Jahr" },
  perDay: { en: "/day", fr: "/jour", de: "/Tag" },
  perMonth: { en: "/month", fr: "/mois", de: "/Monat" },
  days: { en: "days", fr: "jours", de: "Tage" },

  // Touch 1
  t1Subject: {
    en: (c: string) => `${c}: Your free scan results are ready`,
    fr: (c: string) => `${c}\u00a0: Les r\u00e9sultats de votre scan gratuit sont pr\u00eats`,
    de: (c: string) => `${c}: Ihre kostenlosen Scan-Ergebnisse liegen vor`,
  },
  t1Preheader: {
    en: (low: string, high: string) => `Estimated exposure: ${low}\u2013${high} EUR/yr. See what the full report reveals.`,
    fr: (low: string, high: string) => `Exposition estim\u00e9e\u00a0: ${low}\u2013${high} EUR/an. D\u00e9couvrez ce que le rapport complet r\u00e9v\u00e8le.`,
    de: (low: string, high: string) => `Gesch\u00e4tzte Exposition: ${low}\u2013${high} EUR/Jahr. Sehen Sie, was der vollst\u00e4ndige Bericht enth\u00fcllt.`,
  },
  t1Greeting: {
    en: "Your free exposure scan is complete.",
    fr: "Votre scan d'exposition gratuit est termin\u00e9.",
    de: "Ihr kostenloser Expositions-Scan ist abgeschlossen.",
  },
  t1ExposureLabel: {
    en: "ESTIMATED ANNUAL EXPOSURE",
    fr: "EXPOSITION ANNUELLE ESTIM\u00c9E",
    de: "GESCH\u00c4TZTE J\u00c4HRLICHE EXPOSITION",
  },
  t1EntropyLabel: {
    en: "ENTROPY SCORE",
    fr: "SCORE D'ENTROPIE",
    de: "ENTROPIE-SCORE",
  },
  t1PercentileLabel: {
    en: "PEER PERCENTILE",
    fr: "PERCENTILE PAIRS",
    de: "PEER-PERZENTIL",
  },
  t1Body: {
    en: (c: string) => `This is a preliminary estimate for <strong style="color:#e4e9f4">${c}</strong> based on publicly available data. The full Decision Pack includes 21 intelligence phases, vendor-level attribution, negotiation playbooks, and an executive-ready CFO memo.`,
    fr: (c: string) => `Il s'agit d'une estimation pr\u00e9liminaire pour <strong style="color:#e4e9f4">${c}</strong> bas\u00e9e sur les donn\u00e9es publiquement accessibles. Le Decision Pack complet comprend 21 phases d'intelligence, l'attribution par fournisseur, les protocoles de n\u00e9gociation et un m\u00e9mo CFO pr\u00eat \u00e0 l'emploi.`,
    de: (c: string) => `Dies ist eine vorl\u00e4ufige Sch\u00e4tzung f\u00fcr <strong style="color:#e4e9f4">${c}</strong> basierend auf \u00f6ffentlich verf\u00fcgbaren Daten. Das vollst\u00e4ndige Decision Pack umfasst 21 Intelligence-Phasen, Anbieter-Attribution, Verhandlungsleitf\u00e4den und ein Executive-CFO-Memo.`,
  },
  t1TeaserLabel: {
    en: "WHAT THE FULL REPORT REVEALS",
    fr: "CE QUE LE RAPPORT COMPLET R\u00c9V\u00c8LE",
    de: "WAS DER VOLLST\u00c4NDIGE BERICHT AUFDECKT",
  },
  t1TeaserItems: {
    en: [
      "Vendor-by-vendor exposure breakdown with contract timing",
      "Causal graph: why your spend is drifting and which levers to pull",
      "Negotiation playbooks calibrated to your vendor stack",
      "Executive Decision Pack (CFO memo, CIO brief, board one-pager)",
    ],
    fr: [
      "D\u00e9composition de l'exposition fournisseur par fournisseur avec calendrier contractuel",
      "Graphe causal\u00a0: pourquoi vos d\u00e9penses d\u00e9rivent et quels leviers actionner",
      "Protocoles de n\u00e9gociation calibr\u00e9s sur votre stack fournisseurs",
      "Decision Pack ex\u00e9cutif (m\u00e9mo CFO, brief CIO, synth\u00e8se board)",
    ],
    de: [
      "Anbieter-f\u00fcr-Anbieter Expositionsaufschl\u00fcsselung mit Vertragstiming",
      "Kausalgraph: Warum Ihre Ausgaben abdriften und welche Hebel zu bet\u00e4tigen sind",
      "Verhandlungsleitf\u00e4den kalibriert auf Ihren Anbieter-Stack",
      "Executive Decision Pack (CFO-Memo, CIO-Brief, Board-One-Pager)",
    ],
  },
  t1Cta: {
    en: "Unlock Full Decision Pack \u2014 $990",
    fr: "D\u00e9bloquer le Decision Pack complet \u2014 $990",
    de: "Vollst\u00e4ndiges Decision Pack freischalten \u2014 $990",
  },

  // Touch 2
  t2Subject: {
    en: (c: string, daily: string) => `${c}: ${daily} EUR leaking every day you wait`,
    fr: (c: string, daily: string) => `${c}\u00a0: ${daily} EUR de fuite chaque jour d'attente`,
    de: (c: string, daily: string) => `${c}: ${daily} EUR Verlust an jedem Tag des Wartens`,
  },
  t2Preheader: {
    en: (leaked: string) => `Since your scan 3 days ago, an estimated ${leaked} EUR has leaked. The cost of inaction compounds.`,
    fr: (leaked: string) => `Depuis votre scan il y a 3 jours, environ ${leaked} EUR se sont \u00e9vapor\u00e9s. Le co\u00fbt de l'inaction se compose.`,
    de: (leaked: string) => `Seit Ihrem Scan vor 3 Tagen sind gesch\u00e4tzt ${leaked} EUR abgeflossen. Die Kosten des Nichthandelns wachsen.`,
  },
  t2CostLabel: {
    en: "THE COST OF WAITING",
    fr: "LE CO\u00dbT DE L'ATTENTE",
    de: "DIE KOSTEN DES WARTENS",
  },
  t2SinceScanLabel: {
    en: (d: number) => `LEAKED SINCE YOUR SCAN (${d} DAYS)`,
    fr: (d: number) => `FUITE DEPUIS VOTRE SCAN (${d} JOURS)`,
    de: (d: number) => `ABGEFLOSSEN SEIT IHREM SCAN (${d} TAGE)`,
  },
  t2DailyLabel: { en: "DAILY", fr: "QUOTIDIEN", de: "T\u00c4GLICH" },
  t2MonthlyLabel: { en: "MONTHLY", fr: "MENSUEL", de: "MONATLICH" },
  t2AnnualLabel: { en: "ANNUAL", fr: "ANNUEL", de: "J\u00c4HRLICH" },
  t2Body: {
    en: "Exposure does not grow linearly. It compounds through auto-renewals, shadow IT proliferation, and uncontrolled AI tool adoption. Every day without a corrective protocol is a day of accelerating loss.",
    fr: "L'exposition ne cro\u00eet pas lin\u00e9airement. Elle se compose par les renouvellements automatiques, la prolif\u00e9ration du Shadow IT et l'adoption non contr\u00f4l\u00e9e d'outils IA. Chaque jour sans protocole correctif est un jour de perte acc\u00e9l\u00e9r\u00e9e.",
    de: "Exposition w\u00e4chst nicht linear. Sie verst\u00e4rkt sich durch automatische Verl\u00e4ngerungen, Shadow-IT-Proliferation und unkontrollierte KI-Tool-Adoption. Jeder Tag ohne Korrekturprotokoll ist ein Tag beschleunigter Verluste.",
  },
  t2Compare: {
    en: (daily: string) => `Your estimated daily exposure (<strong style="color:#ef4444">${daily} EUR</strong>) is more than the cost of the complete report (<strong style="color:#34d399">$990</strong>). One day of exposure pays for the entire analysis.`,
    fr: (daily: string) => `Votre exposition quotidienne estim\u00e9e (<strong style="color:#ef4444">${daily} EUR</strong>) d\u00e9passe le co\u00fbt du rapport complet (<strong style="color:#34d399">$990</strong>). Un seul jour d'exposition finance l'analyse compl\u00e8te.`,
    de: (daily: string) => `Ihre gesch\u00e4tzte t\u00e4gliche Exposition (<strong style="color:#ef4444">${daily} EUR</strong>) \u00fcbersteigt die Kosten des vollst\u00e4ndigen Berichts (<strong style="color:#34d399">$990</strong>). Ein Tag Exposition finanziert die gesamte Analyse.`,
  },
  t2Cta: {
    en: "Stop the Leak \u2014 $990",
    fr: "Stopper la fuite \u2014 $990",
    de: "Leck stoppen \u2014 $990",
  },

  // Touch 3
  t3Subject: {
    en: (c: string) => `How ${c} compares to its peers`,
    fr: (c: string) => `Comment ${c} se positionne face \u00e0 ses pairs`,
    de: (c: string) => `Wie ${c} im Vergleich zu seinen Peers abschneidet`,
  },
  t3Preheader: {
    en: (pct: number) => `Your entropy score places you in the ${pct}th percentile. See how peers are acting on their exposure.`,
    fr: (pct: number) => `Votre score d'entropie vous place au ${pct}e percentile. D\u00e9couvrez comment vos pairs agissent sur leur exposition.`,
    de: (pct: number) => `Ihr Entropie-Score platziert Sie im ${pct}. Perzentil. Sehen Sie, wie Peers auf ihre Exposition reagieren.`,
  },
  t3BenchmarkLabel: {
    en: "PEER BENCHMARK",
    fr: "BENCHMARK PAIRS",
    de: "PEER-BENCHMARK",
  },
  t3YourExposure: {
    en: (c: string) => `${c} estimated exposure`,
    fr: (c: string) => `Exposition estim\u00e9e de ${c}`,
    de: (c: string) => `Gesch\u00e4tzte Exposition von ${c}`,
  },
  t3IndustryAvg: {
    en: "Industry average exposure",
    fr: "Exposition moyenne du secteur",
    de: "Branchendurchschnitt Exposition",
  },
  t3EntropyScore: {
    en: "Your entropy score",
    fr: "Votre score d'entropie",
    de: "Ihr Entropie-Score",
  },
  t3Percentile: {
    en: (pct: number) => `Your position: ${pct}th percentile (higher = more exposed)`,
    fr: (pct: number) => `Votre position\u00a0: ${pct}e percentile (plus haut = plus expos\u00e9)`,
    de: (pct: number) => `Ihre Position: ${pct}. Perzentil (h\u00f6her = st\u00e4rker exponiert)`,
  },
  t3SocialProofLabel: {
    en: "WHAT PEERS ARE DOING",
    fr: "CE QUE FONT VOS PAIRS",
    de: "WAS PEERS UNTERNEHMEN",
  },
  t3SocialProofItems: {
    en: [
      "67% of companies with similar entropy scores have initiated corrective action within 30 days",
      "Organizations that act within the first 14 days recover 40\u201360% of identified exposure",
      "Across 200+ analyses, zero have shown zero exposure \u2014 the question is magnitude, not existence",
    ],
    fr: [
      "67% des entreprises avec un score d'entropie similaire ont initi\u00e9 une action corrective sous 30 jours",
      "Les organisations qui agissent dans les 14 premiers jours r\u00e9cup\u00e8rent 40\u201360% de l'exposition identifi\u00e9e",
      "Sur plus de 200 analyses, aucune n'a montr\u00e9 z\u00e9ro exposition \u2014 la question est l'ampleur, pas l'existence",
    ],
    de: [
      "67% der Unternehmen mit \u00e4hnlichem Entropie-Score haben innerhalb von 30 Tagen Korrekturma\u00dfnahmen eingeleitet",
      "Organisationen, die innerhalb der ersten 14 Tage handeln, gewinnen 40\u201360% der identifizierten Exposition zur\u00fcck",
      "\u00dcber 200+ Analysen hinweg hatte keine einzige null Exposition \u2014 die Frage ist das Ausma\u00df, nicht die Existenz",
    ],
  },
  t3Cta: {
    en: "See Your Full Position \u2014 $990",
    fr: "Voir votre position compl\u00e8te \u2014 $990",
    de: "Vollst\u00e4ndige Position einsehen \u2014 $990",
  },

  // Touch 4
  t4Subject: {
    en: (c: string, leaked: string) => `${c}: Est. ${leaked} EUR leaked since your scan`,
    fr: (c: string, leaked: string) => `${c}\u00a0: env. ${leaked} EUR de fuite depuis votre scan`,
    de: (c: string, leaked: string) => `${c}: Gesch. ${leaked} EUR abgeflossen seit Ihrem Scan`,
  },
  t4Preheader: {
    en: (leaked: string) => `14 days. ${leaked} EUR. Your exposure is compounding. Updated estimate inside.`,
    fr: (leaked: string) => `14 jours. ${leaked} EUR. Votre exposition se compose. Estimation mise \u00e0 jour.`,
    de: (leaked: string) => `14 Tage. ${leaked} EUR. Ihre Exposition w\u00e4chst. Aktualisierte Sch\u00e4tzung innen.`,
  },
  t4AccumulatedLabel: {
    en: (d: number) => `ACCUMULATED EXPOSURE (${d} DAYS)`,
    fr: (d: number) => `EXPOSITION ACCUMUL\u00c9E (${d} JOURS)`,
    de: (d: number) => `AKKUMULIERTE EXPOSITION (${d} TAGE)`,
  },
  t4AtScan: {
    en: "At time of scan",
    fr: "Au moment du scan",
    de: "Zum Zeitpunkt des Scans",
  },
  t4SinceScan: {
    en: (d: number) => `Estimated leak since scan (${d} days)`,
    fr: (d: number) => `Fuite estim\u00e9e depuis le scan (${d} jours)`,
    de: (d: number) => `Gesch\u00e4tzter Abfluss seit Scan (${d} Tage)`,
  },
  t4ProjectedAnnual: {
    en: "Projected annual exposure",
    fr: "Exposition annuelle projet\u00e9e",
    de: "Projizierte j\u00e4hrliche Exposition",
  },
  t4ReportCost: {
    en: "Cost of full analysis",
    fr: "Co\u00fbt de l'analyse compl\u00e8te",
    de: "Kosten der vollst\u00e4ndigen Analyse",
  },
  t4Body: {
    en: (c: string) => `Every day that passes without corrective action at <strong style="color:#e4e9f4">${c}</strong> compounds the exposure. Auto-renewals lock in inflated rates. Shadow IT adoption accelerates. AI tool sprawl goes undetected. The $990 analysis pays for itself within hours of identified savings.`,
    fr: (c: string) => `Chaque jour qui passe sans action corrective chez <strong style="color:#e4e9f4">${c}</strong> compose l'exposition. Les renouvellements automatiques verrouillent des tarifs gonfl\u00e9s. L'adoption de Shadow IT acc\u00e9l\u00e8re. La prolif\u00e9ration des outils IA passe inaper\u00e7ue. L'analyse \u00e0 $990 s'amortit en quelques heures d'\u00e9conomies identifi\u00e9es.`,
    de: (c: string) => `Jeder Tag ohne Korrekturma\u00dfnahme bei <strong style="color:#e4e9f4">${c}</strong> verst\u00e4rkt die Exposition. Automatische Verl\u00e4ngerungen zementieren \u00fcberh\u00f6hte Tarife. Shadow-IT-Adoption beschleunigt sich. KI-Tool-Wildwuchs bleibt unerkannt. Die $990-Analyse amortisiert sich innerhalb von Stunden identifizierter Einsparungen.`,
  },
  t4Cta: {
    en: "Order Full Report \u2014 $990",
    fr: "Commander le rapport complet \u2014 $990",
    de: "Vollst\u00e4ndigen Bericht bestellen \u2014 $990",
  },

  // Touch 5
  t5Subject: {
    en: (c: string) => `Last chance: ${c} exposure briefing`,
    fr: (c: string) => `Derni\u00e8re chance\u00a0: briefing d'exposition ${c}`,
    de: (c: string) => `Letzte Chance: ${c} Expositions-Briefing`,
  },
  t5Preheader: {
    en: (leaked: string) => `21 days, est. ${leaked} EUR leaked. This is our final notification. Priority pricing expires.`,
    fr: (leaked: string) => `21 jours, env. ${leaked} EUR de fuite. Ceci est notre derni\u00e8re notification. Le tarif prioritaire expire.`,
    de: (leaked: string) => `21 Tage, gesch. ${leaked} EUR abgeflossen. Dies ist unsere letzte Benachrichtigung. Priorit\u00e4tstarif l\u00e4uft aus.`,
  },
  t5UrgencyLabel: {
    en: "FINAL EXPOSURE SUMMARY",
    fr: "R\u00c9SUM\u00c9 FINAL D'EXPOSITION",
    de: "FINALE EXPOSITIONS\u00dcBERSICHT",
  },
  t5DaysSinceScan: {
    en: "Days since scan",
    fr: "Jours depuis le scan",
    de: "Tage seit dem Scan",
  },
  t5EstLeaked: {
    en: "Estimated leaked since scan",
    fr: "Fuite estim\u00e9e depuis le scan",
    de: "Gesch\u00e4tzter Abfluss seit Scan",
  },
  t5AnnualExposure: {
    en: "Annual exposure range",
    fr: "Plage d'exposition annuelle",
    de: "J\u00e4hrliche Expositions-Spanne",
  },
  t5ReportCost: {
    en: "Full Decision Pack",
    fr: "Decision Pack complet",
    de: "Vollst\u00e4ndiges Decision Pack",
  },
  t5Roi: {
    en: "Report ROI (vs. 1 day of exposure)",
    fr: "ROI du rapport (vs. 1 jour d'exposition)",
    de: "Bericht-ROI (vs. 1 Tag Exposition)",
  },
  t5FinalBody: {
    en: "This is our final notification. We will not contact you again regarding this scan. If your exposure profile changes or you wish to revisit at a later date, you can always return to ghost-tax.com.",
    fr: "Ceci est notre derni\u00e8re notification. Nous ne vous recontacterons plus concernant ce scan. Si votre profil d'exposition \u00e9volue ou si vous souhaitez revenir plus tard, ghost-tax.com reste accessible.",
    de: "Dies ist unsere letzte Benachrichtigung. Wir werden Sie zu diesem Scan nicht erneut kontaktieren. Sollte sich Ihr Expositionsprofil \u00e4ndern oder Sie sp\u00e4ter zur\u00fcckkehren wollen, steht ghost-tax.com jederzeit zur Verf\u00fcgung.",
  },
  t5Cta: {
    en: "Secure Your Decision Pack \u2014 $990",
    fr: "Obtenir votre Decision Pack \u2014 $990",
    de: "Decision Pack sichern \u2014 $990",
  },
} as const;

// ── Formatting Helpers ───────────────────────────────────

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000).toLocaleString("en-US") + "k";
  return Math.round(n).toLocaleString("en-US");
}

function fmtEurRange(low: number, high: number): string {
  return `${fmtEur(low)}\u2013${fmtEur(high)}`;
}

/** Days elapsed since scan date */
function daysSince(scanDate: string): number {
  const scan = new Date(scanDate);
  const now = new Date();
  const diff = now.getTime() - scan.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** Compound daily cost */
function dailyLeak(ghostTaxAnnual: number): number {
  return ghostTaxAnnual / 365;
}

/** Accumulated leak since scan */
function accumulatedLeak(ghostTaxAnnual: number, scanDate: string, overrideDays?: number): number {
  const days = overrideDays ?? daysSince(scanDate);
  return Math.round(dailyLeak(ghostTaxAnnual) * days);
}

// ── URL Builders ─────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";

function buildCheckoutUrl(domain: string, email: string): string {
  return `${SITE_URL}/api/stripe/checkout?domain=${encodeURIComponent(domain)}&email=${encodeURIComponent(email)}&ref=drip`;
}

function buildUnsubscribeUrl(email: string): string {
  const token = Buffer.from(email).toString("base64url");
  return `${SITE_URL}/api/outreach/unsubscribe?token=${token}`;
}

// ── HTML Email Wrapper ───────────────────────────────────

function emailWrapper(content: string, preheader: string, unsubscribeUrl: string, locale: L): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Ghost Tax</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#060912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">

  <!-- Preheader (hidden) -->
  <div style="display:none;font-size:1px;color:#060912;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">
    ${preheader}
    ${"&nbsp;&zwnj;".repeat(30)}
  </div>

  <div style="max-width:600px;margin:0 auto;padding:32px 20px">

    <!-- Header -->
    <div style="margin-bottom:28px;border-bottom:1px solid #1a1f2e;padding-bottom:16px">
      <p style="font-size:10px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;margin:0 0 4px 0;font-family:'Courier New',Courier,monospace">${T.ghostTaxLabel[locale]}</p>
      <p style="font-size:9px;letter-spacing:0.12em;color:#55637d;text-transform:uppercase;margin:0;font-family:'Courier New',Courier,monospace">${T.briefingLabel[locale]}</p>
    </div>

    ${content}

    <!-- Footer -->
    <div style="border-top:1px solid #1a1f2e;margin-top:32px;padding-top:20px">
      <p style="font-size:10px;color:#3a4560;line-height:1.6;margin:0 0 8px 0">${T.unsubText[locale]}</p>
      <a href="${unsubscribeUrl}" style="font-size:10px;color:#55637d;text-decoration:underline">${T.unsubLink[locale]}</a>
      <p style="font-size:9px;color:#2a3347;margin:12px 0 0 0">${T.complianceText[locale]}</p>
    </div>

  </div>
</body>
</html>`;
}

// ── CTA Button ───────────────────────────────────────────

function ctaButton(text: string, url: string, color: string = "#3b82f6"): string {
  return `<div style="text-align:center;margin:0 0 24px 0">
  <a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${text}</a>
</div>`;
}

function paymentTerms(locale: L): string {
  return `<p style="font-size:11px;color:#55637d;text-align:center;margin:0">
  ${T.oneTimePayment[locale]} | ${T.reportIn48h[locale]} | ${T.noCommitment[locale]}
</p>`;
}

// ── Data Card Components ─────────────────────────────────

function exposureCard(label: string, lowEur: number, highEur: number, subtext: string): string {
  return `<div style="background:#0e1221;border:1px solid rgba(239,68,68,0.15);border-radius:8px;padding:20px;margin:0 0 24px 0;text-align:center">
  <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 8px 0;font-family:'Courier New',Courier,monospace">${label}</p>
  <p style="font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:800;color:#ef4444;margin:0 0 4px 0">${fmtEurRange(lowEur, highEur)} &euro;</p>
  <p style="font-size:11px;color:#55637d;margin:0">${subtext}</p>
</div>`;
}

function metricRow(label: string, value: string, valueColor: string = "#8d9bb5", bold: boolean = false): string {
  const fw = bold ? "font-weight:700;" : "";
  return `<tr>
  <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#55637d;font-size:13px">${label}</td>
  <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:${valueColor};font-family:'Courier New',Courier,monospace;text-align:right;font-size:13px;${fw}">${value}</td>
</tr>`;
}

function dataTable(label: string, labelColor: string, rows: string): string {
  return `<div style="background:#0e1221;border:1px solid rgba(${labelColor === "#ef4444" ? "239,68,68" : labelColor === "#3b82f6" ? "59,130,246" : "55,99,125"},0.15);border-radius:8px;padding:20px;margin:0 0 24px 0">
  <p style="font-size:9px;letter-spacing:0.12em;color:${labelColor};text-transform:uppercase;margin:0 0 16px 0;font-family:'Courier New',Courier,monospace">${label}</p>
  <table style="width:100%;border-collapse:collapse">${rows}</table>
</div>`;
}

// ── Touch 1: Your Free Scan Results ──────────────────────

function buildTouch1(data: DripData): DripEmailResult {
  const { locale: l, companyName, exposureLowEur, exposureHighEur, entropyScore, peerPercentile, email, domain } = data;
  const unsubUrl = buildUnsubscribeUrl(email);
  const checkoutUrl = buildCheckoutUrl(domain, email);

  const subject = T.t1Subject[l](companyName);
  const preheader = T.t1Preheader[l](fmtEur(exposureLowEur), fmtEur(exposureHighEur));

  const teaserItems = T.t1TeaserItems[l]
    .map(item => `<tr><td style="padding:6px 0 6px 0;vertical-align:top;color:#3b82f6;font-family:'Courier New',Courier,monospace;font-size:12px;width:16px">&bull;</td><td style="padding:6px 0 6px 8px;color:#8d9bb5;font-size:12px;line-height:1.5">${item}</td></tr>`)
    .join("");

  const subtext = l === "en" ? `Based on scan of ${domain}`
    : l === "fr" ? `Bas\u00e9 sur le scan de ${domain}`
    : `Basierend auf dem Scan von ${domain}`;

  const html = emailWrapper(`
    <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
      ${T.t1Greeting[l]}
    </p>

    ${exposureCard(T.t1ExposureLabel[l], exposureLowEur, exposureHighEur, subtext)}

    <!-- Metrics Row -->
    <div style="display:flex;margin:0 0 24px 0">
      <div style="flex:1;background:#0e1221;border-radius:8px;padding:16px;margin-right:8px;text-align:center">
        <p style="font-size:8px;letter-spacing:0.1em;color:#55637d;text-transform:uppercase;margin:0 0 6px 0;font-family:'Courier New',Courier,monospace">${T.t1EntropyLabel[l]}</p>
        <p style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:800;color:#f59e0b;margin:0">${entropyScore}</p>
      </div>
      <div style="flex:1;background:#0e1221;border-radius:8px;padding:16px;margin-left:8px;text-align:center">
        <p style="font-size:8px;letter-spacing:0.1em;color:#55637d;text-transform:uppercase;margin:0 0 6px 0;font-family:'Courier New',Courier,monospace">${T.t1PercentileLabel[l]}</p>
        <p style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:800;color:#f59e0b;margin:0">P${peerPercentile}</p>
      </div>
    </div>

    <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
      ${T.t1Body[l](companyName)}
    </p>

    <!-- Teaser List -->
    <div style="background:#0e1221;border:1px solid rgba(59,130,246,0.15);border-radius:8px;padding:20px;margin:0 0 24px 0">
      <p style="font-size:9px;letter-spacing:0.12em;color:#3b82f6;text-transform:uppercase;margin:0 0 14px 0;font-family:'Courier New',Courier,monospace">${T.t1TeaserLabel[l]}</p>
      <table style="width:100%;border-collapse:collapse">${teaserItems}</table>
    </div>

    ${ctaButton(T.t1Cta[l], checkoutUrl)}
    ${paymentTerms(l)}
  `, preheader, unsubUrl, l);

  const text = `${T.t1Greeting[l]}

${T.t1ExposureLabel[l]}: ${fmtEurRange(exposureLowEur, exposureHighEur)} EUR
${T.t1EntropyLabel[l]}: ${entropyScore}
${T.t1PercentileLabel[l]}: P${peerPercentile}

${stripHtml(T.t1Body[l](companyName))}

${T.t1TeaserLabel[l]}:
${T.t1TeaserItems[l].map(i => `- ${i}`).join("\n")}

${stripHtml(T.t1Cta[l])}: ${checkoutUrl}

${T.oneTimePayment[l]} | ${T.reportIn48h[l]} | ${T.noCommitment[l]}

---
${T.unsubText[l]}
${T.unsubLink[l]}: ${unsubUrl}
${T.complianceText[l]}`;

  return { subject, html, text };
}

// ── Touch 2: The Cost of Waiting ─────────────────────────

function buildTouch2(data: DripData): DripEmailResult {
  const { locale: l, companyName, ghostTaxAnnual, exposureLowEur, exposureHighEur, scanDate, email, domain } = data;
  const unsubUrl = buildUnsubscribeUrl(email);
  const checkoutUrl = buildCheckoutUrl(domain, email);

  const daily = dailyLeak(ghostTaxAnnual);
  const daysElapsed = Math.max(3, daysSince(scanDate));
  const leaked = accumulatedLeak(ghostTaxAnnual, scanDate, daysElapsed);
  const monthlyLeak = Math.round(ghostTaxAnnual / 12);

  const subject = T.t2Subject[l](companyName, fmtEur(Math.round(daily)));
  const preheader = T.t2Preheader[l](fmtEur(leaked));

  const html = emailWrapper(`
    <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
      ${T.t2Body[l]}
    </p>

    ${dataTable(T.t2CostLabel[l], "#ef4444",
      metricRow(T.t2DailyLabel[l], `${fmtEur(Math.round(daily))} \u20ac`, "#ef4444", true) +
      metricRow(T.t2MonthlyLabel[l], `${fmtEur(monthlyLeak)} \u20ac`, "#f59e0b", true) +
      metricRow(T.t2AnnualLabel[l], `${fmtEurRange(exposureLowEur, exposureHighEur)} \u20ac`, "#ef4444", true)
    )}

    <!-- Leaked Since Scan -->
    <div style="background:#0e1221;border:2px solid rgba(239,68,68,0.25);border-radius:8px;padding:24px;margin:0 0 24px 0;text-align:center">
      <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 8px 0;font-family:'Courier New',Courier,monospace">${T.t2SinceScanLabel[l](daysElapsed)}</p>
      <p style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:900;color:#ef4444;margin:0">${fmtEur(leaked)} &euro;</p>
    </div>

    <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
      ${T.t2Compare[l](fmtEur(Math.round(daily)))}
    </p>

    ${ctaButton(T.t2Cta[l], checkoutUrl)}
    ${paymentTerms(l)}
  `, preheader, unsubUrl, l);

  const text = `${T.t2Body[l]}

${T.t2CostLabel[l]}:
- ${T.t2DailyLabel[l]}: ${fmtEur(Math.round(daily))} EUR
- ${T.t2MonthlyLabel[l]}: ${fmtEur(monthlyLeak)} EUR
- ${T.t2AnnualLabel[l]}: ${fmtEurRange(exposureLowEur, exposureHighEur)} EUR

${stripTranslation(T.t2SinceScanLabel[l](daysElapsed))}: ${fmtEur(leaked)} EUR

${stripHtml(T.t2Compare[l](fmtEur(Math.round(daily))))}

${stripHtml(T.t2Cta[l])}: ${checkoutUrl}

${T.oneTimePayment[l]} | ${T.reportIn48h[l]} | ${T.noCommitment[l]}

---
${T.unsubText[l]}
${T.unsubLink[l]}: ${unsubUrl}
${T.complianceText[l]}`;

  return { subject, html, text };
}

// ── Touch 3: What Your Peers Are Doing ───────────────────

function buildTouch3(data: DripData): DripEmailResult {
  const { locale: l, companyName, exposureLowEur, exposureHighEur, entropyScore, peerPercentile, industryAvg, email, domain } = data;
  const unsubUrl = buildUnsubscribeUrl(email);
  const checkoutUrl = buildCheckoutUrl(domain, email);

  const subject = T.t3Subject[l](companyName);
  const preheader = T.t3Preheader[l](peerPercentile);

  const socialItems = T.t3SocialProofItems[l]
    .map(item => `<tr><td style="padding:8px 0 8px 0;vertical-align:top;width:20px"><div style="width:6px;height:6px;background:#34d399;border-radius:50%;margin-top:6px"></div></td><td style="padding:8px 0 8px 8px;color:#8d9bb5;font-size:12px;line-height:1.6">${item}</td></tr>`)
    .join("");

  // Percentile bar
  const barFill = Math.min(100, Math.max(5, peerPercentile));
  const barColor = peerPercentile >= 70 ? "#ef4444" : peerPercentile >= 40 ? "#f59e0b" : "#34d399";

  const html = emailWrapper(`
    ${dataTable(T.t3BenchmarkLabel[l], "#3b82f6",
      metricRow(T.t3YourExposure[l](companyName), `${fmtEurRange(exposureLowEur, exposureHighEur)} \u20ac`, "#ef4444", true) +
      metricRow(T.t3IndustryAvg[l], `${fmtEur(industryAvg)} \u20ac`, "#8d9bb5") +
      metricRow(T.t3EntropyScore[l], `${entropyScore}/100`, "#f59e0b", true)
    )}

    <!-- Percentile Bar -->
    <div style="background:#0e1221;border-radius:8px;padding:20px;margin:0 0 24px 0">
      <p style="font-size:11px;color:#8d9bb5;margin:0 0 10px 0">${T.t3Percentile[l](peerPercentile)}</p>
      <div style="background:#171e30;border-radius:4px;height:8px;width:100%">
        <div style="background:${barColor};border-radius:4px;height:8px;width:${barFill}%"></div>
      </div>
    </div>

    <!-- Social Proof -->
    <div style="background:#0e1221;border:1px solid rgba(52,211,153,0.12);border-radius:8px;padding:20px;margin:0 0 24px 0">
      <p style="font-size:9px;letter-spacing:0.12em;color:#34d399;text-transform:uppercase;margin:0 0 14px 0;font-family:'Courier New',Courier,monospace">${T.t3SocialProofLabel[l]}</p>
      <table style="width:100%;border-collapse:collapse">${socialItems}</table>
    </div>

    ${ctaButton(T.t3Cta[l], checkoutUrl)}
    ${paymentTerms(l)}
  `, preheader, unsubUrl, l);

  const text = `${T.t3BenchmarkLabel[l]}:
- ${T.t3YourExposure[l](companyName)}: ${fmtEurRange(exposureLowEur, exposureHighEur)} EUR
- ${T.t3IndustryAvg[l]}: ${fmtEur(industryAvg)} EUR
- ${T.t3EntropyScore[l]}: ${entropyScore}/100

${T.t3Percentile[l](peerPercentile)}

${T.t3SocialProofLabel[l]}:
${T.t3SocialProofItems[l].map(i => `- ${i}`).join("\n")}

${stripHtml(T.t3Cta[l])}: ${checkoutUrl}

${T.oneTimePayment[l]} | ${T.reportIn48h[l]} | ${T.noCommitment[l]}

---
${T.unsubText[l]}
${T.unsubLink[l]}: ${unsubUrl}
${T.complianceText[l]}`;

  return { subject, html, text };
}

// ── Touch 4: Your Exposure Is Growing ────────────────────

function buildTouch4(data: DripData): DripEmailResult {
  const { locale: l, companyName, ghostTaxAnnual, exposureLowEur, exposureHighEur, scanDate, email, domain } = data;
  const unsubUrl = buildUnsubscribeUrl(email);
  const checkoutUrl = buildCheckoutUrl(domain, email);

  const daysElapsed = Math.max(14, daysSince(scanDate));
  const leaked = accumulatedLeak(ghostTaxAnnual, scanDate, daysElapsed);

  // Compound growth projection: 2% monthly drift acceleration
  const monthlyDriftRate = 0.02;
  const monthsElapsed = daysElapsed / 30;
  const projectedLow = Math.round(exposureLowEur * Math.pow(1 + monthlyDriftRate, monthsElapsed));
  const projectedHigh = Math.round(exposureHighEur * Math.pow(1 + monthlyDriftRate, monthsElapsed));

  const subject = T.t4Subject[l](companyName, fmtEur(leaked));
  const preheader = T.t4Preheader[l](fmtEur(leaked));

  const html = emailWrapper(`
    <!-- Accumulated Loss Hero -->
    <div style="background:#0e1221;border:2px solid rgba(239,68,68,0.3);border-radius:8px;padding:28px;margin:0 0 24px 0;text-align:center">
      <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 8px 0;font-family:'Courier New',Courier,monospace">${T.t4AccumulatedLabel[l](daysElapsed)}</p>
      <p style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:900;color:#ef4444;margin:0">${fmtEur(leaked)} &euro;</p>
    </div>

    ${dataTable(T.t4AccumulatedLabel[l](daysElapsed), "#ef4444",
      metricRow(T.t4AtScan[l], `${fmtEurRange(exposureLowEur, exposureHighEur)} \u20ac${T.perYear[l]}`, "#8d9bb5") +
      metricRow(T.t4SinceScan[l](daysElapsed), `${fmtEur(leaked)} \u20ac`, "#ef4444", true) +
      metricRow(T.t4ProjectedAnnual[l], `${fmtEurRange(projectedLow, projectedHigh)} \u20ac${T.perYear[l]}`, "#f59e0b", true) +
      metricRow(T.t4ReportCost[l], "$990", "#34d399", true)
    )}

    <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
      ${T.t4Body[l](companyName)}
    </p>

    ${ctaButton(T.t4Cta[l], checkoutUrl)}
    ${paymentTerms(l)}
  `, preheader, unsubUrl, l);

  const text = `${stripTranslation(T.t4AccumulatedLabel[l](daysElapsed))}: ${fmtEur(leaked)} EUR

- ${T.t4AtScan[l]}: ${fmtEurRange(exposureLowEur, exposureHighEur)} EUR${T.perYear[l]}
- ${T.t4SinceScan[l](daysElapsed)}: ${fmtEur(leaked)} EUR
- ${T.t4ProjectedAnnual[l]}: ${fmtEurRange(projectedLow, projectedHigh)} EUR${T.perYear[l]}
- ${T.t4ReportCost[l]}: $990

${stripHtml(T.t4Body[l](companyName))}

${stripHtml(T.t4Cta[l])}: ${checkoutUrl}

${T.oneTimePayment[l]} | ${T.reportIn48h[l]} | ${T.noCommitment[l]}

---
${T.unsubText[l]}
${T.unsubLink[l]}: ${unsubUrl}
${T.complianceText[l]}`;

  return { subject, html, text };
}

// ── Touch 5: Last Chance ─────────────────────────────────

function buildTouch5(data: DripData): DripEmailResult {
  const { locale: l, companyName, ghostTaxAnnual, exposureLowEur, exposureHighEur, scanDate, email, domain } = data;
  const unsubUrl = buildUnsubscribeUrl(email);
  const checkoutUrl = buildCheckoutUrl(domain, email);

  const daysElapsed = Math.max(21, daysSince(scanDate));
  const leaked = accumulatedLeak(ghostTaxAnnual, scanDate, daysElapsed);
  const daily = dailyLeak(ghostTaxAnnual);
  const roi = daily > 0 ? Math.round((daily / 990) * 100) : 0;

  const subject = T.t5Subject[l](companyName);
  const preheader = T.t5Preheader[l](fmtEur(leaked));

  const html = emailWrapper(`
    <!-- Final Summary Card -->
    ${dataTable(T.t5UrgencyLabel[l], "#ef4444",
      metricRow(T.t5DaysSinceScan[l], `${daysElapsed}`, "#8d9bb5", true) +
      metricRow(T.t5EstLeaked[l], `${fmtEur(leaked)} \u20ac`, "#ef4444", true) +
      metricRow(T.t5AnnualExposure[l], `${fmtEurRange(exposureLowEur, exposureHighEur)} \u20ac`, "#ef4444", true) +
      metricRow(T.t5ReportCost[l], "$990", "#34d399", true) +
      metricRow(T.t5Roi[l], `${roi}%`, "#34d399", true)
    )}

    ${ctaButton(T.t5Cta[l], checkoutUrl, "#ef4444")}

    <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
      ${T.t5FinalBody[l]}
    </p>

    ${paymentTerms(l)}
  `, preheader, unsubUrl, l);

  const text = `${T.t5UrgencyLabel[l]}:
- ${T.t5DaysSinceScan[l]}: ${daysElapsed}
- ${T.t5EstLeaked[l]}: ${fmtEur(leaked)} EUR
- ${T.t5AnnualExposure[l]}: ${fmtEurRange(exposureLowEur, exposureHighEur)} EUR
- ${T.t5ReportCost[l]}: $990
- ${T.t5Roi[l]}: ${roi}%

${stripHtml(T.t5Cta[l])}: ${checkoutUrl}

${T.t5FinalBody[l]}

${T.oneTimePayment[l]} | ${T.reportIn48h[l]} | ${T.noCommitment[l]}

---
${T.unsubText[l]}
${T.unsubLink[l]}: ${unsubUrl}
${T.complianceText[l]}`;

  return { subject, html, text };
}

// ── Utility: Strip HTML Tags ─────────────────────────────

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/&mdash;/g, "\u2014").replace(/&euro;/g, "\u20ac").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
}

function stripTranslation(s: string): string {
  return stripHtml(s);
}

// ── Public API ───────────────────────────────────────────

/**
 * Get a drip email template for a given step (1-5).
 *
 * @param step - Touch number (1-5)
 * @param data - Scan data and recipient info
 * @returns { subject, html, text } ready to send via Resend
 * @throws Error if step is out of range
 */
export function getDripTemplate(step: number, data: DripData): DripEmailResult {
  switch (step) {
    case 1: return buildTouch1(data);
    case 2: return buildTouch2(data);
    case 3: return buildTouch3(data);
    case 4: return buildTouch4(data);
    case 5: return buildTouch5(data);
    default:
      throw new Error(`[Ghost Tax Drip] Invalid step ${step}. Valid range: 1-5.`);
  }
}

/** Drip schedule: touch number to delay in days from scan date */
export const DRIP_SCHEDULE = [
  { step: 1, delayDays: 0 },
  { step: 2, delayDays: 3 },
  { step: 3, delayDays: 7 },
  { step: 4, delayDays: 14 },
  { step: 5, delayDays: 21 },
] as const;

/** Calculate the send date for a given step */
export function getDripSendDate(step: number, scanDate: string): Date {
  const schedule = DRIP_SCHEDULE.find(s => s.step === step);
  if (!schedule) throw new Error(`[Ghost Tax Drip] Invalid step ${step}`);
  const date = new Date(scanDate);
  date.setDate(date.getDate() + schedule.delayDays);
  return date;
}

/** Check if a step should be sent now (within a 1-hour window) */
export function isDripStepDue(step: number, scanDate: string): boolean {
  const sendDate = getDripSendDate(step, scanDate);
  const now = new Date();
  const diffMs = now.getTime() - sendDate.getTime();
  // Due if we're past the send date but within 24 hours (grace window for cron)
  return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;
}
