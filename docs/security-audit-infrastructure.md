# Ghost Tax — Audit de Sécurité, Conformité & Infrastructure

**Date**: 6 avril 2026 | **Classification**: CONFIDENTIEL

---

## 1. AUDIT DE SÉCURITÉ — 65 Routes Analysées

### Routes PUBLIQUES (aucune auth)

| Route | Rate Limit | Risque |
|-------|------------|--------|
| `POST /api/intel` | 5/min/IP | **MOYEN** |
| `POST /api/contact` | 3/min/IP | FAIBLE |
| `POST /api/leads/capture` | 10/min/IP | FAIBLE |
| `GET /api/health` | 30/min | FAIBLE |
| `POST /api/stripe/webhook` | Signature Stripe | FAIBLE |

### Routes PROTÉGÉES (OK)

| Catégorie | Auth | Verdict |
|-----------|------|---------|
| `/api/cron/*` (13 routes) | `Bearer CRON_SECRET` | OK |
| `/api/admin/*` (3 routes) | `x-admin-token: ADMIN_TOKEN` | OK |
| `/api/detect/*` (3 routes) | `Bearer CRON_SECRET` | OK |
| `/api/command/ingest` | `COMMAND_SECRET` | OK |

### Routes COCKPIT — FAILLE PRINCIPALE

6 routes exclues du middleware dans `cockpitOpenRoutes` :

| Route | Auth | Sévérité |
|-------|------|----------|
| `GET/POST /api/command/auto-pipeline` | **AUCUNE** | **CRITIQUE** |
| `POST /api/command/generate-message` | **AUCUNE** | **CRITIQUE** |
| `POST /api/command/send-approved` | `x-command-key` faible | **CRITIQUE** |
| `GET/POST /api/command/approval-queue` | **AUCUNE** | **CRITIQUE** |
| `POST /api/command/apollo-sync` | `x-command-key` | **HAUT** |
| `POST /api/command/apollo-enrich` | `x-command-key` | **HAUT** |

---

## 2. VULNÉRABILITÉS CRITIQUES

### CRITIQUE-1 (10/10): Clé Supabase service_role en clair

**Fichier**: `scripts/inject-prospects.js` ligne 5

La clé `service_role` (accès admin complet bypass RLS) est committée en clair. Quiconque clone le repo peut lire/écrire/supprimer toutes les données.

**Remédiation IMMÉDIATE**: Régénérer la clé dans Supabase Dashboard. Supprimer le fichier du repo + purger historique git.

### CRITIQUE-2 (6/10): Clé Supabase anon dans cockpit-v3.html

**Fichier**: `public/cockpit-v3.html` ligne 1781

Clé anon + URL du projet hardcodées dans un fichier HTML public.

### CRITIQUE-3 (9/10): 6 routes cockpit ouvertes sans auth

N'importe qui sur Internet peut :
- Lancer des recherches Apollo (consommer des crédits)
- Générer des messages IA (consommer des tokens Anthropic)
- Lire la queue de prospects
- Potentiellement déclencher des envois d'email

### CRITIQUE-4 (9/10): send-approved bypass auth si aucun secret configuré

```typescript
const secret = process.env.CRON_SECRET || process.env.COMMAND_KEY || '';
if (secret && key !== secret) { // Si secret est '', cette condition est FALSE
```

**Remédiation**: Inverser la logique — refuser par défaut si pas de secret.

### CRITIQUE-5 (7/10): Auth par Referer contournable

`command/sync` utilise le header `Referer` comme fallback auth — trivial à falsifier.

### HAUT-6 (6/10): Rate limiting in-memory inefficace en serverless

Les `Map` in-memory sont réinitialisées à chaque cold start Vercel.

---

## 3. PLAN DE CONFORMITÉ RGPD

### Données Personnelles Traitées

| Catégorie | Source | Base Légale |
|-----------|--------|-------------|
| Prospects (nom, email, titre) | Apollo.io | Intérêt légitime (Art. 6(1)(f)) |
| Leads (email, entreprise) | Formulaires site | Consentement |
| Visiteurs (IP hashée) | Frontend | Intérêt légitime |
| Clients (email, paiement) | Stripe | Contrat (Art. 6(1)(b)) |

### Table d'Audit Append-Only

```sql
CREATE TABLE audit_communications (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prospect_email    TEXT NOT NULL,
  prospect_domain   TEXT,
  channel           TEXT NOT NULL CHECK (channel IN ('email','linkedin_dm','apollo_sequence')),
  action            TEXT NOT NULL CHECK (action IN (
    'sent','approved','rejected','bounced',
    'unsubscribed','erasure_requested','erasure_completed'
  )),
  message_id        TEXT,
  sequence_step     TEXT,
  triggered_by      TEXT NOT NULL CHECK (triggered_by IN ('human','cron','automation','api')),
  consent_basis     TEXT CHECK (consent_basis IN (
    'legitimate_interest','consent','contract','legal_obligation'
  )),
  gdpr_notice_sent  BOOLEAN DEFAULT FALSE,
  unsubscribe_link  TEXT,
  metadata          JSONB DEFAULT '{}'
);

-- AUCUNE policy UPDATE ou DELETE = immutable
ALTER TABLE audit_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert_service_only" ON audit_communications
  FOR INSERT TO service_role WITH CHECK (TRUE);
CREATE POLICY "audit_read_service_only" ON audit_communications
  FOR SELECT TO service_role USING (TRUE);
```

### Endpoint Droit à l'Oubli (Art. 17)

`POST /api/gdpr/erasure` — Protégé par `ADMIN_TOKEN`

Tables à purger dans l'ordre :
1. `outreach_sends` → DELETE via lead_id
2. `outreach_log` → DELETE par domain
3. `outreach_leads` → DELETE par email
4. `osint_prospects` → Anonymiser (email→null, name→'ERASED')
5. `command_events` → Anonymiser
6. `vault_sessions` → Anonymiser (email→hash)
7. `audit_communications` → INSERT action='erasure_completed' (NE PAS supprimer)

### Politique de Rétention

| Catégorie | Rétention | Action |
|-----------|-----------|--------|
| Prospects non contactés | 6 mois | Suppression |
| Prospects contactés sans réponse | 12 mois | Anonymisation |
| Leads sans conversion | 18 mois | Anonymisation |
| Clients | 7 ans (obligation comptable) | Archive |
| Logs d'audit | 3 ans | Archive froide |
| IP hashes | 90 jours | Suppression |

### Obligations par Marché

| Marché | Obligation clé |
|--------|----------------|
| **DE** | Double opt-in requis pour marketing. Premier email froid B2B toléré avec opt-out immédiat |
| **NL** | Email froid B2B toléré avec opt-out. Identification claire expéditeur |
| **UK** | Email froid B2B autorisé avec opt-out (PECR corporate exception) |
| **US** | CAN-SPAM: adresse physique obligatoire, opt-out sous 10 jours. CCPA: droit suppression CA |

---

## 4. CHECKLIST CI/CD

### Pre-commit Hooks (Husky + lint-staged)

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,html}": [
      "eslint --fix",
      "détection secrets (sk_live, re_, whsec_, eyJhbG, service_role)"
    ]
  }
}
```

### GitHub Actions — TruffleHog

```yaml
name: Secret Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

---

## 5. OBSERVABILITÉ

| Élément | Actuel | Recommandé |
|---------|--------|------------|
| Frontend analytics | PostHog | OK |
| Error tracking | Prévu (Sentry DSN) | Activer |
| Backend logging | `console.log` | Logger JSON structuré |
| Alertes | Aucune | Cron `/api/cron/alerts` |
| Health monitoring | `/api/health` | Enrichir + Log Drain Axiom Free |

---

## 6. MATRICE DE RISQUES

| # | Vulnérabilité | Sévérité | Priorité |
|---|--------------|----------|----------|
| C1 | Clé service_role dans le code | **10/10** | **P0 — AUJOURD'HUI** |
| C3 | 6 routes cockpit sans auth | **9/10** | **P0 — AUJOURD'HUI** |
| C4 | send-approved bypass auth | **9/10** | **P0 — AUJOURD'HUI** |
| C5 | Auth par referer contournable | **7/10** | **P1 — CETTE SEMAINE** |
| — | RGPD: pas d'audit trail | **7/10** | **P1 — CETTE SEMAINE** |
| C2 | Anon key dans HTML public | **6/10** | **P1 — CETTE SEMAINE** |
| H6 | Rate limit in-memory | **6/10** | **P2 — CE MOIS** |
| — | RGPD: pas de retention policy | **6/10** | **P2 — CE MOIS** |

---

## 7. PLAN DE REMÉDIATION

### Phase 0 — Aujourd'hui (30 min)
1. Régénérer clé Supabase service_role
2. Supprimer `scripts/inject-prospects.js` du repo
3. Retirer les 6 routes de `cockpitOpenRoutes` dans `middleware.ts`
4. Corriger logique auth de `send-approved`
5. Supprimer fallback referer dans `command/sync`

### Phase 1 — Cette semaine (2-3h)
6. Déplacer credentials cockpit vers env vars Vercel
7. Créer table `audit_communications`
8. Implémenter logging structuré
9. Créer endpoint `/api/gdpr/erasure`
10. Configurer Husky + lint-staged
11. Ajouter lien unsubscribe dans tous les emails

### Phase 2 — Ce mois (4-6h)
12. Rate limiting distribué (Upstash Free)
13. Header CSP dans middleware
14. Cron RGPD rétention
15. TruffleHog en CI
16. Secrets en headers au lieu de query strings

### Phase 3 — Mois prochain
17. DPA avec Anthropic et Apollo
18. Privacy Policy publique (EN, DE)
19. Double opt-in marché allemand
20. Adresse postale dans emails (CAN-SPAM)
