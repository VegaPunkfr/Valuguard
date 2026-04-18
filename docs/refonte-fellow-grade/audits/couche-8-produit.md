# AUDIT COUCHE 8 — Produit (Cockpit V6 + Decision Pack)

**Gate** : `AUDIT_COUCHE_8_GATE: BLOCKED`
**Score moyen Cockpit** : 6.4/10
**Score moyen Decision Pack** : 4.0/10
**Date** : 18 avril 2026

---

## PARTIE A — COCKPIT V6

### Inventaire

- **Monolithe HTML** : `public/cockpit-v6.html` — 3670 lignes, standalone HTML5/CSS/vanilla JS
- **Modules ES6** (7 fichiers, 2045 LOC total) :
  - `recon-ledger.js` (823 L) — state machine (10 états, 20+ transitions)
  - `recon-components.js` (421 L) — UI rendering helpers
  - `recon-api.js` (337 L) — API bridge `/api/command/*`
  - `recon-utils.js` (348 L) — formatters, scoring
  - `recon-state.js` (116 L) — state ops + priority calc
  - `modules/supabase-realtime.js` (299 L) — postgres_changes live subscription
  - `modules/message-forge.js` — Culture rules + signal angles + quality gate
- **Data JSON** (3) : signal-angles.json (80+ angles multilingues), culture-rules.json, ai-blacklist.json
- **API backing** : 22 endpoints `/api/command/*`
- **Next.js wrapper** : `app/cockpit/page.tsx` + `layout.tsx` (redirect hardcodé vers `/cockpit-v4.html` — obsolète)

### Features Tier S (toutes présentes, validées ce matin J1-J7)
- ✅ Supabase realtime (dedup LRU 50/100ms, backoff 1s→30s)
- ✅ Morning Brief (L0-L3 autonomy)
- ✅ Signal Angles (80+ variantes)
- ✅ Quality Gate (.quality-gate class, 32 ARIA labels)
- ✅ Smart Scheduling (focal mode dynamique)
- ✅ DataStore (Supabase cockpit-data, ledger persistent)

### Scores (0-10)
| Critère | Score |
|---|---|
| Design alignment site | 5/10 (hardcode #05070B vs tokens.ts #060912 — non-sync) |
| Code maintainability | 7/10 (modules séparés, state machine propre) |
| Test coverage | 7/10 (162 fichiers test, modules recon couverts) |
| Accessibility | 7/10 (32 ARIA, focus-visible, scrollbar custom) |
| Performance | 6/10 (monolithe chargement synchrone, no code-split) |

### Gaps Cockpit P0/P1/P2

#### P0 (Bloquant)
1. **Monolithe → Next.js app route** — V7 doit être composant React avec design tokens synced
2. **Design tokens synchronisation** — cockpit-v6.html hardcode couleurs ≠ lib/tokens.ts
3. **Cockpit auth flow cassé** — page login redirect vers `/cockpit-v4.html` (obsolète)

#### P1 (Critique)
4. Module imports standardization (recon-*.js ES6 vs message-forge IIFE)
5. Realtime error resilience (status='ERROR' sans UI resync auto)
6. Message Forge quality gate exposé comme React hook

#### P2
7. Focal mode move to backend (calc locale peut dériver)
8. PDF generation depuis cockpit UI

---

## PARTIE B — DECISION PACK PDF

### Inventaire

- **Générateur** : `lib/pdf-report.tsx` (1453 lignes) — `@react-pdf/renderer`
- **Deux formats** :
  - `GhostTaxReport` (dark, original)
  - `ForensicAuditReport` (McKinsey white-paper, 3 pages A4)
- **API endpoint** : `app/api/report/pdf/route.ts` (120 L), rate limit 5 req/min per IP
- **Locales** : EN, FR, DE (strings hardcodés dans pdf-report.tsx)
- **Sections** :
  - GhostTaxReport : Page 1 Executive Summary + Exposure, Page 2 Peer Comparison + Findings + Scenarios
  - ForensicAuditReport : Page 1 Exec Summary + TVAR + Urgency Score + Breakdown, Page 2 Shadow Bill, Page 3 Recovery Roadmap
- **Pas d'export PPTX/HTML standalone** (PDF only)
- **Pas de Web UI** pour customizer avant export

### ⚠️ P0 DÉCOUVERTE CRITIQUE

**Le PDF header affiche "VALUGUARD" au lieu de "Ghost Tax"** — ancien nom du projet (avant pivot). Tes clients reçoivent potentiellement un Decision Pack avec du branding obsolète. À fixer AVANT Touch 1 Apollo mardi.

### Scores (0-10)
| Critère | Score |
|---|---|
| Typography (serif, tabular nums) | 4/10 (Helvetica hardcodé, pas Garamond/serif, pas tabular-nums) |
| Data visualization | 5/10 (bar charts View width%, pas Chart.js, pas legends/axes) |
| Layout professional (magazine) | 6/10 (structure correcte, pas magazine grid) |
| **Coherence brand** | **3/10** (HEADER "VALUGUARD" — ancien branding !) |
| Export flexibility | 2/10 (PDF only, pas PPTX/HTML) |

### Gaps Decision Pack P0/P1/P2

#### P0 (BLOQUANT AVANT MARDI)
1. **Branding "VALUGUARD" → "Ghost Tax"** (header hardcoded pdf-report.tsx) — urgent
2. **Typography serif** (Helvetica → Garamond ou similaire, tabular numerals)
3. **Data visualization** (bars texte-based → SVG embedded Chart.js/Recharts)

#### P1 (Critique)
4. PDF customization UI (logo upload, color picker, language toggle)
5. Export PPTX/HTML standalone (pptxgen lib + React-to-static-HTML)
6. Appendix sections (Methodology, References, Historical data)

#### P2
7. Print color profile CMYK (pre-press)
8. Interactive PDF (bookmarks, outline, table of contents cliquable)

### Recommandation stack PDF

**Option A recommandée** : améliorer @react-pdf/renderer
- Garamond serif registerFont TTF
- Tabular numerals via fontVariant CSS
- Chart.js/Recharts → SVG embedded
- Layout magazine grid 3-col
- Ghost Tax branding + logo SVG
- Appendix sections
- CMYK export print

**Option B premium** : migrer vers Puppeteer + HTML Fellow-grade
- HTML template React avec `lib/tokens.ts`
- Puppeteer headless render → PDF/PNG/PPTX
- Pro : full CSS, animations, responsive
- Con : overhead +500ms génération

**Recommandation hybride** :
- V1 court terme : améliorer @react-pdf (serif, viz, branding) — **3 jours**
- V2 long terme : Puppeteer si clients demandent interactive — Phase 4

---

## Gate

**AUDIT_COUCHE_8_GATE: BLOCKED**

Raisons :
1. Cockpit V6 monolithe HTML — non-testable, non-maintainable → migration Option A Next.js
2. Decision Pack branding "VALUGUARD" + Helvetica — perception low-effort PDF template, pas premium audit deliverable

Path to PASS :
- **Sprint T (2 semaines)** : Cockpit V7 alpha (recon-*.js → TS hooks, import tokens.ts), Decision Pack V1.1 (Garamond, Ghost Tax logo, bar chart legend)
- **Sprint T+1 (2 semaines)** : Cockpit V7 auth NextAuth, Decision Pack PPTX via pptxgen
- **Sprint T+2 (1 semaine)** : Integration tests Cockpit + realtime, QA Decision Pack multi-locale

**Constat bonus** : Cockpit V6 + Decision Pack sont **70% du chemin vers Fellow-grade**. Path clair, 1 mois sprint achievable. Mais le branding "VALUGUARD" est urgent (à fixer AVANT mardi si un CFO clique checkout sample report).
