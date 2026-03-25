---
token_profile: balanced
dynamic_routing: true
budget_ceiling: 25
auto_supervisor: soft
git:
  isolation: worktree
  merge_strategy: squash
  auto_push: false
  auto_pr: false
  commit_docs: false
models:
  research: claude-sonnet-4-6
  planning: claude-opus-4-6
  execution: claude-sonnet-4-6
  execution_simple: claude-haiku-4-5-20251001
  completion: claude-sonnet-4-6
  subagent: claude-haiku-4-5-20251001
verification_commands:
  - name: typecheck
    command: "cd C:/Users/edith/Desktop/Valuguard/Claude && npx tsc --noEmit"
    run_on: commit
  - name: i18n-sync-check
    command: "node -e \"const e=Object.keys(JSON.parse(require('fs').readFileSync('C:/Users/edith/Desktop/Valuguard/Claude/messages/en.json'))).length,f=Object.keys(JSON.parse(require('fs').readFileSync('C:/Users/edith/Desktop/Valuguard/Claude/messages/fr.json'))).length,d=Object.keys(JSON.parse(require('fs').readFileSync('C:/Users/edith/Desktop/Valuguard/Claude/messages/de.json'))).length;console.log({en:e,fr:f,de:d});if(e!==f||f!==d){console.error('i18n DESYNC');process.exit(1)}\""
    run_on: commit
skill_rules:
  - when: "task involves plugin or connector or SaaS integration"
    use: plugin-sdk
  - when: "task modifies UI text or adds new page or component"
    use: i18n-sync
parallel:
  max_workers: 2
  auto_merge: false
notifications:
  on_complete: true
  on_error: true
  on_budget: true
context_pause_threshold: 80
---

# Valuguard Project Preferences

## Custom Instructions

### Project Identity
- **Name:** Valuguard / Ghost Tax (brand)
- **Type:** Next.js 15 App Router, React 19, TypeScript 5.5
- **Stack:** Supabase (pgvector), Stripe, Exa AI, Resend, PostHog
- **Location:** C:/Users/edith/Desktop/Valuguard/Claude/
- **Language:** Always respond in French to the user

### Architecture (3 Surfaces)
- PUBLIC = marketing pages (ghost-tax.com)
- CLIENT = app pages (authenticated)
- FOUNDER = command cockpit (valuguard-cockpit.vercel.app)

### Doctrine (Non-Negotiable)
1. Exposure > 2. Corrective Window > 3. Dominant Cause > 4. Corrective Path
- Evidence before conclusions
- Confidence discipline: ranges, never point estimates
- CFO-first perspective always

### i18n Rules
- 3 locale files: messages/{en,fr,de}.json (~2273 keys each, MUST stay synchronized)
- French = source of truth, EN/DE = translations
- Any UI text change MUST update ALL 3 files
- Use `useTranslations()` from next-intl
- Provider: lib/i18n.tsx

### Plugin SDK Architecture
- Registry: lib/plugins/registry.ts (central, phase execution, parallel connector fetch)
- Types: lib/plugins/types.ts (PluginManifest, ConnectorManifest, lifecycle hooks)
- Auto-registration: lib/plugins/index.ts (imports all 10 plugins + 11 connectors)

#### 10 Plugins
vendor-risk-scorer, contract-analyzer, spend-anomaly-detector, renewal-sniper,
license-waste-detector, benchmark-engine, compliance-checker, consolidation-advisor,
negotiation-intel, board-report-generator

#### 11 Connectors
stripe-billing, quickbooks, google-workspace, microsoft-365, aws-cost, azure-cost,
slack-analytics, salesforce-crm, okta-identity, jira-projects, sap-concur

- New plugins MUST implement PluginManifest from lib/plugins/types.ts
- New connectors MUST implement ConnectorManifest
- After adding a plugin/connector, register in lib/plugins/index.ts

### Key File Map
- lib/analysis.ts — 21-phase intelligence pipeline (2035 lines)
- lib/orchestrator.ts — Execution orchestrator (1572 lines)
- lib/flywheel.ts — 16 market signals, tri-lingue (1366 lines)
- lib/delivery.ts — Post-payment pipeline, idempotent (706 lines)
- lib/exa.ts — Exa AI enrichment, 200+ vendors (799 lines)
- lib/lead-scoring.ts — 8-dimension scoring (705 lines)
- lib/pricing.ts — Rail A tiered pricing USD/EUR
- app/api/stripe/webhook/route.ts — Payment webhook (maxDuration=60)
- app/api/intel/route.ts — NDJSON streaming (21 phases)
- globals.css — Design system (21K, 60+ gt-* classes)

### Streaming Phase Order (NEVER modify)
context > exposure > lossVelocity > costOfDelay > diagnosis > causalGraph >
proofEngine > proof > marketMemory > peerComparison > driftMonitor >
correctionMomentum > scenarios > counterfactual > decisionFriction >
decisionPressure > negotiation > confidenceModel > decisionPack >
executiveSnapshot > complete

### Critical Invariants
1. stripe_payment_intent_id UNIQUE index — upsert pattern in delivery
2. Confidence caps at 85 — never overclaim
3. API keys NEVER in client code
4. Webhook idempotent via stripe_payment_intent_id
5. "Ghost Tax" = brand name, NEVER translated
