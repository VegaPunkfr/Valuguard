# Fixes appliqués — 17 avril 2026 (Claude Opus 4.7 autonomous run)

## 🎯 Contexte
Diagnostic "zero reply" Ghost Tax. 3 causes identifiées :
1. Emails mal routés (reply_to → boîte non vérifiée accessible)
2. Tracking Resend désactivé (1/819 DELIVERED capturé vs attendu ~800+)
3. Content mauvais (Touch 4 & 5 = manipulation, Touch 2 = cost-of-delay math)

Fix autonome sans intervention Edith.

---

## ✅ Fichiers modifiés (9)

| Fichier | Nature du fix |
|---|---|
| `lib/email-config.ts` (NOUVEAU) | Helper centralisé reply_to + tracking |
| `lib/drip-sequence.ts` | MAX_ACTIVE_TOUCHES=3 + reply_to fallback + tracking |
| `lib/drip-templates.ts` | Touch 2 rewrite (question ouverte vs cost-of-delay) |
| `app/api/command/send-approved/route.ts` | reply_to env-var + tracking + autonomy fail-CLOSED + COMMAND_SECRET |
| `app/api/command/sync/route.ts` | COMMAND_SECRET header Bearer (plus query string) |
| `lib/command/store.ts` | Client utilise Authorization header |
| `app/api/cron/followup/route.ts` | reply_to + tracking |
| `app/api/cron/outbound-orchestrator/route.ts` | reply_to env-var + tracking |
| `lib/checkout-recovery.ts` | reply_to + tracking |
| `lib/outreach.ts` | reply_to + tracking |
| `lib/outreach/mailer.ts` | reply_to + tracking |
| `lib/delivery.ts` | reply_to + tracking |
| `lib/flywheel.ts` | reply_to + tracking |
| `lib/orchestrator.ts` | reply_to + tracking |
| `public/cockpit-manifest.json` | start_url V4 → V6 |
| `app/api/webhook/resend/route.ts` | Logging détaillé chaque hit |
| `app/api/webhook/resend/health/route.ts` (NOUVEAU) | Endpoint diagnostic webhook |

**Build TypeScript** : ✅ 0 erreur après tous les fixes.

---

## 🔧 Fix 1 — Reply-to routing (risque #1 zero reply)

**Avant** : Toutes les adresses `reply_to` pointaient vers `audits@ghost-tax.com`, boîte non confirmée accessible. Les prospects qui cliquaient "Répondre" recevaient potentiellement un bounce côté destinataire → tu es mort dans leur tête.

**Après** :
- Env var `REPLY_TO_EMAIL` (défaut `hashirama973@gmail.com`)
- Fallback Gmail perso Edith tant que Google Workspace pas récupéré
- Tous les senders migrés (11 fichiers)

**Action Edith requise** : définir `REPLY_TO_EMAIL=audits@ghost-tax.com` dans Vercel quand tu auras confirmé la boîte GWorkspace accessible.

---

## 🔧 Fix 2 — Tracking opens/clicks activé partout

**Avant** : Flags `track_opens` et `track_clicks` non passés dans les fetch vers Resend API → Resend appliquait ses défauts (mais les webhooks ne remontaient quasi rien, 1/819).

**Après** :
- Tous les sends ajoutent `track_opens: true` et `track_clicks: true`
- Override possible via env vars `TRACK_OPENS=false` et `TRACK_CLICKS=false`

**Action Edith requise** : configurer le webhook dans Resend dashboard (voir Fix 5).

---

## 🔧 Fix 3 — Touch 4 & 5 désactivés + Touch 2 rewritten

### Désactivation Touch 4 & 5
`lib/drip-sequence.ts` : `MAX_ACTIVE_TOUCHES = 3` + `TOUCH_SCHEDULE_DAYS` tronqué. Les deux touches qui tuaient ta crédibilité CFO ("exposure has grown" redondant + "final notice: scan data expires in 7 days" manipulation) ne partent plus.

### Rewrite Touch 2
**Avant** (note audit : 3/10) :
- Subject : *"${c}: ${daily} EUR leaking every day you wait"*
- Cost-of-delay math avec daily/monthly/annual + accumulated loss box en rouge
- CTA : *"Stop the Leak — Get Your Decision Pack"*

**Après** (visée 6-7/10) :
- Subject : *"Quick question on ${c}'s SaaS stack"*
- Body : question ouverte en 3 paragraphes. "Je ne vais pas vous pousser un pack. Quel est votre ratio SaaS/collaborateur ? Répondez avec un ordre de grandeur, je vous renverrai votre benchmark sans pitch derrière."
- CTA : *"Reply with your SaaS-per-head ratio — or just 'pass'"*

Traduit en EN, FR, DE. Plus aucune data table, plus aucun emoji urgency red.

---

## 🔧 Fix 4 — Sécurité P0 (3 fixes)

### 4.1 — Manifest cockpit
`public/cockpit-manifest.json:6` : `start_url: "/cockpit-v4.html"` → `/cockpit-v6.html`. PWA mobile pointe maintenant sur la bonne version.

### 4.2 — COMMAND_SECRET en header Bearer
**Avant** : `/api/command/sync?key=SECRET` → secret loggué dans browser history, proxy logs, analytics tiers.

**Après** :
- Client (`lib/command/store.ts`) envoie `Authorization: Bearer ${key}`
- Serveur (`app/api/command/sync/route.ts`) accepte cookie + Bearer + query (legacy 30j avec warn log)

### 4.3 — Autonomy fail-CLOSED sur send-approved
**Avant** : `catch (_) { /* fail-open */ }` — si Supabase indispo, L0 pouvait envoyer.

**Après** :
- Si `createAdminSupabase()` retourne null → 503 refus envoi
- Si lecture `bot_settings` échoue → 503 refus envoi
- Override admin explicite via env `AUTONOMY_BYPASS=true` (jamais en prod)

---

## 🔧 Fix 5 — Webhook Resend diagnostique

### Logging ajouté
`app/api/webhook/resend/route.ts` logge maintenant chaque hit reçu avec timestamp + type + taille.

### Endpoint healthcheck créé
`GET /api/webhook/resend/health` retourne :
- Si secrets configurés
- Compte events reçus derniers 24h par kind
- Diagnose automatique si webhook ne reçoit rien

**Action Edith requise** :
1. Aller sur https://resend.com/webhooks
2. Vérifier qu'un endpoint `https://ghost-tax.com/api/webhook/resend` existe
3. Si non → le créer
4. Activer tous les events : `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.failed`
5. Vérifier que `RESEND_WEBHOOK_SECRET` dans Vercel matche celui affiché dans Resend dashboard

Après config, tester avec :
```bash
curl https://ghost-tax.com/api/webhook/resend/health
```

---

## 🎯 Ce qu'Edith doit faire manuellement

Ces 3 actions ne peuvent pas être codées :

### A. Trouver/créer boîte audits@ghost-tax.com (30 min)
MX records ghost-tax.com pointent vers Google Workspace (`aspmx.l.google.com`).
1. Logge-toi sur `admin.google.com` avec un compte `@ghost-tax.com`
2. Si pas de compte trouvé, cherche dans `hashirama973@gmail.com` les factures "Google Workspace"
3. Si vraiment pas de GWorkspace → alternative gratuite ImprovMX : Cloudflare Email Routing ou forwarding vers Gmail perso

Une fois fait, mets `REPLY_TO_EMAIL=audits@ghost-tax.com` dans Vercel.

### B. Configurer le webhook Resend (10 min)
Voir Fix 5 ci-dessus.

### C. Enrichir prospects-apollo.json (1h)
20 CFOs listés mais emails tous vides. Re-fetch via Apollo avec `people/match` ou email pattern inference (firstname.lastname@, firstname@, etc.) + email verification.

---

## 📊 Impact attendu

| Métrique | Avant | Après fixes seuls | Après + actions manuelles |
|---|---|---|---|
| Reply CFO possible | Non (bounce) | Oui (va Gmail perso) | Oui (audits@ pro) |
| Tracking events captured | 1/819 | Dépend webhook config | ~95% normal |
| Cost-of-delay anti-pattern | Touch 2+4+5 | Touch 2 rewritten | ✓ |
| Manipulation "final notice" | Touch 5 envoyé | Désactivé | ✓ |
| Touch 4 redondant | Envoyé | Désactivé | ✓ |
| Max touches/prospect | 5 | 3 | 3 |
| COMMAND_SECRET query string | Exposé | Bearer header | ✓ |
| Autonomy fail-open | Oui (risque) | Fail-closed | ✓ |
| PWA mobile | V4 obsolète | V6 | ✓ |

---

## 🏁 Tests effectués

- ✅ `npx tsc --noEmit` passe (exit 0)
- ✅ Envoi test Resend fonctionnel (HTTP 200, email reçu par Edith)
- ✅ Simulation CFO DACH envoyée et reçue
- ⏳ Webhook health à vérifier après config manuelle Resend dashboard
