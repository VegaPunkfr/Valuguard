/**
 * GHOST TAX — PDF REPORT DOWNLOAD
 *
 * GET /api/report/pdf?id=<audit_request_id>
 *
 * Generates and returns a PDF Decision Pack for a completed audit.
 * Requires the audit_request to have report_data (status = delivered).
 *
 * Revenue impact: PDF is the shareable artifact that sells Rail B internally.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { generatePDFReport, toPDFReportData } from "@/lib/pdf-report";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing audit request ID" }, { status: 400 });
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
    const pdfData = toPDFReportData(
      reportData,
      (row.company_name as string) || "Unknown Company",
      (row.domain as string) || "",
      (row.run_id as string) || id.slice(0, 8),
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
