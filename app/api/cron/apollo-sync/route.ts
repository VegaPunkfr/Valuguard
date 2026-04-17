/**
 * GHOST TAX — APOLLO SYNC CRON (quotidien 06:15 UTC)
 *
 * Synchronise les stats sequence Apollo → outreach_leads.metadata
 *
 * Créé 17 avril 2026 après setup Apollo par Claude Cowork :
 * - Mailbox contact@ghost-tax.com connectée en OAuth Google
 * - Sequence "Ghost Tax — DACH UK NL Q2 2026" active, 29 contacts enrollés
 * - Warmup progressif 10→40 emails/jour, DKIM en propagation
 *
 * Le cron :
 *  1. Pull /contacts/search par IDs (29 contacts Q2 2026)
 *  2. Merge sequence stats (sends/opens/clicks/replies) dans metadata JSON
 *  3. Détecte replies → passe status="replied", converted=true (stoppe drip Resend)
 *  4. Détecte bounces/unsub → met à jour flags
 *  5. Émet event REPLIED dans outreach_events pour observability
 *
 * Config : schedule "15 6 * * *" dans vercel.json.
 * Auth : Bearer CRON_SECRET (header Authorization).
 *
 * Schema DB : stocke tout dans metadata JSON (colonnes custom inexistantes).
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── IDs des 29 contacts Ghost Tax Q2 2026 (unlockés 17 avril) ─────────

const GHOST_TAX_CONTACT_IDS: string[] = [
  "69e24603bc93b1001d77928a", // Roman Bernold — Kongresshaus Zürich
  "69e24604c1bf470019777202", // Peter Kainz — Ontime Logistics
  "69e246046ae18e001dd2fee1", // Kevin Matjeka — ASTRA Bremen
  "69e24605e90b12000dd4649c", // Andrej Nikitin — Toyota Material Handling AT
  "69e24606c1bf47001977722f", // Karsten Kammer — BCN
  "69e24607bc93b1001d7792a0", // Stefan Stuker — UCC Coffee Switzerland
  "69e246086ddd5e000d5d57c6", // Christian Schoen — Alois Dallmayr
  "69e24609e90b12000dd46506", // Reto Graf — BRAUN AG
  "69e2460aef7cd2001512a780", // Marc Schmidt — IMTRON GmbH
  "69e2460a088db8001d294a12", // Laila Haller — Eturnity
  "69e2460b6ae18e001dd2ff98", // Philip Gardner — Rocket Medical
  "69e2460cd3b3ca00150be081", // Gill Martin — Cumbria Education Trust
  "69e2460de0c4d80021bc892c", // Phil Ward — Astech
  "69e2460ebc93b1001d779322", // Stephen Smales — Survitec/Beaufort
  "69e2460fbc93b1001d77932b", // Chris Romain — Pareto Financial Planning
  "69e2460f6ddd5e000d5d5819", // Charlie Irvine — Ergonomic Solutions
  "69e24610d3b3ca00150be08a", // Ellie Poltorak — Inclusive Employers
  "69e24611184deb0015586a67", // Deborah Spence — The CFO Centre UK
  "69e24612e0c4d80021bc8959", // Jenny Peel — MAGTEC
  "69e24614ef7cd2001512a7a1", // Ad Breepoel — VERVAET
  "69e246156ddd5e000d5d5894", // Nick Van Der Steen — Sawiday
  "69e24616184deb0015586bb2", // Patrick Helvensteijn — Ampowr
  "69e24616d3b3ca00150be0ae", // Jeroen Willard — Canon Business Center NL
  "69e246176ddd5e000d5d58b5", // Martijn Klerk — P1 Travel
  "69e24618e0c4d80021bc8a6e", // Eric Luttikhuis — Baan Twente
  "69e24619184deb0015586be7", // Marcel Oosterveld — Consumentenbond
  "69e2461a6ddd5e000d5d58c2", // Maryse Trommelen — PIDZ
  "69e2461bd3b3ca00150be0c6", // Yolanda Both — Papendal
  "69e2461c74c25000218e0970", // Martin Filius — Topa Verpakking
];

// ─── Types ─────────────────────────────────────────────────────────────

interface ApolloContact {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  organization_name?: string;
  contact_last_activity_date?: string | null;
  email_status?: string;
  contact_campaign_statuses?: Array<{
    id?: string;
    emailer_campaign_id?: string;
    state?: string; // active | paused | completed | stopped | bounced
    sends_count?: number;
    opens_count?: number;
    clicks_count?: number;
    replies_count?: number;
  }>;
}

// ─── Fetch contacts Apollo par IDs ─────────────────────────────────────

async function fetchApolloContacts(apiKey: string): Promise<ApolloContact[]> {
  const batchSize = 25;
  const all: ApolloContact[] = [];

  for (let i = 0; i < GHOST_TAX_CONTACT_IDS.length; i += batchSize) {
    const batch = GHOST_TAX_CONTACT_IDS.slice(i, i + batchSize);
    const res = await fetch("https://api.apollo.io/api/v1/contacts/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        contact_ids: batch,
        per_page: batchSize,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.warn(`[apollo-sync] batch ${i} HTTP ${res.status}: ${errText.slice(0, 200)}`);
      continue;
    }

    const data = await res.json();
    all.push(...(data.contacts || []));
  }

  return all;
}

// ─── Handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth guard — accepte Bearer CRON_SECRET OU hit interne Vercel Cron
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (cronSecret && !isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apolloApiKey = process.env.APOLLO_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apolloApiKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "missing_env", need: ["APOLLO_API_KEY", "SUPABASE_URL", "SERVICE_ROLE_KEY"] },
      { status: 503 }
    );
  }

  const start = Date.now();
  const syncedAt = new Date().toISOString();

  let contacts: ApolloContact[];
  try {
    contacts = await fetchApolloContacts(apolloApiKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "apollo_fetch_failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const result = {
    contactsFetched: contacts.length,
    leadsUpdated: 0,
    repliesDetected: 0,
    bouncesDetected: 0,
    errors: [] as string[],
    durationMs: 0,
  };

  for (const c of contacts) {
    const email = (c.email || "").toLowerCase();
    if (!email) continue;

    const cs = c.contact_campaign_statuses?.[0];
    const state = (cs?.state || "").toLowerCase();
    const replies = cs?.replies_count || 0;
    const sends = cs?.sends_count || 0;
    const opens = cs?.opens_count || 0;
    const clicks = cs?.clicks_count || 0;

    // 1. Fetch lead existant par email (clé unique)
    const getRes = await fetch(
      `${supabaseUrl}/rest/v1/outreach_leads?email=eq.${encodeURIComponent(email)}&select=id,status,metadata,converted,unsubscribed`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );

    if (!getRes.ok) {
      result.errors.push(`fetch ${email}: HTTP ${getRes.status}`);
      continue;
    }
    const existing = (await getRes.json())[0];
    if (!existing) {
      // Pas en DB — skip, l'ingest initial s'en occupe
      continue;
    }

    // 2. Build patch
    const currentMeta = existing.metadata || {};
    const wasReplied = currentMeta.apolloReplied === true;

    const patch: Record<string, any> = {
      updated_at: syncedAt,
      metadata: {
        ...currentMeta,
        apolloContactId: c.id,
        apolloSequenceId: cs?.emailer_campaign_id || null,
        apolloSequenceState: cs?.state || null,
        apolloStats: { sends, opens, clicks, replies },
        apolloLastActivity: c.contact_last_activity_date || null,
        apolloEmailStatus: c.email_status || null,
        apolloReplied: replies > 0 || state === "replied",
        lastApolloSyncAt: syncedAt,
      },
    };

    // 3. Transitions de status
    if ((replies > 0 || state === "replied") && existing.status !== "replied") {
      patch.status = "replied";
      patch.last_contacted_at = c.contact_last_activity_date || syncedAt;
      patch.converted = true; // stoppe le cron drip Resend (évite doublon)
      if (!wasReplied) {
        result.repliesDetected++;
        console.log(`[apollo-sync] 🔥 NEW REPLY ${email} (${c.organization_name || "?"})`);
      }
    }

    if ((state === "bounced" || c.email_status === "invalid") && existing.status !== "bounced") {
      patch.status = "bounced";
      result.bouncesDetected++;
    }

    if (state === "unsubscribed" && !existing.unsubscribed) {
      patch.unsubscribed = true;
    }

    // 4. Apply patch
    const patchRes = await fetch(
      `${supabaseUrl}/rest/v1/outreach_leads?id=eq.${existing.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(patch),
      }
    );

    if (!patchRes.ok) {
      result.errors.push(`patch ${email}: HTTP ${patchRes.status}`);
      continue;
    }

    result.leadsUpdated++;

    // 5. Event observability si reply nouveau
    if (patch.status === "replied" && !wasReplied) {
      try {
        const { emitOutreachEvent } = await import("@/lib/outreach/events");
        await emitOutreachEvent({
          at: syncedAt,
          client_id: null,
          orphan: true,
          strategy_version: "apollo-sync",
          strategy_assignment_mode: "native",
          attempt_id: null,
          kind: "REPLIED",
          provider: "apollo",
          provider_event_id: c.id,
          provider_event_type: "sequence.replied",
          actor: "cron-apollo-sync",
          ingest_mode: "live",
          payload: { apollo: c },
          derived: {
            to: email,
            subject: null,
            from: "contact@ghost-tax.com",
            orphan_reason: "apollo-sync",
          },
        });
      } catch (_) {
        /* fire-and-forget */
      }
    }
  }

  result.durationMs = Date.now() - start;

  console.log(
    `[apollo-sync] ${syncedAt} fetched=${result.contactsFetched} updated=${result.leadsUpdated} replies=${result.repliesDetected} bounces=${result.bouncesDetected} duration=${result.durationMs}ms`
  );

  return NextResponse.json(result);
}
