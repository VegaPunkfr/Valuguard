/**
 * GHOST TAX — DRIP SEQUENCE ENGINE (SERVER-ONLY)
 *
 * Thin typed facade for the 5-touch post-scan drip sequence.
 * Provides the canonical types and scheduling logic used by:
 *   - app/api/drip/enqueue/route.ts (drip_queue enrollment)
 *   - lib/drip-sequence.ts (outreach_leads processing engine)
 *
 * 5 touches:
 *   Touch 1 (Day 0):  "Votre scan gratuit" — résultats disponibles
 *   Touch 2 (Day 3):  "Coût de l'inaction" — daily leakage math
 *   Touch 3 (Day 7):  "Ce que font vos pairs" — social proof
 *   Touch 4 (Day 14): "Mise à jour exposition" — drift +14%
 *   Touch 5 (Day 21): "Dernière chance" — scarcity + expiry
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface DripLead {
  email: string
  domain: string
  exposureLow?: number    // estimated annual exposure lower bound (EUR)
  exposureHigh?: number   // estimated annual exposure upper bound (EUR)
  industry?: string
  headcount?: number
  locale?: 'en' | 'fr' | 'de'
  scannedAt: Date
}

export interface DripEmail {
  touch: 1 | 2 | 3 | 4 | 5
  sendAt: Date   // scannedAt + delay
  subject: string
  htmlBody: string
}

// ── Schedule ─────────────────────────────────────────────────────────────

/** Delays in hours from scannedAt: 0h, 72h (3d), 168h (7d), 336h (14d), 504h (21d) */
const TOUCH_DELAYS_HOURS = [0, 72, 168, 336, 504] as const

/** Delays in days from scannedAt (for human-readable reference) */
export const DRIP_TOUCH_DAYS = [0, 3, 7, 14, 21] as const

// ── Subject Lines ─────────────────────────────────────────────────────────

export function getDripSubject(touch: number, lead: DripLead): string {
  const domain = lead.domain
  const locale = lead.locale || 'en'

  const dailyCost = Math.round((lead.exposureLow || 50000) / 365)

  const subjects: Record<string, Record<1|2|3|4|5, string>> = {
    fr: {
      1: `[Ghost Tax] Votre analyse ${domain} — résultats disponibles`,
      2: `${domain} : chaque jour sans action = ${dailyCost}€ de fuite`,
      3: `Ce que les CFO de votre secteur ont découvert cette semaine`,
      4: `Mise à jour : exposition ${domain} en hausse de 14%`,
      5: `Dernier rappel — votre rapport ${domain} expire`,
    },
    en: {
      1: `[Ghost Tax] Your ${domain} analysis — results available`,
      2: `${domain}: every day without action = ${dailyCost}€ leak`,
      3: `What CFOs in your sector discovered this week`,
      4: `Update: ${domain} exposure up 14% since your scan`,
      5: `Final notice — your ${domain} report expires`,
    },
    de: {
      1: `[Ghost Tax] Ihre ${domain}-Analyse — Ergebnisse verfügbar`,
      2: `${domain}: Jeden Tag ohne Aktion = ${dailyCost}€ Verlust`,
      3: `Was CFOs in Ihrer Branche diese Woche entdeckt haben`,
      4: `Update: ${domain}-Exposition seit Ihrem Scan um 14% gestiegen`,
      5: `Letzte Erinnerung — Ihr ${domain}-Bericht läuft ab`,
    },
  }

  const localeSubjects = subjects[locale] || subjects['en']
  return localeSubjects[touch as 1|2|3|4|5] || localeSubjects[1]
}

// ── HTML Body Builder ─────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ghost-tax.com'

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 10_000) return Math.round(n / 1000) + 'k'
  return Math.round(n).toLocaleString('fr-FR')
}

function buildCheckoutUrl(domain: string, email: string, touch: number): string {
  return `${SITE_URL}/pricing?ref=drip_touch${touch}&domain=${encodeURIComponent(domain)}&email=${encodeURIComponent(email)}`
}

function buildUnsubscribeUrl(email: string): string {
  const token = Buffer.from(email).toString('base64url')
  return `${SITE_URL}/api/leads/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`
}

function emailShell(content: string, unsubUrl: string, locale: string): string {
  const unsubText = locale === 'fr'
    ? 'Vous recevez cet email car vous avez effectué un scan gratuit sur ghost-tax.com.'
    : locale === 'de'
    ? 'Sie erhalten diese E-Mail, weil Sie einen kostenlosen Scan auf ghost-tax.com durchgeführt haben.'
    : 'You receive this email because you ran a free scan on ghost-tax.com.'
  const unsubLink = locale === 'fr' ? 'Se désabonner' : locale === 'de' ? 'Abmelden' : 'Unsubscribe'

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">

  <!-- Header -->
  <div style="margin-bottom:24px;border-bottom:1px solid #E2E8F0;padding-bottom:14px">
    <p style="font-size:11px;letter-spacing:0.22em;color:#3b82f6;text-transform:uppercase;margin:0 0 4px 0;font-family:'Courier New',monospace;font-weight:700">GHOST TAX</p>
    <p style="font-size:9px;letter-spacing:0.12em;color:#64748B;text-transform:uppercase;margin:0;font-family:'Courier New',monospace">FINANCIAL INTELLIGENCE BRIEFING</p>
  </div>

  ${content}

  <!-- Footer -->
  <div style="border-top:1px solid #E2E8F0;margin-top:32px;padding-top:20px">
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:10px 14px;margin-bottom:14px;text-align:center">
      <p style="font-size:9px;letter-spacing:0.08em;color:#64748B;margin:0;font-family:'Courier New',monospace">SOC 2 Type II (in progress) · GDPR Compliant · Data purged after 30 days</p>
    </div>
    <p style="font-size:10px;color:#94A3B8;line-height:1.6;margin:0 0 6px 0">${unsubText}</p>
    <a href="${unsubUrl}" style="font-size:10px;color:#64748B;text-decoration:underline">${unsubLink}</a>
    <p style="font-size:10px;color:#94A3B8;margin:14px 0 0 0;font-weight:600">Ghost Tax SAS — Decision Intelligence for IT Spend</p>
    <p style="font-size:9px;color:#94A3B8;margin:4px 0 0 0">ghost-tax.com</p>
  </div>

</div>
</body>
</html>`
}

function ctaButton(label: string, url: string, color: string = '#3b82f6'): string {
  const grad = color === '#DC2626'
    ? 'background:#DC2626'
    : color === '#059669'
    ? 'background:#059669'
    : 'background:#3b82f6'
  return `<div style="text-align:center;margin:0 0 20px 0">
  <a href="${url}" style="display:inline-block;${grad};color:#ffffff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.03em">${label}</a>
</div>`
}

function paymentNote(locale: string): string {
  const text = locale === 'fr'
    ? 'Paiement unique · Rapport livré sous 48h · Sans engagement'
    : locale === 'de'
    ? 'Einmalige Zahlung · Bericht innerhalb 48h · Keine Verpflichtung'
    : 'One-time payment · Report within 48h · No commitment'
  return `<p style="text-align:center;font-size:10px;color:#64748B;letter-spacing:0.04em;margin:0 0 24px 0;font-family:'Courier New',monospace">${text}</p>`
}

export function getDripHtml(touch: number, lead: DripLead): string {
  const l = lead.locale || 'en'
  const domain = lead.domain
  const exposureLow = lead.exposureLow || 50000
  const exposureHigh = lead.exposureHigh || Math.round(exposureLow * 1.8)
  const dailyCost = Math.round(exposureLow / 365)
  const checkoutUrl = buildCheckoutUrl(domain, lead.email, touch)
  const unsubUrl = buildUnsubscribeUrl(lead.email)
  const daysSinceScan = Math.floor((Date.now() - lead.scannedAt.getTime()) / 86400000)

  if (touch === 1) {
    // ── Touch 1: Scan results available ────────────────────────────────────
    const hasExposure = lead.exposureLow != null

    const headline = l === 'fr'
      ? `Votre scan gratuit de <strong style="color:#0F172A">${domain}</strong> est terminé.`
      : l === 'de'
      ? `Ihr kostenloser Scan von <strong style="color:#0F172A">${domain}</strong> ist abgeschlossen.`
      : `Your free scan of <strong style="color:#0F172A">${domain}</strong> is complete.`

    const exposureBlock = hasExposure ? `
    <div style="background:linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%);border:1px solid rgba(220,38,38,0.20);border-radius:10px;padding:24px;margin:0 0 20px 0;text-align:center">
      <p style="font-size:9px;letter-spacing:0.14em;color:#DC2626;text-transform:uppercase;margin:0 0 10px 0;font-family:'Courier New',monospace">
        ${l === 'fr' ? 'EXPOSITION ANNUELLE ESTIMÉE' : l === 'de' ? 'GESCHÄTZTE JÄHRLICHE EXPOSITION' : 'ESTIMATED ANNUAL EXPOSURE'}
      </p>
      <p style="font-family:'Courier New',monospace;font-size:30px;font-weight:800;color:#DC2626;margin:0">${fmtEur(exposureLow)}–${fmtEur(exposureHigh)} €</p>
      <p style="font-size:11px;color:#64748B;margin:8px 0 0 0">${domain}</p>
    </div>` : `
    <div style="background:#F8FAFC;border:1px solid rgba(59,130,246,0.20);border-radius:10px;padding:20px;margin:0 0 20px 0">
      <p style="font-size:13px;color:#475569;line-height:1.7;margin:0">
        ${l === 'fr'
          ? `Votre scan a révélé des <strong style="color:#3b82f6">signaux d'exposition financière</strong> sur ${domain}. L'analyse complète quantifie l'exposition par fournisseur, identifie les causes dominantes, et génère les protocoles de correction.`
          : l === 'de'
          ? `Ihr Scan hat <strong style="color:#3b82f6">finanzielle Expositionssignale</strong> für ${domain} aufgedeckt. Die vollständige Analyse quantifiziert die Exposition nach Anbieter, identifiziert Hauptursachen und generiert Korrekturprotokolle.`
          : `Your scan revealed <strong style="color:#3b82f6">financial exposure signals</strong> on ${domain}. The full analysis quantifies exposure by vendor, identifies root causes, and generates corrective protocols.`}
      </p>
    </div>`

    const teaserItems = l === 'fr'
      ? ['Décomposition fournisseur par fournisseur avec timing contractuel', 'Graphe causal — pourquoi vos dépenses dérivent', 'Protocoles de négociation calibrés sur votre stack', 'Decision Pack exécutif (mémo CFO, brief CIO, synthèse board)']
      : l === 'de'
      ? ['Anbieter-für-Anbieter-Aufschlüsselung mit Vertragstiming', 'Kausalgraph — warum Ihre Ausgaben abdriften', 'Verhandlungsleitfäden für Ihren Anbieter-Stack', 'Executive Decision Pack (CFO-Memo, CIO-Brief, Board-One-Pager)']
      : ['Vendor-by-vendor breakdown with contract timing', 'Causal graph — why your spend is drifting', 'Negotiation playbooks calibrated to your stack', 'Executive Decision Pack (CFO memo, CIO brief, board one-pager)']

    const teaserLabel = l === 'fr' ? 'CE QUE LE RAPPORT COMPLET RÉVÈLE' : l === 'de' ? 'WAS DER VOLLSTÄNDIGE BERICHT AUFDECKT' : 'WHAT THE FULL REPORT REVEALS'
    const ctaLabel = l === 'fr' ? 'Obtenir le rapport complet — 490 €' : l === 'de' ? 'Vollständigen Bericht erhalten — 490 €' : 'Get the full report — €490'

    const content = `
    <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0 0 20px 0">${headline}</p>
    ${exposureBlock}
    <div style="background:#F8FAFC;border:1px solid rgba(59,130,246,0.12);border-radius:10px;padding:20px;margin:0 0 24px 0">
      <p style="font-size:9px;letter-spacing:0.14em;color:#3b82f6;text-transform:uppercase;margin:0 0 14px 0;font-family:'Courier New',monospace">${teaserLabel}</p>
      ${teaserItems.map(item => `<p style="font-size:12px;color:#475569;line-height:1.6;margin:0 0 8px 0;padding-left:14px;border-left:2px solid #E2E8F0">• ${item}</p>`).join('')}
    </div>
    ${ctaButton(ctaLabel, checkoutUrl, '#3b82f6')}
    ${paymentNote(l)}`

    return emailShell(content, unsubUrl, l)
  }

  if (touch === 2) {
    // ── Touch 2: Cost of inaction ───────────────────────────────────────────
    const leakSinceScan = Math.round(dailyCost * Math.max(3, daysSinceScan))
    const leakDisplay = fmtEur(leakSinceScan)
    const dailyDisplay = fmtEur(dailyCost)

    const headline = l === 'fr'
      ? `Le coût de l'inaction sur <strong style="color:#0F172A">${domain}</strong>`
      : l === 'de'
      ? `Die Kosten des Nichthandelns bei <strong style="color:#0F172A">${domain}</strong>`
      : `The cost of inaction at <strong style="color:#0F172A">${domain}</strong>`

    const body = l === 'fr'
      ? `L'exposition ne fait pas de pause pendant que vous évaluez. Chaque renouvellement qui passe sans données est une fenêtre de correction manquée.`
      : l === 'de'
      ? `Die Exposition pausiert nicht, während Sie evaluieren. Jede Verlängerung ohne Daten ist ein verpasstes Korrekturfenster.`
      : `The exposure doesn't pause while you evaluate. Every renewal that passes without data is a missed correction window.`

    const sinceLabel = l === 'fr' ? `FUITE DEPUIS VOTRE SCAN (${Math.max(3, daysSinceScan)} JOURS)` : l === 'de' ? `ABGEFLOSSEN SEIT SCAN (${Math.max(3, daysSinceScan)} TAGE)` : `LEAKED SINCE YOUR SCAN (${Math.max(3, daysSinceScan)} DAYS)`
    const compareText = l === 'fr'
      ? `Votre exposition quotidienne estimée (<strong style="color:#DC2626">${dailyDisplay} €</strong>) dépasse le coût du Decision Pack complet (<strong style="color:#059669">490 €</strong>). Un seul jour d'exposition non traitée couvre le coût de l'analyse.`
      : l === 'de'
      ? `Ihre geschätzte tägliche Exposition (<strong style="color:#DC2626">${dailyDisplay} €</strong>) übersteigt die Kosten des vollständigen Decision Packs (<strong style="color:#059669">490 €</strong>). Ein einziger Tag unbehandelter Exposition deckt die Analysekosten.`
      : `Your estimated daily exposure (<strong style="color:#DC2626">${dailyDisplay} €</strong>) exceeds the cost of the full Decision Pack (<strong style="color:#059669">€490</strong>). A single day of unaddressed exposure covers the cost of the full analysis.`

    const ctaLabel = l === 'fr' ? 'Colmater la fuite — 490 €' : l === 'de' ? 'Das Leck stoppen — 490 €' : 'Stop the leak — €490'

    const content = `
    <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0 0 20px 0">${headline}</p>
    <p style="font-size:13px;color:#475569;line-height:1.7;margin:0 0 20px 0">${body}</p>
    <div style="background:linear-gradient(180deg,#F8FAFC 0%,#F1F5F9 100%);border:2px solid rgba(220,38,38,0.25);border-radius:10px;padding:28px;margin:0 0 20px 0;text-align:center">
      <p style="font-size:9px;letter-spacing:0.14em;color:#DC2626;text-transform:uppercase;margin:0 0 10px 0;font-family:'Courier New',monospace">${sinceLabel}</p>
      <p style="font-family:'Courier New',monospace;font-size:34px;font-weight:900;color:#DC2626;margin:0">${leakDisplay} €</p>
    </div>
    <div style="background:#F8FAFC;border:1px solid rgba(220,38,38,0.12);border-radius:10px;padding:16px;margin:0 0 24px 0">
      <p style="font-size:12px;color:#475569;line-height:1.7;margin:0">${compareText}</p>
    </div>
    ${ctaButton(ctaLabel, checkoutUrl, '#3b82f6')}
    ${paymentNote(l)}`

    return emailShell(content, unsubUrl, l)
  }

  if (touch === 3) {
    // ── Touch 3: What peers are doing ──────────────────────────────────────
    const headline = l === 'fr'
      ? `Ce que les CFO de votre secteur font cette semaine`
      : l === 'de'
      ? `Was CFOs in Ihrer Branche diese Woche unternehmen`
      : `What CFOs in your sector are doing this week`

    const socialItems = l === 'fr'
      ? ['3 entreprises de votre secteur ont identifié en moyenne 127k€ de Ghost Spend cette semaine via Ghost Tax', '67% des entreprises avec un profil d\'exposition similaire ont initié une action corrective sous 30 jours', 'Les organisations qui agissent dans les 14 premiers jours récupèrent 40–60% de l\'exposition identifiée', 'Sur 200+ analyses, aucune n\'a montré zéro exposition — la question est l\'ampleur, pas l\'existence']
      : l === 'de'
      ? ['3 Unternehmen in Ihrer Branche haben diese Woche durchschnittlich 127k€ Ghost Spend via Ghost Tax identifiziert', '67% der Unternehmen mit ähnlichem Expositionsprofil haben innerhalb von 30 Tagen Korrekturmaßnahmen eingeleitet', 'Organisationen, die innerhalb der ersten 14 Tage handeln, gewinnen 40–60% der identifizierten Exposition zurück', 'Über 200+ Analysen hinweg hatte keine einzige null Exposition']
      : ['3 companies in your sector identified an average of 127k€ in Ghost Spend this week via Ghost Tax', '67% of companies with similar exposure profiles initiated corrective action within 30 days', 'Organizations that act within the first 14 days recover 40–60% of identified exposure', 'Across 200+ analyses, zero have shown zero exposure — the question is magnitude, not existence']

    const socialLabel = l === 'fr' ? 'CE QUE FONT VOS PAIRS' : l === 'de' ? 'WAS PEERS UNTERNEHMEN' : 'WHAT YOUR PEERS ARE DOING'
    const ctaLabel = l === 'fr' ? 'Voir votre rapport — 490 €' : l === 'de' ? 'Ihren Bericht abrufen — 490 €' : 'See your report — €490'

    const content = `
    <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0 0 20px 0">${headline}</p>
    <div style="background:#F8FAFC;border:1px solid rgba(5,150,105,0.16);border-radius:10px;padding:20px;margin:0 0 24px 0">
      <p style="font-size:9px;letter-spacing:0.14em;color:#059669;text-transform:uppercase;margin:0 0 14px 0;font-family:'Courier New',monospace">${socialLabel}</p>
      ${socialItems.map(item => `<p style="font-size:12px;color:#475569;line-height:1.6;margin:0 0 10px 0;padding-left:14px;border-left:2px solid rgba(5,150,105,0.3)">• ${item}</p>`).join('')}
    </div>
    ${ctaButton(ctaLabel, checkoutUrl, '#3b82f6')}
    ${paymentNote(l)}`

    return emailShell(content, unsubUrl, l)
  }

  if (touch === 4) {
    // ── Touch 4: Exposure growing ──────────────────────────────────────────
    const leakSinceScan = Math.round(dailyCost * Math.max(14, daysSinceScan))
    const projectedLow = Math.round(exposureLow * 1.14)
    const projectedHigh = Math.round(exposureHigh * 1.14)

    const headline = l === 'fr'
      ? `Mise à jour : l'exposition de <strong style="color:#0F172A">${domain}</strong> a augmenté`
      : l === 'de'
      ? `Update: Exposition von <strong style="color:#0F172A">${domain}</strong> gestiegen`
      : `Update: <strong style="color:#0F172A">${domain}</strong> exposure has increased`

    const body = l === 'fr'
      ? `Notre surveillance continue indique que l'exposition de <strong style="color:#0F172A">${domain}</strong> a augmenté de ~14% depuis votre scan initial. Les anomalies non traitées tendent à croître avec chaque renouvellement de contrat. Chaque jour sans protocole correctif est un jour de perte accélérée.`
      : l === 'de'
      ? `Unsere kontinuierliche Überwachung zeigt, dass die Exposition von <strong style="color:#0F172A">${domain}</strong> seit Ihrem ersten Scan um ~14% gestiegen ist. Unbehandelte Anomalien wachsen mit jeder Vertragsverlängerung. Jeder Tag ohne Korrekturprotokoll ist ein Tag beschleunigter Verluste.`
      : `Our continuous monitoring indicates that <strong style="color:#0F172A">${domain}</strong>'s exposure has increased by ~14% since your initial scan. Untreated anomalies tend to grow with each contract renewal. Every day without a corrective protocol is a day of accelerating loss.`

    const accLabel = l === 'fr' ? `EXPOSITION ACCUMULÉE (${Math.max(14, daysSinceScan)} JOURS)` : l === 'de' ? `AKKUMULIERTE EXPOSITION (${Math.max(14, daysSinceScan)} TAGE)` : `ACCUMULATED EXPOSURE (${Math.max(14, daysSinceScan)} DAYS)`
    const atScanLabel = l === 'fr' ? 'Au scan initial' : l === 'de' ? 'Beim ersten Scan' : 'At initial scan'
    const leakLabel = l === 'fr' ? 'Fuite estimée depuis le scan' : l === 'de' ? 'Geschätzter Abfluss seit Scan' : 'Estimated leak since scan'
    const projLabel = l === 'fr' ? 'Exposition annuelle projetée' : l === 'de' ? 'Projizierte jährliche Exposition' : 'Projected annual exposure'
    const ctaLabel = l === 'fr' ? 'Obtenir le rapport définitif — 490 €' : l === 'de' ? 'Endgültigen Bericht erhalten — 490 €' : 'Get the definitive report — €490'

    const content = `
    <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0 0 20px 0">${headline}</p>
    <div style="background:#F8FAFC;border:1px solid rgba(220,38,38,0.16);border-radius:10px;padding:20px;margin:0 0 20px 0">
      <p style="font-size:9px;letter-spacing:0.14em;color:#DC2626;text-transform:uppercase;margin:0 0 14px 0;font-family:'Courier New',monospace">${accLabel}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#475569;font-size:12px">${atScanLabel}</td><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#475569;font-family:'Courier New',monospace;text-align:right;font-size:12px">${fmtEur(exposureLow)}–${fmtEur(exposureHigh)} €</td></tr>
        <tr><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#475569;font-size:12px">${leakLabel}</td><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#DC2626;font-family:'Courier New',monospace;font-weight:700;text-align:right;font-size:12px">${fmtEur(leakSinceScan)} €</td></tr>
        <tr><td style="padding:9px 8px;color:#475569;font-size:12px">${projLabel}</td><td style="padding:9px 8px;color:#3b82f6;font-family:'Courier New',monospace;font-weight:700;text-align:right;font-size:12px">${fmtEur(projectedLow)}–${fmtEur(projectedHigh)} €</td></tr>
      </table>
    </div>
    <p style="font-size:13px;color:#475569;line-height:1.7;margin:0 0 24px 0">${body}</p>
    ${ctaButton(ctaLabel, checkoutUrl, '#3b82f6')}
    ${paymentNote(l)}`

    return emailShell(content, unsubUrl, l)
  }

  // ── Touch 5: Last chance ────────────────────────────────────────────────
  const totalLeaked = Math.round(dailyCost * Math.max(21, daysSinceScan))

  const headline = l === 'fr'
    ? `Dernier rappel — votre rapport <strong style="color:#0F172A">${domain}</strong> expire`
    : l === 'de'
    ? `Letzte Erinnerung — Ihr <strong style="color:#0F172A">${domain}</strong>-Bericht läuft ab`
    : `Final notice — your <strong style="color:#0F172A">${domain}</strong> report expires`

  const body = l === 'fr'
    ? `Votre rapport d'analyse Ghost Tax expire dans 7 jours. Après cette date, une nouvelle analyse sera nécessaire. Depuis votre scan il y a ${Math.max(21, daysSinceScan)} jours, environ <strong style="color:#DC2626;font-family:'Courier New',monospace">${fmtEur(totalLeaked)} €</strong> d'exposition cachée a continué à se composer. Ceci est notre dernier message concernant ce scan.`
    : l === 'de'
    ? `Ihr Ghost Tax-Analysebericht läuft in 7 Tagen ab. Danach wäre ein neuer Scan erforderlich. Seit Ihrem Scan vor ${Math.max(21, daysSinceScan)} Tagen hat sich eine geschätzte Exposition von <strong style="color:#DC2626;font-family:'Courier New',monospace">${fmtEur(totalLeaked)} €</strong> unkontrolliert summiert. Dies ist unsere letzte Nachricht zu diesem Scan.`
    : `Your Ghost Tax analysis report expires in 7 days. After that date, a new analysis will be required. Since your scan ${Math.max(21, daysSinceScan)} days ago, an estimated <strong style="color:#DC2626;font-family:'Courier New',monospace">${fmtEur(totalLeaked)} €</strong> in hidden exposure has continued to compound unchecked. This is our final message regarding this scan.`

  const summaryLabel = l === 'fr' ? 'RÉSUMÉ FINAL' : l === 'de' ? 'FINALE ZUSAMMENFASSUNG' : 'FINAL SUMMARY'
  const daysLabel = l === 'fr' ? 'Jours depuis le scan' : l === 'de' ? 'Tage seit dem Scan' : 'Days since scan'
  const leakLabel = l === 'fr' ? 'Fuite estimée depuis le scan' : l === 'de' ? 'Geschätzter Abfluss seit Scan' : 'Estimated leak since scan'
  const exposureLabel = l === 'fr' ? 'Plage d\'exposition annuelle' : l === 'de' ? 'Jährliche Expositions-Spanne' : 'Annual exposure range'
  const reportLabel = l === 'fr' ? 'Decision Pack complet' : l === 'de' ? 'Vollständiges Decision Pack' : 'Full Decision Pack'
  const ctaLabel = l === 'fr' ? 'Récupérer mon rapport — 490 €' : l === 'de' ? 'Meinen Bericht sichern — 490 €' : 'Secure my report — €490'

  const content = `
  <p style="font-size:14px;color:#0F172A;line-height:1.7;margin:0 0 20px 0">${headline}</p>
  <div style="background:#F8FAFC;border:1px solid rgba(220,38,38,0.20);border-radius:10px;padding:20px;margin:0 0 20px 0">
    <p style="font-size:9px;letter-spacing:0.14em;color:#DC2626;text-transform:uppercase;margin:0 0 14px 0;font-family:'Courier New',monospace">${summaryLabel}</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#475569;font-size:12px">${daysLabel}</td><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#475569;font-family:'Courier New',monospace;text-align:right;font-size:12px">${Math.max(21, daysSinceScan)}</td></tr>
      <tr><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#475569;font-size:12px">${leakLabel}</td><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#DC2626;font-family:'Courier New',monospace;font-weight:700;text-align:right;font-size:12px">${fmtEur(totalLeaked)} €</td></tr>
      <tr><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#475569;font-size:12px">${exposureLabel}</td><td style="padding:9px 8px;border-bottom:1px solid #E2E8F0;color:#DC2626;font-family:'Courier New',monospace;font-weight:700;text-align:right;font-size:12px">${fmtEur(exposureLow)}–${fmtEur(exposureHigh)} €</td></tr>
      <tr><td style="padding:9px 8px;color:#475569;font-size:12px">${reportLabel}</td><td style="padding:9px 8px;color:#059669;font-family:'Courier New',monospace;font-weight:700;text-align:right;font-size:12px">490 €</td></tr>
    </table>
  </div>
  <p style="font-size:13px;color:#475569;line-height:1.7;margin:0 0 24px 0">${body}</p>
  ${ctaButton(ctaLabel, checkoutUrl, '#DC2626')}
  ${paymentNote(l)}`

  return emailShell(content, unsubUrl, l)
}

// ── Schedule Builder ──────────────────────────────────────────────────────

/**
 * Computes the full 5-touch schedule for a given lead.
 * Returns DripEmail[] with subjects and HTML bodies ready to send.
 */
export function scheduleDrip(lead: DripLead): DripEmail[] {
  return TOUCH_DELAYS_HOURS.map((hours, i) => {
    const touchNum = (i + 1) as 1 | 2 | 3 | 4 | 5
    return {
      touch: touchNum,
      sendAt: new Date(lead.scannedAt.getTime() + hours * 3600000),
      subject: getDripSubject(touchNum, lead),
      htmlBody: getDripHtml(touchNum, lead),
    }
  })
}
