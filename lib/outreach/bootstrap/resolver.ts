/**
 * LOT 1 / OBS-0 — Client resolver
 * Maps a raw outreach event (email, domain, tags) to a sprint_accounts.id
 * with strict no-fuzzy rules. Returns null + orphan reason if unresolvable.
 */

import { createAdminSupabase } from "@/lib/supabase";

export type ResolveResult =
  | { ok: true; client_id: string; via: "tag" | "email_exact" | "domain_unique" }
  | { ok: false; orphan: true; reason: "no_match" | "ambiguous_domain" | "excluded_domain" | "missing_inputs" };

export async function resolveClientId(input: {
  tagClientId?: string | null;
  toEmail?: string | null;
  toDomain?: string | null;
}): Promise<ResolveResult> {
  const supabase = createAdminSupabase();
  if (!supabase) return { ok: false, orphan: true, reason: "no_match" };

  // 1. Tag wins if present (post-CP7 sends will always carry this)
  if (input.tagClientId) {
    const { data } = await (supabase as any)
      .from("sprint_accounts")
      .select("id")
      .eq("id", input.tagClientId)
      .maybeSingle();
    if (data?.id) return { ok: true, client_id: data.id, via: "tag" };
  }

  // 2. Exact email match
  if (input.toEmail) {
    const lc = input.toEmail.trim().toLowerCase();
    if (lc) {
      const { data } = await (supabase as any)
        .from("sprint_accounts")
        .select("id")
        .ilike("contact_email", lc);
      if (data?.length === 1) return { ok: true, client_id: data[0].id, via: "email_exact" };
    }
  }

  // 3. Domain unique match (only if exactly 1 row for that domain)
  const domain = (input.toDomain || (input.toEmail?.split("@")[1] ?? "")).trim().toLowerCase();
  if (domain) {
    const { data } = await (supabase as any)
      .from("sprint_accounts")
      .select("id")
      .eq("domain", domain);
    if (data?.length === 1) return { ok: true, client_id: data[0].id, via: "domain_unique" };
    if ((data?.length ?? 0) > 1) return { ok: false, orphan: true, reason: "ambiguous_domain" };
  }

  if (!input.toEmail && !input.tagClientId && !domain) {
    return { ok: false, orphan: true, reason: "missing_inputs" };
  }
  return { ok: false, orphan: true, reason: "no_match" };
}

/**
 * Déterministe attempt_id for bootstrap events (idempotent even si relancé).
 * Pattern : bootstrap:<provider>:<provider_event_id>
 */
export function deterministicAttemptId(provider: string, providerEventId: string | null): string {
  return `bootstrap:${provider}:${providerEventId ?? "none"}`;
}
