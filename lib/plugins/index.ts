/**
 * GHOST TAX — PLUGIN & CONNECTOR INDEX (SERVER-ONLY)
 *
 * Auto-registers all plugins and connectors on import.
 * Import this file once in the intelligence pipeline to activate everything.
 *
 * 10 PLUGINS:
 *   1. vendor-risk-scorer     — Lock-in risk scoring per vendor
 *   2. contract-analyzer      — Auto-renewal traps, price escalation, penalties
 *   3. spend-anomaly-detector — Zombie spend, cost creep, per-seat anomalies
 *   4. renewal-sniper         — 60-90 day renewal window negotiation intel
 *   5. license-waste-detector — Unused licenses across 12 SaaS categories
 *   6. benchmark-engine       — Industry/size/region spend benchmarks
 *   7. compliance-checker     — GDPR, EU AI Act, SOC 2, DORA compliance costs
 *   8. consolidation-advisor  — Tool overlap detection + consolidation roadmap
 *   9. negotiation-intel      — Per-vendor negotiation playbooks
 *  10. board-report-generator — Auto-generated CFO memo, board slide, CIO brief
 *
 * 10 CONNECTORS:
 *   1. stripe-billing      — Client Stripe subscription/invoice data
 *   2. quickbooks           — Accounting expenses and vendor payments
 *   3. google-workspace     — License usage, active users, storage
 *   4. microsoft-365        — License SKUs, E5/E3 optimization, usage
 *   5. aws-cost             — Cloud cost explorer, reserved instances
 *   6. azure-cost           — Azure cost management, Advisor recommendations
 *   7. slack-analytics      — Workspace usage, inactive seats
 *   8. salesforce-crm       — CRM license waste, user activity
 *   9. okta-identity        — SSO app assignments, shadow IT detection
 *  10. jira-projects        — Atlassian license usage, project activity
 *  (bonus) sap-concur       — Shadow IT in expense reports
 */

import { registerPlugin, registerConnector } from "./registry";

// ── Plugins ──────────────────────────────────────────
import { vendorRiskScorerPlugin } from "./vendor-risk-scorer";
import { contractAnalyzerPlugin } from "./contract-analyzer";
import { spendAnomalyDetectorPlugin } from "./spend-anomaly-detector";
import { renewalSniperPlugin } from "./renewal-sniper";
import { licenseWasteDetectorPlugin } from "./license-waste-detector";
import { benchmarkEnginePlugin } from "./benchmark-engine";
import { complianceCheckerPlugin } from "./compliance-checker";
import { consolidationAdvisorPlugin } from "./consolidation-advisor";
import { negotiationIntelPlugin } from "./negotiation-intel";
import { boardReportGeneratorPlugin } from "./board-report-generator";

// ── Connectors ───────────────────────────────────────
import { stripeConnector } from "../connectors/stripe-billing";
import { quickbooksConnector } from "../connectors/quickbooks";
import { googleWorkspaceConnector } from "../connectors/google-workspace";
import { microsoft365Connector } from "../connectors/microsoft-365";
import { awsCostConnector } from "../connectors/aws-cost";
import { azureCostConnector } from "../connectors/azure-cost";
import { slackConnector } from "../connectors/slack-analytics";
import { salesforceConnector } from "../connectors/salesforce-crm";
import { oktaConnector } from "../connectors/okta-identity";
import { jiraConnector } from "../connectors/jira-projects";
import { sapConcurConnector } from "../connectors/sap-concur";

// ── Register Everything ──────────────────────────────

// Plugins
registerPlugin(vendorRiskScorerPlugin);
registerPlugin(contractAnalyzerPlugin);
registerPlugin(spendAnomalyDetectorPlugin);
registerPlugin(renewalSniperPlugin);
registerPlugin(licenseWasteDetectorPlugin);
registerPlugin(benchmarkEnginePlugin);
registerPlugin(complianceCheckerPlugin);
registerPlugin(consolidationAdvisorPlugin);
registerPlugin(negotiationIntelPlugin);
registerPlugin(boardReportGeneratorPlugin);

// Connectors
registerConnector(stripeConnector);
registerConnector(quickbooksConnector);
registerConnector(googleWorkspaceConnector);
registerConnector(microsoft365Connector);
registerConnector(awsCostConnector);
registerConnector(azureCostConnector);
registerConnector(slackConnector);
registerConnector(salesforceConnector);
registerConnector(oktaConnector);
registerConnector(jiraConnector);
registerConnector(sapConcurConnector);

// ── Re-exports ───────────────────────────────────────
export {
  registerPlugin,
  registerConnector,
  getPlugin,
  getConnector,
  listPlugins,
  listConnectors,
  executePhasePlugins,
  fetchAllConnectorData,
  getRegistryStats,
} from "./registry";

export type {
  GhostTaxPlugin,
  GhostTaxConnector,
  PluginManifest,
  PluginContext,
  PluginOutput,
  PluginAction,
  PluginInsight,
  PluginPhase,
  PluginCategory,
  PipelineResult,
  ConnectorManifest,
  ConnectorCredentials,
  ConnectorOutput,
  ConnectorCategory,
  ConnectorAuthType,
} from "./types";
