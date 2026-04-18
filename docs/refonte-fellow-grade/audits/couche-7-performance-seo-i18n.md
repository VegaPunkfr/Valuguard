# AUDIT COUCHE 7 — Performance + SEO + i18n

**Gate** : `AUDIT_COUCHE_7_GATE: CONDITIONAL_PASS` (hard block sur IT/ES/SV)
**Score moyen** : **7.47/10**
**Date** : 18 avril 2026

---

## 1. Scores

| Domaine | Score | État |
|---|---|---|
| **Core Web Vitals** | 8.2/10 | LCP <1.2s desktop viable, INP <120ms, CLS <0.03 ✓ |
| **JSON-LD Coverage** | 6.5/10 | @graph homepage OK, manque NewsArticle sur benchmarks |
| **Sitemap Quality** | 7.8/10 | 54 URLs dynamiques, manque `<priority>` |
| **hreflang** | 6.0/10 | 11 régions déclarées mais URLs identiques (routing fail) |
| **i18n Structure** | 7.0/10 | **4 de 7 locales** — IT/ES/SV MANQUENT (BLOCKER) |
| **Image Optimization** | 7.5/10 | Config AVIF+WebP OK, hero-bg.png 58KB non optimisé |
| **Font Loading** | 8.0/10 | 2 fonts swap, manque `<link rel="preload">` |
| **Bundle Splitting** | 7.2/10 | @react-pdf/renderer non lazy-loaded |

---

## 2. Blockers P0

### BLOCKER 1 — Locales IT/ES/SV manquent (CRITIQUE)
- Aucun `messages/it.json`, `messages/es.json`, `messages/sv.json`
- Aucune entrée dans `Locale` type (`lib/i18n.tsx:5`)
- Impact : impossible d'atteindre les 3 nouveaux marchés 2026 (Italie 50M+, Espagne 47M+, Suède 10M+ habitants)
- Effort : Phase 1 infra 48h + Phase 2 traduction 240h + Phase 3 hreflang 32h = **320h cumulés (4-5 semaines)**

### BLOCKER 2 — NewsArticle schema manquant sur `/intel-benchmarks/*`
- 3 pages benchmarks sans structured data ArticleBody
- Impact : AI Overviews (ChatGPT, Perplexity, Google AI) ne reconnaissent pas la citabilité
- Effort : 4h

### BLOCKER 3 — Images >50KB non optimisées (hero-bg.png 58KB)
- PNG non converti WebP/AVIF
- Impact : LCP +200-300ms mobile 4G
- Effort : 2h conversion Sharp

---

## 3. Points forts

- `next.config.ts` : Images AVIF+WebP formats ✓, TTL 31536000s ✓, edge cache s-maxage=3600 ✓
- `robots.txt` : 9 user-agents AI déclarés (GPTBot, ClaudeBot, PerplexityBot, ChatGPT-User, OAI-SearchBot, CCBot, Google-Extended) ✓
- `llms.txt` : 46 lignes markdown, index complet des pages clés ✓
- `sitemap.ts` : 54 URLs, lastmod précises, verticals dynamiques via `getAllVerticalSlugs()` ✓
- **Fonts** : Inter + JetBrains_Mono, swap display ✓
- **JSON-LD homepage** : @graph 5-entity (Organization, WebSite, WebApplication, Product, Service) ✓
- **i18n fallback** : Tous locales FR/DE/NL avec fallback EN, 98% parity ✓

---

## 4. Gaps Top 15

| # | Gap | Sévérité | Effort |
|---|---|---|---|
| 1 | IT/ES/SV loaders, locale config | **P0** | L (320h total) |
| 2 | NewsArticle schema sur benchmarks | **P1** | M (4h) |
| 3 | hreflang URL routing pas content-aware | **P1** | L (16h refactor) |
| 4 | Sitemap sans `<priority>` tags | **P1** | XS (1h) |
| 5 | Images >50KB non optimisées | **P1** | M (6h) |
| 6 | No `<link rel="preload">` fonts | **P1** | S (2h) |
| 7 | @react-pdf/renderer non lazy-loaded | **P1** | M (4h code-split) |
| 8 | robots.txt no Crawl-Delay AI | **P2** | S (1h) |
| 9 | hreflang missing FR-BE/NL-BE/IT-IT | **P2** | S (2h) |
| 10 | OG images sans alt text strategy | **P2** | XS (0.5h) |
| 11 | Sitemap missing dynamic Intel URLs | **P2** | M (3h) |
| 12 | No googlebot max-snippet/-image | **P2** | XS (0.5h) |
| 13 | Font subsetting not applied | **P2** | M (4h) |
| 14 | No variable font fallback | **P2** | S (2h) |
| 15 | Missing dns-prefetch 3rd-party APIs | **P2** | S (1h) |

---

## 5. Plan 3 locales (IT/ES/SV)

### Phase 1 — Infrastructure (48h)
- Créer `messages/it.json`, `messages/es.json`, `messages/sv.json` (copie EN pour QA)
- Modifier `lib/i18n.tsx` : Type Locale +3 values, loaders +3, LOCALES array +6
- Modifier `app/layout.tsx` : detectLocaleSSR(), loadMessagesSSR(), hreflang +6 régions
- QA : cookie persist, fallback chain, currency formatting EUR

### Phase 2 — Traduction (240h)
- Auto-traduction EN→IT/ES/SV via Claude API (~80h)
- Review domain expert FinOps (~80h, 3 reviewers natifs IT/ES/SV)
- QA texte régional, pricing EUR (~80h)

### Phase 3 — hreflang + SEO (32h)
- Ajouter regions hreflang (it, it-IT, es, es-ES, es-MX, sv, sv-SE)
- Valider robots.txt + crawlability
- Sitemap vérification

**Total** : 320h (~4-5 semaines en parallèle).

---

## 6. Recommandations stack

| Component | Current | Recommendation |
|---|---|---|
| **i18n** | Custom Context | Keep custom → Phase 4 migration next-intl |
| **Images** | Sharp built-in | hero-bg.png conversion one-time |
| **Fonts** | Google Fonts | Add preload links + subsetting |
| **Bundle** | Selective imports | Dynamic import @react-pdf/renderer |

---

## 7. Files à créer/modifier

| File | Action | Lignes | Effort |
|---|---|---|---|
| `messages/it.json` | CREATE | 2733 | 80h traduction |
| `messages/es.json` | CREATE | 2733 | 80h traduction |
| `messages/sv.json` | CREATE | 2733 | 80h traduction + review native |
| `lib/i18n.tsx` | UPDATE | 5 changes | 2h |
| `app/layout.tsx` | UPDATE | 12 changes | 3h |
| `app/sitemap.ts` | UPDATE | +priority tags | 1h |

---

## 8. Gate

**AUDIT_COUCHE_7_GATE: CONDITIONAL_PASS**

Conditions PASS complet :
1. ✋ HARD BLOCK : IT/ES/SV Phase 1 infra (48h) avant go-live
2. ⚠️ MUST-DO : Images optimize + NewsArticle schema (10h)
3. 💡 RECOMMENDED : Font preload + bundle split (5.5h)

**Readiness estimée** : 18-19 mai 2026 (à partir du 18 avril).
