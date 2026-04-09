# Ghost Tax Cockpit v4 — Architecture CQRS + Pipeline Apollo

**Date**: 6 avril 2026 | **Contexte**: Solo founder, 49 EUR/mois, Vercel + Supabase + Resend

---

## 1. Diagnostic de l'existant

### Couplages problématiques

1. **Données = Code**: 24 prospects hardcodés dans le JS
2. **Clé Supabase en clair** dans le HTML frontend
3. **État global mutable**: 16 variables let/var sans encapsulation
4. **Pas de schéma de commande**: fetch() inline sans idempotence ni audit trail
5. **Pipeline autonome inline**: scan + generate + send dans une boucle for côté client
6. **Trading simulator**: ~150 lignes hors sujet à extraire

### Tables Supabase existantes (14 migrations)

`vault_sessions`, `vg_vectors` (pgvector 1536d), `outreach_leads`, `outreach_sequences`, `osint_prospects`, `visitor_intel_cache`, `visitor_intel_pipeline`, `buying_committees`, `command_events`, `events`, `prospects`

---

## 2. Architecture Cible: CQRS Léger

### Topologie

```
+-------------------+     +-------------------+     +-------------------+
|   Cockpit (SPA)   |---->|  API Routes       |---->|  Supabase         |
|   (Read Only)     |     |  /api/command/*   |     |  (Write Tables)   |
+--------+----------+     +-------------------+     +--------+----------+
         |                                                   |
         |  Supabase Realtime (WebSocket)                    |
         |  postgres_changes on read tables                  |
         +<--------------------------------------------------+
                                                             |
                                                    +--------+----------+
                                                    |  DB Triggers      |
                                                    |  (Projections)    |
                                                    +-------------------+
```

**Write Side** = API Routes écrivent dans `command_log` + tables cibles
**Read Side** = Vue composite `cockpit_pipeline` via Supabase Realtime
**Event Bus** = Supabase Realtime (postgres_changes) remplace Kafka

### Séparation Lecture / Écriture

**COMMANDES (Write)**:

| Commande | Route API | Idempotence |
|---|---|---|
| `APPROVE_OUTREACH` | `POST /api/command/approve` | `idempotency_key` UUID |
| `ENRICH_PROSPECT` | `POST /api/command/enrich` | `domain` UNIQUE upsert |
| `SEND_MESSAGE` | `POST /api/command/send` | `(lead_id, step)` UNIQUE |
| `IMPORT_APOLLO` | `POST /api/command/apollo-import` | `apollo_id` UNIQUE |
| `UPDATE_STAGE` | `POST /api/command/update-stage` | `(prospect_id, stage)` |
| `RUN_SCAN` | `POST /api/command/run-scan` | `domain` dedup 24h |

**LECTURE (Query)** — vue composite:

```sql
CREATE OR REPLACE VIEW cockpit_pipeline AS
SELECT
  p.id, p.entreprise AS company, p.domain, p.country, p.industry, p.headcount,
  p.score_opportunite AS score, p.tier, p.statut AS status, p.email,
  p.contact AS contact_name, p.role AS contact_title,
  p.valeur_estimee AS revenue_estimate, p.source, p.signals,
  op.exposure_low_eur, op.exposure_high_eur, op.intent_score,
  bc.committee_size, bc.stage AS committee_stage, bc.recommended_rail,
  os.current_step AS seq_step, os.sequence_name, os.status AS seq_status
FROM prospects p
LEFT JOIN osint_prospects op ON op.domain = p.domain
LEFT JOIN buying_committees bc ON bc.domain = p.domain
LEFT JOIN outreach_leads ol ON ol.domain = p.domain
LEFT JOIN outreach_sequences os ON os.lead_id = ol.id AND os.status = 'active';
```

### Ghost-Tasks: Crons Vercel (plus de boucle client)

| Ghost-Task | Fréquence | Route |
|---|---|---|
| Apollo Ingestion | 1x/jour (8h CET) | `/api/cron/apollo-ingest` |
| Drip Sequence Sender | 3x/jour (9h/14h/17h) | `/api/cron/drip` |
| Morning Brief Builder | 1x/jour (7h30 CET) | `/api/cron/morning-brief` |
| Autonomous Pipeline | 2x/jour (mode auto) | `/api/cron/auto-pipeline` |

Le mode "autonome" active `cockpit_settings.autonomous_mode = true` en DB. Les crons vérifient ce flag. Plus de `setInterval()` côté client.

---

## 3. Pipeline Apollo Idempotent

### Contraintes: 49 EUR/mois = 300 crédits/mois

### Table `apollo_imports`

```sql
CREATE TABLE apollo_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apollo_id       TEXT NOT NULL,
  domain          TEXT NOT NULL,
  company_name    TEXT, contact_name TEXT, contact_email TEXT, contact_title TEXT,
  headcount       INTEGER, industry TEXT, country TEXT,
  technologies    TEXT[] DEFAULT '{}',
  raw_data        JSONB NOT NULL DEFAULT '{}',
  import_batch    TEXT NOT NULL,
  credit_cost     INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'imported'
    CHECK (status IN ('imported','enriching','enriched','promoted','rejected','duplicate')),
  promoted_to     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_apollo_imports_apollo_id ON apollo_imports (apollo_id);
```

### Token Bucket `apollo_rate_limits`

```sql
CREATE TABLE apollo_rate_limits (
  id              TEXT PRIMARY KEY DEFAULT 'singleton',
  credits_used    INTEGER NOT NULL DEFAULT 0,
  credits_limit   INTEGER NOT NULL DEFAULT 300,
  period_start    DATE NOT NULL DEFAULT CURRENT_DATE,
  requests_today  INTEGER NOT NULL DEFAULT 0,
  daily_limit     INTEGER NOT NULL DEFAULT 50
);
```

Reset mensuel auto, reset daily auto. Check avant chaque appel Apollo.

### Flux pipeline

1. **DEDUP**: SELECT domain FROM apollo_imports UNION prospects UNION osint_prospects
2. **RATE LIMIT**: `consumeApolloCredit(1)` — si false, STOP, retry demain
3. **APOLLO API**: `/mixed_people/search` ou `/organizations/enrich`
4. **UPSERT**: ON CONFLICT (apollo_id) DO UPDATE
5. **VECTORISATION**: Embed company profile → `vg_vectors` catégorie `prospect_profile`
6. **SCORING & PROMOTION**: Si score >= seuil → INSERT INTO prospects

---

## 4. Nouvelles Tables

### `command_log` (audit trail CQRS)

```sql
CREATE TABLE command_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','success','failed')),
  error_message TEXT, result JSONB,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_command_idempotency ON command_log (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

### `cockpit_settings` (préférences singleton)

```sql
CREATE TABLE cockpit_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  autonomous_mode BOOLEAN NOT NULL DEFAULT FALSE,
  daily_credit_cap INTEGER NOT NULL DEFAULT 50,
  send_window_start INTEGER NOT NULL DEFAULT 8,
  send_window_end INTEGER NOT NULL DEFAULT 19,
  target_markets TEXT[] NOT NULL DEFAULT ARRAY['DE','US','UK','NL'],
  email_daily_limit INTEGER NOT NULL DEFAULT 30
);
```

### `morning_briefs` (pré-calculés par cron)

```sql
CREATE TABLE morning_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date DATE NOT NULL UNIQUE,
  actions JSONB NOT NULL DEFAULT '[]',
  linkedin_post TEXT,
  stats JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','ready','completed'))
);
```

---

## 5. Tolérance aux Pannes

| Composant | Défaillance | Mitigation |
|---|---|---|
| Supabase Realtime | Déconnexion WS | Reconnexion auto + fallback polling 30s |
| Apollo API | 429 rate limit | Token bucket prévient. Backoff exponentiel |
| Vercel Edge Function | Timeout 10s | `command_log` status='pending', retry par cron |
| Resend | API down | `next_send_at` non mis à jour, prochain cron réessaie |
| OpenAI Embeddings | API down | Fallback hash embedding (déjà en place) |

**Idempotence end-to-end**: Chaque commande a un `idempotency_key`. Si déjà exécutée, retourne le résultat caché.

---

## 6. Plan de Migration (4 semaines)

- **Semaine 1**: 5 nouvelles tables + vue `cockpit_pipeline` + seed prospects + extraire utilitaires
- **Semaine 2**: API routes `/api/command/*` + rate limiter Apollo + cron `apollo-ingest` + mode autonome server-side
- **Semaine 3**: Shell React cockpit + composants + Supabase Realtime + supprimer trading simulator
- **Semaine 4**: Morning brief pré-calculé + LinkedIn CM composant + tests E2E + deprecation v3

---

## 7. Métriques de Succès

| Avant (v3) | Cible (v4) |
|---|---|
| 3548 lignes (1 fichier) | ~2000 lignes (30+ fichiers) |
| 87 fonctions globales | 0 (tout encapsulé) |
| 24 prospects hardcodés | 0 (tout en DB) |
| 0% audit trail | 100% (command_log) |
| Clé API en clair | 0 clé côté client |
| Mode auto = setInterval client | Mode auto = flag DB + crons serveur |
