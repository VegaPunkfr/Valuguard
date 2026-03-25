---
name: plugin-sdk
trigger: when task involves plugins, connectors, or SaaS integrations
---

# Plugin SDK Skill

## Architecture Overview
- **Registry:** lib/plugins/registry.ts — Central registry, phase execution, parallel connector fetch
- **Types:** lib/plugins/types.ts — PluginManifest & ConnectorManifest interfaces with lifecycle hooks
- **Auto-registration:** lib/plugins/index.ts — Imports and registers all plugins + connectors on import

## Current Inventory

### 10 Plugins (lib/plugins/)
| Plugin | Purpose |
|--------|---------|
| vendor-risk-scorer | Lock-in risk, switching cost, data portability per vendor |
| contract-analyzer | Auto-renewal traps, price escalation, termination penalties |
| spend-anomaly-detector | Zombie spend, cost creep, per-seat anomalies |
| renewal-sniper | 60-90 day renewal window targeting + negotiation tactics |
| license-waste-detector | Unused licenses across 12 SaaS categories |
| benchmark-engine | Industry/size spend benchmarks, percentile scoring |
| compliance-checker | GDPR, EU AI Act, SOC 2, DORA exposure costing |
| consolidation-advisor | Tool overlap detection + consolidation roadmap |
| negotiation-intel | Per-vendor playbooks (10 vendors, tactics, timing, discounts) |
| board-report-generator | Board slide, CFO memo, CIO brief, procurement brief |

### 11 Connectors (lib/connectors/)
| Connector | Provider | Data |
|-----------|----------|------|
| stripe-billing | Stripe | Subscriptions, invoices |
| quickbooks | QuickBooks | Expenses, vendor payments, duplicates |
| google-workspace | Google | License usage, active users, storage |
| microsoft-365 | Microsoft | License SKUs, E5/E3 optimization |
| aws-cost | AWS | Cost Explorer, reserved instances |
| azure-cost | Azure | Cost management, Advisor recs |
| slack-analytics | Slack | Workspace usage, inactive seats |
| salesforce-crm | Salesforce | CRM license waste, user activity |
| okta-identity | Okta | SSO app assignments, shadow IT |
| jira-projects | Atlassian | License usage, project activity |
| sap-concur | SAP | Shadow IT in expense reports |

## Creating a New Plugin

```typescript
// lib/plugins/{name}.ts
import { PluginManifest } from './types';

export const myPlugin: PluginManifest = {
  name: 'my-plugin',
  version: '1.0.0',
  phases: ['diagnosis', 'scenarios'], // which analysis phases this plugin contributes to
  async execute(context) {
    // Plugin logic here
    return { /* results */ };
  },
  async validate(input) {
    // Input validation
    return { valid: true };
  }
};
```

Then register in `lib/plugins/index.ts`:
```typescript
import { myPlugin } from './my-plugin';
registry.register(myPlugin);
```

## Creating a New Connector

```typescript
// lib/connectors/{name}.ts
import { ConnectorManifest } from '../plugins/types';

export const myConnector: ConnectorManifest = {
  name: 'my-connector',
  provider: 'ServiceName',
  async authenticate(credentials) {
    // OAuth or API key auth
  },
  async fetch(params) {
    // Fetch data from provider
  },
  async normalize(raw) {
    // Normalize to common schema
  }
};
```

Then:
1. Register in `lib/plugins/index.ts`
2. Create API route: `app/api/connectors/{name}/route.ts`
3. Add i18n keys for connector UI (EN/FR/DE)

## Verification
- `npx tsc --noEmit` — Type-safe manifest validation
- Plugin must appear in registry after import
- Connector API route must respond to POST with auth header

## Rules
- All plugins MUST implement PluginManifest interface
- All connectors MUST implement ConnectorManifest interface
- Never bypass the registry — always register via index.ts
- Connector data MUST be normalized before passing to plugins
- Plugin output feeds into the 21-phase analysis pipeline
