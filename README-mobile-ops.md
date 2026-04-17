# Ghost Tax — Mobile Operations Architecture

## Why This Exists (and why agent-sdk-dev doesn't fit)

Ghost Tax cockpit is a **standalone HTML file** (`public/cockpit-v4.html`, ~3800 lines). It is NOT a TypeScript SDK app. It doesn't import `@anthropic-ai/sdk`. It doesn't need type checking or SDK best-practice verification.

`agent-sdk-dev` verifies Python/TypeScript apps that USE the Claude API. Our problem is the opposite: we need Claude Code to OPERATE ON a frontend HTML file with surgical precision.

The solution is a **local `.claude/` extension system** — agents, skills, hooks — that encodes Ghost Tax's mobile doctrine directly into reusable project components.

## Architecture: Why local `.claude/` beats Agent SDK

| Dimension | `.claude/` local | Agent SDK external |
|---|---|---|
| Setup | Zero config, already in repo | Needs separate project, dependencies, API key |
| Specificity | Ghost Tax doctrine encoded in every agent | Generic, must be prompted each time |
| Execution | Runs inside Claude Code session | Requires separate runtime |
| Cost | Included in Claude Code usage | Separate API calls billed independently |
| Iteration speed | Edit a markdown file, re-run | Modify code, redeploy, re-test |
| Multi-agent | Via Agent tool with specialized prompts | Via SDK orchestrator (overkill here) |
| When it breaks | Edit the skill file | Debug SDK code, check API responses |

**Decision: `.claude/` local is correct for this project.**

Agent SDK becomes relevant ONLY when:
- You need programmatic orchestration (cron jobs, webhooks)
- You need to run agents outside Claude Code (CI/CD pipeline)
- You need fine-grained token/cost control per agent
- The complexity justifies a separate codebase

None of these apply to cockpit mobile transformation.

## When a plugin would become worth it

A plugin packages `.claude/` extensions for sharing across projects. It would be worth it when:
1. The mobile ops system is proven on Ghost Tax (Phase 2 executed)
2. At least 3 cockpit iterations have used it successfully
3. Someone else (another project) would benefit from the same agent topology
4. The doctrine is stable enough to not change weekly

**Current status: NOT YET.** The system must prove value locally first.

## File Tree

```
.claude/
├── agents/                          ← 7 agent definitions
│   ├── surface-live-auditor.md      ← READ-ONLY: confirms live surface
│   ├── mobile-shell-architect.md    ← READ-ONLY: decides mobile structure
│   ├── a11y-mobile-reviewer.md      ← READ-ONLY: accessibility audit
│   ├── perf-pwa-reviewer.md         ← READ-ONLY: performance + PWA check
│   ├── mobile-patch-integrator.md   ← WRITE: the ONLY writer
│   ├── desktop-regression-reviewer.md ← READ-ONLY: desktop safety check
│   └── mobile-acceptance-reporter.md  ← READ-ONLY: final acceptance
├── skills/
│   ├── cockpit-mobile-bootstrap/    ← /cockpit-mobile — full pipeline
│   │   └── SKILL.md
│   ├── cockpit-mobile-audit/        ← /cockpit-audit — read-only diagnostic
│   │   └── SKILL.md
│   ├── cockpit-mobile-patch/        ← /cockpit-patch — apply transforms
│   │   └── SKILL.md
│   └── cockpit-mobile-verify/       ← /cockpit-verify — post-patch check
│       └── SKILL.md
├── settings.json                    ← Hooks: cockpit file protection
└── ...existing rules, skills, state...
```

## Agent Topology

```
┌─────────────────────────────────────────────────────┐
│                  PHASE 1: AUDIT                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ surface-live  │ │ a11y-mobile  │ │ perf-pwa     │ │
│  │ auditor (R)   │ │ reviewer (R) │ │ reviewer (R) │ │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ │
│         │                │                │          │
│         └────────────────┼────────────────┘          │
│                          ▼                           │
│                  PHASE 2: DESIGN                     │
│           ┌──────────────────────┐                   │
│           │ mobile-shell         │                   │
│           │ architect (R)        │                   │
│           └──────────┬───────────┘                   │
│                      ▼                               │
│                  PHASE 3: WRITE                       │
│           ┌──────────────────────┐                   │
│           │ mobile-patch         │                   │
│           │ integrator (W) ←ONLY │                   │
│           └──────────┬───────────┘                   │
│                      ▼                               │
│                  PHASE 4: VERIFY                      │
│  ┌───────────────────┐ ┌────────────────────────┐    │
│  │ desktop-regression │ │ mobile-acceptance      │    │
│  │ reviewer (R)       │ │ reporter (R)           │    │
│  └───────────────────┘ └────────────────────────┘    │
└─────────────────────────────────────────────────────┘
(R) = read-only    (W) = write-allowed
```

## How to Use

### Full pipeline (audit → design → patch → verify):
```
/cockpit-mobile
```

### Audit only (no modifications):
```
/cockpit-audit
```

### Apply patches (requires prior audit):
```
/cockpit-patch
```

### Verify post-patch (desktop + mobile acceptance):
```
/cockpit-verify
```

### Individual agents (manual invocation):
Reference agent definitions in `.claude/agents/` when delegating via the Agent tool. Each agent file specifies its role, allowed tools, behavior, and output contract.

## Delegation Rules

| Agent | Auto-invocable | Manual @mention | Writes files |
|---|---|---|---|
| surface-live-auditor | ✅ via skills | ✅ | ❌ |
| mobile-shell-architect | ✅ via skills | ✅ | ❌ |
| a11y-mobile-reviewer | ✅ via skills | ✅ | ❌ |
| perf-pwa-reviewer | ✅ via skills | ✅ | ❌ |
| mobile-patch-integrator | ✅ via /cockpit-patch only | ✅ | ✅ |
| desktop-regression-reviewer | ✅ via skills | ✅ | ❌ |
| mobile-acceptance-reporter | ✅ via skills | ✅ | ❌ |

## Ghost Tax Mobile Doctrine (reference)

1. Vérité repo > hypothèse
2. Confirmation surface live avant tout patch
3. Distinction live / legacy / expérimental / orphelin
4. Refus du shrink desktop strategy
5. Refus du scroll horizontal sur surfaces clés
6. Refus du table survivalism sur mobile
7. Refus de la sidebar desktop figée sans justification
8. Hiérarchie d'information stricte
9. Actions critiques accessibles au pouce (≥44px)
10. Détails secondaires repliables
11. Performance mobile = exigence produit
12. Lazy loading des modules lourds
13. PWA minimale seulement si cohérente
14. Desktop protégé (tout dans @media queries)
15. Packaging plugin uniquement après preuve locale
