# Checklist validation — avant de me livrer le handoff

**Utilise cette checklist** avant de me transférer les handoff bundles. Si un item échoue, retourne dans Claude Design et corrige via prompt itératif. Ne me livre JAMAIS un design qui rate plus de 3 items — je vais devoir défausser des heures à corriger.

---

## Checklist globale (tous les pages)

### Typographie
- [ ] Hiérarchie par **weight** (400/500/600/700), PAS par capitalization
- [ ] Maximum 1 typeface display (Bebas Neue), 1 body (Inter), 1 mono (JetBrains Mono)
- [ ] Pas de uppercase forcée sur les headlines (sauf marque "GHOST TAX" ou nombres critiques)
- [ ] Line-height body : 1.5-1.7
- [ ] Line-height headings : 1.1-1.3
- [ ] Pas de texte en dessous de 14px en body

### Couleurs & tokens
- [ ] Noir dominant (#05060E ou similaire)
- [ ] Cyan accent uniquement sur actions primaires et data highlights (#5FD4E0)
- [ ] Gold sur warnings/"attention needed" (#E8B149)
- [ ] Rouge très parcimonieux, uniquement critical alerts (#F27155 ou similaire)
- [ ] Pas de gradients sur CTAs
- [ ] Pas plus de 5 couleurs au total sur la page

### Whitespace
- [ ] Minimum 80px entre sections principales
- [ ] Minimum 32px entre sous-sections
- [ ] Minimum 16px padding dans les cards
- [ ] Max content width : 1200px (desktop) / 100% - 32px (mobile)

### CTAs
- [ ] Boutons plats (pas de gradient, pas de shadow excessive)
- [ ] Action primaire : 1 seule par section hero
- [ ] Texte direct : "Start scan", "Get roadmap", "Book call" — PAS "Learn more", "Request proposal", "See my exposure"
- [ ] Pas d'exclamation marks dans les CTAs
- [ ] Style cohérent across pages (même bouton primary partout)

### Imagerie
- [ ] ZÉRO stock photo de personnes
- [ ] ZÉRO emoji dans l'interface (ok en copy si vraiment justifié, rare)
- [ ] Données visualisées OK (quartile bars, timelines, confidence heatmaps)
- [ ] Chaque data viz accompagnée de la source (ex: "Source: Flexera 2024, n=2800")
- [ ] Icônes minimales (Lucide ou Heroicons outline style, 1.5px stroke)

### Trust signals
- [ ] Analyst citations (Gartner, Flexera, Vertice, FinOps Foundation) visibles
- [ ] Pas de "Join 10,000+ CFOs" ou social proof inventé
- [ ] Pas de logos clients fake
- [ ] Confidence caps déclarés (0-85) quand pertinent
- [ ] Delivery SLA avec median (pas juste promesse)

### Registre / tone
- [ ] ZÉRO "doctrine is...", "belief system" language
- [ ] "48h" mentionné MAXIMUM 1 fois par page
- [ ] Pas de "None has ever...", claims défensifs
- [ ] Pas de "no calls" residuel (ça fait pas sérieux CFO)
- [ ] Vocabulaire CFO : "median", "confidence interval", "cohort", "variance", "bands"

---

## Checklist spécifique — Homepage (`/`)

### Above the fold
- [ ] Headline en weight-based hierarchy, pas en all-caps
- [ ] Subhead explique le mécanisme (public signals, no integration)
- [ ] 1 CTA primaire + 1 secondaire
- [ ] Badge de crédibilité sous la fold (21 phases · audited)

### Sections présentes
- [ ] Hero
- [ ] Credibility bar (21 phases, SLA 48h median, confidence 85 cap)
- [ ] Problem framing (3 data points avec citations analyst)
- [ ] What we measure (4 deliverables disaggregated stakeholders)
- [ ] Sample report preview (1 case anonymisé avec variance post-audit)
- [ ] Pricing snapshot (3 tiers condensés)
- [ ] Footer (méthodologie, legal, language selector)

### Ne doit PAS contenir
- [ ] Pas de live counter "€X detected today"
- [ ] Pas de "21detection phases" sans espace
- [ ] Pas de "48h" mentionné plus d'une fois
- [ ] Pas d'emoji en navigation

---

## Checklist spécifique — `/sample-report`

### Above the fold
- [ ] PDF preview visible (mockup du Decision Pack)
- [ ] Title spécifie le cohort : "anonymized European fintech, Q3 2024"
- [ ] Variance post-audit visible : "+11% vs actual, within confidence band"
- [ ] CTA download direct (pas de gate email)

### Sections critiques
- [ ] Methodology box (cohort definition, confidence scoring, validation hit rate 78%)
- [ ] Executive summary extract (exposure range, peer median, patterns)
- [ ] **1 vendor deep dive** (Salesforce ou autre, DNS signal → SKU → cost → post-audit actual)
- [ ] Confidence band disaggregated (observed/inferred/estimated/benchmark séparés)
- [ ] Boundaries explicites (what we detect / cannot detect / validate post-delivery)

### Ne doit PAS contenir
- [ ] Pas de "95% confidence" en claim agrégé
- [ ] Pas de "P82" sans définir le cohort
- [ ] Pas de "Top 5 recovery actions" sans au moins 1 itemisé concrètement

---

## Checklist spécifique — `/methodology`

### Sections critiques
- [ ] 21 phases expandable list avec empirical calibration par phase
- [ ] Inference patterns table (nom / trigger / prevalence / FP rate / examples TP+FP)
- [ ] Baseline sources avec liens directs aux reports primaires
- [ ] Confidence model avec weights empiriquement calibrés
- [ ] Validation cohort visible (N=247, hit rate 78% ±15%)
- [ ] Boundaries comparison table (detect / requires internal / requires manual audit)
- [ ] Open audit invitation

### Ne doit PAS contenir
- [ ] Pas de "Phase order is doctrine"
- [ ] Pas de "380 EUR/employee/month" sans citation primaire
- [ ] Pas de "Up to 25 points" sans empirical calibration source
- [ ] Pas de "typical Ghost Tax range" (circularité)

---

## Checklist spécifique — `/pricing`

### Sections critiques
- [ ] 3 tier cards equal weight (Stabilization slightly elevated visually)
- [ ] Monitoring présenté comme **add-on**, pas 4e tier
- [ ] CTAs symétriques et directs : "Start scan", "Get roadmap", "Book call"
- [ ] Self-qualification calculator (slider spend → savings estimate)
- [ ] Comparison table condensé à 5-6 rows max
- [ ] Geo-pricing : EUR pour DACH/FR/NL, GBP pour UK, USD pour US (detection IP)
- [ ] Guarantees (3 bullets : SLA, money-back, GDPR zero-access)

### Ne doit PAS contenir
- [ ] Pas de "REQUEST PROPOSAL" (CTA mou)
- [ ] Pas de Mission tier sans range visible
- [ ] Pas de 3-screen scroll comparison table
- [ ] Pas de multi-currency affiché simultanément

---

## Checklist responsive

### Desktop (1440px)
- [ ] Grid 12-col, max width 1200px
- [ ] Sidebar (si présente) max 280px
- [ ] Content column min 640px pour lecture confortable

### Tablet (768px)
- [ ] Grid 8-col
- [ ] Pricing cards passent en 2-col layout
- [ ] Navigation se replie en hamburger si >5 items

### Mobile (375px)
- [ ] Single column
- [ ] CTA primary sticky en bottom
- [ ] Font-size minimum 16px (éviter zoom iOS)
- [ ] Hamburger nav
- [ ] Images stack verticalement

---

## Checklist i18n (critique pour DACH mardi)

- [ ] Toutes les strings en en.json, de.json, fr.json, nl.json (4 locales)
- [ ] Pas de string hardcodée en FR dans les composants
- [ ] Nombres formatés par locale (1.234,56 pour DE, 1,234.56 pour US)
- [ ] Dates en format ISO ou local approprié
- [ ] Currency symbol correct par marché

---

## Checklist accessibilité (WCAG AA minimum)

- [ ] Contraste texte minimum 4.5:1 (body)
- [ ] Contraste texte large minimum 3:1
- [ ] Alt text sur toutes les images
- [ ] Focus visible sur tous les interactive elements
- [ ] Navigation au clavier fonctionnelle
- [ ] ARIA labels sur CTAs icon-only
- [ ] Pas de color-only information (toujours texte + symbole)

---

## Checklist performance (avant handoff)

- [ ] Poids total page < 500KB (HTML + CSS + JS + images inline)
- [ ] Pas de JS bloquant rendering
- [ ] Fonts preload pour les 2 display + body
- [ ] Images optimisées (webp quand possible, lazy loading)
- [ ] Pas plus de 3 requêtes réseau critiques au-dessus de la fold

---

## Score de validation

Compte les items checkés :

| Score | Action |
|---|---|
| 95-100% | ✅ Handoff prêt — livre-le moi |
| 85-94% | 🟡 Corrige les 5-10 items manquants avant handoff |
| 70-84% | 🟠 Retourne à Claude Design avec prompts correctifs spécifiques |
| <70% | 🔴 Refais les wireframes. Quelque chose a dérivé dans le prompt. |

---

## Commande de handoff vers moi

Quand tu as validé les 4 pages et que tu es à 95%+, envoie-moi le message suivant en chat :

```
Refonte site : handoff ready pour 4 pages (/, /sample-report, /methodology, /pricing).
Bundles Claude Design dans [lien ou dossier].
Quoi faire : 
- Lance le skill /refonte-site (que tu créeras similar à /merge-tier-s)
- 4 agents Implementer parallèles
- Next.js 15 + Tailwind, respect i18n existant 4 locales
- Ne casse pas les routes existantes /api/*
- Commit atomique par page
- Push Vercel quand tous les 4 pages PASS Verifier
```

Je prends le relai. Tu ne touches plus rien jusqu'à ce que je te livre le site live.
