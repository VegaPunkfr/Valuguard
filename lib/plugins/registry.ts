/**
 * GHOST TAX — PLUGIN & CONNECTOR REGISTRY (SERVER-ONLY)
 *
 * Central registry for all plugins and connectors.
 * Handles lifecycle, execution order, and parallel execution.
 */

import type {
  GhostTaxPlugin,
  GhostTaxConnector,
  PluginContext,
  PluginOutput,
  PluginPhase,
  ConnectorCredentials,
  ConnectorOutput,
} from "./types";
import type { CompanyContext } from "@/lib/analysis";

// ── Plugin Registry ──────────────────────────────────

const pluginRegistry = new Map<string, GhostTaxPlugin>();
const connectorRegistry = new Map<string, GhostTaxConnector>();

export function registerPlugin(plugin: GhostTaxPlugin): void {
  if (pluginRegistry.has(plugin.manifest.id)) {
    console.warn(`[PluginSDK] Plugin ${plugin.manifest.id} already registered, overwriting.`);
  }
  pluginRegistry.set(plugin.manifest.id, plugin);
}

export function registerConnector(connector: GhostTaxConnector): void {
  if (connectorRegistry.has(connector.manifest.id)) {
    console.warn(`[PluginSDK] Connector ${connector.manifest.id} already registered, overwriting.`);
  }
  connectorRegistry.set(connector.manifest.id, connector);
}

export function getPlugin(id: string): GhostTaxPlugin | undefined {
  return pluginRegistry.get(id);
}

export function getConnector(id: string): GhostTaxConnector | undefined {
  return connectorRegistry.get(id);
}

export function listPlugins(): GhostTaxPlugin[] {
  return Array.from(pluginRegistry.values());
}

export function listConnectors(): GhostTaxConnector[] {
  return Array.from(connectorRegistry.values());
}

// ── Phase Execution ──────────────────────────────────

/**
 * Execute all plugins registered for a given phase.
 * Plugins within the same phase run in parallel for speed.
 * Returns merged outputs.
 */
export async function executePhasePlugins(
  phase: PluginPhase,
  ctx: PluginContext
): Promise<PluginOutput[]> {
  const phasePlugins = Array.from(pluginRegistry.values()).filter((p) =>
    p.manifest.phases.includes(phase)
  );

  if (phasePlugins.length === 0) return [];

  const results = await Promise.allSettled(
    phasePlugins.map(async (plugin) => {
      const start = Date.now();
      try {
        if (plugin.initialize) await plugin.initialize();
        const output = await plugin.execute(ctx);
        output.executionMs = Date.now() - start;
        return output;
      } catch (err) {
        console.error(`[PluginSDK] Plugin ${plugin.manifest.id} failed:`, err);
        return {
          pluginId: plugin.manifest.id,
          executionMs: Date.now() - start,
          metadata: { error: err instanceof Error ? err.message : "unknown" },
        } as PluginOutput;
      } finally {
        if (plugin.teardown) await plugin.teardown().catch(() => {});
      }
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<PluginOutput> => r.status === "fulfilled")
    .map((r) => r.value);
}

// ── Connector Execution ──────────────────────────────

/**
 * Fetch data from all connectors that have active credentials.
 * Runs in parallel. Failed connectors are logged but don't block pipeline.
 */
export async function fetchAllConnectorData(
  credentials: ConnectorCredentials[],
  company: CompanyContext
): Promise<Record<string, ConnectorOutput>> {
  const results: Record<string, ConnectorOutput> = {};

  const tasks = credentials.map(async (cred) => {
    const connector = connectorRegistry.get(cred.connectorId);
    if (!connector) {
      console.warn(`[PluginSDK] No connector registered for ${cred.connectorId}`);
      return;
    }

    try {
      const testResult = await connector.testConnection(cred);
      if (!testResult.ok) {
        console.warn(`[PluginSDK] Connector ${cred.connectorId} connection test failed: ${testResult.error}`);
        return;
      }

      const data = await connector.fetchData(cred, company);
      results[cred.connectorId] = data;
    } catch (err) {
      console.error(`[PluginSDK] Connector ${cred.connectorId} fetch failed:`, err);
    }
  });

  await Promise.allSettled(tasks);
  return results;
}

// ── Plugin Stats ─────────────────────────────────────

export interface RegistryStats {
  totalPlugins: number;
  totalConnectors: number;
  pluginsByCategory: Record<string, number>;
  connectorsByCategory: Record<string, number>;
  pluginsByPhase: Record<string, number>;
}

export function getRegistryStats(): RegistryStats {
  const stats: RegistryStats = {
    totalPlugins: pluginRegistry.size,
    totalConnectors: connectorRegistry.size,
    pluginsByCategory: {},
    connectorsByCategory: {},
    pluginsByPhase: {},
  };

  for (const p of pluginRegistry.values()) {
    stats.pluginsByCategory[p.manifest.category] =
      (stats.pluginsByCategory[p.manifest.category] || 0) + 1;
    for (const phase of p.manifest.phases) {
      stats.pluginsByPhase[phase] = (stats.pluginsByPhase[phase] || 0) + 1;
    }
  }

  for (const c of connectorRegistry.values()) {
    stats.connectorsByCategory[c.manifest.category] =
      (stats.connectorsByCategory[c.manifest.category] || 0) + 1;
  }

  return stats;
}
