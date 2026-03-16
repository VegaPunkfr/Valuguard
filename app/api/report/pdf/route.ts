/**
 * GHOST TAX — PDF REPORT DOWNLOAD
 *
 * GET /api/report/pdf?id=<audit_request_id>
 *
 * Generates and returns a PDF Decision Pack for a completed audit.
 * Requires the audit_request to have report_data (status = delivered).
 *
 * Security: rate limited (5 req/min per IP), validates UUID format for id param.
 * Revenue impact: PDF is the shareable artifact that sells Rail B internally.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { generatePDFReport, toPDFReportData, detectLocaleFromDomain, type PDFLocale } from "@/lib/pdf-report";

// ── Rate Limiting ─────────────────────────────────────────
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_MAX_REQUESTS = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && now > entry.resetAt) {
    rateLimitMap.delete(ip);
  }
  const current = rateLimitMap.get(ip);
  if (!current) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= RATE_MAX_REQUESTS) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  current.count++;
  return { allowed: true, retryAfter: 0 };
}

// ── UUID validation ───────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  // ── Rate limiting ───────────────────────────────────────
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } },
    );
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing audit request ID" }, { status: 400 });
  }

  // Validate UUID format to prevent brute-force scanning with arbitrary strings
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid audit request ID format" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Fetch the audit request with report data
  const { data, error } = await supabase
    .from("audit_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Audit request not found" }, { status: 404 });
  }

  const row = data as Record<string, unknown>;
  const reportData = row.report_data as Record<string, unknown> | null;
  if (!reportData) {
    return NextResponse.json(
      { error: "Report not yet generated. Please wait for delivery." },
      { status: 404 }
    );
  }

  try {
    const domain = (row.domain as string) || "";
    const locale = (row.locale as PDFLocale) || detectLocaleFromDomain(domain);
    const pdfData = toPDFReportData(
      reportData,
      (row.company_name as string) || "Unknown Company",
      domain,
      (row.run_id as string) || id.slice(0, 8),
      locale,
    );

    const pdfBuffer = await generatePDFReport(pdfData);
    const filename = `ghost-tax-report-${(row.domain as string) || "report"}-${new Date().toISOString().split("T")[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[Ghost Tax] PDF generation error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to generate PDF report" },
      { status: 500 }
    );
  }
}
