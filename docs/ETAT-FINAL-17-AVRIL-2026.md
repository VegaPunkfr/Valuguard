# État Final — 17 avril 2026 (soir)

## 🟢 Apollo Mailbox opérationnel (via Claude Cowork UI)

| Item | État |
|---|---|
| Mailbox | `contact@ghost-tax.com` connectée via OAuth Google |
| Warmup | Progressive 10→40 emails/jour, actif |
| Signature | Jean-Etienne Helene / ghost-tax.com |
| Sending limits | 50/jour, 6/heure, 600s délai |
| Subdomain tracking | `track.ghost-tax.com` Healthy (DNS via Entri/Vercel) |
| Opt-out link | `<%Unsubscribe%>` activé |
| DKIM | Records ajoutés via Entri → propagation 24-48h |
| Domain auth | Healthy (DKIM en attente propagation) |

## 🟢 Code Ghost Tax aligné (via Claude Code CLI)

| Item | Fichier | Statut |
|---|---|---|
| Cron `apollo-sync` | `app/api/cron/apollo-sync/route.ts` | Réécrit pour schema réel (metadata JSON) |
| Schedule cron | `vercel.json` → `15 6 * * *` | Déjà ajouté |
| `from` + `reply_to` | 9 fichiers sends | Tous migrés vers `contact@ghost-tax.com` |
| Tracking opens/clicks | Tous sends | Activé |
| Touch 4 & 5 | `drip-sequence.ts` | Désactivés (MAX_ACTIVE_TOUCHES=3) |
| Touch 2 rewrite | `drip-templates.ts` | Question ouverte "SaaS ratio?" |
| Skip drip Resend pour leads Apollo | `drip-sequence.ts:135` | `source ≠ apollo-v2-*` |
| Stop drip quand reply détecté | `apollo-sync` | Pass `converted=true` |
| P0 sécurité | COMMAND_SECRET Bearer + autonomy fail-closed + manifest | Tous fixes |
| Webhook Resend healthcheck | `/api/webhook/resend/health` | Disponible |
| TypeScript check | `tsc --noEmit` | ✅ 0 erreur |

## 🟢 Apollo API exploité (via Claude Code CLI, 59 credits consommés)

- 30 CFOs DACH/UK/NL unlockés via `/mixed_people/api_search` + `/people/match`
- 30/30 créés dans CRM Apollo via `/contacts` POST (label `Ghost Tax Q2 2026`)
- 29/29 companies enrichies via `/organizations/enrich` (tech stack, revenue, headcount, funding)
- Intelligence report priorisé écrit : `intelligence-report-17avril.json`

## 🔴 Non disponible sur plan Basic

- `/organizations/job_postings` — upgrade Professional requis
- Buying intent topics surge — upgrade Professional
- Advanced filters (funding amount, growth rate) — upgrade Professional

## 📅 Prochaine exécution automatique

| Cron | Schedule (UTC) | Prochain run |
|---|---|---|
| `apollo-sync` | `15 6 * * *` quotidien | Demain 06:15 UTC |
| `master` (drip Resend) | `30 8 * * 2-4` mar/mer/jeu | Mardi 21 avril 08:30 UTC |
| `outbound-orchestrator` | `0 8 * * 2-4` | Mardi 21 avril 08:00 UTC |
| Apollo sequence | Tue-Thu 9:30-11:30 local | Mardi 21 avril 9:30 DACH/UK/NL local |

## 🎯 Architecture outreach finale

```
Apollo sequence native (30 CFO DACH/UK/NL)
  ├─ Send via contact@ghost-tax.com (OAuth Google Workspace)
  ├─ Touch 1 / 2 / 3 (templates identiques aux drip-templates Ghost Tax)
  ├─ Warmup progressif 10→40/jour
  ├─ Tracking natif Apollo (opens/clicks/replies)
  └─ Stop auto sur reply/bounce/unsubscribe

Cron apollo-sync (quotidien 6h15 UTC)
  └─ Pull stats sequence → merge dans outreach_leads.metadata
     └─ Si reply : status="replied", converted=true
        └─ Stoppe drip Resend côté Ghost Tax pour ce lead

Drip Resend Ghost Tax (mar/mer/jeu 8h30 UTC)
  ├─ Exclut source=apollo-v2-* (géré par Apollo)
  ├─ Traite les leads post-scan (autres origines)
  └─ Touches 1→3 Ghost Tax avec reply_to=contact@ghost-tax.com
```

**Pas de doublon, pas de conflit.** Apollo pour la prospection sortante, Resend pour les flux transactionnels et post-scan.

## 📋 Ce qu'il reste à faire (côté Edith, manuel)

1. **Commit + push Vercel** — toutes les modifs code sont prêtes, il faut deploy
2. **Attendre propagation DKIM** (24-48h) avant de lancer le warmup à plein volume
3. **Monitoring Apollo dashboard** — vérifier que la sequence démarre mardi
4. **Si Cowork n'a pas setup tous les items** (intent signals, vues, Slack intégration) → re-run le prompt ciblé sur ce qui manque

## 📊 Objectif 10 premiers clients

Avec la séquence actuelle :
- 30 CFOs DACH/UK/NL × 3 touches = 90 emails sur 14 jours
- Reply rate réaliste cold outreach B2B CFO : 2-5% → **0.6 à 1.5 replies/semaine**
- Conversion reply → scan gratuit → pack : ~15-25% → **0.1 à 0.4 clients/semaine**

**Projection 3 mois** (hors upgrade plan Apollo) : ~2-5 clients Rail A sur les 30 prospects actuels. Pour hitter 10 clients rapidement, il faudra :
- Re-run search Apollo avec 30-60 nouveaux prospects (budget credits : OK)
- Ou upgrader plan Professional (+99€/mois) pour débloquer intent signals (surge = 3-5× reply rate)
