# AUDIT COUCHE 4 — Observabilité & Ops

**Gate** : `AUDIT_COUCHE_4_GATE: BLOCKED`
**Score moyen** : **2.1/10** (le plus bas des 8 couches)
**Date** : 18 avril 2026

---

## 1. Inventaire

### CI/CD Pipeline
- **GitHub Actions** : AUCUN workflow `.github/workflows/`
- **Vercel** : config minimale (`vercel.json` seul)
- **Déployments** : auto via push main
- **Preview deployments** : non configurés explicitement
- **Rollback** : manuel seulement (RISQUE P0)

### Cron Jobs (5 configurés, 16 implémentés — drift)
- `/api/pulse` — lun-ven 06:00 UTC
- `/api/cron/master` — mar-jeu 08:30 UTC (5 min timeout, orchestre 7 stages)
- `/api/cron/daily-brief` — lun-ven 05:00 UTC
- `/api/cron/outbound-orchestrator` — 30 min (auto-send bot)
- `/api/cron/apollo-sync` — quotidien 06:15 UTC

### Logging
- **Stratégie** : `console.log` partout (169+ appels dans `/api/cron`)
- **Structured JSON** : ABSENT
- **Logger** : Aucun (pino, winston, bunyan absents de package.json)

### Error Tracking
- **Sentry** : infrastructure en place (`.env.sentry-build-plugin`, `@sentry/nextjs` dans `optimizePackageImports`)
- **Sentry activation** : **0%** — aucune instrumentation dans le code
- **Source maps** : jamais uploadés

### Distributed Tracing
- OpenTelemetry : ABSENT
- Trace headers : ABSENT
- Request IDs : ABSENT

### Metrics & Observability
- Business metrics : AUCUN dashboard
- Health check : `/api/health` (86 lignes, presence check seulement)
- Uptime monitoring : AUCUN externe
- Rate limiting : in-memory middleware (reset cold start — unsafe prod)

### E2E Testing
- Playwright : installé v1.59.1 mais **aucun test trouvé**
- `playwright.config.ts` : ABSENT
- Critical paths couverts : 0% (free scan, checkout, cockpit)

### Alerting
- Slack/Email alerts : ABSENT
- Cron failure detection : ABSENT (16 jobs sans alerting)
- Anomaly thresholds : AUCUN

---

## 2. Scores (0-10)

| Sous-couche | Score |
|---|---|
| Logging quality | 1/10 |
| Distributed tracing | 0/10 |
| Metrics & dashboards | 0/10 |
| Alerting | 0/10 |
| Uptime monitoring | 0/10 |
| Error tracking | 2/10 |
| E2E tests | 0/10 |
| CI/CD rigor | 1/10 |
| Rollback capability | 1/10 |
| Health monitoring | 3/10 |

**Score moyen** : 2.1/10

---

## 3. Gaps P0/P1/P2 Top 10

### P0 (BLOCKING)
1. **Cron failure alerting** — 16 jobs scheduled sans alert. Si `/api/cron/master` fail nuit, flywheel stalle, Touch 1 delivery = 0%. Détection : manuel (next morning). **MTTR 12h+**.
2. **Structured logging** — console.log inutilisable en prod. 3am failure = re-run manuel pour debug.
3. **Source maps + Sentry** — stacks traces illisibles, infrastructure Sentry en place mais 0% intégré.

### P1 (SÉVÈRE)
4. Distributed tracing — master cron 7 stages, impossible de tracer bottleneck. Effort 8h.
5. Business metrics dashboard — Touch 1 delivery, reply %, conversion invisibles. Grafana free tier. Effort 12h.
6. E2E test suite — 3 tests Playwright (free scan, checkout, cockpit auth). Effort 16h.
7. Uptime monitoring — Betterstack free tier 5 monitors. Effort 2h.

### P2
8. Anomaly alerting (bounce >10%, scan fail >5%, p99 latency >60s). Effort 20h.
9. Rate limiting hardening (Upstash Redis). Effort 6h.
10. Bot audit trail (who changed autonomy_level when). Effort 4h.

---

## 4. Stack cible recommandée

| Layer | Tool | Cost | Config effort |
|---|---|---|---|
| Logging | **Pino + Vercel stdout** | $0 | 3h |
| Tracing | **OpenTelemetry + Grafana Cloud free** | $0 | 8h |
| Error tracking | **Sentry free tier** (5k events/mo) | $0 then $29/mo | 2h |
| Metrics | **Grafana Cloud** (free 10GB ingest) | $0 | 12h |
| Alerting | **Slack webhooks + Supabase functions** | $0 | 6h |
| Uptime | **Betterstack free** (5 monitors) | $0 | 2h |
| E2E tests | **Playwright + GitHub Actions free** | $0 | 16h |
| CI/CD | **GitHub Actions** (preview on PR, main auto, smoke tests) | $0 | 6h |

**Total effort** : ~55h (~1-1.5 eng-weeks)
**Monthly cost at scale** : $29 (Sentry si upgrade) — tout le reste free

---

## 5. Cron Jobs Deep Dive

### RTO actuel (catastrophique)

| Job | Failure Detection | MTTR | Impact |
|---|---|---|---|
| master | Manual next morning | **12h+** | Flywheel stalle, 0 outreach emails |
| apollo-sync | Manual query | **24h** | Replies undetected, tracking break |
| outbound-orchestrator | Manual query `bot_execution_log` | 30-60min | No emails sent |
| intent-scan | Manual check `vault_sessions` | 24h | Prospecting stops |
| daily-brief | Manual (email pas reçu) | 8h+ | Briefing missing |

**Current SLA** : AUCUN.
**Target Fellow-grade** : <5min detection, <15min auto-recovery.

### Logging density par cron

| Job | console.log count | Structured? | Persistent? | Alert condition |
|---|---|---|---|---|
| apollo-sync | 3 | Non (prefix) | Non | Aucune |
| master | 5 | Non | Non | 207 HTTP seulement |
| outbound-orchestrator | 10+ | Partial (log[] array) | **YES** (`bot_execution_log`) | Aucune |
| intent-scan | 3 | Non | Non | Aucune |
| daily-brief | 0 | N/A | Non | Aucune |
| visitor-intel | 1 | Non | Non | Aucune |
| retry-webhooks | 3 | Non | Non | Logs dead-letter sans alert |

---

## 6. Priorité sprint Fellow-grade (Week 1-2)

1. **Pino logger** (3h) — deploy prod, JSON logs
2. **Sentry integration** (2h) — wire DSN, upload source maps
3. **Slack alerting on cron fail** (2h) — webhook on 500
4. **Betterstack monitors** (2h) — 5 external uptime checks
5. **Playwright E2E suite** (16h) — 3 critical paths
6. **Master cron alerting** (2h) — email summary sur >1 stage failed
7. **Grafana dashboard** (12h) — live KPI visibility

---

## 7. Gate

**AUDIT_COUCHE_4_GATE: BLOCKED**

Conditions PASS :
- [ ] Pino structured logging deployed
- [ ] Sentry DSN wired + source maps uploaded
- [ ] Slack webhook on cron 500
- [ ] Betterstack 5 monitors active
- [ ] Playwright 3 E2E tests PASS
- [ ] Master cron alerting summary email

**Path** : Friday 19 April 2026 EOD (si sprint 2 engs).

**Investment** : ~55h eng + $29/mo ongoing débloque : nightly autonomy no babysitting, customer SLA 99.5% Touch 1 delivery, MTTR <5min, data-driven optimization.
