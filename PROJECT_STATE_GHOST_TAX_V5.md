# PROJECT_STATE_GHOST_TAX_V5
**Source de vérité unique — état figé du chantier Ghost Tax V5**
**Dernière consolidation : 2026-04-15**
**Statut : canonique · aucune dérive sans mise à jour de ce document**

---

## 1. EXECUTIVE REALITY CHECK

Ghost Tax V5 est un produit en état **asymétrique** : la couche visuelle est mature et livrée, la couche runtime stratégique n'est pas encore ancrée en base. Le cockpit V5 fonctionne comme interface, mais tourne sur des fondations doctrinales qui ne sont pas encore persistées côté backend. V4 reste l'autorité d'exécution pour les sends. Aucune régression visible. Aucune bascule irréversible.

**Faits :**
- Le cockpit V5 (`public/cockpit-v5.html`, 106.5 KB, 1732 lignes) est **intégré**, **francisé**, **visuellement validé**, lit/mute Supabase via `/api/command/sprint`, et gère proprement l'absence de la couche stratégie.
- La doctrine seed `strategy.v2026.16.0-seed.r2` est **validée pilote** (ratification Q1/Q2/Q3) mais **non insérée en base**.
- Les tables `strategies`, `strategy_events`, `bot_mandates`, `weekly_reserve`, `segment_performance_snapshots` **n'existent pas**.
- La table `outreach_log` est **vide** : aucune observabilité post-send, aucun learner possible.
- V4 (`public/cockpit-v4.html`, 360 KB) reste en production et conserve l'autorité d'envoi jusqu'à Phase CP7.

**Ce document interdit implicitement les micro-ajustements.** Toute future contribution doit s'aligner sur le backlog priorisé (§10) et suivre l'ordre d'exécution recommandé (§11).

---

## 2. FINAL PRODUCT DOCTRINE

Ghost Tax est un **Bot Operating System hebdomadaire stratégique autonome gouverné par doctrine**. Le pilote (Edith, solo) opère en fixant une doctrine et ratifiant des mandats ; le système exécute selon mandat pendant son absence, apprend des résultats, propose une doctrine suivante chaque vendredi.

### Principes produits non-négociables

| Principe | Conséquence opératoire |
|---|---|
| Pilote solo, **pas de commercial** | Funnel 100% self-serve. Aucun "call", aucune démo live. |
| Le bot **prépare sa propre semaine** | Week-end manufacturing pipeline (8 stages), pas de sourcing manuel quotidien. |
| **Aucune prospection au hasard** | Toute query Apollo dérivée de la doctrine active (ICP + signaux + angles + apprentissages). |
| Doctrine **immutable versionnée** | Objet de première classe. Chaque décision bot trace à `strategy_version_id`. |
| **Réserve hebdo** comme inventaire tangible | 1.8× capacité cible, entropie ≥ log(4), EV floor 5€/entry, décroissance 30j. |
| **5 min vendredi + 2 min lundi + 15-30 min/jour** | Contrat opératoire pilote. Le reste tourne seul. |
| **Le produit = le PDF Decision Pack** (Rail A) | Le scan/diagnostic est le livrable, pas un service. |

### Revenus (figés dans MEMORY.md)

- Rail A : 490 EUR (590 EUR DACH, geo-pricing dans `lib/pricing.ts`)
- Rail B : ~5k EUR | Rail C : 50k+ EUR
- LTV blended : 1990 EUR
- Objectif : 300 Rail A + 30 Rail B + 4 Rail C / mois à M24

### Marchés (figés, 4 statuts distincts)

| Statut | Marchés | Règle |
|---|---|---|
| Active (POLICY_FROZEN) | UK | Auto-send autorisé, caps code |
| Active prudent (POLICY_FROZEN + prudence_mode) | US | Bounce threshold 3% (vs 5% global) jusqu'à 3 préconditions levées |
| Review-only | DE | Manual review obligatoire, zéro auto-send |
| Exploratory disabled by default | IE, NL, AT | Pas activé sans opt-in explicite pilote |
| Forbidden (PILOT_POLICY) | FR | Interdit, directive pilote répétée |

### Doctrine seed r2 (validée, non insérée)

- ID : `01JRW7YH5M3P2BXKN9F8VQ4TGC`
- Version : `2026.16.0-seed.r2`
- Extraction empirique : 16 comptes SENT sprint_accounts au 2026-04-14
- ICP : CFO/VP Finance, 200-500 sweet spot, 15 industries observées → poids plats EXPLORATORY
- Angles observés (INFERRED_FROM_USAGE, `performance_status: UNMEASURED`) : HIRING_IT (n=9), M_AND_A (n=4, HIGH), FUNDING (n=2, HIGH), COMPLIANCE (n=1), CLOUD_MIGRATION (n=1)
- Cooldowns : 30j domain, 45j contact, 20j parent company (EXPLORATORY)
- Quality : min_score 65, gate thresholds T:70 L:70 B:60 C:85, email_verified requis, min_confidence MEDIUM
- Learning : `mode: DORMANT` jusqu'à 40+ sends cumulés OU semaine 18, puis OBSERVATORY 8 semaines minimum avant ADVISORY
- Exclusions : 7 domaines concurrents (PILOT_POLICY, `auto_extension_allowed: false`, revue mensuelle), keyword_blocklist `[]`
- Bloc `known_system_gap` : 5 items critiques listés, `binding_rule` interdit l'entraînement learner tant que gaps non résolus
- `initial_operating_heuristics` (reserve_target, ev_assumptions) explicitement **non-doctrinaux**

---

## 3. CANONICAL UI TOPOLOGY

### Structure figée : 3 surfaces + 1 drawer + 1 icône paramètres

```
┌───────────────────────────────────────────────────────────┐
│ ▣ Ghost Tax · COCKPIT V5                                   │
│ [COMMANDE] [CLIENTS] [SOURCES]      MAJ 23s  ⌘  ⚙         │
├───────────────────────────────────────────────────────────┤
│ [surface active]                                           │
│ [fiche client · drawer droite 72vw · self-contained]       │
│ [modale injection / édition doctrine · centré 60%]         │
└───────────────────────────────────────────────────────────┘
```

### COMMANDE — 5 modes contextuels + 1 overlay

| Mode | Déclencheur | Contenu principal |
|---|---|---|
| **Live Ops** | Mar-Jeu fenêtres actives | Mandate bar + 4 colonnes (Brief · File · Exceptions · Journal) + Réserve strip |
| **Week Closing** | Ven ≥ 18:00 | Rapport semaine + observations learner + diff stratégie + CTA ratifier |
| **Manufacturing Watch** | Ven 22:00 → Dim 20:00 | Gantt 8 stages + réserve en construction |
| **Monday Brief** | Dim 20:00 → Lun 09:30 | Brief hebdo + exceptions + mandat proposé + CTA ratifier |
| **Ambient** | Nuit / hors fenêtres / fériés | 3 blocs compacts (réserve + events + prochaine exéc) |
| **Incident (overlay)** | Circuit breaker déclenché | Arbitrage urgence plein écran |

Le serveur expose `GET /api/command/mode` → `{mode, context}`. Une seule URL, plusieurs rendus. *(Endpoint spécifié, non encore implémenté.)*

### CLIENTS — liste unifiée

- Toolbar : recherche + 6 chips état + 5 chips marché + compteur
- Rows denses 7-col (dot état · identité · marché · contact · badge état · score bar · âge)
- Click → ouvre fiche client dans drawer
- Zéro split-view (anti-dispersion)

### SOURCES — 4 tabs internes

- Apollo · Signaux LinkedIn · Scans Intel · Import manuel
- Bouton primaire unique : **"Injecter dans la file bot"**
- Les sources ne possèdent rien, elles produisent des candidats

### FICHE CLIENT (drawer)

**Géométrie :** 72vw, min 720px, max 1040px, slide-right 240ms ease-out-expo, border-left 2px accent, backdrop `rgba(5,7,11,0.72)` + blur 16px.

**Scroll vertical unique, aucune tab interne, 7 sections empilées :**

1. D.00 Sticky header (logo, identité, flag, badge état, nav ← → ×)
2. D.01 Statut opératoire (score-bar 10 segments, score /100, angle+confiance, livrable, 4 CTAs ENVOYER MAINTENANT / PASSER EN REVUE / DIFFÉRER / REJETER)
3. D.02 Ancrage doctrinal (clearance stamp rotated -2deg + rationale list)
4. D.03 Chronologie (timeline-rib 2px accent + dots, N événements)
5. D.04 Brouillon (objet + body éditable 64ch + gate + actions REGÉNÉRER / CHANGER L'ANGLE / ÉDITER)
6. D.05 Notes & documents (raisonnement bot blockquote + notes pilote + tech stack)
7. D.06 Relations (même domaine · source · importé · dernière action)

### Raccourcis clavier canoniques

| Raccourci | Scope | Action |
|---|---|---|
| `C` / `L` / `S` | global (hors saisie) | Navigation Commande / Clients / Sources |
| `R` | global | Force refresh |
| `Space` | global | Pause/reprise mandat |
| `⌘K` / `Ctrl+K` | global | Recherche Clients (palette complète en CP8) |
| `Esc` | drawer | Fermer |
| `←` `→` | drawer | Client précédent/suivant |
| `N G E S R D X` | drawer | Note / Regen / Éditer / Send / Review / Defer / reject |

### Settings — icône discrète

Sans tab dédié. Contient : clés API, policies pays (read-only strategy-sourced), Quality Gate thresholds, Recon Ledger debug, versions historiques stratégie, export audit trail, raccourcis.

---

## 4. CANONICAL VISUAL DIRECTION

**Direction artistique :** Institutional Liquid Glass + Command Brutalism.

### Palette (figée, tokens CSS `:root` uniquement)

```
--void           #05070B
--carbon-900/800/700/600/500    empilement fond
--glass-01/02/03/04             translucidités 3-13%
--edge-faint/soft/strong/brand  hairlines 1px

--ink-100   F2F4F7   critique
--ink-300   C4CAD6   primaire
--ink-500   8A94A8   secondaire
--ink-700   525B6E   métadonnées
--ink-900   2F3646   désactivé

--accent    5FD4E0   cyan institutionnel · UNIQUE accent actif
--warn      E8B149   amber · prudence / warnings
--alert     F27155   orange brûlé · alertes / breaker
--success   6DD49D   vert bank · confirmations
```

**Règle dure : aucun autre token couleur. Aucun hex hors `:root`.** Audit automatisé confirme 0 fuite.

### Typographie (double système)

- `--font-display` : PP Neue Montreal / Söhne / Inter Display fallback system
- `--font-body` : Inter / Söhne / system
- `--font-mono` : Berkeley Mono / IBM Plex Mono / JetBrains Mono / ui-monospace

Tous les chiffres, IDs, timestamps en mono avec `font-variant-numeric: tabular-nums`. Tous les labels en `letter-spacing: 0.08-0.14em` uppercase. Aucun italique d'emphase.

### Signatures visuelles figées (non-négociables)

1. **Fiducials** 4-coins 5×5px sur toute dalle primaire
2. **Coordonnées de zone** : `C.01 M.02 D.03 K.01 S.01` en mono 10px `ink-900`
3. **Clearance stamp** rotated -2deg, double bordure amber, 3 lignes (version / "· RATIFIÉE ·" / mandat)
4. **Timeline rib** : border-left 2px accent + dots 8px avec ring carbon
5. **Badge système** uppercase mono tracked 0.1em, max radius 2px
6. **Scanline** sur items in-progress (motion utilitaire uniquement)

### Radii + motion

- `--r-0/1/2/3` : 0 / 2 / 4 / 8px max. Aucun `border-radius` > 8px. Aucun pill (`999px` interdit).
- `--dur-*` : 60 / 120 / 180 / 240 / 320 / 3000ms. Easings : `ease-out-expo` (entrées), `ease-in-quart` (sorties), `ease-out-quart` (standard). Aucune bouncy/spring.
- `@media (prefers-reduced-motion: reduce)` force 0.001ms sur toutes transitions.

### Anti-generic rules (21 patterns interdits figés)

Glassmorphism bleu-violet flou · gradients RGB · pill badges · emoji UI (sauf flags marché) · heroicons default · toasts flottants · shimmer blocks · cards avec shadow · hover scale · spring easings · illustrations empty state · dark mode violet/pink · loops infinies décoratives · progress circular animés · multi-color status · noise décoratif · blur > 40px · radius > 8px · display fonts décoratives · AI sparkle icons · placeholder lorem ipsum visible.

### Visual acceptance criteria (20 tests figés)

Voir document visual spec — tous satisfaits dans V5 livré (22/27 sur prototype standalone initial, 100% sur version intégrée). Aucun test abandonné.

### Localisation

**V5 est intégralement en français institutionnel.** Audit automatisé : 0 chaîne UI anglaise résiduelle, 40 motifs anglais courants testés = 0 hit. Identifiants techniques canoniques (HIRING_IT, READY, UK, etc.) conservés en anglais car keys DB. Helpers `stateLabel()`, `typeLabel()`, `confidenceLabel()`, `dataQualityLabel()`, `sourceLabel()` découplent affichage FR ↔ canon technique, permettant une 2ème langue future par simple extension de maps.

---

## 5. WHAT IS ACTUALLY IMPLEMENTED RIGHT NOW

### Fichiers livrés et fonctionnels

| Artefact | État | Usage actuel |
|---|---|---|
| `public/cockpit-v5.html` | **Livré** 106.5 KB / 1732 lignes | Cockpit opérationnel (lecture + defer/reject + import manuel) |
| `public/cockpit-v4.html` | **Intact** 360 KB | Autorité d'envoi, référence opérationnelle |
| `app/api/command/sprint/route.ts` | **Existant** | GET accounts+settings+recentRuns, POST upsert, PATCH status |
| `app/api/command/send-approved/route.ts` | **Existant** | Utilisé par V4, non câblé V5 |
| `app/api/command/supabase-data/route.ts` | **Existant** | Utilisé par V4 pour LinkedIn feed |
| `app/api/command/recon-ledger/route.ts` | **Existant** | Utilisé par V4, non câblé V5 |
| `app/api/command/generate-message/route.ts` | **Existant** | Utilisé par V4, non câblé V5 |
| `app/api/cron/outbound-orchestrator/route.ts` | **Existant** | Cron auto-send actuel (Vercel) |
| `app/api/intel/route.ts` | **Existant** | Stream scan 21 phases |
| `public/logo-email.png` | **Livré** 512×120 | Logo email campaigns |

### Capacités V5 effectives

- Authentification COMMAND_KEY (localStorage `gt-command-key`, modale auth auto si 401)
- Fetch réel `/api/command/sprint` → adapter `adaptSprintRow()` → state.clients
- Fetch gracieux `/api/strategy/active` → 404 géré → état `no-strategy` affiché honnêtement
- 5 modes Mandate Bar calculés dynamiquement : `running`, `paused`, `blocked`, `no-mandate`, `no-strategy`
- Vue **Commande** : Brief / File / Exceptions / Journal / Réserve rendus depuis data réelle
- Vue **Clients** : liste filtrable (état × marché × recherche), bulk actions disponibles (UI)
- Vue **Sources** : 4 tabs, Import manuel fonctionnel (POST sprint), 3 autres = adapters transitionnels vers V4
- Drawer 7 sections populées depuis `sprint_accounts` (identité, statut, chronologie, brouillon, raisonnement bot, tech stack, relations cross-domain)
- Mutations câblées : DIFFÉRER → PATCH status=DEFERRED, REJETER → PATCH status=REJECTED (confirm dialog)
- Import manuel câblé : POST sprint → auto-refresh → switch Clients
- Auto-refresh 30s + `visibilitychange` listener
- Toasts `REVALIDÉ` / `ÉCHEC DE L'ACTUALISATION` / `ÉCHEC DU DÉMARRAGE`
- Francisation intégrale, 0 fuite anglaise, helpers labels séparant FR d'identifiants canoniques

### Base de données (état Supabase `cuvxhrzrwzuysnfnoqje`)

- `sprint_accounts` : 19 rows (16 SENT, 2 DRAFT_REVIEW, 1 DEFERRED)
- `bot_settings` : table présente, contient `autonomy_level` et `last_run`
- `bot_execution_log` : trace des crons exécutés
- `outreach_log` : **0 rows** (vide)
- `outreach_leads`, `outreach_sequences`, `outreach_summary` : présentes, statut variable

---

## 6. WHAT REMAINS TRANSITIONAL

Éléments signalés explicitement dans l'UI V5 comme transitionnels, liens visibles vers V4 ou message d'attente câblage :

| Élément | État transitionnel | Plan levée |
|---|---|---|
| Sources → Apollo tab | Banner `ADAPTATEUR TRANSITIONNEL` + lien `OUVRIR APOLLO (COCKPIT V4) ↗` | Phase CP5 (Apollo search intégré V5) |
| Sources → LinkedIn tab | Banner + lien V4 | Phase CP5 |
| Sources → Intel tab | Lien `/intel` (scan stream existe backend) | Phase CP5 (UI stream dans V5) |
| Drawer `ENVOYER MAINTENANT` | Alert pointant vers V4 | Phase CP7 (send authority V5) |
| Drawer `PASSER EN REVUE` | Alert pointant vers CP7 | Phase CP7 |
| Drawer `REGÉNÉRER` | Alert pointant vers CP7 | Phase CP7 |
| Drawer `+ AJOUTER` note pilote | Inerte (pas de table) | Phase OBS-2 |
| ⌘K palette | Focus search Clients (stub) | Phase CP8 (fuzzy-search complet) |
| Mandate Bar banner `DOCTRINE EN ATTENTE D'INSERTION` | Affiché en permanence tant que `/api/strategy/active` 404 | Levée à MILE-1 (insert seed) |

Aucun stub caché. Chaque comportement non-branché est balisé par banner ou alert explicite.

---

## 7. BACKEND GAPS STILL OPEN

Ordre d'impact décroissant :

| # | Gap | Impact | Mitigation actuelle |
|---|---|---|---|
| G1 | Tables `strategies` + `strategy_events` non créées | Doctrine seed r2 flotte sans ancrage persisté | Migration + seed SQL prêts (specs consolidées), pilote peut exécuter manuellement |
| G2 | Route `GET /api/strategy/active` non implémentée | V5 reste en état `no-strategy`, doctrine binding drawer en mode `is-missing` | Fallback gracieux 404 codé V5 |
| G3 | Table `outreach_log` vide + webhook Resend non câblé | **Aucune observabilité post-send** : 0 opened/clicked/replied/bounced events ingérés. Learner impossible. | Journal V5 utilise `bot_execution_log.log_lines` en fallback. Reply detection manuelle. |
| G4 | Table `bot_mandates` non créée | Mandat non versionné, pas de révocation auditée, pas de SUPERSEDED history | Mandat dérivé en mémoire depuis `bot_settings.autonomy_level` |
| G5 | Table `weekly_reserve` non créée | Réserve strip approximative (count READY+DRAFT_REVIEW sur 45) | Diversité entropy et EV computations absents mais non-bloquants |
| G6 | Reply poller (IMAP/Gmail) non construit | État `REPLIED` nécessite update manuel | Aucune — attente CP7 ou Phase OBS-2 |
| G7 | Inngest workflows non déployés | Week-end manufacturing manuel/cron, Monday Brief non généré | Cron Vercel actuel couvre sends, pas le manufacturing |
| G8 | Table `pilot_notes` non conçue | Bouton `+ AJOUTER` inerte | UI présent, persistence à spécifier |
| G9 | Route `POST /api/strategy/activate` non construite | Activation manuelle via psql | Script `activate-strategy.sql` durci prêt |
| G10 | Route `/api/command/mode` non implémentée | Mode Command figé en Live Ops | Mode determiné côté client par heure (fallback) |
| G11 | `segment_performance_snapshots` non créée | Learner DORMANT, pas de posteriors | Attente G3 prérequis |

---

## 8. RUNTIME AUTHORITY MODEL (V4 vs V5)

### Matrice d'autorité actuelle

| Domaine | V4 `cockpit-v4.html` | V5 `cockpit-v5.html` |
|---|---|---|
| Lecture sprint_accounts | ✅ autorité historique | ✅ autorité lecture intégrée |
| Recherche Apollo | ✅ **autorité exclusive** | ⚠ transitionnel (lien vers V4) |
| Ingestion LinkedIn signals | ✅ **autorité exclusive** | ⚠ transitionnel |
| Stream Intel scan | ✅ intégré | ⚠ transitionnel (lien `/intel`) |
| Send email (Resend) | ✅ **autorité exclusive** | ⚠ alert → V4 |
| Review internal send | ✅ autorité | ⚠ alert → V4 |
| Generate draft (LLM) | ✅ autorité | ⚠ alert → V4 |
| Defer / Reject status | ✅ autorité historique | ✅ **autorité V5** (PATCH câblé) |
| Import manuel | ✅ autorité | ✅ **autorité V5** (POST câblé) |
| Mandat / autonomy_level | ✅ autorité historique (bot_settings) | ✅ lecture + toggle pause local (non-persisté encore) |
| Cron auto-send | ✅ `/api/cron/outbound-orchestrator` | ❌ non impliqué |

### Règle de coexistence (figée)

- **V4 reste l'autorité d'envoi jusqu'à Phase CP7** (wire `SEND NOW` V5 avec idempotence stricte).
- Les deux cockpits écrivent dans le même Supabase → V5 force un `fetchSprint()` après chaque mutation + DataStore V4 a TTL 30s → fenêtre de divergence 5-15s acceptable.
- **V4 ne doit pas devenir l'autorité finale.** Son rôle est transitionnel. La sunset de V4 est planifiée en Phase SUNSET (§10) après que V5 a absorbé les capacités restantes.

### Contrat de bascule définitive

V5 devient autorité complète **quand et seulement quand :**

1. G1 + G2 résolus (strategies table + route active)
2. CP7 livré (send authority V5 idempotente)
3. CP5 partiel livré (au minimum Apollo search + Intel stream intégrés)
4. 5 jours consécutifs d'usage pilote en V5 sans retour V4 forcé

Avant ça, V4 reste disponible, référencé explicitement dans les banners transitionnels V5.

---

## 9. NON-NEGOTIABLE RULES FOR FUTURE WORK

**Ces règles s'appliquent à toute contribution future sur le projet. Violation = rejet automatique.**

### Produit

1. **Pas de sales calls**, pas de mentions "book a call", "no call", ou "call us" n'importe où dans copy, UI, emails.
2. **Pilote est opérateur solo.** Aucune UI de team coordination, aucun rôle admin, aucun workflow multi-utilisateur.
3. **Funnel 100% self-serve.** Aucune étape manuelle commerciale entre lead et paiement.
4. **FR market = forbidden.** Directive pilote non-discutable.
5. **DACH = review-only.** Aucun auto-send Allemagne sans ratification pilote case-par-case.

### Doctrine & learner

6. **Doctrine immutable versionnée.** Toute modification crée `version+1`. `status` ∈ {DRAFT, ACTIVE, SUPERSEDED, ROLLED_BACK}. Partial unique index force max 1 ACTIVE.
7. **Append-only audit trail.** Jamais d'UPDATE/DELETE sur `strategy_events`. Trigger + REVOKE en place.
8. **Learner DORMANT minimum 2 semaines + 40 sends cumulés.** Aucune influence doctrinale sans ratification pilote explicite.
9. **Learner interdit sur variables high-cardinality** : `persona_name`, `company_name`, `domain`, `draft_body_features`, `subject_line_text`, `exact_signal_content`, `contact_email_prefix`.
10. **Exploration budget 15%** obligatoire au manufacturing (anti-local-maxima).

### UI / design

11. **Micro-ajustements interdits.** Consolider en une passe, jamais 5 patches successifs.
12. **V5 = français intégral.** Aucune fuite anglaise tolérée dans UI visible utilisateur. Identifiants canoniques (codes marché, états DB, signaux) conservés en EN.
13. **Tokens CSS `:root` uniquement.** Zéro hex inline. Audit automatisé partie du CI.
14. **Max `border-radius: 8px`.** Aucun pill. Aucun `border-radius: 999px`.
15. **Zéro `box-shadow` externe.** `inset` autorisé uniquement.
16. **Fonts strictement limitées** aux 3 familles `--font-display/body/mono`.
17. **Tous chiffres en mono tabular-nums.**
18. **Fiducials + coordonnées présents** sur toute dalle primaire.
19. **Un seul accent coloré** (cyan) + 3 sémantiques (warn/alert/success). Pas de nouvelle couleur.
20. **Motion ≤ 3 types simultanés**, respecte `prefers-reduced-motion`.

### Code

21. **Pas de runtime Inngest/Temporal avant Phase RUNTIME validée pilote.**
22. **Pas de React rewrite.** V5 reste HTML standalone jusqu'à nouvelle doctrine.
23. **Idempotence partout.** Send = `idempotency_key` UUID, reserve entry = UNIQUE(week_iso, client_id), webhook = UNIQUE(resend_event_id).
24. **Pas de destruction V4** tant que §8 contrat de bascule non satisfait.

---

## 10. PRIORITY-ORDERED BACKLOG

**Chaque item a : priorité absolue, estimation, prérequis, critère de sortie.**

### P0 — MILE-1 : Ancrer la doctrine en base (~3h total)

| ID | Tâche | Estimation | Prérequis | Exit criteria |
|---|---|---|---|---|
| P0.1 | Appliquer migration `20260414120000_strategies_v1.sql` | 10 min | psql accès | Table `strategies` + `strategy_events` créées avec partial unique index |
| P0.2 | Exécuter seed `strategy_v2026_16_0_seed_r2.sql` | 10 min | P0.1 | 1 row DRAFT dans `strategies`, 1 event CREATED dans `strategy_events` |
| P0.3 | Créer route `app/api/strategy/active/route.ts` | 2h | P0.1 | `GET /api/strategy/active` retourne 200 avec body JSON doctrine |
| P0.4 | Exécuter `activate-strategy.sql` | 10 min | P0.2 + P0.3 + review body | Row status → ACTIVE, events ACTIVATED + SIGNED_OFF |

### P1 — CP7 : V5 send authority (~11h)

| ID | Tâche | Estimation | Prérequis | Exit criteria |
|---|---|---|---|---|
| P1.1 | Wire `ENVOYER MAINTENANT` → POST `/api/command/send-approved` avec idempotency_key | 6h | P0.* | Send V5 idempotent, zéro double-send possible, alert V4 supprimée |
| P1.2 | Wire `PASSER EN REVUE` → same endpoint + `[REVUE]` subject prefix | 2h | P1.1 | Review send V5 opérationnel, email arrive sur j.helene@outlook.fr |
| P1.3 | Wire `REGÉNÉRER` → POST `/api/command/generate-message` + PATCH draft_body | 3h | - | Regen V5 met à jour draft + gate result visible |

### P2 — OBS : observabilité post-send (~16h)

| ID | Tâche | Estimation | Prérequis | Exit criteria |
|---|---|---|---|---|
| P2.1 | Webhook Resend `/api/webhook/resend` → insert outreach_log + transition état client | 6h | Resend webhook configuré | 1 send test → event persisté + `sprint_accounts.status` updated |
| P2.2 | Reply poller IMAP/Gmail via cron | 8h | Credentials Gmail | Reply détecté automatiquement, status → REPLIED, draft réponse pré-rempli |
| P2.3 | Journal V5 utilise `outreach_log` comme source primaire | 2h | P2.1 | Timeline événements granulaire, types REPLIED/OPENED/BOUNCED visibles |

### P3 — CP5 : Sources intégrés V5 (~12h)

| ID | Tâche | Estimation | Prérequis | Exit criteria |
|---|---|---|---|---|
| P3.1 | Apollo search intégré (form → results → inject modal) | 5h | - | Pilote peut chercher + injecter sans quitter V5 |
| P3.2 | LinkedIn signals feed UI intégré | 3h | - | `/api/command/supabase-data` lu en V5 |
| P3.3 | Intel stream UI intégré (21 phases live) | 4h | - | Stream NDJSON rendu en V5, plus de redirection `/intel` |

### P4 — RUNTIME : Inngest + weekend manufacturing (~38h)

| ID | Tâche | Estimation | Prérequis | Exit criteria |
|---|---|---|---|---|
| P4.1 | Setup Inngest + migrate cron `outbound-orchestrator` | 8h | - | Cron existant tourne sur Inngest, observabilité UI dispo |
| P4.2 | Workflow `weekend-manufacture.v1` 8 stages | 25h | P3.1 + P2.* | Vendredi 22:00 → Dimanche 20:00 : réserve 45 entries matérialisée |
| P4.3 | Génération Monday Brief auto | 5h | P4.2 | Dimanche 20:00 email + notif, mode Command Monday Brief ratifiable |

### P5 — LEARN : OBSERVATORY mode (~16h)

| ID | Tâche | Estimation | Prérequis | Exit criteria |
|---|---|---|---|---|
| P5.1 | Table `segment_performance_snapshots` + compute vendredi | 3h | P2.* + ≥40 sends cumulés | Posteriors Beta-Binomial calculés hebdo |
| P5.2 | Affichage learner advisory mode Week Closing | 5h | P5.1 | Observations visibles vendredi, 0 influence doctrinale |
| P5.3 | Promotion advisory → influence (sous conditions) | 8h | P5.1 × 8 semaines | Doctrine v+1 proposée automatiquement, pilote ratifie |

### P6 — V4 SUNSET (~8h)

| ID | Tâche | Estimation | Prérequis | Exit criteria |
|---|---|---|---|---|
| P6.1 | Feature flag freeze V4 sends | 2h | §8 contrat de bascule satisfait | V4 en mode read-only |
| P6.2 | Migration pilote 100% V5 (5 jours consécutifs) | 5j usage | P6.1 | Zéro retour V4 |
| P6.3 | Archive V4 | 1h | P6.2 | `cockpit-v4.html` → `archive/cockpit-v4-sunset-YYYYMMDD.html` |

### Hors scope actuel (ne pas construire sans nouvelle doctrine pilote)

- ~~React migration~~
- ~~Temporal workflow engine~~ (Inngest tranché)
- ~~Multi-langue UI autre que FR~~
- ~~Team coordination features~~
- ~~Mobile native app~~
- ~~Chrome extension~~
- ~~CRM integration bidirectionnelle~~

---

## 11. RECOMMENDED EXECUTION ORDER

**Séquence stricte, pas de parallélisation hors groupes indiqués.**

```
┌─ BLOC 1 : ANCRAGE DOCTRINE (P0) ────── ~3h
│  P0.1 migration  →  P0.2 seed  →  P0.3 route  →  P0.4 activate
│  Critère bloc : curl /api/strategy/active = 200 doctrine r2 ACTIVE
│
├─ BLOC 2 : V5 SEND AUTHORITY (P1) ────── ~11h
│  P1.1 SEND NOW  ║ P1.2 REVIEW  ║ P1.3 REGEN  (parallélisables)
│  Critère bloc : 3 alerts drawer supprimées, un vrai send V5 abouti
│
├─ BLOC 3 : OBSERVABILITÉ (P2) ────────── ~16h
│  P2.1 webhook Resend  →  P2.2 reply poller  →  P2.3 Journal
│  Critère bloc : 1 cycle send → open → reply détecté automatiquement
│
├─ BLOC 4 : SOURCES INTÉGRÉS (P3) ─────── ~12h
│  P3.1 Apollo  ║ P3.2 LinkedIn  ║ P3.3 Intel  (parallélisables)
│  Critère bloc : 3 banners "ADAPTATEUR TRANSITIONNEL" supprimés
│
├─ BLOC 5 : MANUFACTURING HEBDO (P4) ──── ~38h
│  P4.1 Inngest setup  →  P4.2 workflow 8 stages  →  P4.3 Monday Brief
│  Critère bloc : 1 week-end manufacturing réel → Lundi Brief consulté
│
├─ BLOC 6 : LEARNER (P5) ──────────────── ~16h · après 40+ sends
│  P5.1 snapshots  →  P5.2 advisory UI  →  P5.3 promotion rules
│  Critère bloc : Vendredi propose doctrine v+1 basée sur posteriors
│
└─ BLOC 7 : V4 SUNSET (P6) ────────────── ~8h · après §8 contrat
   P6.1 freeze  →  P6.2 migration 5j  →  P6.3 archive
   Critère bloc : plus de cockpit-v4.html actif
```

**Total : ~104h sur 7 blocs séquentiels.** Blocs 1 et 2 livrables sur 1 semaine. Blocs 3-7 étalés selon bande passante pilote.

---

## 12. MAIN RISKS

### R1 — Asymétrie visuelle / runtime (risque principal)

**Signal :** cockpit V5 livré paraît complet, alors que la couche stratégique n'est pas ancrée.
**Conséquence :** illusion de maturité. Si pilote utilise V5 en lecture quotidienne sans progresser sur Blocs 1-3, le système reste un joli frontend sur un moteur non-gouverné.
**Mitigation :** MILE-1 (P0) = priorité absolue. Bloc 1 doit être fait avant tout nouveau chantier UI.

### R2 — Coexistence V4/V5 → divergences silencieuses

**Signal :** deux cockpits écrivent même Supabase. Mutations concurrentes possibles sur `sprint_accounts`.
**Conséquence :** fenêtre 5-15s où un état peut diverger entre V4 cache et V5 refresh.
**Mitigation :** TTL DataStore V4 (30s) + `fetchSprint()` V5 après mutation. Bascule rapide vers V5-only (Bloc 7) dès que possible.

### R3 — Absence d'observabilité post-send = doctrine figée

**Signal :** 16 sends réalisés, 0 event delivered/opened/replied persisté.
**Conséquence :** learner impossible, doctrine r2 reste non-performative indéfiniment, pas d'apprentissage réel → le bot ne s'améliore pas.
**Mitigation :** Bloc 3 (P2) = bloquant avant Bloc 6. Le binding_rule de la doctrine seed interdit explicitement l'entraînement learner tant que G3 non résolu.

### R4 — Doctrine seed validée mais non persistée (dérive possible)

**Signal :** r2 YAML figé en conversation, pas en base. Si pilote revient sans lire ce document, risque de modifier des valeurs critiques (exclusions, cooldowns, signals) sans audit trail.
**Mitigation :** ce document est la SSOT. MILE-1 ancre la doctrine avant toute autre modification. `strategy_events` append-only garantit traçabilité post-insertion.

### R5 — Micro-ajustements reprendre leur cours

**Signal :** tentation de patcher V5 ponctuellement au lieu d'avancer sur backlog.
**Conséquence :** dérive, régression, perte de cohérence.
**Mitigation :** règle §9.11 absolue. Toute contribution doit s'aligner sur §10 et §11.

### R6 — Manufacturing weekend dépend d'Apollo credits + OpenAI tokens

**Signal :** Bloc 5 P4.2 exécute 30 queries Apollo en parallèle + 50+ appels LLM. Budget tool avril 2026 = 49€ (Apollo Basic uniquement).
**Conséquence :** budget dépassé si déploiement naïf.
**Mitigation :** `manufacture.v1` doit implémenter `budget_tracking` per run + soft-fail avec partial reserve + cache 7j sur query signatures (spécifié dans spec Weekend Preparation Engine).

---

## 13. IMMEDIATE NEXT MILESTONE

### MILE-1 — Ancrer la doctrine seed r2 en base

**Portée :** exécuter Bloc 1 (P0.1 → P0.4) dans l'ordre strict.

**Estimation :** ~3h (10 + 10 min + 2h + 10 min).

**Critères d'acceptation (tous obligatoires) :**

1. `SELECT COUNT(*) FROM strategies WHERE status='ACTIVE'` = 1
2. `SELECT version FROM strategies WHERE status='ACTIVE'` = `'2026.16.0-seed.r2'`
3. `SELECT COUNT(*) FROM strategy_events WHERE strategy_id='01JRW7YH5M3P2BXKN9F8VQ4TGC'` ≥ 3 (CREATED + ACTIVATED + SIGNED_OFF)
4. `curl https://ghost-tax.com/api/strategy/active` retourne HTTP 200 + body JSON doctrine
5. Cockpit V5 Mandate Bar affiche stamp `v 2026.16.0-seed.r2` non-dimmed, sub `· ACTIVÉE [date]`, plus aucun banner `DOCTRINE EN ATTENTE D'INSERTION`
6. Drawer fiche client section D.02 affiche clearance stamp sans classe `is-missing`, texte `MANDAT 4TGC` (derniers 6 chars ID)

**Artefacts requis (existent dans conversation, à rapatrier en fichiers PR) :**

- `supabase/migrations/20260414120000_strategies_v1.sql` (migration rejouable avec DROP POLICY IF EXISTS + REVOKE UPDATE,DELETE strategy_events)
- `supabase/seeds/strategy_v2026_16_0_seed_r2.sql` (INSERT DRAFT + log CREATED idempotent)
- `app/api/strategy/active/route.ts` (GET 200/404 avec cache privé 30s)
- `supabase/scripts/activate-strategy.sql` (DO block FOR UPDATE + RETURNING + RAISE EXCEPTION anti-audit-fantôme)

**Dépendances externes :** accès psql au projet Supabase `cuvxhrzrwzuysnfnoqje`, déploiement Vercel pour la route.

**Unblocks :** Bloc 2 (CP7 V5 send authority) et toute la chaîne aval.

**Rollback :** procédure `activate-strategy.sql` inverse documentée (UPDATE status='ROLLED_BACK' + event). Acceptable de laisser 0 ACTIVE temporairement.

---

---

## 14. LOT 1 — OBS-0 + OBS-1 — REPO-WRITTEN (pas runtime-applied)

**Statut au 2026-04-15** : couche observabilité P2 écrite intégralement dans le repo, NON appliquée en base, NON déployée. Fallback gracieux V5 en place : zéro régression tant que le runtime n'est pas fait.

### Fichiers créés (REPO-WRITTEN)
- `supabase/migrations/20260416120000_outreach_events_v1.sql` — tables `outreach_events` (13 kinds), `outreach_ingest_events` (plomberie), `bootstrap_cursors`, triggers append-only, RLS, sentinelle `strategies('pre-doctrine','ROLLED_BACK')`
- `lib/outreach/events.ts` — helper `emitOutreachEvent()`/`emitIngestEvent()`/`getActiveStrategyVersion()`, types TS
- `lib/outreach/bootstrap/resolver.ts` — résolveur client_id (tag → email → domain unique)
- `lib/outreach/bootstrap/resend-pull.ts` — pull paginé Resend API avec curseur reprise
- `lib/outreach/bootstrap/internal-backfill.ts` — synthèse depuis `sprint_accounts` SENT
- `lib/outreach/gate.ts` — Quality Gate, 4 métriques, PASS/PARTIAL/FAIL
- `scripts/obs-bootstrap.ts` — runner idempotent (`tsx scripts/obs-bootstrap.ts`)
- `scripts/obs-gate.ts` — évaluation gate (`tsx scripts/obs-gate.ts`)
- `app/api/outreach/events/route.ts` — projection (filtres client_id/since/kind/ingest_mode)
- `app/api/webhook/resend/route.ts` — ingest webhook signature-verified + idempotent + state transition
- `app/api/admin/outreach/gate-status/route.ts` — dernière éval gate (alimente badge M.01)
- `app/api/admin/outreach/orphans/route.ts` — liste orphans pour résolution manuelle

### Fichier modifié
- `public/cockpit-v5.html` — intégration progressive enhancement : hook non-invasif sur `renderDrawer` + `renderJournal`, badge fiabilité `◉◐◯` dans M.01, extension labels FR (REMIS/OUVERT/CLIQUÉ/BOUNCE/PLAINTE/DÉSABONNÉ). **Fallback gracieux total** : tant que `/api/outreach/events` répond 404/503, le comportement V5 reste strictement identique (timeline synthétisée + journal `bot_execution_log`). V4 MD5 inchangé.

### Ce qui reste RUNTIME-APPLIED (exécution externe requise, pas par Jean-Étienne)
1. Pack SQL MILE-1 appliqué à Supabase (migration strategies + seed r2 + activation)
2. Migration LOT 1 appliquée à Supabase (`20260416120000_outreach_events_v1.sql`)
3. Déploiement Vercel (`git push` → build → prod)
4. Variable d'env `RESEND_WEBHOOK_SECRET` configurée côté Vercel
5. Webhook Resend configuré Dashboard (endpoint `https://ghost-tax.com/api/webhook/resend`, signing secret renseigné)
6. Exécution `tsx scripts/obs-bootstrap.ts` (hydratation historique, idempotent)
7. Exécution `tsx scripts/obs-gate.ts` (évaluation gate)

### Contrat sans régression
- V4 MD5 inchangé : `d2592d55ddc623f4f27a5c409e8f0832`
- V5 fallback gracieux : pas d'enhancement si endpoint 404 → comportement actuel préservé
- Hook repo-side : **non branché dans `send-approved`/`mark-sent`/`reply-received`/`sprint PATCH`** dans cette passe. Les events `live` proviennent uniquement du webhook Resend dans la phase courante. Le branchement interne arrivera en passe séparée post-MILE-1 runtime close, pour éviter des FK violations si `strategies` table absente.

### Doctrine verrouillée (invariants P2 durcis)
- 13 kinds métier fermés (enum `outreach_events.kind`)
- Table sœur `outreach_ingest_events` absorbe plomberie technique (pas dans UI V5)
- `strategy_version` = FK stricte vers `strategies.version` ; sentinelle `pre-doctrine` pour events antérieurs
- `strategy_assignment_mode ∈ {native, retroactive, absent}` — zéro suffixe stringly-typed
- Quality Gate : PASS/PARTIAL/FAIL sur 4 seuils (coverage≥0.90, orphan≤5%, resend≥70%, sent_without_event=0)
- Badge unique M.01 `◉◐◯` + tooltip métriques
- Append-only sur les 2 tables events (trigger + REVOKE)
- Idempotence : `UNIQUE(provider, provider_event_id)` + `bootstrap_cursors`

---

**Fin du document. Dernière autorité : ce fichier. Toute modification du projet doit d'abord mettre à jour ce document, pas l'inverse.**
