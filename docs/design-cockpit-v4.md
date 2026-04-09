# GHOST TAX COCKPIT V4 — Document de Design Technique

**Date**: 6 avril 2026 | **Base analysée**: cockpit-v3.html (3633 lignes)

---

## 1. DIAGNOSTIC V3

### Architecture
- **Monolithe**: 3633 lignes dans un seul fichier (627 CSS, ~1100 HTML, ~1900 JS)
- **16 variables globales** non structurées
- **Zéro event system**: composants couplés via `onclick="..."` directs
- **innerHTML rebuild**: chaque changement reconstruit des pans entiers du DOM
- **Clé API Supabase en clair** (ligne 1781)

### Performance
- 35 prospects en dur, pas de virtual scrolling
- Re-render total de la liste à chaque interaction
- Animations CSS coûteuses (radar rings + sweep permanent)

### UX
- Topbar surchargée (5 stats + horloge + 4 boutons sur 52px)
- 17+ fonctions `comingSoon()` — boutons fantômes
- Zéro keyboard navigation
- Données 100% statiques

---

## 2. ARCHITECTURE V4 — ES Modules natifs

### Structure des fichiers

```
cockpit-v4.html              — Shell HTML minimal + <script type="module">
cockpit-v4.css                — Design tokens + styles globaux
modules/
  state.js                    — Store centralisé observable
  events.js                   — Event bus interne
  router.js                   — Navigation entre les 7 vues
  api.js                      — Couche API (Supabase, Apollo, backend)
  virtual-list.js             — Virtual scrolling générique
  worker-scoring.js           — Web Worker filtering/scoring
  keyboard.js                 — Raccourcis clavier
views/
  cockpit.js                  — Vue principale 3 panneaux
  apollo.js                   — Vue prospection Apollo
  sequences.js                — Vue séquences
  linkedin.js                 — Vue LinkedIn CM
  trading.js                  — Vue Trading (Canvas)
  brief.js                    — Vue Morning Brief
  settings.js                 — Vue paramètres
components/
  topbar.js                   — Barre supérieure compacte
  sidebar.js                  — Navigation latérale
  heat-ring.js                — Composant SVG ring de chaleur
  lead-row.js                 — Ligne de prospect (virtual list)
  message-composer.js         — Éditeur messages multi-canal
  toast.js                    — Notifications éphémères
```

**Reste en HTML standalone**. Pas de React, pas de build step. ES Modules natifs.

### Store centralisé

```javascript
// modules/state.js
class Store {
  #state = {};
  #listeners = new Map();
  #history = [];

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.#state);
  }

  set(path, value) {
    // immutable update, notify subscribers, keep history for undo
  }

  subscribe(path, callback) {
    // reactive: callback fired when path changes
  }
}

export const store = new Store({
  prospects: [],
  activeLeadId: null,
  filter: { source: 'all', search: '', sort: 'heat' },
  view: 'cockpit',
  mode: 'assisted',
  sequences: [],
  queue: [],
  sync: { lastSync: null, status: 'idle' }
});
```

### Event Bus

```javascript
// modules/events.js — événements définis:
// lead:select, lead:deselect, lead:enrich, lead:approve
// msg:send, msg:approve, msg:skip
// view:change, mode:toggle
// sync:start, sync:complete
// toast:show
```

---

## 3. PERFORMANCE

### Virtual Scrolling
V3 reconstruit TOUTE la liste à chaque interaction. V4 ne rend que ~20 items visibles.

**Impact**: 500 prospects = ~20 DOM nodes au lieu de 500. Scroll 60fps.

### Web Worker pour Scoring/Filtering
Décharge le thread principal pour tri, filtrage et calcul de stats.

### Canvas pour Trading
Remplacer les 6 éléments CSS animés en continu par un seul `<canvas>` 2D.

---

## 4. DESIGN "BLOOMBERG TERMINAL"

### Hiérarchie visuelle

```
ZONE ROUGE (haut-gauche) = métriques critiques
ZONE CYAN  (centre)      = détail prospect sélectionné
ZONE OR    (droite)      = actions à exécuter
```

### Couleurs — améliorations lisibilité WCAG AA

```css
--text-secondary: rgba(255,255,255, 0.65);  /* AVANT: 0.55 */
--text-tertiary:  rgba(255,255,255, 0.38);  /* AVANT: 0.28 */
--topbar-h: 44px;                            /* AVANT: 52px */
```

### Typographie standardisée

```css
.text-display  { font: 400 28px/1 var(--font-display); }
.text-title    { font: 700 13px/1.3 var(--font-mono); text-transform: uppercase; }
.text-label    { font: 700 11px/1.3 var(--font-mono); text-transform: uppercase; }
.text-body     { font: 400 13px/1.6 var(--font-body); }
.text-metric   { font: 400 18px/1 var(--font-display); }
```

### Pulsation des métriques

```css
@keyframes metric-pulse {
  0%   { transform: scale(1); filter: brightness(1); }
  25%  { transform: scale(1.08); filter: brightness(1.4); }
  100% { transform: scale(1); filter: brightness(1); }
}
.metric-changed { animation: metric-pulse 0.4s ease-out; }
```

---

## 5. WIREFRAMES

### Vue COCKPIT

```
+--[COMMAND BAR 44px]-------------------------------------------------+
| [G] | €18.2M  12 HOT  28% REPLY  35 TOTAL | [/search] [A/M] 14:32 |
+-----+---------+-----------------------------+-----------------------+
|     |  LIST   |       DETAIL                | ACTIONS               |
| NAV | virtual | Prospect sélectionné        | [NEXT ACTION]         |
|     | scroll  | Enrichissement, BANT,       | Message prêt          |
|     | 500+    | Stack, Timeline             | [Approuver][Skip]     |
|     |         |                             | Séquence progress     |
+-----+---------+-----------------------------+-----------------------+
```

### Vue APOLLO
- Pays par défaut DE, US, UK, NL (pas France)
- Filtres secteur + pays + taille
- Pagination serveur

### Vue SÉQUENCES
- Queue séparée par jour (Aujourd'hui/Demain)
- Indicateurs d'urgence `[!]`
- Analytique en haut (enrolled, open rate, reply rate)

---

## 6. OPTIMISTIC UI

```javascript
async function sendMessage(leadId, channel, content) {
  // 1. UPDATE OPTIMISTE — UI immédiate
  store.set(`prospects.${leadId}.seqStep`, lead.seqStep + 1);
  showToast(`Message envoyé à ${lead.contact.name}`, 'success');

  // 2. REQUÊTE SERVEUR
  try {
    const res = await fetch('/api/outreach/send', { ... });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // 3. CONFIRMATION
  } catch (err) {
    // 4. ROLLBACK si échec
    store.set(`prospects.${leadId}.seqStep`, lead.seqStep);
    showToast(`Échec — ${err.message}`, 'error');
  }
}
```

---

## 7. KEYBOARD SHORTCUTS

| Raccourci | Action |
|-----------|--------|
| `1`-`5` | Naviguer vers les vues |
| `B` | Morning Brief |
| `J/K` ou `↑/↓` | Prospect suivant/précédent |
| `Enter` | Sélectionner prospect |
| `Escape` | Fermer / Désélectionner |
| `A` | Approuver action |
| `S` | Skip / Reporter |
| `E` | Enrichir via Apollo |
| `M` | Focus éditeur message |
| `/` | Focus recherche |
| `Ctrl+Shift+A` | Toggle Assisté/Autonome |
| `Space` | Approuver (Brief) |
| `?` | Aide raccourcis |

---

## 8. SÉCURITÉ

Clé Supabase anon exposée en clair ligne 1781 du V3. En V4, toutes les requêtes Supabase transitent par `/api/supabase-proxy` côté serveur. Le frontend ne contient JAMAIS de clés API.

---

## 9. PLAN DE MIGRATION (7 jours)

| Phase | Durée | Contenu |
|-------|-------|---------|
| 1. Foundation | 2j | state.js, events.js, router.js, shell HTML |
| 2. Virtual Scroll + Workers | 1j | virtual-list.js, Web Worker, test 500 prospects |
| 3. Componentisation | 2j | 7 vues en modules, suppression onclick inline |
| 4. Optimistic UI + Keyboard | 1j | Pattern send/approve, raccourcis, toasts |
| 5. Polish | 1j | Pulsation métriques, Canvas Trading, transitions |

---

## 10. CE QUI NE CHANGE PAS

- Layout 3 colonnes Cockpit (optimal)
- Dark mode #05060E (identité Bloomberg)
- Heat rings SVG (performants)
- Structure des 7 vues (navigation logique)
- Grain overlay (atmosphère terminal)
