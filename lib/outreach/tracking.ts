/**
 * VALUGUARD — SNIPER TRACKING (SERVER-ONLY)
 *
 * Sprint 4 : Magic link generation + open tracking.
 *
 * - generateMagicLink(domain) → URL unique avec tracking_id
 * - markAuditOpened(trackingId) → OPENED dans osint_prospects
 * - getTrackingId(domain) → récupère le tracking_id existant
 *
 * Le tracking_id est un UUID v4 stocké sur osint_prospects.
 * Au chargement de /audit/[id], le client POST /api/audit/track
 * qui appelle markAuditOpened().
 */

import { createAdminSupabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

// ══════════════════════════════════════════════════════
//  MAGIC LINK
// ══════════════════════════════════════════════════════

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";

/**
 * Generate a trackable magic link for the forensic audit page.
 *
 * 1. Creates a tracking_id (UUID) if none exists
 * 2. Persists it on osint_prospects
 * 3. Returns the full URL: /audit/{encodedDomain}?ref={trackingId}
 */
export async function generateMagicLink(
  domain: string,
): Promise<{ url: string; trackingId: string }> {
  const cleanDomain = normalizeDomain(domain);
  const trackingId = randomUUID();

  const supabase = createAdminSupabase();
  if (supabase) {
    try {
      await (supabase.from("osint_prospects") as ReturnType<typeof supabase.from>)
        .update({
          tracking_id: trackingId,
          status_changed_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("domain", cleanDomain);
    } catch (err) {
      console.error(
        "[Tracking] Failed to persist tracking_id:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const encoded = encodeURIComponent(cleanDomain);
  const url = `${SITE_URL}/audit/${encoded}?ref=${trackingId}`;

  return { url, trackingId };
}

// ══════════════════════════════════════════════════════
//  MARK OPENED
// ══════════════════════════════════════════════════════

export interface OpenTrackResult {
  success: boolean;
  domain?: string;
  firstOpen: boolean;
  error?: string;
}

/**
 * Mark an audit as OPENED in osint_prospects.
 *
 * Called from /api/audit/track when the client loads the report.
 * Only transitions status to OPENED if current status is OUTREACH_SENT or AUDITED.
 * Records opened_at only on first open (idempotent).
 */
export async function markAuditOpened(
  trackingId: string,
): Promise<OpenTrackResult> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return { success: false, firstOpen: false, error: "Supabase not configured" };
  }

  try {
    // Fetch current state
    const { data, error: fetchErr } = await (supabase
      .from("osint_prospects") as ReturnType<typeof supabase.from>)
      .select("domain, status, opened_at")
      .eq("tracking_id", trackingId)
      .limit(1)
      .single();

    if (fetchErr || !data) {
      return { success: false, firstOpen: false, error: "Tracking ID not found" };
    }

    const row = data as Record<string, unknown>;
    const domain = row.domain as string;
    const alreadyOpened = !!row.opened_at;

    // Update: set opened_at (first open only) + status → OPENED
    const updatePayload: Record<string, unknown> = {
      status_changed_at: new Date().toISOString(),
    };

    if (!alreadyOpened) {
      updatePayload.opened_at = new Date().toISOString();
    }

    // Only move to OPENED if in a valid preceding state
    const validPrevStates = ["OUTREACH_SENT", "AUDITED", "READY_FOR_OUTREACH"];
    if (validPrevStates.includes(row.status as string)) {
      updatePayload.status = "OPENED";
    }

    const { error: updateErr } = await (supabase
      .from("osint_prospects") as ReturnType<typeof supabase.from>)
      .update(updatePayload)
      .eq("tracking_id", trackingId);

    if (updateErr) {
      return { success: false, domain, firstOpen: false, error: updateErr.message };
    }

    return { success: true, domain, firstOpen: !alreadyOpened };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, firstOpen: false, error: msg };
  }
}

// ══════════════════════════════════════════════════════
//  MARK SNIPER SENT
// ══════════════════════════════════════════════════════

/**
 * Update osint_prospects after sniper email is sent.
 * Sets status → OUTREACH_SENT + sniper_sent_at + outreach_sent_at.
 */
export async function markSniperSent(domain: string): Promise<boolean> {
  const cleanDomain = normalizeDomain(domain);
  const supabase = createAdminSupabase();
  if (!supabase) return false;

  try {
    const now = new Date().toISOString();
    const { error } = await (supabase
      .from("osint_prospects") as ReturnType<typeof supabase.from>)
      .update({
        status: "OUTREACH_SENT",
        sniper_sent_at: now,
        outreach_sent_at: now,
        status_changed_at: now,
      } as Record<string, unknown>)
      .eq("domain", cleanDomain);

    if (error) {
      console.error("[Tracking] markSniperSent failed:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════

function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();
}
