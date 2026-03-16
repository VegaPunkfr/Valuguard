/**
 * GHOST TAX — SHADOW-BILL RECONSTRUCTOR API
 *
 * GET /api/shadow-bill?domain=acme.com
 *
 * Runs CT-Log parsing + SaaS fingerprinting + overlap detection.
 * Returns structured ShadowBill JSON.
 * Caches results in Supabase vault_sessions for Trojan Vault pages.
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateShadowBill } from "@/lib/shadow-bill";
import { createAdminSupabase } from "@/lib/supabase";

export const maxDuration = 30;

// ── Rate limiter (simple, in-memory) ─────────────────
const RATE_MAX = 10;
const RATE_WINDOW_MS = 60_000;
const rateMap = new Map<string, number[]>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  let timestamps = rateMap.get(ip);
  if (!timestamps) { timestamps = []; rateMap.set(ip, timestamps); }
  while (timestamps.length > 0 && timestamps[0] < now - RATE_WINDOW_MS) timestamps.shift();
  if (timestamps.length >= RATE_MAX) return false;
  timestamps.push(now);
  return true;
}

// ── Validation ───────────────────────────────────────
function validateDomain(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const clean = raw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  if (clean.length < 3 || clean.length > 253) return null;
  if (!clean.includes(".")) return null;
  if (/[^a-z0-9.\-]/.test(clean)) return null;
  return clean;
}

export async function GET(request: NextRequest) {
  // Rate limit
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const domain = validateDomain(request.nextUrl.searchParams.get("domain"));
  if (!domain) {
    return NextResponse.json({ error: "Valid domain required (e.g. acme.com)." }, { status: 400 });
  }

  const headcount = parseInt(request.nextUrl.searchParams.get("size") || "100", 10);
  const companySize = Math.max(10, Math.min(10000, isNaN(headcount) ? 100 : headcount));

  try {
    // Check Supabase cache first (24h TTL)
    // shadow_bill column may not exist in typed schema yet — use type assertion
    const supabase = createAdminSupabase();
    if (supabase) {
      const { data: cached } = await (supabase
        .from("vault_sessions") as ReturnType<NonNullable<typeof supabase>["from"]>)
        .select("*")
        .eq("domain", domain)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      const row = cached as Record<string, unknown> | null;
      if (row?.shadow_bill && row.updated_at) {
        const age = Date.now() - new Date(row.updated_at as string).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return NextResponse.json(row.shadow_bill, {
            headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=3600" },
          });
        }
      }
    }

    // Fresh scan
    const bill = await calculateShadowBill(domain, companySize);

    // Cache to Supabase (fire-and-forget)
    // Uses untyped insert since shadow_bill column may not be in schema types
    if (supabase) {
      (supabase
        .from("vault_sessions") as ReturnType<NonNullable<typeof supabase>["from"]>)
        .upsert(
          {
            domain,
            shadow_bill: bill,
            updated_at: new Date().toISOString(),
          } as Record<string, unknown>,
          { onConflict: "domain" },
        )
        .then(() => {})
        .catch(() => {});
    }

    return NextResponse.json(bill, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.error("[Shadow Bill] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Scan failed. Please retry." }, { status: 500 });
  }
}
