# Refonte ghost-tax.com — dossier opérationnel

**Date de création** : 18 avril 2026
**Objectif** : faire passer le site de "6/10 CFO credibility" à "Fellow-grade institutional" en 7 jours.
**Outils** : Claude Design (Anthropic Labs, depuis 17 avril) + Claude Code (moi) + optionnellement Figma pour précision pixel.
**Budget tokens** : 40-50% du quota hebdo Max 5x (safe, marge pour Touch 1 Apollo mardi).

---

## Contenu du dossier

| Fichier | À lire quand | Pour qui |
|---|---|---|
| `01-ANALYSE-SITE.md` | **Maintenant** (avant de démarrer) | Toi — pour comprendre les défauts spécifiques |
| `02-ANALYSE-CAPACITES-CLAUDE.md` | **Maintenant** (pour rentabiliser les 100€/mois) | Toi + tes proches dubitatifs |
| `03-PROMPTS-CLAUDE-DESIGN.md` | **Dimanche matin** (début refonte) | Toi — copier-coller dans claude.ai/design |
| `04-CHECKLIST-VALIDATION.md` | **Lundi** (après wireframes générés) | Toi — avant de me livrer le handoff |
| `README.md` | Maintenant (c'est ce fichier) | Toi — index |

---

## Workflow en 7 jours

### Dimanche 19 avril — Préparation design
- **Matin 2h** : lire les 2 analyses. Intérioriser le verdict et les anti-patterns.
- **Fin matinée 1h** : Prompt 0 → extraction design system
- **Début après-midi 1h** : review design system + question/réponse si dérive
- **Après-midi 2h** : Prompts 1-4 → 4 wireframes en batch
- **Soir** : me partager les wireframes en chat pour review

### Lundi 20 avril — Validation wireframes
- **Matin 30 min** : je review tes 4 wireframes en chat, feedback précis
- **Matin 1h** : tu corriges les dérives identifiées (prompts itératifs Claude Design)
- **Midi** : handoff validé → Prompt 5 high-fidelity lancé
- **Après-midi** : tu ne touches pas. Focus préparation Touch 1 Apollo mardi.

### Mardi 21 avril — Touch 1 Apollo
- **ZÉRO design work.**
- 29 CFOs DACH/UK/NL reçoivent Touch 1.
- Tu monitor les replies dans contact@ghost-tax.com
- Si replies : tu me pingue, je prépare les réponses, tu valides.
- Budget : 2-3h ton temps sur Apollo, 0h sur refonte.

### Mercredi 22 avril — Handoff vers moi
- **Matin 30 min** : récupère les handoff bundles Claude Design (4 pages)
- **Midi** : envoie-moi la commande de handoff (voir `04-CHECKLIST-VALIDATION.md` fin)
- Je crée le skill `/refonte-site` similar à `/merge-tier-s`
- Je lance 4 agents Implementer parallèles (1 par page) en background
- Tu ne touches pas, tu regardes les replies Apollo continuer

### Jeudi-vendredi 23-24 avril — Implémentation
- Les 4 agents codent le nouveau site dans Next.js 15 existant
- Respect i18n (EN/DE/FR/NL), pas de casse routes existantes
- Commits atomiques par page
- Runtime verify avant PASS

### Samedi 25 avril — Site live
- Je push Vercel quand les 4 pages PASS Verifier
- Tu ouvres ghost-tax.com et tu vois le nouveau site
- Comparison screenshots avant/après
- Si OK → on monitor la conversion 1 semaine
- Si problème → je corrige en 1-2h

---

## Garde-fous opérationnels

### Règle 1 — Claude Design et Claude Code jamais simultanés
Matin = l'un, après-midi = l'autre. Évite le lockout tokens.

### Règle 2 — Valide un wireframe à la fois
Ne balance pas 4 prompts d'un coup. Si le Prompt 1 dérive, tu corriges, puis Prompt 2.

### Règle 3 — Screenshots systématiques
Claude Design est en research preview. Si des données disparaissent, tu as la sauvegarde PNG.

### Règle 4 — Ne touche pas aux pages secondaires
`/about`, `/faq`, `/integrations`, `/case-studies`, `/contact`, `/peer-gap`, `/procurement`, `/intel-benchmarks` → **pas dans cette refonte**. Focus sur les 4 pages P0+P1 qui drive conversion.

### Règle 5 — Touch 1 Apollo > refonte site
Si mardi tu as un reply CFO et un wireframe à corriger, **toujours le CFO d'abord**. Le design peut attendre 48h. Un reply non traité en 48h = prospect perdu.

### Règle 6 — Commit + push quand PASS
Pas de "je push demain". Chaque page validée runtime = commit atomique poussé main = Vercel auto-deploy. Feedback loop court.

---

## Escape hatch — si ça ne marche pas

Si à un moment du processus :
- Claude Design produit du output aberrant (ex: met des emojis malgré le prompt)
- Tu te fais lockout tokens
- Les agents Implementer remontent BLOCKED en cascade
- Le site en prod se casse après deploy

**Stop tout. Me pinguer en chat avec :**
```
Refonte : blocked. [description du problème]. Besoin reroute.
```

Je :
1. Diagnostique en 5 min
2. Propose 2-3 options de recovery
3. Tu valides
4. On repart, pas de panique

**Le site actuel reste live** peu importe ce qui arrive pendant la refonte. On travaille sur une branche/working tree jusqu'au push final. Risque zéro sur la prod pendant Touch 1 Apollo.

---

## Métrique de succès

Le site est refondu "correctement" si, **une semaine après le deploy**, tu peux mesurer :

- [ ] Conversion rate `/` → `/intel` (free scan) augmentée d'au moins 10% (baseline à mesurer avant deploy)
- [ ] Bounce rate `/` diminué (proxy : sessions > 30s augmentées)
- [ ] Conversion rate `/sample-report` → `/checkout` augmentée
- [ ] Au moins 1 reply Apollo qui mentionne "j'ai regardé votre site, c'est clair" (qualitatif)
- [ ] Aucun support ticket pour bug / broken layout

Si 3/5 oui → refonte réussie.
Si 5/5 oui → Fellow-grade atteint.

---

## Prochaine action

**Ton côté, maintenant** : lis `01-ANALYSE-SITE.md` (20 min) + `02-ANALYSE-CAPACITES-CLAUDE.md` (15 min). Prépare Claude Design pour dimanche matin (connecte GitHub, prépare screenshots).

**Mon côté, maintenant** : commit + push ce dossier. Je reste en standby. Tu me pingue dimanche matin quand tu démarres Prompt 0.

Si tu veux me relancer avant dimanche (ex: question sur un prompt, ou adjustement d'un analyse) → juste envoie "refonte question : ..." et je reprends le contexte.
