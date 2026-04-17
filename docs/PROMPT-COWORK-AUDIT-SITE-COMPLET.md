# PROMPT COWORK — Audit complet ghost-tax.com (Fellow-level, A→Z)

**Copie-colle tout ce qui suit dans Claude Cowork.**

---

## Contexte

Je suis Edith, fondatrice de Ghost Tax — plateforme B2B de détection d'exposition financière IT (SaaS/AI/Cloud waste). Markets primaires : DACH (Allemagne/Autriche/Suisse), UK, US, Pays-Bas. Produit entrée = scan gratuit suivi du Decision Pack 490€ (590€ DACH). Je suis solo founder, pas commerciale, funnel 100% self-serve.

**État actuel du site** : après 2 mois de lancement, 0 client, 820 emails envoyés dans le vide (canal reply cassé, landing buggée, pricing mismatch). Aujourd'hui 17 avril 2026, on a déployé P0+P1+P2 :
- Pricing géo corrigé (DACH 590€ cohérent display/checkout)
- Hero copy rewrit ("YOUR SAAS BLEEDS 18-32%. WE PROVE IT.")
- Trust bar GDPR/48h/public signals/pricing
- Industry validation section (Gartner/Flexera/Vertice/FinOps Foundation)
- Sample report enrichi (méthodologie + Decision Pack preview)
- hreflang complet DACH/UK/US/NL
- Rail B Monitor wiré en optional upsell

**Mais je n'ai aucune vision directe** du rendu visuel — Claude Code CLI ne voit que du code, pas le site réel.

---

## Ta mission

**Faire un audit complet ghost-tax.com A→Z comme un Fellow Product Designer + B2B Growth Expert.** Pas un review superficiel. Pas de complaisance. Je veux un verdict brutal avec screenshots et priorisation impact € réel.

Navigue le site réel via Playwright. Prends des screenshots annotés. Compare aux standards B2B CFO 2026 (Vendr, Spendflo, Cledara, pas Mailchimp-level).

**Pas de limite de budget d'attention.** Prends le temps nécessaire. Livrable attendu : un rapport structuré qui me permet de décider les 3 prochains chantiers avec certitude.

---

## Pages à auditer (toutes, sans exception)

### Landing principale
- `https://ghost-tax.com/` (hero + sections — le critique)

### Pages funnel conversion
- `https://ghost-tax.com/intel` (scan gratuit — où le prospect démarre vraiment)
- `https://ghost-tax.com/sample-report` (ce qu'un CFO voit avant d'acheter)
- `https://ghost-tax.com/pricing` (la page où il décide)

### Pages support/trust
- `https://ghost-tax.com/methodology` (crédibilité technique)
- `https://ghost-tax.com/platform` (vue d'ensemble produit)
- `https://ghost-tax.com/about` (qui est derrière)
- `https://ghost-tax.com/contact` (peut-il te joindre)
- `https://ghost-tax.com/legal` (GDPR, CGV)

### Pages secondaires
- `https://ghost-tax.com/ghost-tax` (calculator estimator)
- `https://ghost-tax.com/estimator`
- `https://ghost-tax.com/faq`
- `https://ghost-tax.com/case-studies`
- `https://ghost-tax.com/peer-gap`
- `https://ghost-tax.com/procurement`
- `https://ghost-tax.com/integrations`
- `https://ghost-tax.com/intel-benchmarks`

---

## Critères d'évaluation Fellow — 12 axes par page

Pour CHAQUE page visitée, note /10 sur ces axes :

1. **Clarté 3 secondes** — un CFO allemand comprend-il en 3 secondes ce que tu vends et pour qui ?
2. **Densité informationnelle** — trop vide (perception légère) ou trop dense (perception lourde) ?
3. **Hiérarchie visuelle** — l'œil est-il guidé vers l'action voulue ?
4. **Crédibilité immédiate** — le design inspire-t-il confiance sans testimonials ? (CFO test)
5. **Adaptation locale** — en `de-DE` la page est-elle vraiment allemande ou fallback EN ?
6. **Pricing transparence** — le visiteur DACH voit-il 590€ ou 490€ ? Est-ce cohérent hero → checkout ?
7. **CTA force** — le bouton principal est-il évident, urgent, sans ambiguïté ?
8. **Trust signals** — GDPR/DSGVO mentionné visiblement ? sources (Gartner etc.) vérifiables ?
9. **Performance perçue** — la page charge-t-elle vite ? animations qui aident ou gênent ?
10. **Mobile responsive** — utilisable sur iPhone sans horreur ? touch targets OK ?
11. **Cohérence design system** — tokens de couleur/typo/espacement respectés ?
12. **Absence d'anti-patterns IA** — buzzwords ("AI Financial Control Plane", "Proprietary Causal Financial Graph", "unlock", "leverage", "journey", "ecosystem") ?

**Score par page sur 120 (12×10).**

---

## Tests spécifiques à exécuter

### Test 1 — Multi-locale
1. Ouvre le site avec Accept-Language: `en-US` → screenshot hero
2. Ouvre avec `de-DE` → screenshot hero (doit afficher "IHR SAAS / VERLIERT 18-32%. / WIR BEWEISEN ES.")
3. Ouvre avec `nl-NL` → screenshot hero (doit afficher "UW SAAS / LEKT 18-32%. / WIJ BEWIJZEN HET.")
4. Compare : est-ce que le contenu est vraiment adapté ou fallback EN silencieux ?

### Test 2 — Pricing géo
1. En `de-DE` : le prix affiché dans trust bar doit être "590 € · Decision Pack (DACH)"
2. En `en-US` : doit être "490€ · Decision Pack"
3. Clic sur "GET THE REPORT" depuis `de-DE` → checkout Stripe doit afficher 590€ (PAS 490€)
4. Lance `/api/geo` direct dans le navigateur → doit retourner `{ country, locale, isDACH, priceEur, priceFormatted }`

### Test 3 — Sample report accessibility
1. Depuis hero, clic "→ See sample report" / "→ Beispielbericht ansehen" / "→ Voir un exemple"
2. Vérifie que le PDF ouvre directement dans un nouvel onglet (pas d'erreur 404)
3. Vérifie que la version téléchargée correspond à la locale

### Test 4 — Sample report page interactive
1. Visite `/sample-report` directement
2. Vérifie que les nouvelles sections P1.4 apparaissent :
   - "METHODOLOGY — how we reach these numbers" (3 layers 95%/70%/50%)
   - "WHAT'S INSIDE THE DECISION PACK — 490 € (590 € DACH)" (6 livrables)
   - "AFTER THE DECISION PACK — OPTIONAL ONGOING MONITORING" (Rail B Monitor card)

### Test 5 — Checkout flow end-to-end (sans payer)
1. Lance un scan avec un vrai domain (ex: `github.com`)
2. Arrive sur checkout Stripe
3. Vérifie : prix cohérent avec ce qui était affiché, currency correct, description produit localisée, reply_to visible dans transaction descriptor

### Test 6 — Core Web Vitals
- Lance Lighthouse sur `/` et `/sample-report`
- Note : LCP, FID, CLS, INP
- Objectif CFO-grade : 90+ sur Performance

### Test 7 — Mobile
- Charge le site en viewport iPhone 14 (390×844)
- Screenshot hero mobile
- Vérifie que trust bar est lisible (4 bullets sur 2 colonnes au minimum, pas 1 bullet qui prend toute la largeur)
- Vérifie scan-form : champ input + bouton Detect visibles dès le fold

### Test 8 — Console erreurs
- DevTools Console sur chaque page
- Liste toutes les erreurs JS, warnings React, erreurs réseau, fonts bloquées

### Test 9 — SEO crawl
- Source HTML de `/` → vérifier `<title>`, `<meta description>`, hreflang complet, JSON-LD schema
- Compare avec ce qui est attendu :
  - Title : "Ghost Tax — SaaS & Cloud waste audit for CFOs"
  - hreflang : en/en-US/en-GB/de/de-DE/de-AT/de-CH/nl/nl-NL/fr/x-default

### Test 10 — Test CFO DACH "3 secondes"
Imagine tu es un CFO allemand qui vient de cliquer un email de prospection. Tu arrives sur le site. En 3 secondes :
- Comprends-tu ce qu'on vend ?
- Comprends-tu que c'est pour toi (CFO) ?
- Comprends-tu combien ça coûte ?
- Comprends-tu le délai (48h) ?
- Vois-tu un signal GDPR/DSGVO rassurant ?

---

## Benchmarks de comparaison

Compare ghost-tax.com à 3 sites concurrents. Screenshot leurs hero + note les différences :

1. **https://www.spendflo.com** — concurrent subscription qui a levé 16M$, landing pro
2. **https://www.cledara.com** — concurrent simple, target SMB/finance
3. **https://www.vendr.com** — leader négociation SaaS, design premium B2B

Pour chaque comparaison dis :
- Qu'est-ce que Ghost Tax fait MIEUX ?
- Qu'est-ce qu'ils font MIEUX que Ghost Tax ?
- Quelle copy/section devrait-elle emprunter (sans copier) ?

---

## Format livrable attendu

Écris le rapport dans `C:/Users/edith/Desktop/Ghost-tax/Claude/docs/AUDIT-SITE-COWORK-17AVRIL.md` avec cette structure :

```
# Audit ghost-tax.com — 17 avril 2026 (Cowork fellow-level)

## VERDICT GLOBAL — /100
[Score global pondéré]

## RÉSUMÉ EXÉCUTIF
- 3 killer issues à fixer MAINTENANT (P0)
- 5 améliorations importantes (P1)
- 5 polish (P2)

## AUDIT PAR PAGE
### /
Score : XX/120
Screenshots : [desktop, mobile, de-DE, en-US]
Forces :
Faiblesses :
Recos :

[répéter pour chaque page]

## TESTS EXÉCUTÉS
### Test 1 — Multi-locale
Résultat : ✅/⚠️/❌
Détail :
Screenshots annotés :

[répéter pour chaque test]

## COMPARAISON BENCHMARKS
### vs Spendflo
### vs Cledara
### vs Vendr

## LES 3 P0 ABSOLUS
[Ce qui tue la conversion aujourd'hui, à fixer cette semaine]

## LES 5 P1
[Ce qui améliorera significativement dans 2-4 semaines]

## LES 5 P2
[Polish, nice-to-have, après validation produit]

## RISQUES DÉTECTÉS
[Bugs, console errors, liens morts, pricing inconsistencies]

## CONCLUSION FELLOW
[Le site est-il CFO-grade aujourd'hui ? 1 paragraphe tranché]
```

---

## Contraintes de qualité

- **Minimum 15 screenshots** annotés (cercles rouges sur les problèmes)
- **Minimum 12 pages auditées**
- **Minimum 10 tests exécutés**
- **Pas de recommandation vague** : chaque reco doit pointer un fichier/ligne précis ou une URL spécifique
- **Priorité par impact € réel** : ne me dis pas "améliorer la typography" sans expliquer combien de conversions ça coûte
- **Brutal mais constructif** : ne hésite pas à dire "cette page ne devrait pas exister dans cet état"
- **Fellow-level** : pas de coaching feel-good. Pas de "c'est super ! juste quelques améliorations"

---

## Tu as carte blanche

Utilise Playwright pour naviguer. Utilise Lighthouse pour les scores. Utilise DevTools pour les erreurs. Utilise screenshots annotés pour prouver tes points. Prends le temps nécessaire (2-4h est raisonnable).

**Ne me pose aucune question intermédiaire.** Tu es Fellow-level, tu décides. Livre le rapport final dans le fichier indiqué. Je vais le lire et décider les 3 prochains chantiers avec tes conclusions.

**Commence maintenant.**

---

## Fichiers de référence (si tu veux creuser le code)

- `C:/Users/edith/Desktop/Ghost-tax/Claude/components/marketing/home-client.tsx` — landing principale
- `C:/Users/edith/Desktop/Ghost-tax/Claude/components/marketing/scan-form.tsx` — form scan
- `C:/Users/edith/Desktop/Ghost-tax/Claude/app/(marketing)/sample-report/page.tsx` — sample report enrichi
- `C:/Users/edith/Desktop/Ghost-tax/Claude/app/api/stripe/checkout/route.ts` — checkout logic
- `C:/Users/edith/Desktop/Ghost-tax/Claude/app/api/geo/route.ts` — détection géo
- `C:/Users/edith/Desktop/Ghost-tax/Claude/lib/pricing.ts` — config pricing
- `C:/Users/edith/Desktop/Ghost-tax/Claude/messages/{en,de,nl,fr}.json` — i18n
- `C:/Users/edith/Desktop/Ghost-tax/Claude/docs/FIXES-17-AVRIL-2026.md` — changements précédents
- `C:/Users/edith/Desktop/Ghost-tax/Claude/docs/ETAT-FINAL-17-AVRIL-2026.md` — état général
