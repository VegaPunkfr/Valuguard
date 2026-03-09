/**
 * PLUGIN: Benchmark Engine
 *
 * Compares client spend against industry/size/region benchmarks.
 * Creates peer pressure that drives purchasing urgency.
 * Revenue: "you're in the bottom quartile" is the strongest conversion trigger.
 */

import type { GhostTaxPlugin, PluginContext, PluginOutput, PluginInsight } from "./types";

interface BenchmarkResult {
  metric: string;
  clientValue: number;
  benchmarkMedian: number;
  benchmarkP25: number;
  benchmarkP75: number;
  percentile: number;
  gap: number;
  gapEur: [number, number];
  verdict: "efficient" | "average" | "above_average" | "overspending";
}

// Industry benchmarks (EUR/employee/month) by company size
const BENCHMARKS: Record<string, Record<string, number>> = {
  "saas_spend_per_employee": {
    "small": 145,    // <100 employees
    "mid": 180,      // 100-500
    "large": 210,    // 500-2000
    "enterprise": 250, // 2000+
  },
  "cloud_spend_per_employee": {
    "small": 65,
    "mid": 95,
    "large": 130,
    "enterprise": 180,
  },
  "ai_spend_per_employee": {
    "small": 15,
    "mid": 28,
    "large": 45,
    "enterprise": 70,
  },
  "security_spend_pct": {
    "small": 0.06,
    "mid": 0.08,
    "large": 0.10,
    "enterprise": 0.12,
  },
  "tools_per_employee": {
    "small": 0.45,
    "mid": 0.35,
    "large": 0.25,
    "enterprise": 0.20,
  },
};

function getSizeCategory(headcount: number): string {
  if (headcount < 100) return "small";
  if (headcount < 500) return "mid";
  if (headcount < 2000) return "large";
  return "enterprise";
}

export const benchmarkEnginePlugin: GhostTaxPlugin = {
  manifest: {
    id: "benchmark-engine",
    name: "Benchmark Engine",
    version: "1.0.0",
    category: "scoring",
    phases: ["analysis", "post-analysis"],
    description: "Compares spending against industry/size/region benchmarks to identify over-spending.",
    revenueImpact: "Peer comparison creates urgency — 'bottom quartile' finding drives 35% higher conversion.",
  },

  async execute(ctx: PluginContext): Promise<PluginOutput> {
    const start = Date.now();
    const insights: PluginInsight[] = [];
    const results: BenchmarkResult[] = [];
    const scores: Record<string, number> = {};
    const headcount = ctx.company.headcount || 200;
    const monthlySpend = ctx.company.monthlySpendEur || 50000;
    const toolCount = ctx.company.saasToolCount || 40;
    const size = getSizeCategory(headcount);

    // Use pipeline peer comparison if available (observed > estimated)
    const pipelinePeer = ctx.pipeline?.peerComparison;
    const pipelineExposure = ctx.pipeline?.exposure;
    if (pipelinePeer && !pipelinePeer.insufficientBenchmark) {
      scores.pipeline_percentile = pipelinePeer.efficiencyPercentile || 50;
      scores.pipeline_benchmark_confidence = pipelinePeer.benchmarkConfidence;
      if (pipelinePeer.categoryMedianExposureEur) {
        scores.category_median_exposure = pipelinePeer.categoryMedianExposureEur;
      }
    }
    if (pipelineExposure) {
      scores.pipeline_exposure_low = pipelineExposure.lowEur;
      scores.pipeline_exposure_high = pipelineExposure.highEur;
      scores.pipeline_exposure_confidence = pipelineExposure.confidence;
    }

    // SaaS spend per employee
    const saasPerEmp = monthlySpend / headcount;
    const saasBench = BENCHMARKS["saas_spend_per_employee"][size];
    const saasPercentile = Math.min(99, Math.max(1, Math.round(50 + (saasPerEmp - saasBench) / saasBench * 50)));
    const saasGap = saasPerEmp - saasBench;
    const saasGapAnnual: [number, number] = saasGap > 0
      ? [Math.round(saasGap * headcount * 8), Math.round(saasGap * headcount * 12)]
      : [0, 0];

    results.push({
      metric: "SaaS spend per employee",
      clientValue: Math.round(saasPerEmp),
      benchmarkMedian: saasBench,
      benchmarkP25: Math.round(saasBench * 0.75),
      benchmarkP75: Math.round(saasBench * 1.35),
      percentile: saasPercentile,
      gap: Math.round(saasGap),
      gapEur: saasGapAnnual,
      verdict: saasPercentile > 75 ? "overspending" : saasPercentile > 55 ? "above_average" : saasPercentile > 35 ? "average" : "efficient",
    });

    if (saasPercentile > 60) {
      insights.push({
        id: "be-saas-overspend",
        label: `SaaS spend: ${saasPercentile}th percentile (${Math.round(saasPerEmp)} EUR/emp/mo)`,
        description: `Your SaaS spend is ${Math.round((saasPerEmp / saasBench - 1) * 100)}% above the ${size} company median (${saasBench} EUR). Annual gap: ${saasGapAnnual[0].toLocaleString()}-${saasGapAnnual[1].toLocaleString()} EUR.`,
        severity: saasPercentile > 80 ? "critical" : "high",
        eurImpact: saasGapAnnual,
        confidence: 55,
        source: "benchmark-engine",
      });
    }

    // Tools per employee ratio
    const toolsPerEmp = toolCount / headcount;
    const toolBench = BENCHMARKS["tools_per_employee"][size];
    const toolPercentile = Math.min(99, Math.max(1, Math.round(50 + (toolsPerEmp - toolBench) / toolBench * 50)));

    if (toolsPerEmp > toolBench * 1.3) {
      const excessTools = Math.round((toolsPerEmp - toolBench) * headcount);
      const excessCost: [number, number] = [
        Math.round(excessTools * 150 * 12 * 0.5),
        Math.round(excessTools * 150 * 12),
      ];
      results.push({
        metric: "Tools per employee",
        clientValue: Number(toolsPerEmp.toFixed(2)),
        benchmarkMedian: toolBench,
        benchmarkP25: Number((toolBench * 0.7).toFixed(2)),
        benchmarkP75: Number((toolBench * 1.4).toFixed(2)),
        percentile: toolPercentile,
        gap: Number((toolsPerEmp - toolBench).toFixed(2)),
        gapEur: excessCost,
        verdict: "overspending",
      });
      insights.push({
        id: "be-tool-sprawl",
        label: `Tool sprawl: ${toolCount} tools for ${headcount} employees`,
        description: `Ratio of ${toolsPerEmp.toFixed(2)} tools/employee vs ${toolBench} benchmark. ~${excessTools} excess tools costing ${excessCost[0].toLocaleString()}-${excessCost[1].toLocaleString()} EUR/yr.`,
        severity: "high",
        eurImpact: excessCost,
        confidence: 50,
        source: "benchmark-engine",
      });
    }

    // Overall efficiency score (0-100, lower = more efficient)
    const efficiencyScore = Math.min(85, Math.round(
      (saasPercentile * 0.5) + (toolPercentile * 0.3) + (saasGap > 0 ? 15 : 0)
    ));

    return {
      pluginId: "benchmark-engine",
      insights,
      scores: {
        ...scores,
        saas_percentile: saasPercentile,
        tool_percentile: toolPercentile,
        efficiency_score: efficiencyScore,
        saas_per_employee: Math.round(saasPerEmp),
        benchmark_median: saasBench,
      },
      metadata: { results, sizeCategory: size },
      executionMs: Date.now() - start,
    };
  },
};
