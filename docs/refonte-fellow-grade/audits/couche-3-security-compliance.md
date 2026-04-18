# AUDIT COUCHE 3 — Sécurité & Compliance

**Gate** : `AUDIT_COUCHE_3_GATE: BLOCKED`
**Score moyen** : **5.3/10** (GDPR 4, DORA 3, DACH 7)
**Date** : 18 avril 2026

---

## ⚠️ P0 IMMEDIATE — 3 VULNÉRABILITÉS CRITIQUES

### 1. COMMAND_SECRET EN PLAINTEXT dans `.env.local`
- Valeur trouvée : `Johnsondu97375` (18 chars, mot de dictionnaire, faible)
- Fichier git-tracked (à vérifier que `.env.local` est bien dans `.gitignore`)
- Protège `/api/command/*`, `/api/cron/*`, `/api/admin/*`
- Note memory : "COMMAND_SECRET rotated 2026-04-09 avec 64-char hex" — **incohérence avec ce fichier** → urgent de vérifier.

**Action** : Rotate immédiatement (32+ char crypto-random), documenter rotation cadence, audit logs `/api/command/ingest` sur période récente.

### 2. COCKPIT-AUTH timing attack
- `app/api/command/cockpit-auth/route.ts:11` utilise `key !== secret` (non timing-safe)
- Middleware utilise `timingSafeEqual()` partout SAUF ici
- Attaquant peut brute-force char par char (~576 tentatives)

**Action** : Remplacer par `timingSafeEqual()` importé depuis middleware ou utils/crypto.

### 3. RLS service_role bypass sur `recon_*` tables
- Migration `016_recon_ledger_v2.sql:308-316` : `USING (true)` sur 9 tables
- Service_role query returns all rows sans filtre, sans audit trail
- Risque : si service_role key compromise → fuite recon_people (10k+ candidats avec emails)

**Action** : Audit trigger INSERT-only `log_audit_access('recon_people')`.

---

## 1. Inventaire sécurité

### RLS Deployment
- **42/42 tables** RLS enabled (100%) ✓
- 35/42 tables avec policies complètes
- **2 tables sans policies** : `outreach_leads`, `outreach_sequences` (défaut deny mais sémantiquement unsafe)
- 9 tables recon_* avec `USING (true)` (overly open)

### Rate Limiting
- In-memory per-IP (middleware.ts L4-32)
- `RATE_LIMIT_MAX_API = 30/min`, `RATE_LIMIT_MAX_PAGE = 60/min`, `MAX_MAP_SIZE = 10k`
- **NOT distributed** — reset si serverless restart
- IP-only (pas de user_id buckets)

### Security Headers (8 configurés)
- ✓ HSTS (max-age=31536000; includeSubDomains; preload)
- ✓ X-Frame-Options: DENY
- ✓ X-Content-Type-Options: nosniff
- ✓ Referrer-Policy: strict-origin-when-cross-origin
- ✓ Permissions-Policy: camera=(), microphone=(), geolocation=()
- ✓ COEP: credentialless
- ✓ COOP: same-origin
- ✓ CORP: same-origin

### CSP — ⚠️ AFFAIBLI
- `script-src 'unsafe-inline' 'unsafe-eval'` → XSS vector potentiel
- Pas de nonce-based CSP
- Pas de Subresource Integrity (SRI) hashes

---

## 2. Scores (0-10)

| Sous-couche | Score |
|---|---|
| Authentication | 7/10 |
| Authorization (RLS) | 7/10 |
| Rate Limiting | 4/10 |
| Input Validation | 8/10 |
| CSP + Headers | 6/10 |
| **Secrets Management** | **2/10** |
| GDPR Compliance | 4/10 |
| DORA/Institutional | 3/10 |
| Audit Logs | 3/10 |

---

## 3. Liste des 18 vulnérabilités

### P0 (3)
1. COMMAND_SECRET plaintext in .env.local
2. cockpit-auth timing attack
3. Events table non-immutable (deletable)

### P1 (7)
4. Rate limiting non-distributed
5. CSP unsafe-inline/unsafe-eval
6. Missing RLS outreach_leads/sequences
7. No right-to-erasure endpoint GDPR
8. Events non-immutable
9. Secrets in .gitignore (à vérifier)
10. Stripe webhook bridge uses plaintext COMMAND_SECRET

### P2 (8)
11. No distributed audit trail (DORA)
12. No per-user rate limiting
13. No third-party inventory
14. DKIM/SPF/DMARC track.ghost-tax.com à vérifier
15. Privacy policy non-versioned
16. Imprint "17 April" outdated
17. No DPO contact endpoint
18. PostHog/Crisp sans cookie consent banner

---

## 4. Compliance Gaps

### GDPR (Score 4/10)
| Requirement | Status |
|---|---|
| Privacy Policy exists | ✓ |
| Last Updated date | ❌ |
| Terms of Service | ✓ |
| DPO Contact endpoint | ❌ |
| Right to Erasure | ❌ |
| Data Processing Agreement | ❌ |
| Cookie Consent Banner | ❌ |
| Retention Policy | ⚠️ Partial |

### DORA (Score 3/10) — CRITIQUE POUR DACH
| Requirement | Status |
|---|---|
| Audit Trail immutable | ❌ |
| Third-Party Inventory | ❌ |
| Security Incident Log | ❌ |
| Subprocessor Audit Rights | ❌ |
| Backup RTO/RPO | ⚠️ Partial |
| Change Management Trail | ❌ |

### DACH Institutional (Score 7/10)
| Requirement | Status |
|---|---|
| Impressum | ✓ |
| Last Updated | ⚠️ Outdated (17 April) |
| Publisher Name | ✓ (Hélène Jean-Étienne) |
| Legal Address | ✓ |
| Contact Email | ✓ |
| VAT Notice | ✓ |
| Dispute Resolution (ODR) | ✓ |
| Content Responsibility (RStV) | ✓ |

---

## 5. Recommandation stack

### Phase 1 (3 jours — CRITIQUE)
1. Rotate COMMAND_SECRET (32+ chars), verify .gitignore includes .env.local
2. Timing-safe comparison in cockpit-auth (reuse middleware utility)
3. Audit logging table immutable (INSERT-only trigger, NO DELETE/UPDATE)

### Phase 2 (1 sprint — HIGH)
4. Upstash Redis distributed rate limiting (per-IP + per-user_id)
5. CSP nonce-based (remove unsafe-inline/unsafe-eval)
6. RLS policies on outreach_leads/sequences
7. `/api/user/erasure` endpoint GDPR Article 17

### Phase 3 (2 sprints — DORA/MEDIUM)
8. DORA audit_log table (retention 90j + archive S3/Glacier)
9. Third_party_processors table (Stripe, Exa, Resend, Anthropic, Apollo, PostHog, Sentry)
10. DKIM/SPF/DMARC track.ghost-tax.com verification
11. Versioned privacy policy (updated_at display)

### Phase 4 (Ongoing)
12. Sentry integration (verify productionBrowserSourceMaps: false)
13. Cloudflare WAF (Bot Management + DDoS + custom rules)
14. Incident Response Runbook
15. Monitoring + alerting (rate limit fill, RLS violations)

---

## 6. Gate

**AUDIT_COUCHE_3_GATE: BLOCKED**

Path to PASS :
- [ ] COMMAND_SECRET rotated (new 32+ char random)
- [ ] .env.local dans .gitignore vérifié
- [ ] cockpit-auth timing-safe comparison
- [ ] Audit logging table immutable
- [ ] RLS policies outreach_leads/sequences

**Pre-Production Checklist (20 items)** : voir rapport détaillé.

**Estimated Time to FIX P0** : 3 jours (critical path).
**Re-Audit Date** : 19 avril 2026 après remediation.
