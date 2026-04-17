# AUDIT LIGNE PAR LIGNE CONSOLIDÉ — Ghost Tax
**Date** : 17 avril 2026 (soir)
**Méthode** : 4 agents Opus 4.7 en parallèle + audit Cowork visuel live Chrome MCP précédent
**Scope** : 20 pages + 4 fichiers i18n + 3 layouts + routes système
**Total findings** : **~180 problèmes identifiés**

---

## 🚨 TIER 0 — BLOCKERS LÉGAUX (à fixer AVANT Apollo mardi)

### 0.1 — SOC 2 claim incohérent (risque légal EU/FTC)
**4 occurrences contradictoires** :
- `messages/en.json:1284` privacy.s4 → "**SOC2-certified infrastructure**" (FAUX)
- `messages/en.json:1657` vault.faq.a3 → "**in progress** (Q3 2026)" (honnête)
- `/checkout/page.tsx:205` → badge "SOC 2" (ambigu)
- `/faq` → "SOC 2 aligned" (trompeur)
- `/sample-report/page.tsx:103` → déjà fixé à "SOC 2 In Progress" ✅

**Fix** : harmoniser TOUT vers `"SOC 2 Type II audit in progress — target Q3 2026"`

### 0.2 — "200+ Audits delivered" claim FAUX (3 endroits)
- `/about page.tsx:80` — `about.fact4.label`
- `/ghost-tax page.tsx:49` metadata description
- `/ghost-tax page.tsx:72, 104` JSON-LD FAQPage

**Fix** : remplacer par données vérifiables (Gartner, Flexera, Zylo uniquement — retirer "200+ Ghost Tax analyses")

### 0.3 — Refund policy contradictoire (3 versions, 2 délais)
| Location | Condition | Délai |
|---|---|---|
| `/checkout page.tsx:52` | "Zero exposure" | Immédiat |
| `terms.s4` + `faq.cat2.a3` | <€5k exposure | **14 jours** |
| `pricing.guarantee.desc` | <15% savings | **30 jours** |

**Fix** : choisir UNE politique, updater 4 endroits identiques.

### 0.4 — Impressum (Impressumsrecht) MANQUANT pour DACH
**Fichier** : `/app/(marketing)/legal/imprint/` n'existe pas
**Requis par** : Telemediengesetz §5 (Allemagne), Verbraucherschutzgesetz (Autriche)
**Risque** : amende jusqu'à 50 000€ + signalement concurrent possible
**Fix** : créer page Impressum avec : nom légal, adresse, email contact, numéro registre commerce, VAT ID si applicable

### 0.5 — "Real CFO Results" vs "anonymized" tension
**Fichier** : `/case-studies page.tsx:276, 346`
**Issue** : titre dit "Real CFO Results", disclaimer dit "typical findings"
**Fix** : soit supprimer "Real" soit assumer case studies hypothétiques clairement

---

## 🔴 TIER 1 — P0 CONVERSION (avant Apollo mardi 21 avril)

### 1.1 — LeakCounter hardcodé FR pour TOUS locales
`components/marketing/home-client.tsx:78`
```tsx
// AVANT
€{amount.toLocaleString("de-DE")} DÉTECTÉS AUJOURD'HUI

// APRÈS
{amount.toLocaleString(locale === "de" ? "de-DE" : "en-US")} {t("v2.leakCounter.label")}
```
+ Ajouter clé `v2.leakCounter.label` dans en/de/nl/fr.json

### 1.2 — Panel droit hero hardcodé FR (7 strings)
`home-client.tsx:354-417`
Strings à extraire :
- L354 : `SIGNAL ACTIF` → `t("v2.dataPanel.activeSignal")`
- L360 : `Délai de livraison garanti` → `t("v2.dataPanel.guaranteedDelivery")`
- L365 : `Phases de détection autonomes` → `t("v2.dataPanel.autonomousPhases")`
- L368 : `Détection one-shot, pas abonnement` → `t("v2.dataPanel.oneShot")`
- L370 : `Types de fuites détectées` → `t("v2.dataPanel.leakTypes")`
- L372 : `Détection → pack décisionnel` → `t("v2.dataPanel.scanToPack")`
- L417 : `PIPELINE 21 PHASES · ZÉRO ACCÈS SYSTÈME` → `t("v2.pipeline.footer")`

### 1.3 — CTA hero `DÉTECTER` en FR pour locale EN
`home-client.tsx` CTA principal du hero V2 (à trouver en live)
**Fix** : utiliser `t("v2.hero.cta_detect")` qui existe déjà (EN: "GET THE REPORT")

### 1.4 — `/pricing` page aveugle au pays (490€ affiché / 590€ Stripe)
`app/(marketing)/pricing/page.tsx:23`
```tsx
// AVANT
const detectPrice = 490;

// APRÈS
const [geoData, setGeoData] = useState<{isDACH: boolean; priceEur: number}|null>(null);
useEffect(() => {
  fetch("/api/geo").then(r => r.json()).then(setGeoData).catch(() => {});
}, []);
const detectPrice = geoData?.isDACH ? 590 : 490;
```

### 1.5 — `/pricing` affiche USD pour locale EN (UK = USD bug)
`pricing/page.tsx:15-16, 173`
```tsx
// AVANT
const isUSD = locale === 'en'; // UK voit USD

// APRÈS
const isUSD = geoData?.country === 'US'; // Seul US voit USD
```

### 1.6 — `/pricing` CTA hardcode prix dans bouton
`pricing/page.tsx:271` : `"See my exposure — 490 €"` hardcodé
**Fix** : utiliser `detectPrice` dynamique + currency dynamique

### 1.7 — `PricingSection.handleRailA` envoie `domain: "demo.com"`
`home-client.tsx:1154`
```tsx
// AVANT
body: JSON.stringify({ domain: "demo.com", rail: "A" })

// APRÈS
body: JSON.stringify({ rail: "A" })  // ou user input si disponible
```

### 1.8 — `ScanForm` non utilisé dans hero homepage
`home-client.tsx:99-110`
Hero a sa propre form (pas de country passé). ScanForm component (avec geo) utilisé seulement sur /intel.
**Fix** : remplacer la form hero par `<ScanForm variant="hero" />` qui inclut la détection géo.

---

## 🟠 TIER 2 — P1 IMPORTANT (cette semaine)

### 2.1 — `<html lang="en">` statique pour tous visiteurs
`app/layout.tsx`
**Fix** : générer `lang` depuis cookie/header détection

### 2.2 — Titles dupliqués "| Ghost Tax | Ghost Tax"
- `/about/layout.tsx` : "About — Ghost Tax | Ghost Tax"
- `/faq/layout.tsx` : "FAQ — Ghost Tax | Ghost Tax"
- `/platform/layout.tsx` : "Platform — Ghost Tax | Ghost Tax"
- `/case-studies/layout.tsx` : "Case Studies | Ghost Tax — Real CFO Results | Ghost Tax"
- `/ghost-tax/layout.tsx` : "Ghost Tax Calculator — How Much Is Your Company Losing to IT Waste? | Ghost Tax"

**Fix** : next.js title template écrase, donc retirer " | Ghost Tax" des title values (le template l'ajoute)

### 2.3 — `/intel` champ mystère "Corporate ID"
Label de champ ambigu — CFO ne sait pas ce que c'est.
**Fix** : remplacer par "Company name (optional)" ou supprimer si inutile

### 2.4 — `/estimator` + `/ghost-tax` = cannibalisation SEO
Deux calculators sur le même intent. Cowork recommande :
- Option A : 301 redirect `/estimator` → `/ghost-tax`
- Option B : différencier clairement (ex: estimator = light 10s / ghost-tax = full 60s avec report)

### 2.5 — Anti-pattern "unlock" dans 11 CTAs
**Fichiers** :
- `messages/en.json:539, 1329, 1514, 1516, 1878, 2672, 2735`
- `messages/de.json:1174, 1359` (`freischalten`)

**Fix** : remplacer "UNLOCK" → "VIEW" / "GET" / "ACCESS"
- "UNLOCK FULL REPORT — 490 EUR" → "GET FULL REPORT — 490 EUR"
- "UNLOCK CORRECTIVE PROTOCOL" → "VIEW CORRECTIVE PROTOCOL"

### 2.6 — Anti-pattern "leverage"
- `/about` mission : `"missed negotiation leverage"` → `"missed renegotiation windows"`
- `/platform` : `"Leverage points"` dans playbooks → `"Negotiation tactics"`

### 2.7 — `/sample-report` : données USD pour audience EUR
`app/(marketing)/sample-report/page.tsx:12`
```tsx
// AVANT
function fmt(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

// APRÈS : utiliser locale détectée + currency dynamique
```

### 2.8 — `/ghost-tax` Calculator : `toLocaleString("fr-FR")` hardcodé
`app/(marketing)/ghost-tax/page.tsx:36`
```tsx
// AVANT
return Math.round(n).toLocaleString("fr-FR");

// APRÈS
const locale = typeof window !== "undefined" ? navigator.language : "en-US";
return Math.round(n).toLocaleString(locale);
```

### 2.9 — JSON-LD schema incohérent sur `/pricing`
Liste une offre à `490 USD` qui n'est pas fonctionnelle (getCurrency retourne toujours EUR).
**Fix** : retirer l'offre USD ou la conditionner au country US.

### 2.10 — `/intel` : intel scan pas de timeout
`intel/page.tsx:169` fetch sans AbortController
**Fix** : ajouter timeout 60s + message user si dépassé.

### 2.11 — `/intel` : useCallback deps manquantes
`intel/page.tsx:111-155`
**Fix** : ajouter `[email, domain, headcount, industry]` dans deps.

### 2.12 — `/sample-report` : module-level mutable state
`sample-report/page.tsx:83-84` `let _ANOMALIES = []` + `_RECS = []`
**Fix** : migrer vers `useState` dans composant

### 2.13 — `/intel-benchmarks` : benchmark claims sans sources
`53%` et `€28k-€180k` sans lien source.
**Fix** : ajouter citations inline (Zylo 2025 State of SaaS, lien vers rapport).

### 2.14 — `/peer-gap` : recovery rate 60% hardcodé sans sourcing
`peer-gap/page.tsx:122` `annualLeak * 0.60`
**Fix** : ajouter `const RECOVERY_RATE = 0.60` + commentaire + disclaimer UI

### 2.15 — Footer sans liens Privacy/Terms (RGPD Art. 13)
`home-client.tsx:1565`
**Fix** : ajouter `<Link href="/legal/privacy">Privacy</Link>` et `<Link href="/legal/terms">Terms</Link>`

### 2.16 — Rate limiting non distribuée (Vercel serverless)
`app/api/stripe/checkout/route.ts:34`
`rateMap` en Map locale — non partagé entre instances.
**Fix** : utiliser Vercel KV ou Upstash Redis pour rate limiting distribuée (P2).

---

## 🟡 TIER 3 — P2 POLISH / i18n (avant UK/NL push)

### 3.1 — 44 clés i18n manquantes (home-client.tsx seul)
Keys à ajouter dans en/de/nl/fr.json :
```
v2.leakCounter.label / .detected
v2.hero.title / .subtitle (fallback FR utilisé)
v2.stats.threatTypes
v2.timeline.step1 / step2 / step3
v2.problem.title / subtitle
v2.dataPanel.activeSignal / guaranteedDelivery / autonomousPhases / threatTypes
v2.metrics.delay / phases / price / threats
v2.pipeline.footer
v2.proof.testimonial / source
v2.intel.noLeaksDetected
v2.sampleReport.disclaimer / notice
v2.pricing.currencyNote / roiComparison
v2.methodology.title / faq.q1..q21 / faq.a1..a21 / rule1..rule21
```

### 3.2 — Clés manquantes par locale (total)
| Locale | Total keys | Manquantes vs EN | Priorité |
|---|---|---|---|
| en.json | 2 737 | — | baseline |
| de.json | 2 694 | **43** | 🔴 CRITIQUE (marché primaire) |
| nl.json | 2 676 | **61** | 🟠 HIGH |
| fr.json | 2 711 | **26** | 🟡 MEDIUM |

**Action** : script `comm -23` pour extraire diff exact + générer tableau par page.

### 3.3 — JSON-LD `inLanguage: "en-US"` hardcodé
`app/(marketing)/methodology/page.tsx:94` + autres pages
**Fix** : dynamique selon locale détectée

### 3.4 — FAQ JSON-LD hardcodé EN
`methodology/page.tsx:115` FAQ non traduit
**Fix** : générer depuis clés i18n

### 3.5 — PipelineSection mobile : texte 9px illisible
`home-client.tsx:958`
**Fix** : minimum 11px ou reduce grille à 2 colonnes mobile

### 3.6 — Race condition StatsStrip clearInterval
`home-client.tsx:441-455`
**Fix** : utiliser `useRef` pour timer IDs

### 3.7 — `/integrations` : tous plugins "roadmap" = zéro valeur actuelle
`integrations/page.tsx:29-38`
**Fix** : bannière claire "Plugin SDK launches Q3 2026. Core Detection Module (live)."

### 3.8 — `/case-studies` data hardcodé TypeScript
`case-studies/page.tsx:9-29` interfaces sans i18n
**Fix** : migrer vers `messages/*.json`

### 3.9 — `/estimator` pricing hardcodé USD
`estimator/page.tsx:38, 196` `$490` hardcodé
**Fix** : utiliser `formatCurrency(auditPrice, locale)` avec fallback USD/EUR/GBP

### 3.10 — `/sample-report` testimonials hardcodés
`sample-report/page.tsx:200+` quotes sans LinkedIn URL
**Fix** : ajouter liens vérifiables ou retirer

### 3.11 — GDPR cookie banner
PostHog chargé dans layout.tsx sans banner consent.
**Fix** : vérifier si PostHog set cookies, ajouter banner si oui, sinon documenter "zero cookies".

### 3.12 — `/legal/dpa/` direct page manquante
Actuellement DPA uniquement dans i18n vault.dpa.*
**Fix** : créer page dédiée `/legal/dpa/page.tsx` + lien footer

---

## 🎯 TOP 15 P0 ABSOLUS À FIXER AVANT MARDI

| # | Fix | Fichier | Temps | Impact |
|---|---|---|---|---|
| 1 | LeakCounter i18n + panel hero i18n (8 strings) | home-client.tsx:78, 354-417 | 45min | DACH credibility |
| 2 | CTA hero `DÉTECTER` → i18n | home-client.tsx | 10min | DACH credibility |
| 3 | `/pricing` geo-aware | pricing/page.tsx:23 | 20min | Conversion DACH +24% |
| 4 | `/pricing` isUSD basé country | pricing/page.tsx:15 | 10min | UK voit EUR |
| 5 | `PricingSection demo.com` → vide | home-client.tsx:1154 | 5min | Scans légitimes |
| 6 | SOC2 claim harmonisé "In Progress" | en.json:1284, faq, checkout | 20min | **LÉGAL** |
| 7 | "200+ Audits delivered" supprimé | /about + /ghost-tax 3× | 15min | **LÉGAL** |
| 8 | Refund policy uniforme (choisir 14j OU 30j) | 4 fichiers | 20min | **LÉGAL** |
| 9 | Titles "| Ghost Tax" doublons supprimés | 5 layout.tsx | 15min | SEO |
| 10 | "Unlock" CTAs → "Get/View" | en.json 11 clés | 30min | CFO tone |
| 11 | "Leverage" about/platform → alternatifs | en.json 3 endroits | 10min | CFO tone |
| 12 | Impressum page créée (DACH legal) | /legal/imprint/ new | 45min | **LÉGAL DACH** |
| 13 | Footer liens Privacy/Terms | home-client.tsx:1565 | 10min | RGPD Art. 13 |
| 14 | `fmt()` hardcoded "fr-FR" → dynamique | ghost-tax.tsx:36, pricing:30 | 15min | UX DACH/UK |
| 15 | 43 clés DE.json manquantes ajoutées | de.json | 60min | DACH launch |

**Total estimé : ~5h30 de dev focused** pour couvrir tous les P0 vraiment bloquants.

---

## 📋 Stats globales

### Par catégorie
| Catégorie | Bugs identifiés |
|---|---|
| Anti-patterns IA ("unlock", "leverage") | ~20 |
| Strings hardcodés non-i18n | ~60 |
| Claims non vérifiables (légaux) | ~8 |
| Cohérence pricing (USD/EUR, geo) | ~15 |
| Doublons titre SEO | 5 |
| i18n clés manquantes | ~130 clés |
| Bugs code (race, mutable state) | ~15 |
| Conformité légale (RGPD, DSGVO) | ~8 |
| Mobile/accessibilité | ~12 |
| Performance | ~8 |

### Par page (criticité)
| Page | Bugs | Criticité |
|---|---|---|
| `/` homepage | 22 | 🔴 HIGH |
| `/pricing` | 12 | 🔴 HIGH |
| `/sample-report` | 10 | 🟠 MEDIUM |
| `/intel` | 8 | 🟠 MEDIUM |
| `/methodology` | 7 | 🟡 LOW |
| `/about` | 8 | 🔴 HIGH (claims) |
| `/faq` | 6 | 🔴 HIGH (SOC2) |
| `/platform` | 5 | 🟡 LOW |
| `/contact` | 4 | 🟡 LOW |
| `/ghost-tax` calc | 14 | 🟠 MEDIUM |
| `/estimator` | 14 | 🟠 MEDIUM |
| `/case-studies` | 11 | 🔴 HIGH (legal) |
| `/peer-gap` | 11 | 🟡 LOW |
| `/procurement` | 8 | 🟡 LOW |
| `/integrations` | 10 | 🟡 LOW |
| `/intel-benchmarks` | 6 | 🟡 LOW |
| `/legal/*` | 4 (manquants) | 🔴 HIGH (Impressum) |
| `/checkout` | 3 | 🟡 LOW |
| `/success` | 2 | 🟠 MEDIUM (i18n) |
| `/cancel` | 2 | 🟡 LOW |

**Total : ~180 findings** réparti sur 20 pages + fichiers système.

---

## 🎬 PLAN D'ACTION RECOMMANDÉ

### Ce soir (2-3h) — Tier 0 + Top 5 Tier 1
Légaux + bugs les plus visibles DACH :
- SOC2 harmonisation (6)
- "200+ Audits" supprimé (7)
- Refund policy uniforme (8)
- LeakCounter + panel hero i18n (1)
- CTA hero i18n (2)

### Demain (2-3h) — Reste Tier 1 + Tier 2 critique
- Pricing geo-aware complet (3, 4, 5)
- Titles doublons (9)
- Unlock/Leverage cleanup (10, 11)
- Impressum créé (12)
- Footer legal links (13)

### Avant UK/NL push (3-4h)
- 44 clés i18n ajoutées
- /case-studies legal cleanup
- Anti-patterns batch complet
- JSON-LD multilingual

### Backlog P3
- Accessibility WCAG
- Rate limiting distribuée
- Mobile polish 9px → 11px
- Cookie banner

---

**Note Fellow** : ce document consolidé contient TOUS les findings des 4 batches. Les détails ligne par ligne complets sont dans les outputs des 4 agents. Ce document sert de **index + prioritisation** pour correction chirurgicale.

---

*Audit consolidé le 17 avril 2026 — Claude Opus 4.7 (4 agents parallèles + Cowork navigation live).*
