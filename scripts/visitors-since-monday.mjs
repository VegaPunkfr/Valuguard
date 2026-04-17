/**
 * Audit visiteurs + clients depuis lundi 13 avril 2026
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
const envRaw = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envRaw
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    })
);

const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      Prefer: "count=exact",
    },
  });
  const count = res.headers.get("content-range")?.split("/")[1] || "?";
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, count, body };
}

// Lundi 13 avril 2026 00:00 UTC
const monday = "2026-04-13T00:00:00Z";

console.log("=".repeat(72));
console.log("VISITEURS + CLIENTS depuis lundi 13 avril 2026");
console.log("=".repeat(72));
console.log(`Période : du ${monday} à maintenant (${new Date().toISOString()})`);
console.log("");

// 1. Clients Rail A payants
console.log("1. CLIENTS RAIL A (audit_requests payés)");
const paid = await sb(
  `audit_requests?select=id,status,email,geo,price_eur,created_at,domain&created_at=gte.${monday}&status=in.(paid,processing,report_persisted,delivered,followup_scheduled)&order=created_at.desc`
);
if (paid.status === 200 || paid.status === 206) {
  const rows = Array.isArray(paid.body) ? paid.body : [];
  console.log(`   → ${paid.count} clients payants depuis lundi`);
  for (const r of rows) {
    console.log(`     ${r.created_at?.slice(0, 16)}  ${r.email?.padEnd(35) || "?"}  ${r.geo || "?"}  ${r.price_eur || "?"}€  ${r.status}`);
  }
} else {
  console.log(`   Erreur status ${paid.status}`);
}

console.log("");

// 2. Scans lancés (n'importe quel status)
console.log("2. SCANS LANCÉS (/intel — toute origine)");
const scans = await sb(
  `audit_requests?select=id,status,email,created_at&created_at=gte.${monday}&order=created_at.desc`
);
if (scans.status === 200 || scans.status === 206) {
  const rows = Array.isArray(scans.body) ? scans.body : [];
  console.log(`   → ${scans.count} scans toutes origines depuis lundi`);
  const byStatus = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log(`   Par status : ${JSON.stringify(byStatus)}`);
}

console.log("");

// 3. Emails envoyés depuis lundi
console.log("3. EMAILS ENVOYÉS (outreach_events SEND_SUCCESS)");
const sends = await sb(
  `outreach_events?select=kind,at&kind=eq.SEND_SUCCESS&at=gte.${monday}`
);
if (sends.status === 200 || sends.status === 206) {
  console.log(`   → ${sends.count} emails partis depuis lundi`);
}

console.log("");

// 4. Events Apollo
console.log("4. EVENTS APOLLO (sync quotidien)");
const apollo = await sb(
  `outreach_events?select=kind,at,actor&actor=eq.cron-apollo-sync&at=gte.${monday}`
);
if (apollo.status === 200 || apollo.status === 206) {
  console.log(`   → ${apollo.count} events sync Apollo depuis lundi`);
}

console.log("");

// 5. Replies détectés
console.log("5. REPLIES DÉTECTÉS");
const replies = await sb(
  `outreach_events?select=kind,at,derived&kind=eq.REPLIED&at=gte.${monday}`
);
if (replies.status === 200 || replies.status === 206) {
  console.log(`   → ${replies.count} replies depuis lundi`);
  if (Array.isArray(replies.body)) {
    for (const r of replies.body) {
      console.log(`     ${r.at?.slice(0, 16)}  ${r.derived?.to || "?"}`);
    }
  }
}

console.log("");

// 6. Visitor intel / analytics
console.log("6. VISITOR INTEL (pages views si tracké)");
const tables_visit = ["visitor_intel", "page_views", "analytics_events", "web_sessions"];
for (const t of tables_visit) {
  const r = await sb(`${t}?select=id&limit=1`);
  if (r.status === 200 || r.status === 206) {
    const r2 = await sb(`${t}?select=id&created_at=gte.${monday}`);
    console.log(`   ✅ ${t} : ${r2.count || "?"} events depuis lundi`);
  }
}

console.log("");

// 7. Stripe checkout sessions (abandons potentiels)
console.log("7. CHECKOUT SESSIONS Stripe (créés même si pas payés)");
const tables_co = ["checkout_sessions", "stripe_sessions", "checkout_events", "abandoned_checkouts"];
for (const t of tables_co) {
  const r = await sb(`${t}?select=id&limit=1`);
  if (r.status === 200 || r.status === 206) {
    const r2 = await sb(`${t}?select=id&created_at=gte.${monday}`);
    console.log(`   ✅ ${t} : ${r2.count || "?"} sessions depuis lundi`);
  }
}

console.log("");

// 8. All outreach_events breakdown depuis lundi
console.log("8. BREAKDOWN COMPLET outreach_events depuis lundi");
const events = await sb(
  `outreach_events?select=kind,actor,at&at=gte.${monday}&order=at.desc&limit=2000`
);
if (events.status === 200 || events.status === 206) {
  const rows = Array.isArray(events.body) ? events.body : [];
  console.log(`   Total : ${rows.length}`);
  const byKind = {};
  const byActor = {};
  for (const e of rows) {
    byKind[e.kind] = (byKind[e.kind] || 0) + 1;
    byActor[e.actor || "?"] = (byActor[e.actor || "?"] || 0) + 1;
  }
  console.log(`   Par kind : ${JSON.stringify(byKind)}`);
  console.log(`   Par actor : ${JSON.stringify(byActor)}`);
}

console.log("");
console.log("=".repeat(72));
console.log("RÉSUMÉ");
console.log("=".repeat(72));
