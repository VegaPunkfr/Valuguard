/**
 * Apply Dutch translations to nl.json
 * Run: node scripts/translate-nl.js
 */
const fs = require('fs');
const path = require('path');

const nlPath = path.join(__dirname, '..', 'messages', 'nl.json');
const nl = JSON.parse(fs.readFileSync(nlPath, 'utf8'));

// Critical translations for Dutch market — most visible keys
const translations = {
  // Navigation
  "nav.methodology": "Methodologie",
  "nav.pricing": "Prijzen",
  "nav.security": "Beveiliging",
  "nav.example": "Voorbeeldrapport",
  "nav.cta": "DETECTIE STARTEN",
  "nav.decisionroom": "Decision Room",
  "nav.intelligence": "Inlichtingen",
  "nav.procurement": "Inkoop",
  "nav.runcta": "DETECTIE STARTEN",
  "nav.home": "Home",
  "nav.platform": "Platform",
  "nav.about": "Over ons",
  "nav.contact": "Contact",
  "nav.faq": "FAQ",
  "nav.integrations": "Integraties",
  "nav.caseStudies": "Casestudy's",
  "nav.technology": "Technologie",

  // Hero
  "hero.badge": "AI FINANCIEEL BESTURINGSPLATFORM",
  "hero.title1": "Uw SaaS- en AI-uitgaven",
  "hero.title2": "hebben blinde vlekken.",
  "hero.sub": "Ghost Tax onthult verborgen financiële lekken, verklaart de oorzaken en levert een correctief protocol. Aangedreven door een eigen Causale Financiële Graaf.",
  "hero.cta1": "DETECTIE STARTEN",
  "hero.cta2": "Bekijk een voorbeelddetectie",
  "hero.trust.audits": "200+ audits uitgevoerd",
  "hero.trust.delivery": "48u levering",
  "hero.trust.soc2": "SOC 2 in uitvoering",
  "hero.trust.gdpr": "GDPR-conform",
  "hero.trust.zeroAccess": "Geen systeemtoegang vereist",

  // Social proof
  "social.trusted": "VERTROUWD DOOR TEAMS BIJ",

  // Trust
  "trust.roi": "Gemiddelde detectie-ROI",
  "trust.types": "Signalen gedetecteerd",
  "trust.delivery": "Protocollevering",
  "trust.access": "Systeemtoegang vereist",

  // Problem
  "problem.label": "STILLE BLOOTSTELLING",
  "problem.title1": "Elke maand zonder detectie,",
  "problem.title2": "stapelt de blootstelling zich op.",
  "problem.desc1": "Gemiddeld verspild aan inactieve licenties",
  "problem.desc2": "Verloren aan dubbele & overlappende tools",
  "problem.desc3": "Verbrand door onbeheerd AI-verbruik",
  "problem.source": "Gebaseerd op mediaanbevindingen bij bedrijven met 50-500 medewerkers. Bron: Flexera, Zylo, Gartner 2024-25.",

  // Detection
  "detect.label": "MULTI-SIGNAALDETECTIE",
  "detect.title": "5 convergente signalen. Deterministische engine. Nul speculatie.",
  "detect.t1": "Werkkapitaaldrift",
  "detect.t2": "Versnelling cashverbruik",
  "detect.t3": "Kortlopende schuldendruk",
  "detect.t4": "Balansinstabiliteit",
  "detect.t5": "Negatief financieel momentum",
  "detect.t6": "Blootstellingskwantificering",

  // How it works
  "how.label": "HOE HET WERKT",
  "how.title": "Van CSV tot correctief protocol in 48 uur.",
  "how.s1": "Exporteren",
  "how.s1d": "Download facturerings-CSV's van uw tools. U bepaalt wat uw systemen verlaat.",
  "how.s2": "Uploaden",
  "how.s2d": "Versleutelde upload naar onze kluis. Zero-Knowledge protocol — geen API-toegang nodig.",
  "how.s3": "Detecteren",
  "how.s3d": "8 deterministische detectoren scannen 12 signaaltypen. Blootstellingsmapping in minder dan 48 uur.",
  "how.s4": "Corrigeren",
  "how.s4d": "Correctief protocol met gerangschikte hefbomen. Klaar voor beslissing.",
  "time.48h": "48 uur",
  "time.instant": "Direct",

  // Testimonials
  "testimonials.label": "WAT ONZE KLANTEN ZEGGEN",
  "testimonials.title": "Echte resultaten. Echte besparingen.",
  "testimonials.proof": "Gebaseerd op 200+ analyses in 7 branches",

  // Pricing
  "price.label": "ENGAGEMENTMODELLEN",
  "price.title": "Engagementmodellen",
  "price.sub": "Van initiële blootstellingsmapping tot continue driftstabilisatie over SaaS, AI en Cloud.",
  "price.phase1": "Diagnose",
  "price.phase2": "Correctie",
  "price.phase3": "Controle",
  "price.diag.name": "Financiële blootstellingsdetectie",
  "price.diag.desc": "Ontgrendel uw correctief protocol. Ontdek verborgen SaaS-, AI- en cloudfinanciële lekken in 48 uur.",
  "price.diag.cta": "CORRECTIEF PROTOCOL ONTGRENDELEN",
  "price.diag.badge": "Snelle instap",
  "price.protocol.name": "Stabilisatieplan 30/60/90",
  "price.protocol.cta": "STABILISATIEPLAN AANVRAGEN",
  "price.controlplane.name": "Stabilisatiemissie",
  "price.controlplane.cta": "INSTITUTIONELE BEOORDELING AANVRAGEN",
  "price.note": "Diagnose kan worden verrekend met het stabilisatieprotocol.",
  "price.period.onetime": "eenmalig",

  // FAQ
  "faq.q1": "Hoe werkt de Decision Intelligence engine?",
  "faq.a1": "Deterministisch systeem. Statistische afstand tussen uw profiel en spanningsdrempels. Vijf gelijktijdige signalen. Wiskundig, reproduceerbaar, verifieerbaar resultaat. Geen neurale netwerken.",
  "faq.q2": "Welke gegevens zijn vereist?",
  "faq.a2": "Jaarrekeningen en resultatenrekeningen van de laatste 3 boekjaren. Geen bankgegevens. Geen API-toegang. Lokale verwerking, cryptografische handtekening.",
  "faq.q3": "Wat bevat het correctief protocol?",
  "faq.a3": "Prioriteitscorrectieve hefbomen, geschatte impact, gesequenceerde acties. Geen passief rapport — een gekwantificeerde uitvoeringsopdracht met arbitrages gerangschikt op urgentie.",
  "faq.q4": "Zijn mijn gegevens veilig?",
  "faq.a4": "Ed25519-handtekeningen op elke attestatie. Soevereine Europese omgeving. Geen derde partijen. Geen externe LLM. AES-256 in rust, TLS 1.3 tijdens transport.",
  "faq.q5": "Wat als er geen spanning wordt gedetecteerd?",
  "faq.a5": "Resultaat met lage of nul blootstelling. Dat is een geldig resultaat — bevestiging dat stresssignalen afwezig zijn. Geen extra kosten.",
  "faq.q6": "Waarom deze prijs?",
  "faq.a6": "Kosten van een halve dag consultancy. Gekwantificeerd resultaat in 48u, geen subjectief oordeel. Als gedetecteerde blootstelling $100.000 is, spreekt de verhouding voor zich.",

  // CTA
  "cta.urgency": "BLOOTSTELLING NEEMT NIET AF DOOR TE WACHTEN",
  "cta.title1": "De blootstelling wacht niet.",
  "cta.title2": "Uw correctief protocol is gereed.",
  "cta.sub": "Ontvang uw blootstellingsmapping in 48 uur. Gekwantificeerd resultaat. Correctief protocol inbegrepen. Geen verplichting.",
  "cta.primary": "CORRECTIEF PROTOCOL ONTGRENDELEN — $490",
  "cta.secondary": "Gratis scan uitvoeren",

  // Footer
  "footer.desc": "Detecteert verborgen financiële blootstelling in SaaS-, AI- en clouduitgaven. Decision Pack geleverd in 48u. Gemiddeld gevonden blootstelling: 127–340k EUR.",
  "footer.product": "Product",
  "footer.trust": "Vertrouwen & Juridisch",
  "footer.resources": "Bronnen",
  "footer.copyright": "© 2026 Ghost Tax Inc. Alle rechten voorbehouden.",
  "footer.badge1": "SOC 2 Type I in uitvoering",
  "footer.badge2": "Zero-Knowledge",
  "footer.badge3": "VS-hosting",
  "footer.badge4": "30 dagen verwijdering",
  "back": "← Terug",
  "trustfooter.soc2": "SOC 2 — In uitvoering",
  "trustfooter.zk": "Zero-Knowledge Audit",
  "trustfooter.us": "VS-dataresidentie",
  "trustfooter.purge": "30 dagen automatische verwijdering",
  "footer.col.product": "PRODUCT",
  "footer.col.resources": "BRONNEN",
  "footer.col.company": "BEDRIJF",
  "footer.col.legal": "JURIDISCH",
  "footer.link.intel": "Decision Room",
  "footer.link.ghosttax": "Ghost Tax Calculator",
  "footer.link.platform": "Platform",
  "footer.link.pricing": "Prijzen",
  "footer.link.benchmarks": "Intel Benchmarks",
  "footer.link.faq": "FAQ",
  "footer.link.about": "Over ons",
  "footer.link.contact": "Contact",
  "footer.link.integrations": "Integraties",
  "footer.link.caseStudies": "Casestudy's",
  "footer.link.methodology": "Methodologie",
  "footer.link.sample": "Voorbeeldrapport",
  "footer.link.vault": "Beveiligingskluis",
  "footer.link.privacy": "Privacybeleid",
  "footer.link.terms": "Algemene voorwaarden",
  "footer.finalCta.text": "Begin met een gratis scan",
  "footer.finalCta.btn": "Analyseer mijn domein →",
  "footer.stat.analyses": "analyses geleverd",
  "footer.stat.avgExposure": "gem. gevonden blootstelling",
  "footer.stat.delivery": "gem. levertijd",
  "footer.stat.actionRate": "actiepercentage klanten",

  // Landing page
  "landing.hero.badge": "Decision Intelligence Platform",
  "landing.hero.t1": "Detecteer financiële blootstelling",
  "landing.hero.t2": "voordat het zich opstapelt.",
  "landing.hero.sub": "Breng leveranciersoverlap, schaduw-AI-gebruik, licentieverspilling en herstelpaden aan het licht. Beslissingskwaliteit output in minuten.",
  "landing.hero.cta": "DETECTIE STARTEN",
  "landing.hero.nologin": "Geen login vereist. Publieke verrijking. Resultaten in minder dan 2 minuten.",
  "landing.output.label": "WAT U ONTVANGT",
  "landing.output.title": "Een gestructureerd beslissingsoppervlak, geen rapport.",
  "landing.how.label": "HOE HET WERKT",
  "landing.how.title": "Van domein tot beslissingsoppervlak in 4 stappen.",
  "landing.tiers.label": "BESLISSINGSPAD",
  "landing.tiers.title": "Drie niveaus van diepte. U bepaalt het tempo.",
  "landing.tiers.l1.badge": "NIVEAU 1 — GRATIS",
  "landing.tiers.l1.name": "Publieke detectie",
  "landing.tiers.l1.cta": "Decision Room betreden",
  "landing.tiers.l2.badge": "NIVEAU 2 — €490",
  "landing.tiers.l2.name": "Correctief protocol",
  "landing.tiers.l2.cta": "Prijzen bekijken",
  "landing.tiers.l3.badge": "NIVEAU 3 — OP MAAT",
  "landing.tiers.l3.name": "Stabilisatiemissie",
  "landing.tiers.l3.cta": "Scopebeoordeling aanvragen",
  "landing.cta.urgency": "BLOOTSTELLING NEEMT NIET AF DOOR TE WACHTEN",
  "landing.cta.title": "Zie wat uw technologie-uitgaven u werkelijk kosten.",
  "landing.cta.primary": "DECISION ROOM BETREDEN",
  "landing.cta.secondary": "Prijzen bekijken",
  "landing.social.label": "WAT BESLISSINGSNEMERS ZEGGEN",
  "landing.social.title": "Vertrouwd door CFO's en CIO's in heel Europa",
  "landing.pricing.cta": "CORRECTIEF PROTOCOL ONTGRENDELEN",
  "landing.pricing.cta.loading": "Doorsturen naar betaling...",
  "landing.pricing.cta.error": "Kan de betaling niet starten. Probeer het opnieuw.",
  "landing.logos.label": "Vertrouwd door financeteams in heel Europa",
  "landing.social.count": "Sluit u aan bij 200+ bedrijven die hun Ghost Tax hebben geëlimineerd.",
  "landing.stats.analyses": "200+",
  "landing.stats.analysesDesc": "Uitgevoerde analyses",
  "landing.stats.delivery": "48h",
  "landing.stats.deliveryDesc": "Gemiddelde levertijd",
  "landing.stats.exposureDesc": "EUR gemiddelde gevonden blootstelling",
  "landing.stats.actionDesc": "Actiepercentage klanten",

  // Pricing page
  "pricing.label": "TRANSPARANTE PRIJZEN",
  "pricing.title": "Eén investering. Volledig financieel inzicht.",
  "pricing.sub": "Geen demo's, geen telefoongesprekken, geen enterprise-salescyclus. Kies het diepteniveau dat uw organisatie nodig heeft.",
  "pricing.tier1.name": "Financiële blootstellingsdetectie",
  "pricing.tier1.badge": "MEEST POPULAIR",
  "pricing.tier1.priceLabel": "eenmalig",
  "pricing.tier1.desc": "Volledige blootstellingsanalyse met correctief protocol. Resultaten binnen 48 uur.",
  "pricing.tier1.cta": "NU DETECTIE STARTEN",
  "pricing.tier2.name": "Stabilisatieprotocol",
  "pricing.tier2.cta": "VOORSTEL AANVRAGEN",
  "pricing.tier3.name": "Doorlopende driftmonitoring",
  "pricing.tier3.cta": "MONITORING STARTEN",
  "pricing.tier4.name": "Stabilisatiemissie",
  "pricing.tier4.cta": "TEAM CONTACTEREN",
  "pricing.guarantee.badge": "30 DAGEN GARANTIE",
  "pricing.guarantee.title": "30 dagen niet-goed-geld-teruggarantie",
  "pricing.guarantee.desc": "Als onze analyse niet minimaal 15% aan adresseerbare besparingen binnen uw IT-uitgaven identificeert, krijgt u 100% terugbetaald. Zonder vragen.",
  "pricing.cta.title": "Begin met een gratis scan",
  "pricing.cta.primary": "Gratis detectie starten",
  "pricing.cta.secondary": "Methodologie bekijken",

  // Intel page
  "intel.title": "Gratis blootstellingsscan",
  "intel.subtitle": "Voer uw bedrijfsdomein in. Binnen 60 seconden ziet u hoeveel uw organisatie mogelijk te veel uitgeeft aan SaaS, Cloud en AI — zonder systeemtoegang.",
  "intel.field.domain": "Bedrijfsdomein",
  "intel.field.email": "E-mail (optioneel)",
  "intel.field.headcount": "Aantal medewerkers",
  "intel.field.spend": "Maandelijkse IT-uitgaven (EUR)",
  "intel.field.industry": "Sector",
  "intel.btn.run": "GRATIS SCAN UITVOEREN",
  "intel.btn.running": "ANALYSEREN...",
  "intel.trust.free": "Gratis — geen creditcard nodig",
  "intel.trust.noAccess": "Geen systeemtoegang",
  "intel.trust.time": "Resultaten in 60 seconden",
  "intel.cta.unlock": "VOLLEDIG DECISION PACK ONTGRENDELEN — €490",

  // Contact
  "contact.label": "CONTACT",
  "contact.title": "Activeer uw bescherming",
  "contact.sub": "Vul het onderstaande formulier in. Wij reageren binnen 24 uur.",
  "contact.field.name": "NAAM *",
  "contact.field.email": "ZAKELIJK E-MAILADRES *",
  "contact.field.company": "BEDRIJF",
  "contact.field.message": "BERICHT",
  "contact.btn.send": "Bericht verzenden",
  "contact.btn.sending": "Verzenden...",
  "contact.responseSla": "Wij reageren binnen 24 uur",
  "contact.phone": "Telefoon",

  // About
  "about.label": "OVER GHOST TAX",
  "about.title": "Financiële inlichtingen voor IT-beslissingen",
  "about.sub": "Ghost Tax detecteert verborgen financiële blootstelling in SaaS-, AI- en clouduitgaven. Wij leveren correctieve protocollen, geen dashboards.",

  // Methodology
  "method.badge": "KWANTITATIEVE METHODOLOGIE",
  "method.title1": "12 lektypes.",
  "method.title2": "1 engine.",
  "method.title3": "0 blinde vlekken.",
  "method.subtitle": "Een deterministische, verklaarbare en verifieerbare engine. Wij publiceren onze drempels, formules en beperkingen.",
  "method.cta": "ONTDEK MIJN GHOST TAX",

  // Security vault
  "vault.badge": "BEVEILIGINGSKLUIS",
  "vault.title1": "Uw gegevens.",
  "vault.title2": "Onze obsessie.",
  "vault.subtitle": "Veilig door architectuur, niet door beloften. Wij publiceren onze controles, onze subverwerkers en onze beperkingen.",

  // Misc
  "loading.text": "Laden...",
  "error.title": "Er is iets misgegaan",
  "error.retry": "Opnieuw proberen",
  "notfound.title": "Deze pagina bestaat niet of is verplaatst.",
  "notfound.back": "Terug naar dashboard",
};

let count = 0;
for (const [key, value] of Object.entries(translations)) {
  if (nl[key] !== undefined) {
    nl[key] = value;
    count++;
  }
}

fs.writeFileSync(nlPath, JSON.stringify(nl, null, 2), 'utf8');
console.log(`Applied ${count} Dutch translations to nl.json`);
console.log(`Total keys: ${Object.keys(nl).length}`);
console.log(`Remaining English fallback: ${Object.keys(nl).length - count}`);
