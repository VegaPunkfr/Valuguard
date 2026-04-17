# PROMPT À COPIER DANS CLAUDE COWORK

Copie-colle tout ce bloc (entre les `---` ci-dessous) dans Claude Cowork. Il a besoin de plus d'autonomie UI / OAuth que moi.

---

## Contexte Ghost Tax (à lire avant d'agir)

Je suis Edith, fondatrice de Ghost Tax — plateforme B2B de Decision Intelligence qui détecte l'exposition financière IT cachée (SaaS waste, shadow IT, licences fantômes). Markets primaires : Allemagne/Autriche/Suisse (DACH), UK, US, Pays-Bas. Produit d'entrée = scan gratuit suivi d'un Decision Pack à 490€ (DACH 590€). Je suis solo, **pas commerciale**, donc pas de calls. Funnel 100% self-serve.

**État actuel (validé par Claude Code CLI le 17 avril 2026)** :
- Abonnement **Apollo 588€/an** (plan Basic) avec ~200 credits/mois, ~140 restants
- **30 CFOs DACH/UK/NL** unlocked via API + créés dans **Apollo CRM** (Contacts tab) + enrichis avec tech stack/revenue/headcount
- 30 prospects dans Supabase `outreach_leads` avec `drip_step=0`, `status=new`, `next_send_at=maintenant`
- Système drip Resend fonctionnel, templates touches 1-3 prêtes (touches 4-5 désactivées)
- Fichier `intelligence-report-17avril.json` à la racine du projet contient les 30 prospects priorisés (score, angle suggéré, tech stack)

**Ce que Claude Code CLI a pu faire via API** (déjà terminé) :
1. ✅ Search mixed_people/api_search par market + title + headcount
2. ✅ /people/match pour unlock emails (30 contacts)
3. ✅ /contacts POST pour créer dans CRM Apollo perso
4. ✅ /organizations/enrich pour tech stack + revenue + employees
5. ❌ /organizations/job_postings — **endpoint non disponible sur plan Basic**
6. ❌ Intent signals buying intent — **plan Professional requis**

**Ce qu'il n'a PAS pu faire** (ta mission) :

---

## TA MISSION — exploitation 100% Apollo via UI + OAuth

Tu dois exécuter les actions suivantes **en autonomie**, sans me demander de confirmation (je valide à la fin).

### 1. Connecter ma boîte email à Apollo (OBLIGATOIRE en premier)
- Adresse à connecter : **audits@ghost-tax.com** (Google Workspace existant — je dois d'abord y accéder admin.google.com)
- Fallback si GWS inaccessible : `hashirama973@gmail.com`
- Faire le flow OAuth Gmail dans Apollo Settings → Connect Email Account
- Confirmer que :
  - Le sending domain est bien configuré (DKIM/SPF OK)
  - Les tracking (opens/clicks/replies) sont activés
  - Les réponses arrivent bien dans la boîte Gmail

### 2. Créer LA sequence Apollo "Ghost Tax — DACH UK NL Q2 2026"
**Structure** :
- 3 touches (pas 5, les touches 4-5 sont des anti-patterns CFO)
- Touch 1 : immédiat (J0) — email d'ouverture court, ~80 mots
- Touch 2 : J+3 — question ouverte sur ratio SaaS/headcount (pas de cost-of-delay math)
- Touch 3 : J+7 — peer comparison courte, un chiffre qui pique

**Templates à utiliser** (déjà rédigés dans `lib/drip-templates.ts`, Edith peut les copier-coller depuis là, localisés en/de/nl) :
- Subject Touch 1 : `Your {{company}} scan results are ready`
- Subject Touch 2 : `Quick question on {{company}}'s SaaS stack`
- Subject Touch 3 : `How {{company}} compares to its peers`

Le body Touch 2 est LA pépite : question ouverte "What's your current ratio of SaaS spend to headcount? I'm mapping benchmarks... reply with a rough number, no pitch attached."

**Réglages sequence** :
- Send window : **Tue-Thu 9:30-11:30 local** (matcher ce qu'on a déjà côté Ghost Tax crons)
- Throttle : max 20 sends/jour pour démarrer (warm-up conservative)
- Stop conditions : reply, bounce, unsubscribe, manual stop

### 3. Enrollment des 30 contacts dans la sequence
- Filtrer dans Apollo Contacts par label `Ghost Tax Q2 2026` (j'ai tagué via API)
- Les 30 contacts doivent être visibles avec emails unlocked
- Les enroller tous dans la sequence créée en (2)
- Vérifier que Touch 1 est scheduled pour le prochain créneau de send window

### 4. Configurer les intent signals disponibles sur plan Basic
Va dans Apollo → Signals → vérifier ce qui est activable :
- **Job postings alerts** : créer une alerte sur mes 30 accounts pour "Finance", "CFO", "FinOps", "Procurement" roles hiring
- **News mentions** : alerte sur fusions, licenciements, funding rounds pour mes accounts
- **Website visits** (si dispo) : qui de mes accounts visite Apollo-tracked sites
- **Technology changes** : détection d'un ajout/retrait de tool dans leur stack

**Pas disponible en Basic** (à noter pour upgrade éventuel) :
- Buying intent surges (topics "SaaS cost optimization", "FinOps", "vendor management")
- Full org chart
- Advanced filters (funding amount, growth rate)

### 5. Setup dashboard Apollo (vues + filtres)
Crée les vues suivantes dans Apollo :
- **Vue "Priority 8+"** : filter `label = Ghost Tax Q2 2026 AND priority_score >= 8` (si possible via custom fields)
- **Vue "DACH"** : filter `country IN [Germany, Austria, Switzerland]`
- **Vue "Replied"** : filter `sequence_status = Replied`
- **Vue "Bounced"** : filter `email_status = Invalid`
- **Vue "Hot signals"** : contacts dont l'account a un nouveau job posting finance

### 6. Activer l'intégration Apollo ↔ Slack (optionnel si Slack existe)
Si j'ai un Slack workspace Ghost Tax :
- Apollo Settings → Integrations → Slack → connect
- Channel `#sales-alerts` qui reçoit :
  - Reply received
  - Meeting booked
  - Positive reply classified by AI
  - New hot lead detected

### 7. Configurer Apollo AI features (plan dépendant)
Check si disponible sur plan Basic :
- Email AI Writer (pour iterer sur les templates)
- Reply classification (positive/negative/OOO)
- Meeting booker (si on veut revenir sur "no call" — **à NE PAS activer**, Edith ne fait pas de calls)
- AI research (auto-context per prospect)

### 8. Documenter l'état final
Une fois tout configuré, écris un rapport dans `C:/Users/edith/Desktop/Ghost-tax/Claude/docs/APOLLO-COWORK-REPORT.md` avec :
- Adresse email connectée
- URL de la sequence créée
- Nombre de contacts enrollés / scheduled
- Liste des intent signals activés
- Liste des vues Apollo créées
- Intégrations actives
- Features AI disponibles sur le plan
- Suggestions d'upgrade plan si certaines features critiques manquent

### 9. Mettre à jour le Cockpit V6 Ghost Tax
Dans `C:/Users/edith/Desktop/Ghost-tax/Claude/public/cockpit-v6.html` :
- Ajouter un onglet "Apollo Sync" avec iframe ou API call vers Apollo /contacts/search filtré par label
- Afficher les metrics sequence (sent, opened, clicked, replied) par prospect
- Ajouter un bouton "Open in Apollo" qui deep-link vers le contact Apollo

### 10. Script de sync quotidien
Crée un nouveau cron `app/api/cron/apollo-sync/route.ts` qui tourne quotidien et :
- Pulle `/contacts/search` avec label `Ghost Tax Q2 2026`
- Met à jour `outreach_leads.metadata` avec `sequence_status`, `last_apollo_sync_at`, `opens_count`, `clicks_count`, `replied`
- Trigger un webhook vers Cockpit si un reply est détecté

---

## Constraints importantes

- **Pas de calls**. Edith n'est pas commerciale. Aucune feature "meeting booker" ou "dial" à activer.
- **Pas de sequences manipulatives**. Apollo a des templates avec scarcity, cost-of-delay, final notice — à éviter absolument.
- **Respect GDPR**. Tous les contacts sont unlocked via Apollo sous legitimate interest B2B. Ne pas enroller en cold aux prospects qui sont sur opt-out lists.
- **Budget max 50 credits supplémentaires** ce mois (~25% budget restant). Tout upgrade plan doit être discuté avec Edith avant.
- **Tout en anglais** pour les sequences UK/NL, **allemand** pour DACH. Les templates existent déjà dans le code Ghost Tax.
- **Site URL** : https://ghost-tax.com — prix 490€ (DACH 590€). Ne pas pitcher d'abonnements.

---

## Output attendu à la fin

1. Sequence créée et active dans Apollo ✓
2. 30 contacts enrollés, Touch 1 scheduled mardi prochain 9h30 ✓
3. Intent signals activés (job postings + news) ✓
4. Dashboard vues créées ✓
5. Rapport `APOLLO-COWORK-REPORT.md` dans docs/ ✓
6. Cockpit V6 mis à jour avec tab Apollo ✓
7. Cron apollo-sync créé ✓

Tu peux prendre **toutes les décisions** sans me demander. Si un blocage technique (OAuth failed, plan limite), note-le dans le rapport mais continue sur ce que tu peux faire.

**Ordre d'exécution critique** : #1 (OAuth inbox) avant tout le reste. Sans inbox connectée, rien ne peut partir.

---

## Ressources utiles

- Apollo API docs : https://docs.apollo.io/reference
- Endpoint créer sequence : POST /api/v1/emailer_campaigns
- Endpoint add contact to sequence : POST /api/v1/emailer_campaigns/add_contact_ids
- Apollo Search UI : https://app.apollo.io/#/people
- Label déjà mis sur mes 30 contacts : `Ghost Tax Q2 2026`

Fichiers locaux à consulter :
- `C:/Users/edith/Desktop/Ghost-tax/Claude/intelligence-report-17avril.json` — 30 prospects priorisés
- `C:/Users/edith/Desktop/Ghost-tax/Claude/prospects-apollo-v2.json` — backup unlocked
- `C:/Users/edith/Desktop/Ghost-tax/Claude/lib/drip-templates.ts` — templates emails prêts
- `C:/Users/edith/Desktop/Ghost-tax/Claude/docs/FIXES-17-AVRIL-2026.md` — contexte complet

API key Apollo dans `.env.local` → `APOLLO_API_KEY=<valeur redacted>`.

**Go.**
