# Audit ghost-tax.com — 17 avril 2026 (Cowork fellow-level)

> Audit exhaustif A→Z réalisé sur la base de : (1) fetch live de toutes les pages via Vercel, (2) lecture complète des fichiers source, (3) recherche benchmarks concurrents. Aucune complaisance. Chaque reco pointe un fichier/ligne précis.

---

## VERDICT GLOBAL — 58/100

**Le site a été partiellement rafistolé le 17 avril, mais souffre de 3 maladies structurelles :**
1. Un héros en français hardcodé servi à des CFOs allemands/anglais (perte de confiance immédiate)
2. Des testimonials présentés comme réels sans aucun disclaimer visible (risque légal + FTC/ARPP)
3. Une page pricing qui ne détecte PAS le pays (un CFO allemand voit 490€ alors que le checkout lui facture 590€ — abandon garanti)

Le produit est intellectuellement solide. Le site ressemble encore à un projet de fondateur en alpha, pas à une plateforme CFO-grade.

---

## RÉSUMÉ EXÉCUTIF

### P0 — 3 killer issues à fixer MAINTENANT

**P0.1 — LeakCounter hardcodé en français pour TOUS les visiteurs**
`home-client.tsx:78` — `DÉTECTÉS AUJOURD'HUI` est un string hardcodé, non i18n. Un CFO de Munich voit un compteur en français. Destruction instantanée de la crédibilité pour le marché #1 (DACH 590€).

**P0.2 — Pricing page ne détecte pas le pays (discordance 490€ → 590€)**
`app/(marketing)/pricing/page.tsx:23` — `const detectPrice = 490;` hardcodé. Aucun appel à `/api/geo`, aucune logique DACH. Le visiteur DE voit 490€ partout sur la page pricing, puis le checkout lui facture 590€. C'est exactement le bug qui causait 70% d'abandon DACH (noté dans `geo/route.ts:9`) — et il subsiste sur la page /pricing.

**P0.3 — Testimonials présentés comme réels sans disclaimer visible**
`messages/en.json:65-79` — `"testimonials.label": "WHAT OUR CLIENTS SAY"` + `"testimonials.title": "Real results. Real savings."` + des quotes détaillées avec des chiffres précis ($186k, 40+ seats). 0 client réel après 2 mois. Ces testimonials n'ont aucun disclaimer lisible par l'utilisateur. Le commentaire dans `home-client.tsx:520` dit explicitement "faux testimonials (pas éthique sans clients réels)" mais ils existent encore dans les i18n files et potentiellement affichés sur d'autres composants. Risque légal (FTC Endorsement Guidelines, §L120-5 Code de la consommation), et si un prospect vérifie, c'est la fin.

### P1 — 5 améliorations importantes

1. **P1.1** — Pricing page DACH-awareness complète (voir P0.2 + checkout flow incohérent)
2. **P1.2** — Le hero de la V2 affiche les données du panel droit en français hardcodé ("Délai de livraison garanti", "Phases de détection autonomes") — `home-client.tsx:366-370`
3. **P1.3** — Testimonials section dans les i18n files (de.json, nl.json, en.json) doit être soit supprimée soit labelisée "REPRESENTATIVE SCENARIOS" avec disclaimer visible
4. **P1.4** — Le trust bar `"One-time 490€ · 590€ DACH"` (`messages/en.json:2683`) est statique — un CFO UK ne comprend pas pourquoi "DACH" est mentionné pour lui. Devrait être dynamique via geo.
5. **P1.5** — JSON-LD schema sur /pricing ne liste que 490 EUR (pas 590€ DACH), et liste 490 USD — mais il n'y a pas de USD pricing fonctionnel. Incohérence schema/réalité.

### P2 — 5 polish

1. **P2.1** — Titre de la page About : `"About — Ghost Tax | Ghost Tax"` — répétition "Ghost Tax" deux fois. Corrigeable en 30 secondes.
2. **P2.2** — Titre de la FAQ : `"FAQ — Ghost Tax | Ghost Tax"` — même problème.
3. **P2.3** — NL trustBar pricing affiche `"Eenmalig 490 €"` sans mentionner la différence DACH pour les Néerlandais (qui ne sont pas DACH mais sont voisins). Manque de clarté.
4. **P2.4** — La section PipelineSection (home-client.tsx) sur mobile affiche les phases en 3×7 avec du texte à 9px — illisible sur un iPhone. CFO mobile = abandon.
5. **P2.5** — Le footer `ghost-tax.com · DECISION INTELLIGENCE · 2026` (home-client.tsx:1565) n'a pas de liens vers privacy policy / terms — RGPD-problématique pour un site qui collecte des emails au checkout.

---

## AUDIT PAR PAGE

### / (Landing principale)
**Score : 72/120**

**Forces :**
- Design système cohérent, esthétique Bloomberg Terminal crédible
- Hero V2 avec headline fort ("YOUR SAAS BLEEDS 18-32%. WE PROVE IT." en EN)
- Trust bar 4 signaux (GDPR/DSGVO, 48h, prix, méthode) — bonne décision P1.2 du 17 avril
- IndustryValidation avec 4 stats Gartner/Flexera/FinOps — crédible et vérifiable
- JSON-LD schema complet (Organization, WebSite, WebApplication, Product, Service)
- Hreflang correct : en, en-US, en-GB, de, de-DE, de-AT, de-CH, nl, nl-NL, fr, x-default
- Meta OG solide : titre, description, image 1200×630, Twitter Card
- LeakCounter avec animation temps réel — crée l'urgence

**Faiblesses :**
- LeakCounter hardcodé en français (`"DÉTECTÉS AUJOURD'HUI"`) pour TOUS les locales — `home-client.tsx:78` — **CRITIQUE pour DACH**
- Panel droit du héros (métriques) hardcodé en français : "Délai de livraison garanti", "Phases de détection autonomes", etc. — `home-client.tsx:366-370` — **non-i18n**
- Pricing section sur la homepage affiche statiquement €490 avec CTA "Débloquer le protocole" — ne reflète pas 590€ DACH
- Le PricingSection dans home-client (L1147) envoie le checkout avec `domain: "demo.com"` — `home-client.tsx:1154` — pas le vrai domaine de l'utilisateur
- Page servie en `lang="en"` indépendamment de la locale détectée — `<html lang="en">` dans le HTML servi
- Aucun lien footer visible vers Privacy/Terms sur la home
- Le `<h1>` est caché (`aria-hidden="true"`, `position: absolute`, clip) — Google peut ignorer un H1 caché. Meilleure pratique : le H1 devrait être visible dans le DOM du composant client, pas seulement pré-rendu caché.

**Recos :**
- `home-client.tsx:78` — Remplacer `DÉTECTÉS AUJOURD'HUI` par `t("v2.leakCounter.label")` + ajouter la clé dans les 4 locales
- `home-client.tsx:366-370` — Remplacer les labels hardcodés français par des clés i18n
- `home-client.tsx:1154` — Changer `domain: "demo.com"` par le domain saisi si disponible, sinon vide
- `app/(marketing)/page.tsx:38-43` — Rendre le H1 visible (position non absolue) ou dupliquer dans HomePageClient

---

### /intel (Scan gratuit — Decision Room)
**Score : 78/120**

**Forces :**
- Page fonctionnelle, se charge (status 200)
- Structure (app)/intel — route sous /(app) layout, correctement séparé du marketing
- ScanForm component utilisé : détecte le geo, passe country au checkout (fix P0.3 du 17 avril opérationnel ici)
- Lien "See sample report" localisé (DE/FR/EN) dans ScanForm — excellent

**Faiblesses :**
- Titre non récupéré dans l'audit (page 100% client-side, SSR limité)
- Sans vraie données, le scan gratuit est-il un vrai scan ou une estimation ? Non clair dans le funnel
- Le ScanForm hero variant n'est pas utilisé dans la homepage V2 (home-client.tsx a sa propre form) — donc la correction geo du ScanForm (fix P0.3) ne s'applique PAS au CTA hero de la homepage
- Inconsistance : home CTA → checkout sans country, intel CTA → checkout avec country

**Recos :**
- `components/marketing/home-client.tsx:91-110` — Remplacer le fetch checkout du hero par le ScanForm component (variant="hero"), ce qui apporterait automatiquement la détection geo DACH dans le flux principal

---

### /sample-report
**Score : 82/120**

**Forces :**
- Titre correct : "Sample Decision Pack — See What You Get | Ghost Tax"
- Les 3 sections P1.4 sont présentes (METHODOLOGY, WHAT'S INSIDE THE DECISION PACK, AFTER THE DECISION PACK)
- Données fictives clairement sourcées (Nexus Digital, disclaimer watermark)
- Section METHODOLOGY avec les 3 layers de confiance (95%/70%/50%) — crédibilité CFO forte
- Section WHAT'S INSIDE détaille les 6 livrables concrets avec prix (490€ / 590€ DACH)
- AFTER THE PACK introduit Rail B Monitor sans push agressif — tonalité correcte
- Export tab avec download .txt fonctionnel

**Faiblesses :**
- Données en USD ($) dans le code (`fmt()` function L12 — "$" hardcodé) mais prix affiché en EUR (490€/590€) — incohérence devise : `sample-report/page.tsx:12` — le rapport "sample" montre des chiffres en $ pour une audience principalement EUR/DACH
- Trust footer : `"SOC2-Certified Infrastructure"` (`sample-report/page.tsx:103`) — Ghost Tax n'est pas certifié SOC2 (rule `02-payments.md` dit "SOC 2 in progress"). Affirmation fausse.
- La clé i18n `sample.cta` dans nl.json est `"UNLOCK CORRECTIVE PROTOCOL — €490"` — utilise "UNLOCK" (anti-pattern)
- Le rapport example est entièrement en anglais même si la locale est DE — aucune adaptation i18n du contenu du rapport lui-même (les textes ANOMALY, RECS, CATEGORIES viennent des clés `sample.*` qui sont bien i18n, mais les labels hardcodés du panneau méthodologie sont en anglais seulement)

**Recos :**
- `sample-report/page.tsx:12` — Changer `"$"` par `fc()` (formatCurrency déjà importé) ou utiliser un set de données EUR par défaut pour les marchés non-US
- `sample-report/page.tsx:103` — Remplacer `"SOC2-Certified Infrastructure"` par `"GDPR-safe Infrastructure"` ou `"Zero-Knowledge Architecture"` — vérifiable et honnête
- `messages/nl.json:455` — Remplacer `"UNLOCK CORRECTIVE PROTOCOL"` par `"VOLLEDIG RAPPORT VERKRIJGEN"` ou équivalent

---

### /pricing
**Score : 55/120**

**Forces :**
- Titre correct : "Pricing — Ghost Tax" (après déduplication)
- 3 tiers bien structurés (Detect, Stabilize, Monitor)
- FAQ intégrée
- Checkout fonctionnel avec locale

**Faiblesses (CRITIQUES) :**
- `pricing/page.tsx:23` — `const detectPrice = 490;` hardcodé, aucun appel `/api/geo`, aucune logique DACH. Un visiteur allemand voit 490€ partout, puis Stripe lui facture 590€. **C'est le bug DACH P0 qui existait avant le 17 avril, et qui subsiste sur /pricing.**
- Le JSON-LD schema de /pricing (`lib/schema.ts` ou équivalent) liste prix 490 USD ET 490 EUR — mais il n'y a pas de paiement USD fonctionnel (getCurrency() retourne toujours "eur"). Schema SEO menteur.
- Le CTA dans le tier "Detect" inclut le prix dans le bouton : `"See my exposure — 490 €"` (L271). Pour un visiteur DACH, ce sera faux jusqu'à ce qu'il arrive sur Stripe.
- `pricing/page.tsx:173` — `{isUSD ? "$490" : "490 €"}` — isUSD basé sur locale "en", mais un CFO UK en locale "en" verra "$490" au lieu de "490 €". Bug de devise pour UK.

**Recos :**
- Priorité absolue : Ajouter un `useEffect` au chargement de `/pricing` qui appelle `/api/geo` et met à jour `detectPrice` en conséquence — exactement comme `ScanForm` le fait déjà
- `pricing/page.tsx:16` — La logique `isUSD` doit être basée sur `country` (US uniquement), pas sur locale. UK = locale "en" mais devise EUR.
- `pricing/page.tsx:173` — Afficher le prix en EUR pour tous sauf US détecté via geo
- Corriger le JSON-LD schema : soit 490 EUR (sans DACH) soit les deux offres (490 EUR général + 590 EUR DACH)

---

### /methodology
**Score : 76/120**

**Forces :**
- Titre : "Methodology — Ghost Tax"
- Page dédiée à la méthode : signal fort pour CFO skeptique
- Structure présente

**Faiblesses :**
- Page 100% client-side, contenu non évalué sans exécution JS (SEO limité)
- Pas pu accéder au contenu complet — évaluation partielle

---

### /platform
**Score : 68/120**

**Forces :**
- Titre : "Platform — Ghost Tax"
- Page présente, status 200

**Faiblesses :**
- Titre SEO faible : "Platform — Ghost Tax" sans keyword. Devrait être "Ghost Tax Platform — 21-Phase SaaS & Cloud Exposure Detection"
- Page 100% client-side

---

### /about
**Score : 70/120**

**Forces :**
- Titre : "About — Ghost Tax | Ghost Tax" (doublon à corriger)
- Transparence fondateur : Jean-Étienne Hélène, LinkedIn lien, biographie honnête
- Pas de fausse équipe (une seule personne mentionnée)

**Faiblesses :**
- **Titre dupliqué** : `"About — Ghost Tax | Ghost Tax"` — deux fois "Ghost Tax". Corrigible dans le layout.tsx
- Mission text (`about.mission.p1`) contient `"missed negotiation leverage"` — utilise le mot "leverage" (anti-pattern IA per brief)
- Solo founder avec 0 client = le texte "Decision intelligence practitioner. Previously led IT cost optimization programs for European mid-market companies" n'a aucune preuve. Risque de crédibilité.

**Recos :**
- `app/(marketing)/about/layout.tsx` — Corriger le title en `"À propos | Ghost Tax"` ou équivalent sans doublon
- `messages/en.json:"about.mission.p1"` — Remplacer "missed negotiation leverage" par "missed renegotiation windows"

---

### /contact
**Score : 72/120**

**Forces :**
- Titre : "Questions About Your Report | Ghost Tax" — orienté CFO post-achat, bon angle
- Email audits@ghost-tax.com présent

**Faiblesses :**
- Titre orienté "post-rapport" alors que /contact devrait aussi servir les prospects pré-achat
- Pas de formulaire de contact standard visible dans la review

---

### /faq
**Score : 65/120**

**Forces :**
- Titre : "FAQ — Ghost Tax | Ghost Tax" (doublon)
- Page présente

**Faiblesses :**
- **Titre dupliqué** : doublon "Ghost Tax"
- Contenu non évalué entièrement (client-side)
- Manque de questions orientées "DACH" (DSGVO, paiement par virement, etc.)

---

### /ghost-tax (Calculator)
**Score : 78/120**

**Forces :**
- Titre : "Ghost Tax Calculator — How Much Is Your Company Losing to IT Waste? | Ghost Tax | Ghost Tax"
- Outil viral bien pensé (growth hack #2 de la stratégie)
- URL mémorable

**Faiblesses :**
- **Titre triplé** : "Ghost Tax" apparaît 2 fois (Ghost Tax Calculator / Ghost Tax / Ghost Tax)
- URL `/ghost-tax` confusante (même nom que la marque). Un nouveau visiteur qui cherche "ghost tax" et atterrit sur `/ghost-tax` est désorienté.

---

### /estimator
**Score : 62/120**

**Forces :**
- Titre : "Ghost Tax Estimator — Calculate Your IT Exposure | Ghost Tax"
- Status 200

**Faiblesses :**
- Doublonne avec /ghost-tax (deux estimateurs = confusion dans le funnel). Un seul devrait exister ou être clairement différencié
- SEO cannibalisation : deux pages sur le même intent (estimateur d'exposition IT)

---

### /case-studies
**Score : 74/120**

**Forces :**
- Titre : "Case Studies | Ghost Tax — Real CFO Results | Ghost Tax"
- Disclaimer GDPR présent (`caseStudies.disclaimer` — "These scenarios represent typical findings... Company details are anonymized per GDPR")
- 3 cas structurés Challenge → Detection → Outcome

**Faiblesses :**
- Titre : répétition "Ghost Tax" (doublon)
- "Real CFO Results" dans le titre alors que ce sont des "typical findings" — tension avec le disclaimer. Soit l'un soit l'autre.
- Aucun lien externe vérifiable, aucune date de publication visible

---

### /api/geo (Test direct)
**Score : 95/120**

**Forces :**
- Status 200
- Réponse correcte : `{"country":"US","locale":"en","isDACH":false,"priceEur":490,"priceFormatted":"490 €","source":"vercel-edge"}`
- Edge runtime rapide
- Headers de sécurité excellents : HSTS, X-Frame-Options: DENY, X-Content-Type-Options, CSP complet, Permissions-Policy
- Source "vercel-edge" correctement identifiée

**Faiblesses :**
- `priceFormatted` retourne `"490 €"` même pour US — devrait retourner `"€490"` ou `"$490"` selon la convention locale. Format incohérent (EUR symbol après le chiffre pour toutes locales).
- Aucune valeur de cache (`x-vercel-cache: MISS`) — normal pour edge geo, mais à noter.

---

## TESTS EXÉCUTÉS

### Test 1 — Multi-locale : ⚠️ PARTIEL

**Résultat :** Les clés héros V2 existent bien dans les 4 locales (EN/DE/NL/FR) et sont correctes :
- DE : `"IHR SAAS / VERLIERT 18-32%. / WIR BEWEISEN ES."` ✅
- NL : `"UW SAAS / LEKT 18-32%. / WIJ BEWIJZEN HET."` ✅
- EN : `"YOUR SAAS / BLEEDS 18-32%. / WE PROVE IT."` ✅
- FR : `"VOS DÉPENSES / SAAS & IA / SAIGNENT."` ✅

**Mais :** La page est servie avec `<html lang="en">` pour tous les visiteurs (la langue est stockée dans localStorage côté client, pas dans l'HTML servi). Un CFO allemand sans JavaScript (rare mais possible) ou un bot de traduction reçoit du contenu EN.

**Problème critique :** Le LeakCounter (`home-client.tsx:78`) et les métriques du panel droit (`home-client.tsx:366-370`) sont **hardcodés en français** dans le JSX, indépendamment des clés i18n. Ces strings ne passent pas par `t()`.

**Strings hardcodées non-i18n dans home-client.tsx :**
- L78 : `DÉTECTÉS AUJOURD'HUI`
- L366 : `"Délai de livraison garanti"`
- L367 : `"Phases de détection autonomes"`
- L368 : `"Détection one-shot, pas abonnement"`
- L369 : `"Types de fuites détectées"`
- L370 : `"Détection → pack décisionnel"`
- L417 : `"PIPELINE 21 PHASES · ZÉRO ACCÈS SYSTÈME"`
- L1565 : `"DECISION INTELLIGENCE · 2026"` (footer)

**NL trustBar pricing :** `"Eenmalig 490 €"` — ne mentionne pas les 590€ DACH. Pour un visiteur NL (Pays-Bas, hors DACH), c'est correct, mais manque de clarté sur pourquoi le prix est différent pour DE/AT/CH.

---

### Test 2 — Pricing géo : ⚠️ BUG CONFIRMÉ

**Résultat :**
- `/api/geo` : ✅ Fonctionne, retourne country, isDACH, priceEur, source
- `lib/pricing.ts` : ✅ Logique DACH correcte — `getRailAPrice()` retourne 590 si country ∈ {DE, AT, CH}
- `app/api/stripe/checkout/route.ts` : ✅ Fix P0 du 17 avril opérationnel — lit `body.country` (client via geo) ET `x-vercel-ip-country` (header Vercel) — la cohérence hero→checkout est assurée SI le ScanForm est utilisé
- `components/marketing/scan-form.tsx` : ✅ Appelle `/api/geo` au mount, passe country au checkout

**BUG :** `app/(marketing)/pricing/page.tsx:23` — `const detectPrice = 490;` — aucun appel geo. La page /pricing affiche 490€ pour tous les visiteurs. Un Allemand voit 490€ sur /pricing, clique "Buy", et Stripe l'affiche à 590€. **Le bug DACH n'est résolu que dans le flux intel/home-form, pas dans le flux pricing.**

**BUG 2 :** `app/(marketing)/home-client.tsx:1147-1163` — La PricingSection du home fait son propre `fetch("/api/stripe/checkout", { body: { domain: "demo.com", rail: "A" } })` sans passer country ou locale. Le checkout ne reçoit que `rail: "A"`, donc `getRailAPrice(undefined, "en", undefined)` = 490€ même pour DACH.

---

### Test 3 — Sample report : ✅ OK (avec réserves)

**Résultat :**
- Section METHODOLOGY présente ✅
- Section WHAT'S INSIDE THE DECISION PACK présente ✅ (avec prix 490€ / 590€ DACH)
- Section AFTER THE DECISION PACK présente ✅ (Rail B Monitor upsell éthique, non-push)

**Réserve :**
- `sample-report/page.tsx:12` — `fmt()` hardcode `"$"` — données USD pour une audience EUR
- `sample-report/page.tsx:103` — `"SOC2-Certified Infrastructure"` — **FAUX**. Le règle `02-payments.md` dit "SOC 2 in progress". Affirmation trompeuse.

---

### Test 4 — Checkout flow : ✅/⚠️ PARTIEL

**Résultat :**
- `app/api/stripe/checkout/route.ts` : Logique correcte — gère A, B_STABILIZE, B_MONITOR
- Geo country : ✅ Fix du 17 avril opérationnel — lit `body.country` puis `x-vercel-ip-country`
- Locale : ✅ Stripe locale = `fr`/`de`/`en` selon locale détectée
- Description localisée : ✅ `custom_text.submit.message` et `custom_text.after_submit.message` dans les 3 langues
- Pricing dynamique : ✅ `getRailAPrice()` appelé avec headcount + locale + country

**Problème :** `home-client.tsx:99` (hero form) envoie `{ domain, rail: "A" }` sans `country` ni `locale`. Le checkout tombe sur `locale: "en"`, `country: undefined`, donc `getRailAPrice(undefined, "en", undefined)` = 490€ même depuis DE. Le fix S'applique uniquement quand `body.country` est passé (ScanForm) ou quand Vercel edge header est présent (normalement disponible en prod).

**Note :** En production Vercel, `x-vercel-ip-country` est disponible côté API route, donc le checkout DEVRAIT recevoir le bon country même sans le passer côté client. À vérifier que ce header est bien injecté par Vercel sur les API routes (pas seulement sur les edge functions).

---

### Test 5 — SEO : ✅ SOLIDE

**Résultat :**
- Title : `"Ghost Tax — SaaS & Cloud waste audit for CFOs"` ✅ (pertinent, keyword-riche)
- Meta description : `"Find what your SaaS stack really costs — 18-32% of mid-market IT budgets leak invisibly. Board-ready PDF in 48 hours from public signals only. No integration, no calls. Decision Pack 490€ (DACH 590€)."` ✅ (excellent, includes prix)
- Hreflang : `en, en-US, en-GB, de, de-DE, de-AT, de-CH, nl, nl-NL, fr, x-default` ✅ — complet
- Canonical : `https://ghost-tax.com` ✅
- JSON-LD : Organization, WebSite, WebApplication, Product, Service ✅
- OG : titre, description, image 1200×630, type, url, site_name ✅
- Twitter Card : summary_large_image ✅
- Sécurité headers : HSTS, X-Frame-Options DENY, CSP solide ✅

**Problèmes :**
- `<html lang="en">` statique pour tous visiteurs — devrait être dynamique selon locale détectée
- `/about` title : `"About — Ghost Tax | Ghost Tax"` — doublon
- `/faq` title : `"FAQ — Ghost Tax | Ghost Tax"` — doublon
- `/ghost-tax` title répète "Ghost Tax" 3 fois
- JSON-LD schema /pricing liste une offre à 490 USD qui n'est pas fonctionnelle (getCurrency retourne toujours EUR)

---

### Test 6 — Anti-patterns IA : ⚠️ PRÉSENTS

**Occurrences détectées dans les fichiers messages/ :**

| Terme | Occurrences | Fichier(s) | Contexte |
|-------|-------------|------------|---------|
| "unlock" | 12+ | en.json, nl.json | CTAs: "UNLOCK CORRECTIVE PROTOCOL", "UNLOCK FULL REPORT" |
| "leverage" | 15+ | en.json, nl.json, de.json | "leverage points", "negotiation leverage", "missed negotiation leverage" |
| "AI Financial Control Plane" | 2 | en.json, de.json | `hero.badge` key |
| "Proprietary Causal Financial Graph" | 1 | en.json:10 | `hero.sub` |
| "Causal Financial Graph" | 5+ | en.json, nl.json | Multiple pages |
| "journey" | 0 | — | Absent ✅ |
| "ecosystem" | 0 | — | Absent ✅ |

**Analyse :**
- **"AI Financial Control Plane"** (`messages/en.json:7`, `messages/de.json:7`) : C'est exactement le type de jargon qui fait lever les yeux au ciel à un CFO. Personne ne cherche un "control plane". À supprimer.
- **"Proprietary Causal Financial Graph"** (`messages/en.json:10`) : Buzzword IA pur. Comment un CFO vérifie-t-il qu'un "Causal Financial Graph" existe ? Remplacer par "Reconstruit à partir de 3 couches de signaux publics".
- **"unlock"** : 12+ occurrences dans les CTAs. Le CTA V2 (`home-client.tsx:1189`) dit "Débloquer le protocole" — même concept. Un CFO n'a pas besoin qu'on lui "débloque" quoi que ce soit. Il achète une prestation.
- **"leverage"** : Technique B2B légitime dans le contexte "negotiation leverage", mais sursaturé.

**Impact :** Les clés `hero.badge` et `hero.sub` contenant ces anti-patterns sont-elles affichées dans la V2 de la home ? Dans `home-client.tsx`, le hero V2 utilise `v2.hero.eyebrow` (pas `hero.badge`) et `v2.hero.sub` (pas `hero.sub`). Donc la home V2 est **propre de ces anti-patterns**. Mais la page /pricing, /platform, et d'autres pages qui utilisent les anciennes clés les affichent encore.

---

### Test 7 — CFO 3 secondes test : ✅ PASSE (avec effort)

**En lisant le hero V2 (home-client.tsx) pour un visiteur EN :**

| Critère | Résultat | Délai de compréhension |
|---------|----------|----------------------|
| Ce qu'on vend | "YOUR SAAS BLEEDS 18-32%. WE PROVE IT." | 1 seconde ✅ |
| Pour qui (CFO) | Eyebrow "SAAS & CLOUD WASTE AUDIT — FOR CFOs" | 1 seconde ✅ |
| Combien (prix) | Trust bar "One-time 490€ · 590€ DACH" | 2-3 secondes ✅ |
| Délai (48h) | Trust bar "48h delivery · PDF only" | 2-3 secondes ✅ |
| Signal GDPR | Trust bar "GDPR-safe · zero data collection" | 2-3 secondes ✅ |

**Verdict** : Pour un CFO anglophone, le 3-second test PASSE. Pour un CFO germanophone, le hero dit **les bonnes choses en allemand** (`v2.hero.*` clés DE sont correctes) — MAIS le LeakCounter (`DÉTECTÉS AUJOURD'HUI`) et le panel droit (labels hardcodés FR) cassent immédiatement l'immersion. Note 3s test DACH : 5/10.

---

### Test 8 — Console/code errors : ⚠️ PROBLÈMES DÉTECTÉS

**Problèmes identifiés dans le code source :**

1. **`home-client.tsx:441-455`** — `StatsStrip` : `clearInterval(timers[i])` dans le callback de `setInterval` — les `timers` sont référencés avant d'être entièrement créés (`timers[i]` peut être `undefined` si l'index `i` est créé après l'exécution du callback). Race condition potentielle. Impact : faible en pratique mais incorrect.

2. **`home-client.tsx:1154`** — `PricingSection.handleRailA` : envoie `domain: "demo.com"` hardcodé à Stripe. Si le checkout est complété, le webhook Supabase recevra `domain: "demo.com"` comme domaine client. Impact sur le pipeline de délivrance.

3. **`sample-report/page.tsx:86-104`** — Module-level mutable variables `let _ANOMALIES` et `let _RECS` — mutation de variables globales depuis le composant React. Pattern anti-React (effets de bord, problèmes SSR/hydration).

4. **`app/api/stripe/checkout/route.ts:34-45`** — `rateMap` est un `Map` en mémoire (variable module-level) — en serverless (Vercel), chaque instance a son propre état, donc la rate limiting n'est pas partagée entre instances. Ce n'est pas une vraie rate limiting distribuée.

5. **`scan-form.tsx:220-225`** — Liens vers `/sample-report-de.pdf`, `/sample-report-fr.pdf`, `/sample-report-en.pdf` — ces fichiers existent bien dans `/public/`. ✅

---

### Test 9 — Benchmarks : GHOST TAX SOUS-PERFORME

#### vs Spendflo
- **Positionnement** : "Effortless AI-Native Procurement Platform" — équipe intégrée, plateforme SaaS permanente, procurement-as-a-service
- **Modèle** : Abonnement, équipe dédiée, workflow complet intake-to-procure
- **Prix** : Non affiché publiquement (enterprise)
- **Comparaison Ghost Tax** : Ghost Tax est positionné sur une niche différente (one-shot 48h, no integration) — bonne différenciation. Mais Spendflo a des clients réels visibles, du social proof massif, et des logos clients. Ghost Tax a 0 proof.

#### vs Cledara
- **Positionnement** : "Cledara aligns Finance & IT to control SaaS and AI risk. Prevent unvetted spend, automate accounting, and secure user lifecycles in one platform."
- **Modèle** : Plateforme permanente avec cartes virtuelles, contrôles automatiques
- **Comparaison Ghost Tax** : Cledara est un outil de gouvernance ongoing. Ghost Tax est un audit one-shot. Pas en compétition directe, mais les deux répondent au même signal d'achat ("je perds de l'argent en SaaS"). Cledara a des témoignages vérifiables, des certifications, et des intégrations avec les outils comptables. Ghost Tax n'a rien de tout ça.

#### vs Vendr
- **Positionnement** : "The Authority on Software Pricing Transparency" — accès à $15B+ de données de transactions, Price Checks gratuits
- **Modèle** : $36k-$120k/an, guarantie de ROI supérieur au coût
- **Comparaison Ghost Tax** : Vendr a un moat de données réel ($15B transactions) et un modèle de garantie ROI clair. Ghost Tax prétend à un "data flywheel" mais sans clients, le flywheel est vide. Le "AUCUNE N'A RETOURNÉ ZÉRO EXPOSITION" (`home-client.tsx:829`) est non vérifiable.

**Conclusion benchmarks** : Ghost Tax est le seul des 4 à ne pas avoir de clients visibles, de logos, ou de preuves vérifiables. Les concurrents ont tous un "moat" (données, équipe, intégrations). Ghost Tax a une proposition originale (48h, no integration, one-shot) mais sans proof, la proposition ne convertit pas.

---

## COMPARAISON BENCHMARKS

### vs Spendflo
- Différenciation Ghost Tax : One-shot 48h (pas d'abonnement, pas d'agent) = légitime
- Faiblesse : Spendflo a des dizaines de logos clients, G2 reviews, case studies vérifiables
- Score positionnement Ghost Tax vs Spendflo : Ghost Tax gagne sur la simplicité, perd sur la crédibilité

### vs Cledara
- Différenciation Ghost Tax : Zéro accès système, zéro intégration = légitime pour DSI/RSSI réticents
- Faiblesse : Cledara a un produit utilisable en continu. Ghost Tax est ponctuel.
- Score : égal en différenciation, Ghost Tax perd sur proof

### vs Vendr
- Différenciation Ghost Tax : Prix 490€ vs $36k+ = inaccessible pour Vendr. Ghost Tax vise le mid-market que Vendr ignore.
- Faiblesse : Vendr a un dataset réel de $15B. Ghost Tax a des "signaux publics" non prouvés.
- Score : Ghost Tax gagne sur prix/accessibilité, perd massivement sur data credibility

---

## LES 3 P0 ABSOLUS

### P0.1 — LeakCounter et métriques héros hardcodés en français
**Fichier/ligne :** `components/marketing/home-client.tsx:78` (DÉTECTÉS AUJOURD'HUI), L366-370 (métriques panel droit)

**Impact € estimé :** Le marché DACH (590€) est le marché premium. Un CFO allemand qui voit un compteur en français sur une page censée être en allemand quitte immédiatement. Si 30% du trafic est DACH (590€ vs 490€ = +20% de valeur), et que ce bug crée 50% d'abandon supplémentaire, on parle de **-10% de revenus totaux**.

**Fix concret :**
```tsx
// home-client.tsx:75-81 — Remplacer
const { t } = useI18n(); // déjà importé via useI18n dans HeroSection
// ...
// Ligne 78 actuelle :
€{amount.toLocaleString("de-DE")} DÉTECTÉS AUJOURD'HUI
// Remplacer par :
€{amount.toLocaleString(locale === "de" ? "de-DE" : "en-US")} {t("v2.leakCounter.label") || "DETECTED TODAY"}
```
+ Ajouter la clé `v2.leakCounter.label` dans en.json/de.json/nl.json/fr.json

Pour les métriques L366-370, extraire dans une fonction `getMetrics(t)` qui utilise les clés i18n existantes.

---

### P0.2 — Pricing page aveugle au pays (discordance 490€ → 590€ en Stripe)
**Fichier/ligne :** `app/(marketing)/pricing/page.tsx:23` — `const detectPrice = 490;`

**Impact € estimé :** Tout prospect DACH qui arrive sur /pricing voit 490€ et clique "acheter" — Stripe lui affiche 590€. C'est une surprise de prix +20% à la dernière étape. Les études montrent que toute surprise de prix sur la page de paiement génère 40-70% d'abandon. Si 40% du trafic est DACH et que 60% abandonnent à cause de ça, on perd ~24% des conversions DACH = **plusieurs centaines d'euros par semaine à plein régime**.

**Fix concret :**
```tsx
// Ajouter en haut de pricing/page.tsx :
const [geoData, setGeoData] = useState<{ isDACH: boolean; priceEur: number } | null>(null);
useEffect(() => {
  fetch("/api/geo").then(r => r.json()).then(setGeoData).catch(() => {});
}, []);
const detectPrice = geoData?.isDACH ? 590 : 490;
```
Même logique que `scan-form.tsx:32-37` — copier-coller de 5 lignes.

---

### P0.3 — Testimonials présentés comme réels sans disclaimer visible
**Fichier/ligne :** `messages/en.json:65` ("WHAT OUR CLIENTS SAY"), `messages/de.json:65` ("WAS UNSERE KUNDEN SAGEN"), `messages/en.json:66` ("Real results. Real savings.")

**Impact € estimé :** Un prospect B2B qui découvre que les testimonials sont fictifs (et il le découvrira — soit en cherchant les entreprises, soit par rumeur LinkedIn) = mort de la réputation. Pas de récupération possible. 0 conversions sur le long terme. C'est existentiel.

**Statut :** La home V2 (`home-client.tsx`) a remplacé les testimonials par `IndustryValidation` (données Gartner/Flexera) — bonne décision éthique. MAIS les clés `testimonials.*` existent encore dans les i18n files et sont probablement utilisées sur d'autres pages (pricing, landing pages alternatives, etc.) encore actives.

**Fix concret :**
1. Grep toutes les pages qui utilisent `t("testimonials.*")` : `grep -rn '"testimonials\.' app/ components/`
2. Toutes les occurrences → Soit supprimer la section, soit remplacer par un label `"REPRESENTATIVE SCENARIOS"` avec disclaimer visible : `"These are composite scenarios based on typical findings. Ghost Tax is new and has not yet published attributed customer case studies."`
3. Mettre à jour `messages/en.json:65-66` : `"testimonials.label": "REPRESENTATIVE FINDINGS"`, `"testimonials.title": "What typical clients experience"`

---

## LES 5 P1

### P1.1 — PricingSection hero envoie domain: "demo.com" au checkout
**Fichier :** `home-client.tsx:1154`
**Fix :** Utiliser le domain saisi dans le formulaire hero ou le vider. `body: JSON.stringify({ rail: "A" })` suffit.

### P1.2 — Pricing page UK: isUSD basé sur locale "en" au lieu de country
**Fichier :** `pricing/page.tsx:16-17`
**Fix :** Après le fix geo (P0.2), utiliser `geoData?.country === "US"` pour isUSD, pas `locale === "en"`.

### P1.3 — `<html lang="en">` statique pour tous les visiteurs
**Fichier :** `app/(marketing)/layout.tsx` (ou `app/layout.tsx`)
**Fix :** Générer le lang dynamiquement depuis les cookies/headers ou utiliser un segment [locale] dans l'URL (plus robuste SEO, recommandé Next.js i18n).

### P1.4 — Titres de pages avec doublon "Ghost Tax" (About, FAQ, Case Studies)
**Fichiers :** `app/(marketing)/about/layout.tsx`, `app/(marketing)/faq/layout.tsx`, `app/(marketing)/case-studies/layout.tsx`
**Fix :** Changer les titles en `"À propos | Ghost Tax"`, `"FAQ | Ghost Tax"`, `"Études de cas | Ghost Tax"`.

### P1.5 — "SOC2-Certified Infrastructure" dans l'export du sample report
**Fichier :** `app/(marketing)/sample-report/page.tsx:103`
**Fix :** Remplacer par `"GDPR-safe Infrastructure | Zero-Knowledge Architecture"`. Honnête et vérifiable.

---

## LES 5 P2

### P2.1 — Données USD ($) dans le sample report pour audience EUR
**Fichier :** `app/(marketing)/sample-report/page.tsx:12`
**Fix :** Créer une version EUR des données COMPANY/SCORE/ANOMALY_DEFS, ou détecter la locale et afficher la devise appropriée.

### P2.2 — Anti-patterns IA dans les vieilles clés hero (hero.badge, hero.sub)
**Fichiers :** `messages/en.json:7,10`, `messages/de.json:7,10`
**Fix :** `"hero.badge"` → `"SAAS & CLOUD WASTE DETECTION"`, `"hero.sub"` → supprimer "proprietary Causal Financial Graph", remplacer par description des 3 signal layers.

### P2.3 — PipelineSection mobile : texte 9px illisible
**Fichier :** `home-client.tsx:958` (`fontSize: "9px"` pour les noms de phases en mobile)
**Fix :** Minimum 11px. Ou réduire la grille mobile à 2 colonnes avec les 21 phases en 11×2 au lieu de 7×3.

### P2.4 — Race condition StatsStrip clearInterval
**Fichier :** `home-client.tsx:441-455`
**Fix :** Capturer les ids dans `useRef`, ne pas référencer `timers[i]` depuis l'intérieur du callback.

### P2.5 — Footer sans liens légaux
**Fichier :** `home-client.tsx:1563-1566`
**Fix :** Ajouter `<Link href="/legal/privacy">Privacy</Link>` et `<Link href="/legal/terms">Terms</Link>` dans le footer. Obligatoire RGPD Article 13 pour un site qui collecte des emails.

---

## RISQUES DÉTECTÉS

### Risques légaux
1. **Testimonials fictifs présentés comme réels** — violation FTC Endorsement Guidelines (US), Article L121-1 Code de la consommation (FR), UWG §5 (DE). Risque : plainte concurrente, signalement, perte de crédibilité.
2. **"SOC2-Certified Infrastructure"** (`sample-report/page.tsx:103`) — Allégation fausse. Ghost Tax n'est pas certifié SOC2. Risque : violation de la réglementation sur les certifications.
3. **Pas de liens Privacy/Terms dans le footer** — violation RGPD Article 13 (information des utilisateurs lors de la collecte).

### Risques business
4. **Discordance pricing DACH sur /pricing** (P0.2) — abandon checkout garanti pour le marché le plus lucratif.
5. **LeakCounter en français** (P0.1) — destruction de la crédibilité sur DACH immédiatement.
6. **0 client réel visible** — sans testimonials vérifiables ni logos clients, les prospects B2B font une recherche LinkedIn et trouvent un fondateur seul. L'écart entre l'ambiance "Bloomberg Terminal" du design et la réalité "early-stage solo" est contre-productif si non géré.

### Risques techniques
7. **Rate limiting non distribuée** (`checkout/route.ts:34`) — en production Vercel multi-instance, la rate limiting par IP n'est pas partagée. Une attaque avec 100 instances contourne le limit.
8. **Module-level mutable state** (`sample-report/page.tsx:83-84`) — `_ANOMALIES` et `_RECS` sont des variables globales mutées par le composant. En SSR ou avec React 18 concurrent rendering, ceci peut produire des états corrompus.

---

## AUDIT VISUEL LIVE — 17 avril 2026

> Navigation réelle effectuée via Chrome (Claude in Chrome MCP). Locale EN active (localStorage). Screenshots capturés. Données extraites via get_page_text. Heure : ~20h00 UTC.

---

### RÉSULTATS LIVE PAR PAGE

#### / (Landing principale) — LIVE

**Hero text réel affiché (locale EN) :**
- LeakCounter : `€304.291 DÉTECTÉS AUJOURD'HUI` — **hardcodé FR, confirmé visuellement même en locale EN**
- Eyebrow : `SAAS & CLOUD WASTE AUDIT — FOR CFOs`
- H1 : `YOUR SAAS BLEEDS 18-32%. WE PROVE IT.`
- Subline : `We reconstruct your invisible SaaS, AI and Cloud spend from public signals — no integration, no login, no calls. Board-ready PDF in 48 hours.`

**Panel droit (locale EN) — TOUJOURS EN FRANÇAIS :**
- `SIGNAL ACTIF` (label section)
- `48H / DÉLAI DE LIVRAISON GARANTI`
- `21 / PHASES DE DÉTECTION AUTONOMES`
- `€490 / DÉTECTION ONE-SHOT, PAS ABONNEMENT`
- `12 / TYPES DE FUITES DÉTECTÉES`
- `48 HEURES / DÉTECTION → PACK DÉCISIONNEL`
- `PIPELINE 21 PHASES · ZÉRO ACCÈS SYSTÈME`

**CTAs visibles :**
- Navbar : `RUN DETECTION` (EN) ✅
- Hero : `DÉTECTER` + `→ Lancer un scan gratuit` — **CTA en français même en locale EN** ❌
- Trust bar : `One-time 490€ · 590€ DACH` ✅

**Trust signals :**
- 4 stats Gartner/Flexera/Vertice/FinOps Foundation 2026 — crédibles ✅
- Disclaimer explicite : `"Ghost Tax is new. Our product is transparent methodology, not customer testimonials."` — **honnêteté exemplaire** ✅
- Pas de testimonials fictifs sur la home V2 ✅

**Problèmes live confirmés :**
1. LeakCounter FR même en locale EN — confirmé screenshot
2. Panel droit FR même en locale EN — confirmé screenshot
3. CTA hero `DÉTECTER` en FR même en locale EN — **nouveau bug non détecté dans l'audit code**
4. Footer : `ghost-tax.com · DECISION INTELLIGENCE · 2026` — aucun lien Privacy/Terms visible ❌

---

#### /intel (Decision Room) — LIVE

**Hero text réel :**
- Badge : `FREE EXPOSURE SCAN`
- H1 : `Enter your domain. See your hidden IT spend in 60 seconds.` ✅ EN, correct
- Sub : `Enter your company domain. In 60 seconds, see how much your organization may be overspending on SaaS, Cloud, and AI — with zero system access required.`
- Trust tag : `Every analysis run — zero with zero exposure detected` (phrasing maladroit — "zero with zero")

**CTAs :**
- `RUN FREE SCAN` — pas d'"unlock" ✅
- Champs : `Company Domain`, `Corporate ID` (label bizarre — qu'est-ce que "Corporate ID" ?), `Where should we send your detailed results?`

**Problème détecté :**
- Label `Corporate ID` visible à côté de `Company Domain` — **champ ambigu, non mentionné dans l'audit code**. Un CFO ne sait pas ce que c'est. Risque d'abandon formulaire.

---

#### /sample-report — LIVE

**Contenu réel :**
- Bannière : `SAMPLE REPORT — FICTIONAL DATA — FOR DEMONSTRATION ONLY` ✅ visible et honnête
- Société : `Nexus Digital · SaaS / Tech · 185 employees · 74 SaaS tools`
- Score : `31 ELEVATED`
- **Toutes les valeurs en USD** : `$224k Annual Ghost Tax`, `$18,667 Monthly Leak`, `$82,000/mo total` — bug USD confirmé visuellement

**CTA final :**
- `UNLOCK CORRECTIVE PROTOCOL — €490` — utilise **"UNLOCK"** (anti-pattern) ❌

**Trust signals footer :**
- `SOC 2 — In Progress` ✅ — **correction positive vs audit code** (était "SOC2-Certified" dans le code, maintenant honnêtement "In Progress")
- `Zero-Knowledge Audit` ✅
- `US Data Residency` ✅
- `30-Day Auto-Delete` ✅

**Prix affiché dans la section "WHAT'S INSIDE" :**
- `490 € (590 € DACH)` — en EUR ✅ (correct, prix de la section est en EUR même si les données du rapport sont en USD)

---

#### /pricing — LIVE

**Titre réel (doublon confirmé) :** `Pricing — Ghost Tax | Rail A 490 € · Rail B · Rail C | Ghost Tax`

**Prix affiché pour visiteur locale EN :**
- `Prices in USD USD ($)` — **visiteur EN voit USD, bug critique confirmé**
- `INVESTMENT $490 one-time, no subscription`
- `AVG. EXPOSURE FOUND 127k median across completed analyses`
- CTA tier 1 : `See my exposure — $490` — en USD pour visiteur EN ❌

**Nouveaux éléments non vus dans l'audit code :**
- `30-Day Money-Back Guarantee` — "If our analysis doesn't identify at least 15% in addressable savings, we refund 100%." — **trust signal fort absent de l'audit**
- Tableau comparatif vs SaaS tools / Big 4 / Internal Audit — bien structuré
- Tier "Stabilization Protocol" affiché à `$4,990` (USD) pour visiteur EN ❌
- Tier "Continuous Drift Monitoring" à `$1,990/mo` (USD) pour visiteur EN ❌

**Incohérence garantie :**
- /pricing dit "30-Day Money-Back Guarantee"
- /faq dit "contact us within **14 days** for a full refund" (si moins de €5,000 trouvés)
- **Deux politiques de remboursement contradictoires** sur le même site ❌

---

#### /methodology — LIVE

**Titre :** `Methodology — How Ghost Tax Detects Financial Exposure | Ghost Tax` ✅ (pas de doublon)

**Contenu :**
- Hero : `How the system detects, classifies, and bounds financial exposure.` ✅
- Prix dans le corps : `$490 Full Detection Protocol` — USD ici aussi ❌
- Contenu technique riche, honnête sur les limitations ✅
- 7 sections détaillées (Observed / Inferred / Estimated / Confidence / Boundaries / Why useful / Paid protocol) ✅

**Qualité globale :** Excellente page. Le meilleur contenu du site. Signal de crédibilité fort pour CFO sceptique.

---

#### /platform — LIVE

**Titre (doublon) :** `Platform — Ghost Tax | Ghost Tax` ❌

**Hero :** `Decision intelligence for IT financial exposure`
**Sub :** `A 21-phase intelligence pipeline that detects hidden spend, explains its causes, and delivers corrective protocols with confidence scoring.`

**Contenu riche :**
- Description technique des 21 phases avec stack complet ✅
- `SOC2 Ready — Type II audit scheduled Q3 2026` ✅ honnête
- `"48h AI-powered analysis"` — utilise "AI-powered" ⚠️ (léger, acceptable)
- `"leverage points"` mentionné dans les playbooks de négociation — anti-pattern présent

---

#### /about — LIVE

**Titre (doublon confirmé) :** `About — Ghost Tax | Ghost Tax` ❌

**Hero :** `Financial intelligence for IT decisions` ✅

**Mission text :** `"missed negotiation leverage"` — anti-pattern "leverage" confirmé visuellement ❌

**Claim problématique :** `200+ Audits delivered` — **nouveau claim ajouté depuis l'audit code, non vérifié**. Si Ghost Tax n'a pas de clients réels documentés, afficher "200+ Audits delivered" est trompeur.

**Fondateur :** `HELENE Jean-Étienne — Founder & CEO` — transparence maintenue ✅

---

#### /contact — LIVE

**Titre :** `Questions About Your Report | Ghost Tax` ✅ (pas de doublon)

**Formulaire de contact complet (corrigé vs audit code) :** Champs Name, Work Email, Company, Company Size, Message — **formulaire présent et fonctionnel** ✅ (l'audit code disait "pas de formulaire visible")

**Nouveau pricing visible :** `TYPICAL INVESTMENT RANGE — Scoped engagements from 2,000 to 8,000 EUR` — Rail C pricing exposé sur /contact, ce qui est bien pour les prospects enterprise.

---

#### /faq — LIVE

**Titre (doublon confirmé) :** `FAQ — Ghost Tax | Ghost Tax` ❌

**Problème légal détecté :**
- FAQ "Where is my data stored?" : `"All data is stored in US-East-1 (Virginia) on SOC2-certified infrastructure."` — **"SOC2-certified" est faux** (SOC2 est "In Progress"). Même bug que l'audit code signalait sur /sample-report, mais ici il subsiste. ❌

**Incohérence garantie :**
- FAQ dit : `"contact us within 14 days for a full refund"` (si moins de €5,000 trouvés)
- /pricing dit : `"30-Day Money-Back Guarantee"` si moins de 15% addressable savings
- **Deux conditions ET deux délais différents** pour la même garantie ❌

**Contenu positif :**
- SEPA + bank transfers mentionnés (bon pour DACH) ✅
- Section "CFO & CTO Objections" bien construite ✅
- Refund policy honnête sur le principe ✅

---

### TEST API GEO — LIVE

**Résultat fetch direct `https://ghost-tax.com/api/geo` :**
```json
{
  "country": "US",
  "locale": "en",
  "isDACH": false,
  "priceEur": 490,
  "priceFormatted": "490 €",
  "source": "vercel-edge"
}
```

**Status :** 200 ✅ — Edge runtime, headers sécurité excellents (HSTS, X-Frame-Options DENY, CSP, Permissions-Policy)

**Bug confirmé :** `priceFormatted` retourne `"490 €"` même pour US — format EUR (symbol après le chiffre) pour une locale anglophone qui attendrait `"€490"`.

---

### TEST 404 — LIVE

Vérification via fetch HEAD sur 7 URLs :

| URL | Status | Conclusion |
|-----|--------|-----------|
| /ghost-tax | 200 | Page EXISTS ✅ |
| /estimator | 200 | Page EXISTS ✅ |
| /case-studies | 200 | Page EXISTS ✅ |
| /peer-gap | 200 | Page EXISTS ✅ |
| /procurement | 200 | Page EXISTS ✅ |
| /integrations | 200 | Page EXISTS ✅ |
| /intel-benchmarks | 200 | Page EXISTS ✅ |

**Conclusion :** Aucune des URLs testées ne retourne 404. Toutes ces pages existent en production. **L'audit code était incomplet sur ce point** — ces pages existaient déjà.

---

### TEST ANTI-PATTERNS — LIVE (contenu réel)

| Terme | Trouvé | Localisation |
|-------|--------|-------------|
| "unlock" | ✅ OUI | /sample-report CTA : "UNLOCK CORRECTIVE PROTOCOL — €490" |
| "leverage" | ✅ OUI | /about mission text : "missed negotiation leverage", /platform : "leverage points", /pricing tableau : "Leverage points" |
| "AI Financial Control Plane" | ❌ NON | Absent du contenu visible |
| "Proprietary Causal Financial Graph" | ❌ NON | Absent du contenu visible |
| "journey" | ❌ NON | Absent |
| "ecosystem" | ❌ NON | Absent |
| "DÉTECTÉS AUJOURD'HUI" | ✅ OUI | Homepage LeakCounter, TOUTES locales |

---

### TEST BENCHMARKS CONCURRENTS — LIVE

#### Spendflo (spendflo.com)
- **Hero live :** "Effortless AI-Native Procurement Platform"
- **CTA :** "Request a Demo" (friction élevée, pas d'essai libre)
- **Social proof :** Testimonials nominatifs réels (Josh Rappoport VP Finance, Dan Kim CFO), cas clients nommés, podcast actif
- **Différenciation Ghost Tax :** Ghost Tax gagne sur "Try without demo" (formulaire direct vs "Request a Demo")

#### Cledara (cledara.com)
- **Hero live :** "Control Spend and Risk Across Your SaaS and AI Stack"
- **Badges G2 :** Best Results, Leader, Best Relationship, Top 50 Software 2026 — **social proof institutionnel fort**
- **CTAs :** "Get Started" + "Book a Demo"
- **Différenciation Ghost Tax :** Ghost Tax gagne sur zero-integration (Cledara requiert intégration complète)

#### Vendr (vendr.com)
- **Hero live :** "Don't overpay for software" / "AI PRICING AND NEGOTIATION AGENTS"
- **Moat data :** `$15B+ in verified spend data` — claim concret et vérifiable
- **CTA :** "Try for Free" + "Get a Demo"
- **Évolution notable :** Vendr a pivoté vers "AI agents" — plus direct sur la valeur vs avant
- **Différenciation Ghost Tax :** Ghost Tax gagne sur prix (490€ vs pricing opaque Vendr) et sur délai (48h vs process plus long)

---

### NOUVEAUX PROBLÈMES DÉTECTÉS (absents de l'audit code)

**N1 — CTA hero FR en locale EN** ❌ CRITIQUE
Le CTA principal du hero affiche `DÉTECTER` (FR) même en locale EN. Le bouton secondaire `→ Lancer un scan gratuit` est aussi en FR. Ce n'était pas visible dans le code — c'est un bug live.

**N2 — "Corporate ID" label mystère sur /intel** ❌ P2
Champ affiché sous le formulaire de /intel : `Corporate ID`. Aucun CFO ne sait ce que c'est. Risque d'abandon.

**N3 — "200+ Audits delivered" sur /about** ❌ P1 LÉGAL
Claim non vérifié. Si aucun client payant n'existe, afficher "200+ Audits delivered" est trompeur. Devrait être remplacé par "200+ free scans run" ou supprimé.

**N4 — "SOC2-certified" dans la FAQ** ❌ P0 LÉGAL (subsiste)
La FAQ dit "SOC2-certified infrastructure" alors que SOC2 est "In Progress". Le fix du sample-report a été fait (maintenant "SOC 2 — In Progress") mais pas la FAQ.

**N5 — Deux garanties de remboursement contradictoires** ❌ P1 LÉGAL
- /pricing : "30-Day Money-Back Guarantee" si moins de 15% addressable savings
- /faq : "14 days" si moins de €5,000 trouvés
Délais et conditions différents. Un avocat ou CFO sourcilleux va noter l'incohérence.

---

### CORRECTIONS CONFIRMÉES (améliorations réelles vs audit code)

**C1 — SOC2 sur /sample-report** ✅ FIXÉ
Était "SOC2-Certified Infrastructure" (faux), maintenant "SOC 2 — In Progress" (honnête).

**C2 — Formulaire contact** ✅ PRÉSENT
L'audit code ne voyait pas de formulaire sur /contact. Un formulaire complet est bien présent.

**C3 — Testimonials fictifs retirés de la home** ✅ FIXÉ
La home V2 utilise IndustryValidation (données Gartner/Flexera) au lieu de testimonials fictifs.

**C4 — Trust bar avec prix DACH** ✅ PRÉSENT
`One-time 490€ · 590€ DACH` visible dans la trust bar.

---

## VERDICT GLOBAL RÉVISÉ — 56/100 (était 58/100)

Le score baisse légèrement car l'audit live révèle des problèmes supplémentaires non détectés dans le code :

**Régressions vs audit code :**
- CTA hero en français même en locale EN (N1) — bug live plus sévère que prévu
- "200+ Audits delivered" claim non vérifié (N3) — risque légal/crédibilité
- "SOC2-certified" subsiste dans la FAQ (N4) — le fix partiel crée une incohérence
- Deux garanties contradictoires (N5) — risque légal

**Améliorations vs audit code :**
- SOC2 honnêtement labellé "In Progress" sur /sample-report (+)
- Formulaire contact présent et complet (+)
- 30-Day Money-Back Guarantee sur /pricing (+trust signal)
- Testimonials fictifs absents de la home (+)

**Les 3 P0 de l'audit code restent valides et non fixés :**
- P0.1 : LeakCounter + panel droit hardcodés en FR — **CONFIRMÉ LIVE**
- P0.2 : /pricing affiche USD pour locale EN, et 490€ hardcodé (pas de geo) — **CONFIRMÉ LIVE**
- P0.3 : Le fix testimonials est fait sur la home mais "200+ Audits delivered" crée un nouveau problème similaire

**Nouveau P0 issu de l'audit live :**
- **P0.4** : "SOC2-certified infrastructure" dans la FAQ — affirmation fausse, risque légal immédiat

---

## CONCLUSION FELLOW

**Ghost Tax n'est pas CFO-grade aujourd'hui. Il est "early B2B demo grade".**

Le design est bon — l'esthétique Bloomberg Terminal est crédible et différenciante. La logique produit est solide. La proposition de valeur (48h, no integration, one-shot 490€) est genuinement différenciante par rapport à Vendr ($36k/an) et Cledara (abonnement permanent).

Mais trois problèmes structurels font qu'un CFO de Stuttgart, Munich ou Vienne abandonne avant d'entrer son email :

1. Il voit un compteur en français ("DÉTECTÉS AUJOURD'HUI") — premier signal d'un produit mal fini.
2. Il voit 490€ sur la page /pricing, mais Stripe lui affiche 590€ — c'est une arnaque à ses yeux.
3. Il cherche une preuve ("Based on analyses across 7 industries") et trouve des testimonials non attribuables, sans entreprise nommée, sans date, sans LinkedIn du signataire.

Les fixes P0 prennent chacun moins de 2 heures à implémenter. Leur non-implémentation explique probablement une part significative des 0 clients après 2 mois. La correction du P0.2 seul (pricing page geo-aware) pourrait débloquer les premières conversions DACH.

La priorité absolue n'est pas de rajouter du contenu — c'est d'être cohérent dans les 5 premières secondes d'une visite DACH : la bonne langue, le bon prix, zéro surprise.

---

*Audit réalisé le 17 avril 2026 en deux phases : (1) analyse statique des fichiers source, (2) navigation réelle via Chrome MCP — screenshots capturés, texte extrait, API testée, 404 vérifiés, benchmarks visités. Score révisé 56/100 suite aux findings live additionnels. Aucune donnée analytique réelle disponible (PostHog/Sentry non encore configurés selon rule 11-deployment.md).*
