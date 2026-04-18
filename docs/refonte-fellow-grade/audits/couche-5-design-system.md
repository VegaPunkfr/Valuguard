# AUDIT COUCHE 5 — Frontend Design System

**Gate** : `AUDIT_COUCHE_5_GATE: BLOCKED`
**Score moyen** : **6.4/10** (fondation solide mais fragmentation + AI fingerprint élevé)
**Date** : 18 avril 2026

---

## 1. Inventaire

### Fichiers définissant des tokens (3 principaux)
- `lib/tokens.ts` (224 lignes) : Source unique — ts, sp, c, f, panel/card/inset styles
- `app/globals.css` (1103 lignes) : 157 CSS custom properties (--gt-*), thèmes warm/dark
- `tailwind.config.ts` (126 lignes) : Extend theme, consomme --gt-* variables

### Palettes coexistantes (4)
1. **Dark institutional** (primary) : `c.bg #060912`, accent cyan `#22d3ee`
2. **Warm light** (marketing) : `cWarm.bg #FAF9F7`, accent blue `#3b82f6`
3. **Local C palette** (home-client.tsx lignes 18-33) : `C.obsidian #060912`, `C.cyan #00CFC4` — **redéfinition non-synchée**
4. **Legacy aliases** : `--t-bg`, `--sig-blue`, `--sig-cyan` (backward compat)

### Fonts (2 — conforme "2 fonts max")
- **Sans** : Inter (Google Fonts, app/layout.tsx:12)
- **Mono** : JetBrains Mono (Google Fonts, app/layout.tsx:18)
- **Manque** : serif pour display

### Border-radius patterns
- 7 tokens définis (4px → 24px)
- **18px hardcodé dans 50+ CSS selectors** (`.gt-card`, `.gt-panel`, `panelWarm`, `cardWarm`)

### Styles inline vs classes — 50/50
- **125+ inline styles** dans home-client.tsx
- 119 sélecteurs `.gt-*` en globals.css

---

## 2. Scores (0-10)

| Dimension | Score |
|---|---|
| Tokens source of truth | 7/10 |
| Typography coherence | 8/10 |
| Color coherence | 6/10 |
| Spacing consistency | 8/10 |
| Motion discipline | 7/10 |
| Component reusability | 6/10 |
| **"AI-generated fingerprint"** | **3/10** (= 3 marqueurs forts détectés, 10 = zero) |

---

## 3. Les 15 marqueurs "Claude-generated" détectés

| # | Marqueur | Fichier:Ligne |
|---|---|---|
| 1 | Cyan accent #22d3ee | `app/globals.css:44` |
| 2 | Cyan #00CFC4 local override | `components/marketing/home-client.tsx:27` |
| 3 | JetBrains Mono ubiquitaire | `app/layout.tsx:18` |
| 4 | Inter sans-serif seul (no serif) | `app/layout.tsx:12` |
| 5 | border-radius 18px default | `lib/tokens.ts:90`, 50+ occurrences |
| 6 | translateY(-1px) lift-on-hover | `app/globals.css:309,529` |
| 7 | Dark #0a0a0a-like base | `app/globals.css:26` (`#08090d`) |
| 8 | Backdrop-filter neutralization (signal du pattern) | `app/(marketing)/procurement/page.tsx` |
| 9 | Cards feature grid layout | `app/globals.css:436-444` |
| 10 | text-transform: uppercase | `app/globals.css:191,230,606,617` |
| 11 | scale(0.96) keyframe | `tailwind.config.ts:98` |
| 12 | Pulse animation 2s | `app/globals.css:724-727` |
| 13 | Shadow stack 0 4px 24px | `lib/tokens.ts:91`, 20+ fois |
| 14 | color-mix() utility | `components/ui/metric-card.tsx:44` |
| 15 | Monospace on secondary text | `app/globals.css:603-610` |

---

## 4. Gaps Top 10

### P0 (Bloquant)
1. **Palette parchment Fellow-grade manquante** (pas de token cFellow)
2. **Duplication C.obsidian local** (home-client.tsx) vs `lib/tokens.c`
3. **Styles inline 50% du codebase** (home-client.tsx non-CSCé)

### P1 (Critique)
4. Serif font display absent (Tiempos/Lora/Playfair)
5. Mono appliquée trop largement (labels ≠ data-only)
6. Cyan collision #22d3ee vs #00CFC4
7. border-radius 18px hardcoding (50+)

### P2
8. Z-index nomenclature simple
9. Spacing magic numbers inline
10. tabular-nums pas global

---

## 5. Palette cible Fellow-grade

```typescript
export const cFellow = {
  bg:       "#FAF9F7",        // Parchment
  surface:  "#F3F1ED",        // Cream
  card:     "#FFFFFF",
  text1:    "#1A1A1A",        // Deep ink
  text2:    "#4A4A4A",        // Charcoal
  accent:   "#E63946",        // Ember red (FT/NYT style)
  accentHi: "#DC2F02",
  green:    "#2D6A4F",        // Editorial green
  blue:     "#1D3557",        // Deep blue data
  border:   "#E8E5DF",
};
```

### Typography cible
```
--gt-serif-display: 'Tiempos Text', 'Lora', Georgia, serif;  // NEW
--gt-font-sans:     'Inter', system-ui;                       // existing
--gt-font-tabular:  'IBM Plex Serif', 'JetBrains Mono', mono; // data-only
```

### Motion discipline
- Supprimer generic `translateY(-1px)` lift
- Focus state : 2px outline, color accent
- Data state change : scale ±2% + color shift
- Page transition : 350ms fade-in (pas de generic "up")

---

## 6. Gate

**AUDIT_COUCHE_5_GATE: BLOCKED**

Pre-merge checklist :
- [ ] Create `cFellow` palette in `lib/tokens.ts`
- [ ] Extract home-client.tsx inline styles → Tailwind/GT classes
- [ ] Add serif-display font import + `--gt-serif-display` token
- [ ] Consolidate cyans (remove #00CFC4, use single cyan OR swap primary to ember)
- [ ] Add tabular numerals globally on mono
- [ ] Remove all `translateY(-1px)` generics, replace by motion discipline rules
