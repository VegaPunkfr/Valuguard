# ADR J1 — Message Forge + Quality Gate port V4 → V6

**Statut** : VALIDATED (runtime)
**Date** : 2026-04-18
**Protocole** : `.claude/skills/cockpit-merge-tier-s/SKILL.md`

## Contexte

V6 du cockpit avait perdu la Message Forge + Quality Gate de V4 (L1609-1932). La sequence Apollo "Ghost Tax — DACH UK NL Q2 2026" démarre mardi 21 avril avec 29 CFOs enrollés. Sans ces deux briques, les drafts générés par `/api/command/generate-message` partaient sans filtre contre les phrases IA ("hope you are well", "touching base", etc.) ni contre les anti-patterns commerciaux (placeholder non résolu, absence de personnalisation, spam words). Risque direct : un premier touchpoint à un CFO institutionnel DACH avec du langage IA = crédibilité brûlée sur tout le segment.

## Décision

Porter le bloc V4 dans V6 selon une architecture à 3 couches :

1. **Data éditoriale externalisée** dans `public/cockpit/data/*.json` (culture-rules, signal-angles, ai-blacklist) — une seule source de vérité consommable par serveur (TS) et client (JS vanilla).
2. **Module client** `public/cockpit/modules/message-forge.js` exposant `window.MessageForge` (IIFE, pas ES6 modules — V6 charge des scripts classiques, le refactor ES6 était out-of-scope).
3. **Module serveur** `lib/outreach/culture-rules.ts` + `lib/outreach/quality-gate.ts` avec types stricts (`GateDecision`, `GateScores`, `GateHardBlocker`), invoqué dans `app/api/command/generate-message/route.ts` après la génération Haiku, avant le retour NextResponse.

Le gate retourne un objet riche `{decision, scores, hardBlockers, regenerateHints, auditLog}` + une string legacy `gateResult` dérivée pour rétro-compatibilité avec le code V6 existant qui teste `c.draft.gateResult`.

## Alternatives rejetées

- **Créer `/api/command/message-forge`** (nouvelle route) : rejeté. La route de ce nom existe déjà pour un autre usage (batch pipeline sur `osint_prospects`). Renommer aurait cassé le cron `apollo-sync` et le pipeline automatisé.
- **Garder les const inline dans le module** : rejeté. Les 22 phrases AI_BLACKLIST + 9 signal angles × 4 langues = contenu éditorial qui évoluera sans rebuild. JSON externes = A/B testing de prompts possible sans redeploy.
- **ES6 modules côté client** : rejeté. V6 est un monolithe `<script>` classique L1280. Passer en `type="module"` aurait cassé les closures globales du monolithe. Namespace `window.MessageForge` = greffe chirurgicale.
- **Migration Supabase pour persister les détails du gate** : rejeté pour le MVP J1. `gateResult` string persistée suffit ; les détails riches (`scores`, `hardBlockers`) sont éphémères — re-calculables via re-appel API si besoin.

## Changement doctrinal — AI_BLACKLIST : HARD_BLOCK au lieu de REGENERATE

Premier Verifier a détecté un bug fonctionnel : un message contenant *"hope you are well"* passait en `PASS_SEND` quand les scores étaient pile à 50 sur la couche linguistic. Deux options examinées :

- Option A : abaisser le seuil `scores.linguistic < 60` — ne fixait que le cas limite, laissait passer les messages bien formés contenant une phrase IA isolée.
- Option B : promouvoir AI_BLACKLIST à `'HARD_BLOCK'` — une détection binaire (phrase présente ou absente) → action binaire (BLOCK). Aligné avec la doctrine Ghost Tax *"zéro jargon marketing creux, zéro flatterie"*.

**Option B retenue.** Le check est désormais sévérité `HARD_BLOCK`, layer `B` (Linguistic). Toute phrase IA détectée → decision = BLOCK immédiat, peu importe le reste. Runtime prouvé via `scripts/test-forge-runtime.mjs` Test D2.

## Conséquences

**Positives** :
- Les 29 CFOs DACH Apollo ne recevront jamais de premier touchpoint contenant une phrase IA (couverture : 22 phrases curatées V4).
- Le drawer V6 affiche désormais un badge coloré PASS/REGEN/BLOCK + hints list, au lieu d'un simple texte `PASS · W3`.
- Le bouton APPROUVER L'ENVOI est durci sur `=== 'PASS_SEND'` — plus de débordement `PASS_DRAFT_ONLY`.
- Pattern réutilisable pour J2 à J7 : data externalisée JSON + module IIFE client + types TS serveur.

**Négatives** :
- 22 phrases AI_BLACKLIST en HARD_BLOCK = risque faux positif. Aucune phrase de la liste V4 n'est un terme métier FinOps légitime, mais si un cas apparaît en prod (ex : *"best practices"* dans un email sur FinOps maturity models), il faudra whitelister au cas par cas.
- Le test end-to-end `POST /api/command/generate-message → Haiku → gate → response enrichie` n'a pas pu être exécuté dans cette session (crédit Anthropic à zéro). La logique gate est prouvée offline via `scripts/test-forge-runtime.mjs`, mais la validation du wiring API sera à faire après recharge crédit.

**Neutres** :
- Ajout d'une dépendance cyclique potentielle entre `lib/outreach/culture-rules.ts` (server) et `public/cockpit/data/culture-rules.json` (client). Résolu par chargement du JSON côté serveur via `resolveJsonModule: true` — source unique, pas de duplication.

## Fichiers touchés

**NEW (6)** :
- `public/cockpit/data/culture-rules.json`
- `public/cockpit/data/signal-angles.json`
- `public/cockpit/data/ai-blacklist.json`
- `public/cockpit/modules/message-forge.js`
- `lib/outreach/culture-rules.ts`
- `lib/outreach/quality-gate.ts`

**MODIFIED (3)** :
- `public/cockpit/recon-utils.js` (+flagToCountry, +window export)
- `app/api/command/generate-message/route.ts` (dédup inline detect*, +qualityGate, +gate object response)
- `public/cockpit-v6.html` (+CSS gate-badge, +script src, +renderDrawer badge rendering, +bouton FORGER, gatePass durci, handler forge)

**HELPER** :
- `scripts/test-forge-runtime.mjs` (utilitaire de test runtime du module client, à garder pour régression J2+)
