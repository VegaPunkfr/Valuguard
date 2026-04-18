# Phase 1 — Synthèse consolidée des 8 audits

**Date** : 18 avril 2026 soir
**Méthode** : 8 agents Explore Opus 4.7 en parallèle, audit ligne par ligne
**Statut global** : 7/8 couches **BLOCKED**, 1 CONDITIONAL_PASS
**Score moyen refonte** : **4.7/10** — **35% du chemin vers Fellow-grade**

---

## Scores par couche

| # | Couche | Score | Gate | Findings P0 |
|---|---|---|---|---|
| 1 | Architecture backend | 3.8/10 | BLOCKED | Error handling non typé, DI absent, auth répété 6×, input validation zéro |
| 2 | Data & types | 3.8/10 | BLOCKED | Zod 0% utilisé, types stub 32 tables manquantes, 119 i18n keys missing |
| 3 | Sécurité & compliance | 5.3/10 | BLOCKED | **3 P0 CRITIQUES** : COMMAND_SECRET plaintext, cockpit-auth timing attack, events non-immutable |
| 4 | Observabilité & ops | **2.1/10** | BLOCKED | 0 alerting sur 16 crons, Sentry configuré mais pas intégré, 0 tests E2E, MTTR 12h+ |
| 5 | Frontend design system | 6.4/10 | BLOCKED | 15 marqueurs AI-generated, palette parchment manquante, serif display absent, inline styles 50% |
| 6 | Frontend exécution | 3.7/10 | BLOCKED | 100% Client Components, 2500+ lignes CSS inline pricing, 0 tests, PricingCard dupliqué 3× |
| 7 | Performance + SEO + i18n | 7.47/10 | CONDITIONAL_PASS | IT/ES/SV locales MANQUENT, NewsArticle schema, hero-bg.png 58KB non optimisé |
| 8 | Produit (Cockpit + Decision Pack) | 5.0/10 | BLOCKED | **Decision Pack header "VALUGUARD" ancien nom!**, Helvetica, Cockpit monolithe HTML |

---

## ⚠️ P0 URGENTS transversaux (à traiter AVANT Touch 1 Apollo mardi 21 avril)

### URGENT 1 — Decision Pack branding cassé
**Fichier** : `lib/pdf-report.tsx`
**Problème** : le PDF Decision Pack livre avec l'en-tête **"VALUGUARD"** (ancien nom du projet). Si un des 29 CFOs Apollo mardi clique `sample-report` et télécharge, il reçoit du branding obsolète → crédibilité détruite instantanément.
**Effort** : 1h (remplacer string + logo SVG Ghost Tax)
**Action** : FIX CE SOIR OU DEMAIN

### URGENT 2 — COMMAND_SECRET en plaintext
**Fichier** : `.env.local` (à vérifier si gitignore)
**Problème** : secret `Johnsondu97375` dans `.env.local`. Memory dit "rotated 2026-04-09 avec 64-char hex" — **incohérence détectée**. Soit le rotate n'a pas été fait, soit `.env.local` contient l'ancien secret.
**Effort** : 30 min (vérifier état réel, rotate si nécessaire, audit `.gitignore`)
**Action** : vérifier D'ABORD, puis agir

### URGENT 3 — cockpit-auth timing attack
**Fichier** : `app/api/command/cockpit-auth/route.ts:11`
**Problème** : `key !== secret` non timing-safe. Middleware utilise `timingSafeEqual()` partout sauf ici.
**Effort** : 15 min (import + replace)
**Action** : FIX pendant fenêtre refonte Phase 2

### URGENT 4 — 16 cron jobs sans alerting
**Problème** : si `/api/cron/master` fail nuit, flywheel stalle, Touch 1 Apollo mardi = 0% delivery sans que tu sois alertée.
**Effort** : 2h (Slack webhook on 500)
**Action** : FIX avant lundi soir

---

## Plan Phase 2 — Fondations backend (5-7 jours)

**Skills mobilisés** : `system-architecture`, `v5-backend`, `ssot-guardian`, `build-validator`, `security-audit`, `compliance-checker`, `deployment-guardian`, `i18n-architect`.

### Semaine 1 — Lundi 20 → Vendredi 24 avril
- J1 (lun 20) : Fix URGENT 1-4 (Decision Pack branding, COMMAND_SECRET, cockpit-auth, Slack alert cron)
- J2 (mar 21) : **Focus Touch 1 Apollo replies** — 0 refonte
- J3 (mer 22) : Créer `lib/domain/errors.ts` (ErrorCode enum + AppError class), `lib/middleware/auth.ts`, refactor middleware.ts unifié
- J4 (jeu 23) : Zod schemas pour 10 routes critiques (audit, command, cron/master, outreach)
- J5 (ven 24) : Rename 16 migrations legacy → YYYYMMDDHHMMSS_*, run `supabase gen types typescript`, replace `types/database.ts`
- Week-end : Pino logger + Sentry integration + source maps upload

---

## Plan Phase 3 — Frontend Fellow-grade (7-10 jours)

**Skills mobilisés** : `typography-maestro`, `color-intelligence`, `cinematic-layout-composer`, `depth-and-light-engine`, `ghost-tax-light-design`, `ui-ux-pro-max`, `data-presentation-sculptor`, `responsive-fluid-master`, `micro-interaction-virtuoso`, `v5-frontend`.

### Semaine 2 — Lundi 27 avril → Vendredi 1 mai
- Claude Design extraction tokens + wireframes (parallèle Edith)
- `lib/design/tokens.ts` avec palette `cFellow` (parchment + ember red + deep ink)
- Extract home-client.tsx inline styles → CSS modules
- Extract pricing/page.tsx inline → CSS modules + PricingCard composant générique
- Serif display font (Tiempos Text via Google Fonts alt Lora)
- Suppression `translateY(-1px)` lift-on-hover généric

### Semaine 3 — Lundi 4 → Vendredi 8 mai
- Atomic library (Button, Input, Card, Typography, Badge, Tag)
- Composed (Hero, SectionHeader, StatStrip, FAQAccordion)
- Sections (HeroSection, PricingSection, PlatformPipeline)
- Migration layouts Client → Server Components
- Tests Vitest atomic + 1 e2e Playwright pricing

---

## Plan Phase 4 — Perf + SEO + i18n + Produit (5-7 jours)

### Semaine 4 — Lundi 11 → Vendredi 15 mai

**SEO/Perf** (skills : `seo-guardian`, `v5-ai-seo`, `seo-hreflang`, `seo-schema`)
- Images WebP/AVIF (hero-bg.png + autres)
- Font preload + subsetting
- @react-pdf/renderer lazy-load dynamic import
- NewsArticle schema sur `/intel-benchmarks/*`
- Sitemap priority tags
- hreflang 13 variants (7 locales × régions)

**i18n 3 nouvelles locales** (skills : `i18n-architect`, `i18n-sync`, `country-policy-enforcer`)
- `messages/it.json` création + auto-traduction EN→IT Claude API + review native
- `messages/es.json` création + auto-traduction EN→ES + review
- `messages/sv.json` création + auto-traduction EN→SV + review native (premium ARPU)
- `lib/i18n.tsx` Type Locale +3
- `app/layout.tsx` detectLocaleSSR +3 hreflang
- Pricing overlay : sv-SE = 590€ ARPU premium
- **Sweep final i18n** : parité clés 7 locales, 0 string hardcodée

**Produit** (skills : `data-presentation-sculptor`, `typography-maestro`, nouveau `/pdf-artisan`)
- Decision Pack refonte : Garamond serif, Ghost Tax branding (remplacer "VALUGUARD"), data viz SVG Chart.js
- Cockpit V7 migration : recon-*.js → TypeScript React hooks, import `lib/design/tokens.ts`
- Auth NextAuth (plus localStorage command-key)

---

## Plan Phase 5 — Integration + Handoff (3-5 jours)

### Semaine 5 — Lundi 18 → Vendredi 22 mai
- GitHub Actions CI/CD : preview on PR, smoke tests post-deploy, auto-rollback if fail
- Playwright E2E : 3 parcours critiques × 3 browsers × 4 locales principales = **36 tests minimum**
- Grafana dashboard business metrics : Touch 1 delivery, reply %, conversion, scan latency p50/p95/p99
- Betterstack 5 uptime monitors
- Slack alerting : cron fail, bounce rate >10%, scan fail >5%
- Documentation : ARCHITECTURE.md, SECURITY.md, RUNBOOK.md
- **Vérification finale i18n** (skill règle stricte, 6 étapes)
- Go-live Vercel

---

## Budget opérationnel

**Temps Edith** : 60-80h cumulés sur 4-5 semaines
**Quota Max 5x** : 70-90% hebdo cumulé
**Coût SaaS ongoing** : $29/mo (Sentry) + tout le reste free tier (Grafana, Betterstack, Slack, Upstash)
**ROI** : 10 premiers clients Rail A × 490€ = 4900€ = **rentabilisation 100€/mois × 49 mois** (~4 ans de Max 5x couverts par 10 clients initiaux)

---

## Risque principal

**Le "VALUGUARD" header dans Decision Pack PDF est le risque #1 sur Touch 1 Apollo mardi.** Si un CFO DACH clique sample report et voit du branding obsolète, il ferme. Cette erreur seule peut brûler 3-5 des 29 CFOs enrollés.

**Mitigation** : fix ce soir ou demain matin (1h effort, 1 commit atomique).

---

## Prochaine action

**Lundi 20 avril matin** — tu lis cette synthèse + les 8 audits détaillés (dossier `docs/refonte-fellow-grade/audits/`). Tu valides l'ordre de priorité. Tu me dis "go Phase 2" et on démarre.

**Avant ça (ce soir / dimanche)** — je peux fix les 4 URGENTS ce soir si tu me donnes green light. Ce sont des fixes chirurgicaux courts (~4h total) qui sécurisent Touch 1 Apollo mardi. Dis "go urgents" et j'exécute.

---

*Rapport consolidé par Orchestrator refonte-fellow-grade — 18 avril 2026 soir*
