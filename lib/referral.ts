/**
 * GHOST TAX — REFERRAL TRACKING ENGINE
 *
 * Server-only module. Never import in client bundles.
 *
 * Reward model: 50 EUR credit per converted referral (Rail A purchase).
 * Deterministic referral codes — same email always yields same code.
 *
 * Guards:
 *   - Self-referral blocked (referrer cannot refer themselves)
 *   - Duplicate referral blocked (same referred_email + referrer_code pair)
 *   - Code existence validated before tracking
 */

import { createAdminSupabase } from "@/lib/supabase";
import { createHash } from "crypto";

// ── Constants ──────────────────────────────────────────

const REWARD_EUR_PER_CONVERSION = 50;
const CODE_LENGTH = 8;

// ── Code Generation ────────────────────────────────────

/**
 * Generates a deterministic, URL-safe referral code from an email.
 * Same email always produces the same 8-character code.
 * Uses SHA-256 → base64url → truncate.
 */
export function generateReferralCode(email: string): string {
  const normalized = email.trim().toLowerCase();
  const hash = createHash("sha256").update(`ghosttax-ref:${normalized}`).digest("base64url");
  return hash.slice(0, CODE_LENGTH);
}

// ── Referral Registration ──────────────────────────────

/**
 * Ensures a referrer row exists in the referrals table.
 * Idempotent — safe to call multiple times for the same email.
 * Returns the referral code.
 */
export async function ensureReferrer(email: string): Promise<string | null> {
  const sb = createAdminSupabase();
  if (!sb) return null;

  const code = generateReferralCode(email);
  const normalizedEmail = email.trim().toLowerCase();

  // Upsert: insert if not exists (conflict on referrer_code does nothing)
  const { error } = await (sb as any)
    .from("referrals")
    .upsert(
      {
        referrer_email: normalizedEmail,
        referrer_code: code,
        referred_email: null as unknown as string, // Seed row — no referred email
        status: "seed",
        reward_eur: 0,
      },
      { onConflict: "referrer_code", ignoreDuplicates: true }
    );

  if (error) {
    console.error("[Ghost Tax] ensureReferrer error:", error.message);
    return null;
  }

  return code;
}

// ── Track Referral ─────────────────────────────────────

/**
 * Records a referral event.
 * Guards:
 *   1. Referrer code must exist
 *   2. Self-referral blocked
 *   3. Duplicate (same referrer + referred pair) blocked
 */
export async function trackReferral(
  referrerCode: string,
  referredEmail: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = createAdminSupabase();
  if (!sb) return { ok: false, error: "Database unavailable" };

  const normalizedReferred = referredEmail.trim().toLowerCase();

  // 1. Validate referrer code exists — fetch referrer email
  const { data: referrerRow, error: lookupError } = await (sb as any)
    .from("referrals")
    .select("referrer_email")
    .eq("referrer_code", referrerCode)
    .limit(1)
    .single();

  if (lookupError || !referrerRow) {
    return { ok: false, error: "Invalid referral code" };
  }

  // 2. Self-referral guard
  if (referrerRow.referrer_email === normalizedReferred) {
    return { ok: false, error: "Self-referral is not permitted" };
  }

  // 3. Duplicate guard — check if this exact pair already exists
  const { data: existing } = await (sb as any)
    .from("referrals")
    .select("id")
    .eq("referrer_code", referrerCode)
    .eq("referred_email", normalizedReferred)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "This referral has already been recorded" };
  }

  // 4. Insert the referral
  const { error: insertError } = await (sb as any).from("referrals").insert({
    referrer_email: referrerRow.referrer_email,
    referrer_code: referrerCode,
    referred_email: normalizedReferred,
    status: "pending",
    reward_eur: 0,
  });

  if (insertError) {
    console.error("[Ghost Tax] trackReferral insert error:", insertError.message);
    return { ok: false, error: "Failed to record referral" };
  }

  return { ok: true };
}

// ── Convert Referral ───────────────────────────────────

/**
 * Marks a referral as converted when the referred user completes a Rail A purchase.
 * Call this from the Stripe webhook after successful payment.
 * Awards REWARD_EUR_PER_CONVERSION to the referrer.
 */
export async function convertReferral(
  referredEmail: string
): Promise<{ ok: boolean; referrerEmail?: string }> {
  const sb = createAdminSupabase();
  if (!sb) return { ok: false };

  const normalizedReferred = referredEmail.trim().toLowerCase();

  // Find pending referral for this email
  const { data: referral, error: lookupError } = await (sb as any)
    .from("referrals")
    .select("id, referrer_email")
    .eq("referred_email", normalizedReferred)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (lookupError || !referral) {
    // No pending referral — not an error, user just wasn't referred
    return { ok: true };
  }

  // Mark as converted + assign reward
  const { error: updateError } = await (sb as any)
    .from("referrals")
    .update({
      status: "converted",
      reward_eur: REWARD_EUR_PER_CONVERSION,
      converted_at: new Date().toISOString(),
    })
    .eq("id", referral.id);

  if (updateError) {
    console.error("[Ghost Tax] convertReferral error:", updateError.message);
    return { ok: false };
  }

  return { ok: true, referrerEmail: referral.referrer_email };
}

// ── Stats ──────────────────────────────────────────────

export interface ReferralStats {
  code: string;
  referrals: number;
  converted: number;
  rewardEur: number;
}

/**
 * Retrieves referral stats for a given email address.
 */
export async function getReferralStats(email: string): Promise<ReferralStats | null> {
  const sb = createAdminSupabase();
  if (!sb) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const code = generateReferralCode(normalizedEmail);

  // Fetch all referral rows for this code (excluding the seed row)
  const { data: rows, error } = await (sb as any)
    .from("referrals")
    .select("status, reward_eur")
    .eq("referrer_code", code)
    .neq("status", "seed");

  if (error) {
    console.error("[Ghost Tax] getReferralStats error:", error.message);
    return null;
  }

  const referrals = rows?.length ?? 0;
  const converted = rows?.filter((r: any) => r.status === "converted").length ?? 0;
  const rewardEur = rows?.reduce((sum: number, r: any) => sum + (r.reward_eur ?? 0), 0) ?? 0;

  return { code, referrals, converted, rewardEur };
}

// ── Referral Info (public-safe) ────────────────────────

export interface ReferralInfo {
  valid: boolean;
  referrerEmail?: string;
  totalReferred: number;
}

/**
 * Returns public-safe info about a referral code.
 * Used by the GET endpoint to show "Referred by X".
 */
export async function getReferralInfo(code: string): Promise<ReferralInfo> {
  const sb = createAdminSupabase();
  if (!sb) return { valid: false, totalReferred: 0 };

  // Get referrer + count of non-seed referrals
  const { data: rows, error } = await (sb as any)
    .from("referrals")
    .select("referrer_email, status")
    .eq("referrer_code", code);

  if (error || !rows || rows.length === 0) {
    return { valid: false, totalReferred: 0 };
  }

  const referrerEmail = rows[0].referrer_email;
  const totalReferred = rows.filter((r: any) => r.status !== "seed").length;

  return {
    valid: true,
    referrerEmail,
    totalReferred,
  };
}
