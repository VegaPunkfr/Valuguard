# GHOST TAX — Claude Operating Manual

## Session Startup Protocol (EXECUTE EVERY SESSION)
1. **Language**: Always respond in French to Edith (founder/CEO)
2. **Mode**: 100% AUTONOMOUS MAX — apply ALL modifications without asking. NEVER ask for confirmation. NEVER pause for approval. NEVER list options. Just execute the best path. Fix errors silently. Edith gives direction, you deliver results.
3. **Style**: Detailed, in-depth explanations. Never compress. Fast but thorough.
4. **State Reload**: The SessionStart hook auto-injects CURRENT_STATE, OPEN_RISKS, NEXT_STEPS, DECISIONS, CHANGELOG. Read them. Continue where you left off.
5. **Market Update**: At the START of each session, run a WebSearch for "SaaS FinOps IT spending 2026" + "global economy news this week" and save key findings to memory file `market-intelligence-march-2026.md`. Update the user with anything that impacts Ghost Tax strategy.
6. **Memory Files**: Read `C:/Users/edith/.claude/projects/C--WINDOWS-system32/memory/MEMORY.md` and `market-intelligence-march-2026.md` at session start for context continuity.
7. **Strategy Docs**: Reference `.claude/strategy/` files (master-battle-plan, killer-scripts, money-math, competitive-kills, weekly-rhythm, growth-hacks-2026) when giving business advice.
8. **Skills**: Use 28 specialized skills in `.claude/skills/` — includes pipeline-health, build-validator, i18n-sync, security-audit, seo-checker, state-update, revenue-analyzer, competitive-intel, growth-executor, funnel-optimizer, ab-test-engine, linkedin-growth, drip-architect, customer-success-engine, content-machine.
8b. **Competencies**: Reference 15 autonomous competencies in `.claude/competencies/COMPETENCIES.md` — pricing-optimizer, partnership-broker, conversion-copywriter, objection-handler, churn-predictor, market-sizer, financial-modeler, incident-responder, seo-content-planner, outreach-sequencer, demo-builder, board-reporter, localization-expert, quality-guardian, revenue-intelligence.
9. **Rules**: Follow ALL rules in `.claude/rules/` (autonomy, payments, database, intelligence-pipeline, ui-brand, seo-growth, email-comms, i18n, security, revenue-tracking, deployment).
10. **Revenue Connection**: Every recommendation MUST connect to EUR revenue impact. No generic advice.
11. **Parallel Execution**: Use Agent tool with background mode for independent tasks. Maximize speed.
12. **State Updates**: After EVERY significant change, update `.claude/state/` files (CURRENT_STATE, NEXT_STEPS, OPEN_RISKS, DECISIONS, CHANGELOG, FEATURE_TRACKER, TECH_DEBT).

## Mission
Ghost Tax is a B2B Decision Intelligence platform that detects hidden financial exposure in SaaS, AI, and Cloud spending. Target: 5M EUR revenue in 2 years.

## Revenue Model — Three Rails
- **Rail A**: Detection d'exposition financiere — 490 EUR one-time (self-serve Stripe checkout)
- **Rail B**: Plan de stabilisation 30/60/90 — scoped pricing (contact/intake, ~2k-8k EUR)
- **Rail C**: Mission de stabilisation institutionnelle — custom/enterprise (10k-50k+ EUR)

Pipeline: Free scan (/intel) > Rail A (490 EUR) > Rail B (upsell) > Rail C (expansion)

## Revenue Math to 5M EUR in 2 years
- Rail A alone (490 EUR x 10,204 = 5M) — unrealistic volume-only play
- Blended strategy needed: Rail A as door opener, Rail B/C as revenue engine
- Target mix: 60% Rail A (3,000 clients x 490 = 1.47M), 30% Rail B (~250 x 5k = 1.25M), 10% Rail C (~25 x 90k = 2.25M) = ~5M
- Key lever: Rail A-to-B conversion rate (target 8-12%)

## Tech Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: Supabase (PostgreSQL 15 + pgvector)
- **Payments**: Stripe (one-time payment mode)
- **Enrichment**: Exa (neural search API)
- **Embeddings**: OpenAI text-embedding-3-small (1536 dim)
- **Email**: Resend (domain: ghost-tax.com)
- **Hosting**: Vercel
- **Analytics**: PostHog (optional), custom event taxonomy
- **Styling**: Tailwind CSS, Framer Motion
- **i18n**: Custom provider, 3 locales (EN, FR, DE)

## Architecture
```
User > /intel (free preview, NDJSON streaming) > /api/intel
     > Stripe checkout > /api/stripe/checkout (490 EUR)
     > Payment > webhook > /api/stripe/webhook
                         > executeDeliveryPipeline()
                           > Exa enrichment
                           > 21-phase intelligence pipeline
                           > StructuredReport > Supabase
                           > Email via Resend
                           > followup_at (14 days)
```

## Intelligence Pipeline (21 phases)
enrichment > context > exposure > lossVelocity > costOfDelay > diagnosis > causalGraph > proofEngine > proof > marketMemory > peerComparison > driftMonitor > correctionMomentum > scenarios > counterfactual > decisionFriction > decisionPressure > negotiation > confidenceModel > decisionPack > executiveSnapshot

## Database Tables
vault_sessions, organizations, profiles, audit_requests, reports, anomalies, recommendations, events, vg_vectors

## Key Files
- `lib/analysis.ts` — Central decision intelligence engine (800+ lines)
- `lib/pricing.ts` — Canonical pricing config (Rails A/B/C)
- `lib/delivery.ts` — Post-payment delivery pipeline
- `lib/market.ts` — Market memory engine (baselines, vendors, clusters)
- `lib/drift.ts` — Cost drift monitor
- `lib/negotiation.ts` — Negotiation intelligence + playbooks
- `lib/vectors.ts` — pgvector similarity search
- `lib/exa.ts` — Exa enrichment client
- `lib/events.ts` — Event taxonomy (buyer conviction tracking)
- `lib/stripe.ts` — Stripe singleton
- `lib/supabase.ts` — 3-tier Supabase client (browser/server/admin)

## Conventions
- Server-only modules marked with comment header
- Confidence scores always 0-100, never overclaimed (caps at 80-85)
- Ranges, not point estimates
- Separate observed/inferred/estimated signals
- EUR as primary currency
- Monospace UI (institutional aesthetic)
- Dark theme (#060912 base)

## Target Clients
- Mid-market companies (50-1000 employees) in EU (FR, DE, CH, BE, NL)
- CFOs, CIOs, IT Directors, Procurement leads
- Companies spending 50k-500k+/month on SaaS/Cloud/AI
- Industries: Tech/SaaS, Financial Services, Healthcare, Retail, Manufacturing, Professional Services

## Competitive Positioning
- NOT a SaaS management tool (Zylo, Productiv, Torii)
- NOT a cloud cost optimizer (CloudHealth, Spot.io)
- Ghost Tax = Financial Intelligence for IT decisions
- Unique: combines enrichment + market memory + drift monitoring + negotiation playbooks
- Deliverable is a Decision Pack (CFO memo, CIO memo, procurement brief, board one-pager)

## Critical Invariants
- Stripe webhook MUST return 200 immediately — delivery runs async via waitUntil
- Confidence scores NEVER exceed 85 — overclaiming destroys trust
- All API keys stay server-side — NEVER expose to client components
- Idempotency on delivery pipeline — Stripe session ID is dedup key
- EUR is the only currency — no multi-currency until explicit decision
- Intelligence pipeline order is doctrine — never reorder the 21 phases
- RLS on all Supabase tables — no public reads on sensitive data
- Dark theme (#060912) is brand identity — never light mode
- Ranges, not point estimates — always [low, high] on financial figures

## Editing Discipline
- Always analyze the project before editing
- Prefer minimal changes with maximal stability
- Never modify critical infrastructure blindly
- Always consider side effects on build, API routes, payments, authentication and database
- Avoid introducing unnecessary technical debt
- Read `.claude/state/CURRENT_STATE.md` and `NEXT_STEPS.md` before starting work
- Update state files after every significant change

## State Memory
- `.claude/state/CURRENT_STATE.md` — What's built, what's running
- `.claude/state/NEXT_STEPS.md` — Priority execution queue
- `.claude/state/OPEN_RISKS.md` — Known risks to production/revenue
- `.claude/state/DECISIONS.md` — Architecture decisions and rationale
