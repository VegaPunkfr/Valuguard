/**
 * GHOST TAX — INTERNATIONAL SNIPER CRON (SERVER-ONLY)
 *
 * GET /api/cron/international-sniper
 * Schedule: Daily 02:00 UTC (vercel.json)
 *
 * Workflow (chunked, 5 leads per run):
 *   1. SOURCE — Exa neural search for high-intent B2B prospects
 *   2. SHADOW-BILL — CT-Log analysis + SaaS waste estimation
 *   3. ENRICH — Waterfall CFO finder (Apollo → Dropcontact → Test)
 *   4. COPY — Multilingual email draft via gpt-4o-mini
 *   5. PERSIST — Insert into osint_prospects (status: PENDING_REVIEW)
 *
 * Protected by CRON_SECRET Bearer token.
 * maxDuration: 300s (Vercel Pro required).
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeCertificates } from "@/lib/engines/shadow-bill-engine";
import { findCFOTarget } from "@/lib/engines/enrichment";
import { generateOutreachEmail, detectMarket } from "@/lib/engines/copywriter";
import { createAdminSupabase } from "@/lib/supabase";

export const maxDuration = 300;
export const runtime = "nodejs";

// ── Exa client (lazy init) ───────────────────────────

let _exa: any = null;

async function getExa() {
  if (_exa) return _exa;
  const key = process.env.EXA_API_KEY;
  if (!key) return null;
  const { default: Exa } = await import("exa-js");
  _exa = new Exa(key);
  return _exa;
}

// ── Prospect sourcing queries (multi-market) ─────────

const SNIPER_QUERIES = [
  // US market
  { query: "Series B Series C funding 2026 SaaS technology company hiring", market: "US" as const, signal: "funding" },
  { query: "CFO SaaS spending audit cost optimization enterprise 2026", market: "US" as const, signal: "cfo_audit" },
  // DACH market
  { query: "Finanzvorstand SaaS Kosten Optimierung Digitalisierung 2026 Deutschland", market: "DE" as const, signal: "finops_de" },
  { query: "DORA DSGVO Compliance SaaS Vendor Management Europa 2026", market: "DE" as const, signal: "compliance_de" },
  // France
  { query: "DSI CFO rationalisation SaaS dépenses IT entreprise France 2026", market: "FR" as const, signal: "finops_fr" },
  { query: "scale-up française croissance recrutement 200 500 employés technologie 2026", market: "FR" as const, signal: "growth_fr" },
  // Netherlands / Benelux
  { query: "CFO SaaS spending optimization Netherlands Belgium enterprise 2026", market: "NL" as const, signal: "finops_nl" },
  // General EU
  { query: "IT procurement digital transformation cloud cost overrun Europe 2026", market: "EU" as const, signal: "procurement_eu" },
];

// ── Domain blacklist ─────────────────────────────────

const BLACKLIST = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "protonmail.com", "example.com", "test.com", "localhost", "ghost-tax.com",
  "google.com", "microsoft.com", "apple.com", "amazon.com", "facebook.com",
  "linkedin.com", "twitter.com", "github.com", "wikipedia.org",
]);

// ══════════════════════════════════════════════════════
//  MAIN HANDLER
// ══════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  // ── Auth guard ─────────────────────────────────
  if (!process.env.CRON_SECRET) {
    return new Response("CRON_SECRET not configured", { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const log: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    phases: {},
  };

  try {
    const supabase = createAdminSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    // ══════════════════════════════════════════════
    // PHASE 1: SOURCE — Exa neural search
    // ══════════════════════════════════════════════
    const exa = await getExa();
    const prospects: Array<{
      domain: string;
      companyName: string;
      market: "US" | "DE" | "NL" | "FR" | "EU";
      signal: string;
      url: string;
    }> = [];

    if (exa) {
      // Run 2 random queries per run to stay within time budget
      const shuffled = [...SNIPER_QUERIES].sort(() => Math.random() - 0.5);
      const batch = shuffled.slice(0, 2);

      for (const q of batch) {
        try {
          const res = await exa.searchAndContents(q.query, {
            type: "neural",
            numResults: 10,
            startPublishedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            text: { maxCharacters: 300 },
          });

          for (const r of res.results || []) {
            const url = r.url || "";
            try {
              const parsed = new URL(url);
              const domain = parsed.hostname.replace(/^www\./, "").toLowerCase();
              if (BLACKLIST.has(domain)) continue;
              if (prospects.some((p) => p.domain === domain)) continue;

              prospects.push({
                domain,
                companyName: r.title?.split(/[|\-–—]/)[0]?.trim() || domain,
                market: q.market,
                signal: q.signal,
                url,
              });
            } catch {
              // Invalid URL
            }
          }
        } catch (err) {
          console.warn(`[Sniper] Exa query failed: ${q.signal}`, err instanceof Error ? err.message : err);
        }
      }
    }

    log.phases = { ...log.phases as object, source: { found: prospects.length } };

    // ══════════════════════════════════════════════
    // PHASE 2-4: Process top 5 prospects (chunked)
    // ══════════════════════════════════════════════
    const CHUNK_SIZE = 5;
    const toProcess = prospects.slice(0, CHUNK_SIZE);
    const results: Array<{
      domain: string;
      status: string;
      shadowBill: boolean;
      cfoFound: boolean;
      emailDraft: boolean;
      error?: string;
    }> = [];

    for (const prospect of toProcess) {
      try {
        // Check if already in pipeline
        const { data: existing } = await (supabase
          .from("osint_prospects") as ReturnType<typeof supabase.from>)
          .select("domain, status")
          .eq("domain", prospect.domain)
          .limit(1)
          .single();

        if (existing) {
          results.push({ domain: prospect.domain, status: "SKIPPED_EXISTS", shadowBill: false, cfoFound: false, emailDraft: false });
          continue;
        }

        // ── SHADOW-BILL ────────────────────────────
        const bill = await analyzeCertificates(prospect.domain);
        const hasBill = bill.detectedSaas.length > 0;

        // ── ENRICHMENT ─────────────────────────────
        const enrichment = await findCFOTarget(prospect.domain);
        const hasCfo = enrichment.target !== null;

        // ── COPYWRITING ────────────────────────────
        let emailDraft: Awaited<ReturnType<typeof generateOutreachEmail>> = null;
        if (hasBill && hasCfo && enrichment.target) {
          const market = detectMarket(prospect.domain);
          emailDraft = await generateOutreachEmail({
            target: enrichment.target,
            shadowBill: bill,
            market: prospect.market || market,
            companyName: prospect.companyName,
          });
        }

        // ── PERSIST ────────────────────────────────
        const enrichmentData = {
          shadowBill: bill,
          cfoTarget: enrichment.target,
          enrichmentSource: enrichment.source,
          enrichmentErrors: enrichment.errors,
          emailDraft: emailDraft ? {
            subject: emailDraft.subject,
            body: emailDraft.body,
            htmlBody: emailDraft.htmlBody,
            language: emailDraft.language,
            market: emailDraft.market,
            tonality: emailDraft.tonality,
          } : null,
          sourceSignal: prospect.signal,
          sourceUrl: prospect.url,
          processedAt: new Date().toISOString(),
        };

        const status = (hasBill && hasCfo && emailDraft)
          ? "PENDING_REVIEW"
          : hasBill
            ? "DISCOVERED"
            : "DISCOVERED";

        await (supabase
          .from("osint_prospects") as ReturnType<typeof supabase.from>)
          .upsert(
            {
              domain: prospect.domain,
              company_name: prospect.companyName,
              status,
              intent_score: bill.confidence,
              exposure_low_eur: bill.estimatedWasteEur,
              exposure_high_eur: bill.totalEstimatedSpendEur,
              enrichment_data: enrichmentData,
              geo_market: prospect.market,
              status_changed_at: new Date().toISOString(),
            } as Record<string, unknown>,
            { onConflict: "domain" },
          );

        results.push({
          domain: prospect.domain,
          status,
          shadowBill: hasBill,
          cfoFound: hasCfo,
          emailDraft: emailDraft !== null,
        });
      } catch (err) {
        console.error(`[Sniper] Error processing ${prospect.domain}:`, err instanceof Error ? err.message : err);
        results.push({
          domain: prospect.domain,
          status: "ERROR",
          shadowBill: false,
          cfoFound: false,
          emailDraft: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    log.phases = {
      ...log.phases as object,
      process: {
        total: toProcess.length,
        pendingReview: results.filter((r) => r.status === "PENDING_REVIEW").length,
        discovered: results.filter((r) => r.status === "DISCOVERED").length,
        skipped: results.filter((r) => r.status === "SKIPPED_EXISTS").length,
        errors: results.filter((r) => r.status === "ERROR").length,
      },
      results,
    };

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - start,
      ...log,
    });
  } catch (err) {
    console.error("[Sniper] Fatal error:", err instanceof Error ? err.message : err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Fatal error",
      durationMs: Date.now() - start,
    }, { status: 500 });
  }
}
