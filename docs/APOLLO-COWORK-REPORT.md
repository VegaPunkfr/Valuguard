# APOLLO COWORK REPORT — Ghost Tax Q2 2026
**Généré le** : 17 avril 2026  
**Session** : Claude Cowork (Anthropic)  
**Mission** : Configuration complète Apollo outreach — DACH · UK · NL

---

## État d'exécution

| Tâche | Statut | Notes |
|-------|--------|-------|
| Lecture intelligence-report-17avril.json | ✅ Complété | 29 contacts confirmés |
| Vérification état Apollo | ✅ Complété | 0 séquences existantes, 29 contacts CRM |
| Connexion email OAuth Gmail | ⚠️ Manuel requis | Chrome sandbox sans accès internet |
| Création séquence (3 touches) | ⚠️ Manuel requis | MCP Apollo sans endpoint create_sequence |
| Enrollment 29 contacts | ⚠️ Manuel requis | Dépend de la séquence créée |
| Intent signals | ⚠️ Manuel requis | UI-only, Chrome inaccessible |
| Vues dashboard Apollo | ⚠️ Manuel requis | UI-only |
| Cron `/api/cron/apollo-sync` | ✅ Créé | `Claude/app/api/cron/apollo-sync/route.ts` |
| Cockpit V6 — onglet Apollo Sync | ✅ Créé | `Claude/public/cockpit-v6.html` +tab +view |
| Ce rapport | ✅ Créé | `Claude/docs/APOLLO-COWORK-REPORT.md` |

---

## Ce qui a été fait automatiquement

### 1. Audit de l'état Apollo

- **Séquences existantes** : 0 (aucune — à créer manuellement)
- **Email accounts connectés** : 0 (OAuth requis)
- **Contacts CRM Apollo** : 29 trouvés via `contacts/search` (CFO label Ghost Tax Q2 2026 présent dans le CRM mais API de filtrage par label non fonctionnelle côté MCP)
- **Credits Apollo restants** : ~140/200 mensuels (plan Basic 588€/an)

### 2. Cron apollo-sync créé

**Fichier** : `app/api/cron/apollo-sync/route.ts`

Ce cron tourne quotidiennement (06h15 UTC selon `vercel.json`) et :
- Fetche les 29 contacts Apollo par leur ID (pas par label — plus fiable)
- Lit les métriques de séquence : `sequence_status`, `opens_count`, `clicks_count`, `replies_count`
- Met à jour `outreach_leads` dans Supabase avec `PATCH` (ou `INSERT` si manquant)
- Détecte les transitions `replied: false → true` et notifie `/api/make/relay` (pipeline Make)
- Retourne un JSON complet pour le cockpit

**Ajouter dans `vercel.json`** :
```json
{ "path": "/api/cron/apollo-sync", "schedule": "15 6 * * *" }
```

### 3. Cockpit V6 — onglet Apollo Sync

**Fichier** : `public/cockpit-v6.html`

Nouveau 5ème onglet "Apollo Sync" avec :
- **KPI Row** : Total contacts · Enrollés · Ouvertures · Clics · Réponses · Bounces
- **Notice setup** : Instructions pas-à-pas pour les actions manuelles restantes
- **Table des 29 contacts** : nom, entreprise, email, badge statut séquence, opens, clicks, reply, lien deep-link ↗ Apollo
- **Bouton "Sync Apollo"** : appelle `/api/cron/apollo-sync` live depuis le cockpit et rafraîchit l'affichage
- **Pré-chargé** : tous les contacts statiques (pas besoin de sync pour voir la liste)

---

## Actions manuelles requises — dans l'ordre

### Étape 1 — Connecter l'email (OBLIGATOIRE AVANT TOUT)

1. Aller sur [app.apollo.io/#/settings/email-accounts](https://app.apollo.io/#/settings/email-accounts)
2. Cliquer **"Connect Email Account"** → sélectionner Gmail
3. Utiliser **`audits@ghost-tax.com`** (Google Workspace)  
   Fallback si GWS inaccessible : `hashirama973@gmail.com`
4. Compléter le flow OAuth (permissions : envoi + lecture replies)
5. Vérifier :
   - ✅ DKIM / SPF configurés (Apollo le vérifie automatiquement)
   - ✅ Tracking opens/clicks/replies activé
   - ✅ Réponses redirigées vers la boîte

---

### Étape 2 — Créer la séquence

1. Apollo → Sequences → **"+ New Sequence"**
2. Nom : `Ghost Tax — DACH UK NL Q2 2026`
3. Permissions : Shared with team

**Touch 1 — J0** (copier depuis `lib/drip-templates.ts` : fonction `buildTouch1`)
- Subject EN : `{{firstName}}'s company: Your free scan results are ready`  
  Ou version Apollo variable : `Your {{company}} scan results are ready`
- Body : email HTML complet — voir `buildTouch1()` dans le fichier

**Touch 2 — J+3** (copier depuis `buildTouch2`)
- Subject EN : `Quick question on {{company}}'s SaaS stack`
- Subject DE : `Kurze Frage zum SaaS-Stack von {{company}}`
- Body (🔑 pépite) :  
  > "Short follow-up. I'm not going to push a pack on you — one question: what's your current ratio of SaaS spend to headcount? I'm mapping benchmarks across mid-market DACH/UK. Reply with a rough number, I'll send back how you compare. No pitch attached."

**Touch 3 — J+7** (copier depuis `buildTouch3`)
- Subject EN : `How {{company}} compares to its peers`
- Subject DE : `Wie {{company}} im Vergleich zu seinen Peers abschneidet`
- Body : peer benchmark + social proof (67% des orgs similaires ont agi en 30j)

**Réglages séquence :**
| Paramètre | Valeur |
|-----------|--------|
| Send window | Mardi–Jeudi · 09h30–11h30 heure locale |
| Throttle | 20 emails/jour max (warm-up conservatif) |
| Stop conditions | Reply · Bounce · Unsubscribe · Stop manuel |
| Touches 4–5 | Désactivées (anti-pattern CFO) |

---

### Étape 3 — Enroller les 29 contacts

1. Apollo → People → Filter : Label `Ghost Tax Q2 2026`
2. Sélectionner tous (29 contacts)
3. **"Add to Sequence"** → sélectionner `Ghost Tax — DACH UK NL Q2 2026`
4. Confirmer Touch 1 schedulée mardi prochain 09h30

Dès le lendemain matin (06h15 UTC), le cron `/api/cron/apollo-sync` se déclenche et peuple le Cockpit V6 → onglet Apollo Sync avec les métriques live.

---

### Étape 4 — Configurer les intent signals (plan Basic)

Apollo → Signals (ce qui est disponible sur Basic) :

**Job Change Alerts** — sur vos 30 comptes :
- Roles : Finance · CFO · FinOps · Procurement · Head of Finance · Finanzvorstand

**News Mentions Alerts** :
- Events : Funding rounds · M&A · Restructuring · Layoffs

**Non disponible sur Basic (noter pour upgrade éventuel)** :
- Buying intent surges (topics SaaS cost optimization, FinOps, vendor management)
- Advanced org chart
- Full company growth signals

---

### Étape 5 — Créer les vues Apollo

Apollo → People → Saved Filters → New Filter :

| Vue | Filtre |
|-----|--------|
| **Priority 8+** | Label = Ghost Tax Q2 2026 + Score ≥ 8 (si custom field dispo) |
| **DACH** | Country IN [Germany, Austria, Switzerland] |
| **Replied** | Sequence status = Replied |
| **Bounced** | Email status = Invalid |
| **Hot signals** | Label = Ghost Tax Q2 2026 + Job posting Finance/CFO |

---

### Étape 6 — Intégration Slack (optionnel)

Si workspace Slack Ghost Tax existe :
1. Apollo Settings → Integrations → Slack → Connect
2. Channel `#sales-alerts` → notifications :
   - Reply received
   - Meeting booked
   - Positive reply classified by AI
   - New hot lead detected

**⚠️ Ne pas activer Meeting Booker** — pas de calls dans le funnel Ghost Tax.

---

### Étape 7 — Features AI Apollo (Basic)

Disponibles sur Basic :
- ✅ Email AI Writer (pour itérer sur les templates)
- ✅ Reply classification (positive/negative/OOO) — activer
- ❌ AI Research per prospect (requiert plan Professional)

---

## Contacts enrollés (29)

| # | Nom | Entreprise | Email | Marché |
|---|-----|-----------|-------|--------|
| 01 | Philip Gardner | Rocket Medical | philipg@rocketmedical.com | UK |
| 02 | Martijn Klerk | P1 Travel | m.deklerk@p1travel.com | NL |
| 03 | Maryse Trommelen | PIDZ | maryse.trommelen@pidz.nl | NL |
| 04 | Peter Kainz | Ontime Logistics | peter.kainz@ontimelogistics.com | DACH |
| 05 | Yolanda Both | Papendal | yolanda.deboth@papendal.nl | NL |
| 06 | Karsten Kammer | BCN | karsten.kammer@bcn.group | DACH |
| 07 | Phil Ward | Astech | phil.ward@astechprojects.co.uk | UK |
| 08 | Jeroen Willard | Canon Business Center NL | jeroen.willard@cbc-nederland.nl | NL |
| 09 | Stefan Stuker | UCC Coffee Switzerland | stefan.stuker@ucc-coffee.ch | DACH |
| 10 | Roman Bernold | Kongresshaus Zürich | roman.bernold@kongresshaus.ch | DACH |
| 11 | Nick Van Der Steen | Sawiday | nick@sawiday.com | NL |
| 12 | Andrej Nikitin | Toyota Material Handling AT | andrej@toyota-forklifts.at | DACH |
| 13 | Kevin Matjeka | ASTRA Bremen | kevin.matjeka@astra-bremen.com | DACH |
| 14 | Marcel Oosterveld | Consumentenbond | moosterveld@consumentenbond.nl | NL |
| 15 | Martin Filius | Topa Verpakking | martin.filius@topa.nl | NL |
| 16 | Stephen Smales | Survitec / Beaufort | stephen.smales@survitecgroup.com | UK |
| 17 | Charlie Irvine | Ergonomic Solutions | charlie.irvine@ergonomic.solutions | UK |
| 18 | Ellie Poltorak | Inclusive Employers | epoltorak@inclusiveemployers.co.uk | UK |
| 19 | Chris Romain | Pareto Financial Planning | chris.romain@paretofp.co.uk | UK |
| 20 | Patrick Helvensteijn | Ampowr | p.helvensteijn@ampowr.com | NL |
| 21 | Jenny Peel | MAGTEC | j.peel@magtec.co.uk | UK |
| 22 | Eric Luttikhuis | Baan Twente | e.luttikhuis@baantwente.nl | NL |
| 23 | Marc Schmidt | IMTRON GmbH | schmidt.m@imtron.eu | DACH |
| 24 | Laila Haller | Eturnity | laila.haller@eturnity.com | DACH |
| 25 | Gill Martin | Cumbria Education Trust | gmartin@cumbriaeducationtrust.org | UK |
| 26 | Christian Schoen | Alois Dallmayr | christian.schoen@dallmayr.de | DACH |
| 27 | Deborah Spence | The CFO Centre UK | deborah.spence@cfocentre.com | UK |
| 28 | Ad Breepoel | VERVAET | ad.breepoel@vervaet.nl | NL |
| 29 | Reto Graf | BRAUN AG | reto.graf@braun.ch | DACH |

---

## Contraintes respectées

- ✅ Pas de calling / meeting booker activé — funnel 100% self-serve
- ✅ Touches 4–5 désactivées (anti-patterns CFO DACH)
- ✅ Pas de sequences manipulatives (scarcity, cost-of-delay) — Touch 2 rewrite open question
- ✅ GDPR : contacts unlockés via Apollo sous legitimate interest B2B
- ✅ Budget : 0 crédits Apollo supplémentaires utilisés (lecture seule)
- ✅ Templates EN pour UK/NL, DE pour DACH — disponibles dans `lib/drip-templates.ts`

---

## Fichiers livrés

| Fichier | Description |
|---------|-------------|
| `app/api/cron/apollo-sync/route.ts` | Cron quotidien sync Apollo → Supabase |
| `public/cockpit-v6.html` | Cockpit mis à jour (onglet Apollo Sync + table + KPIs) |
| `docs/APOLLO-COWORK-REPORT.md` | Ce rapport |

---

## Prochaine étape recommandée

**Faire les 3 actions manuelles dans cet ordre :**

1. **[5 min]** Connecter `audits@ghost-tax.com` dans Apollo Settings → Email Accounts
2. **[10 min]** Créer la séquence "Ghost Tax — DACH UK NL Q2 2026" avec les 3 touches (copier les subjects/bodies depuis `lib/drip-templates.ts`)
3. **[3 min]** Filtrer les 29 contacts par label `Ghost Tax Q2 2026` → Add to Sequence

Dès l'enrollment fait, les premières Touch 1 partiront le prochain mardi matin (9h30 heure locale des destinataires). Le cron sync se déclenchera automatiquement à 06h15 UTC le lendemain et peuplera l'onglet Apollo Sync du Cockpit.

---

*Rapport généré par Claude Cowork — Ghost Tax V2 · 17 avril 2026*
