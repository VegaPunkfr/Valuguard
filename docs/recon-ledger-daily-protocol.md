# RECON LEDGER — Protocole d'usage quotidien

## 1. CHECK DU MATIN (2 minutes)

Ouvrir le cockpit → touche `8` (Recon Ledger)

**Regarder en premier : l'Action Queue (onglet QUEUE)**

La queue est triée par priorité. En haut = le plus urgent.

| Ce que tu vois | Ce que tu fais |
|---|---|
| Entité `shortlisted` + `next_action: email_send` | C'est une cible prête. Va dans Prospects (touche 1), retrouve-la, envoie l'email. |
| Entité `replied` | Quelqu'un a répondu. Traite la réponse dans la journée. |
| Entité `deferred` + revisit passé | Elle revient dans la queue automatiquement. Réévalue : shortlist ou suppress. |
| Entité `discovered` + `stale` tag | Vue il y a longtemps, jamais traitée. Décide : review ou suppress. |
| Entité `data_improved` tag | Ses données se sont améliorées (email acquis, titre changé). Réévalue sa priorité. |

**Ensuite : le compteur Stats Bar**

Si "Actionable" est > 5 et tu n'as rien envoyé → tu prends du retard.
Si "Actionable" est 0 → il faut une nouvelle recherche Apollo.

## 2. EXPLOITER L'ACTION QUEUE

### Filtres à utiliser

| Filtre | Ce qu'il fait émerger | Quand l'utiliser |
|---|---|---|
| Status = `shortlisted` | Prêts à contacter, pas encore envoyés | Chaque matin |
| Status = `discovered` | Jamais revus après la découverte | 1x/semaine, pour trier le backlog |
| Status = `deferred` | Mis en pause, certains doivent revenir | 1x/semaine |
| Recherche "wave1" dans tags | Cibles Wave 1 | Pour suivre l'avancement de la wave |

### Actions rapides dans la queue

- **Changer statut** : clic sur le badge statut → cycle vers l'état suivant autorisé
- **Injecter en campagne** : pousse le prospect dans l'onglet Prospects pour envoi
- **Marquer revisit** : reporte à plus tard sans perdre le prospect
- **Ajouter note** : contexte pour toi-même ou pour Claude

## 3. QUAND RELANCER

| Situation | Délai | Action |
|---|---|---|
| Email envoyé, ouvert, pas de réponse | **Jour 10** | Follow-up avec un NOUVEAU finding, pas un "just checking in" |
| Email envoyé, jamais ouvert | **Jour 7** | Changer l'objet, renvoyer. Si toujours pas ouvert → problème de délivrabilité |
| Email envoyé, réponse "pas maintenant" | **Jour 30-60** | Marquer `deferred` avec revisit. Revenir avec un benchmark update |
| Email envoyé, réponse positive | **Même jour** | Répondre dans l'heure. Proposer le rapport complet. |

## 4. QUAND RÉ-ENRICHIR

| Signal | Action | Crédits Apollo |
|---|---|---|
| Prospect `shortlisted` mais pas d'email | Enrichir via Apollo People Match | 1 crédit |
| Prospect vu 3+ fois mais données incomplètes | Enrichir | 1 crédit |
| Prospect dont le titre a changé (job_changed_flag) | Ré-enrichir pour vérifier la nouvelle entreprise | 1 crédit |
| Prospect `discovered` sans email | **NE PAS enrichir** — il n'est même pas reviewed. Trop tôt. |
| Prospect `suppressed` | **JAMAIS ré-enrichir** — c'est un état terminal |

**Règle** : n'enrichis que les prospects que tu vas contacter dans les 7 prochains jours. Les autres peuvent attendre.

## 5. QUAND IGNORER

| Situation | Action |
|---|---|
| Prospect `discovered` depuis 30+ jours, jamais reviewed | Suppress ou ignore. Si tu ne l'as pas regardé en 30 jours, il ne t'intéresse pas. |
| Prospect sans email et sans LinkedIn | Suppress. Pas de canal de contact = pas de valeur opérationnelle. |
| Entreprise <50 employés | Suppress. Hors ICP. Trop petit pour €490. |
| Prospect qui a répondu "ne me contactez plus" | Suppress immédiatement. |
| Session Apollo avec 0 useful results | Ne pas la reproduire. Changer les filtres. |

## 6. RYTHME HEBDOMADAIRE

| Jour | Action Recon Ledger | Temps |
|---|---|---|
| **Lundi** | Check Action Queue. Envoyer les emails shortlisted. | 15 min |
| **Mercredi** | Review les `discovered` non traités. Shortlist ou suppress. | 10 min |
| **Vendredi** | Check les `deferred` dont le revisit est passé. Lancer une nouvelle recherche Apollo si <3 actionable. | 15 min |

**Total : 40 min/semaine sur le Recon Ledger.**
