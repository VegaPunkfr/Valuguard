# AUDIT COUCHE 6 — Frontend Exécution

**Gate** : `AUDIT_COUCHE_6_GATE: BLOCKED`
**Score moyen** : **3.7/10**
**Date** : 18 avril 2026

---

## 1. Inventaire

### Pages marketing
- **29 pages** `.tsx` dans `app/(marketing)/`
- **23 layouts** associés
- **100% `"use client"`** — pas un seul Server Component
- 400-700 lignes par page client en moyenne

### Composants UI
- **23 composants** dans `components/ui/`
- **5 composants** dans `components/marketing/`
- **36 fichiers TSX total**
- **100% "use client"** (36/36)

### Inline styles
- `home-client.tsx` : **125 `style={{`** occurrences (~2000 lignes CSS inline)
- `pricing/page.tsx` : **138 `style={{`** (~2500 lignes CSS inline)
- Moyenne : 110-140 props `style={{` par fichier
- **Aucune extraction** vers CSS modules ou Tailwind

### Responsive & fluid
- `clamp()` CSS : 3 instances dans pricing/page.tsx
- Majorité des breakpoints via `useIsMobile()` hook (768px hardcoded)
- Pas de fluid typography systématique

---

## 2. Scores (0-10)

| Critère | Score |
|---|---|
| Composant reusability | 3/10 |
| Server/Client split | 2/10 |
| Accessibility (WCAG AA) | 4/10 |
| Responsive fluidity | 5/10 |
| Performance (lazy, Suspense) | 4/10 |
| Testability | 1/10 |
| Prop-types discipline | 6/10 |

---

## 3. Duplications détectées

| Pattern | Occurrences | Notes |
|---|---|---|
| Hero + Subtitle + CTA | 7 | ~42% des pages, hero.tsx réutilisable mais pas utilisé systématiquement |
| Metric card (val + label) | 12+ | home, platform, pricing — 3 implémentations distinctes |
| Pricing card layout | 3 | pricing/page.tsx L233-451 = 3× ~200 lignes chacun |
| Section + label + heading | ~15 | Copy-pasted |
| Trust signals / factoids | ~8 | Stat strips dupliqués |
| FAQ item toggle | 2 | pricing FAQ + faq/page dupliquent `useState<number \| null>` |

**Estimation : 30-35% du code est réplicable en composants génériques.**

---

## 4. Gaps Top 10

### P0 (Bloquant)
1. **100% Client Components** — no SSR, no crawlability gain
2. **2500+ lignes CSS inline dans pricing** — unreadable, non-DRY
3. **Pas de tests unitaires** — zéro regression protection

### P1 (Critique)
4. Hardcoded breakpoint (768px) sur tout le site
5. **PricingCard dupliqué 3× (600 LOC non-DRY)**
6. Pas de Suspense/lazy (first paint parse tout le JS)
7. `aria-label` sparse — keyboard users bloqués

### P2 (Important)
8. Form inputs non validés (XSS sur domain input home)
9. Props sans validation (`as const` manque)
10. Pas de dark mode toggle (édito "parchment" mais tout noir)

---

## 5. Architecture composants cible

```
components/
├── atomic/
│   ├── button/
│   │   ├── Button.tsx (primary, ghost, danger, polymorphic `as`)
│   │   └── Button.test.tsx
│   ├── input/
│   │   ├── Input.tsx
│   │   ├── InputField.tsx
│   │   └── .test.tsx
│   ├── card/ (Card, MetricCard, InfoCard, NumberedCard consolidated)
│   ├── typography/ (H1-H6 clamp() fluid, BodyText, Caption)
│   ├── badge/ (Badge, Tag)
│   └── [other primitives]
├── composed/
│   ├── PricingCard.tsx (TierCard générique)
│   ├── SectionHeader.tsx (label + h2 + subtitle)
│   ├── Hero.tsx (generic editorial)
│   ├── StatStrip.tsx (reusable metric grid)
│   ├── FAQAccordion.tsx (generic toggle)
│   └── [others]
├── sections/
│   ├── HeroSection.tsx
│   ├── PricingSection.tsx
│   ├── PlatformPipeline.tsx
│   └── [page-specific]
├── layouts/
│   ├── MarketingLayout.tsx (Server)
│   └── PageWrapper.tsx
└── marketing/ (DEPRECATED — fold into atomic + composed)
```

---

## 6. Server vs Client strategy

| Component | Current | Target | Reason |
|---|---|---|---|
| layout.tsx marketing | Client (N/A) | **Server** | Static wrapper, no interactivity |
| Navbar | Client | **Server stub** | usePathname SSR-able |
| Footer | Client | **Server** | Static links |
| home/page.tsx | Client | **Server wrapper + Hero Client island** | SSR JSON-LD + H1 |
| pricing/page.tsx | Client | **Server + PricingClient** | metadata SSR, tier grid Client |
| Section scroll reveal | Client | Server (no reveal) | IntersectionObserver Client island uniquement pour premium sections |

---

## 7. Testability baseline

**Current** : 0 tests
**Target Phase 1** :
```
__tests__/
├── atomic/
│   ├── Button.test.tsx (render, aria-label, disabled, onClick)
│   ├── Input.test.tsx (onChange, placeholder, required)
│   ├── MetricCard.test.tsx (color prop enum, value formatting)
│   └── TypographyH1.test.tsx (clamp() fluid size)
├── composed/
│   └── PricingCard.test.tsx
└── e2e/
    └── pricing.e2e.ts (Playwright form submit, checkout redirect)
```

---

## 8. Gate

**AUDIT_COUCHE_6_GATE: BLOCKED**

Conditions PASS :
1. Composants atomic extraits + typés (Button, Input, Card, Typography)
2. Pages marketing refactorisées Server Components wrappers + Client islands
3. CSS inline consolidé vers `lib/styles/pages/` ou CSS modules
4. WCAG AA validé : focus-visible, aria-label coverage >80%, keyboard nav
5. Vitest tests atomic (8+), coverage >60%
6. Reusability : PricingCard générique, SectionHeader, Hero non-dupliqués

**Estimation effort** : 80-120h (2-3 sprints équipe 2-3 devs).
