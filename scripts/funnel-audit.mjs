/**
 * Audit funnel complet Ghost Tax — 17 avril 2026 (soir)
 *
 * Répond aux 4 questions qu'Edith ne connaît pas :
 *  1. Taux de conversion scan → Pack ?
 *  2. Combien de ventes Rail A réelles ?
 *  3. Combien de scans lancés total ?
 *  4. Pricing DACH 590€ appliqué en prod ?
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

console.log("=".repeat(72));
console.log("AUDIT FUNNEL GHOST TAX — état réel des ventes");
console.log("=".repeat(72));

// ─── 1. Scans lancés ───
console.log("\n1. SCANS GRATUITS LANCÉS (/intel)\n");
const tables_scans = [
  "audit_requests",
  "intel_scans",
  "scans",
  "scan_requests",
  "intel_runs",
];
let scanTable = null;
let scanCount = 0;
for (const t of tables_scans) {
  const r = await sb(`${t}?select=id&limit=1`);
  if (r.status === 200 || r.status === 206) {
    console.log(`  ✅ Table "${t}" existe — ${r.count} rows`);
    if (!scanTable) { scanTable = t; scanCount = parseInt(r.count) || 0; }
  } else if (r.status === 404 || (r.body?.code === "42P01")) {
    console.log(`  ⬜ ${t} n'existe pas`);
  } else {
    console.log(`  ❌ ${t} status=${r.status}`);
  }
}

// ─── 2. Paiements Stripe (Rail A) ───
console.log("\n2. VENTES RAIL A (paiements Stripe)\n");
if (scanTable === "audit_requests") {
  const paid = await sb(`audit_requests?select=id,status,email,geo,price_eur,created_at&status=in.(paid,processing,report_persisted,delivered,followup_scheduled)&order=created_at.desc&limit=50`);
  if (paid.status === 200 || paid.status === 206) {
    const rows = Array.isArray(paid.body) ? paid.body : [];
    console.log(`  Total paiements trouvés : ${paid.count}`);
    console.log(`  Détail des ${rows.length} plus récents :\n`);
    for (const p of rows.slice(0, 20)) {
      console.log(`    ${(p.created_at || "?").slice(0, 10)}  ${(p.status || "").padEnd(20)}  ${(p.email || "?").padEnd(35)}  ${p.geo || "?"}  ${p.price_eur || "?"}€`);
    }

    // Breakdown par geo
    const byGeo = {};
    const byStatus = {};
    const priceSums = {};
    for (const p of rows) {
      const geo = p.geo || "unknown";
      const status = p.status || "?";
      byGeo[geo] = (byGeo[geo] || 0) + 1;
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (p.price_eur) priceSums[geo] = (priceSums[geo] || 0) + (parseFloat(p.price_eur) || 0);
    }
    console.log(`\n  Breakdown par geo : ${JSON.stringify(byGeo)}`);
    console.log(`  Breakdown par status : ${JSON.stringify(byStatus)}`);
    console.log(`  Revenue par geo (€) : ${JSON.stringify(priceSums)}`);

    // Analyse prix : DACH 590€ vs autre 490€ ?
    const dachPrices = rows.filter(r => r.geo === "DE" || r.geo === "AT" || r.geo === "CH").map(r => r.price_eur);
    const otherPrices = rows.filter(r => r.geo && !["DE", "AT", "CH"].includes(r.geo)).map(r => r.price_eur);
    if (dachPrices.length) console.log(`  Prix DACH observés : ${dachPrices.join(", ")}`);
    if (otherPrices.length) console.log(`  Prix autres marchés : ${otherPrices.join(", ")}`);
  } else {
    console.log(`  Erreur status ${paid.status}`);
  }

  // Scans sans paiement = dropouts
  const all = await sb(`audit_requests?select=status`);
  const allRows = Array.isArray(all.body) ? all.body : [];
  const paidStatuses = new Set(["paid", "processing", "report_persisted", "delivered", "followup_scheduled"]);
  const paidCount = allRows.filter(r => paidStatuses.has(r.status)).length;
  const pendingCount = allRows.filter(r => r.status === "pending" || r.status === "scan_completed" || r.status === "quote_sent" || r.status === "intel").length;
  const droppedCount = allRows.length - paidCount - pendingCount;
  console.log(`\n  TOTAL audit_requests : ${allRows.length}`);
  console.log(`    Paid / en cours : ${paidCount}`);
  console.log(`    En attente/scan seul : ${pendingCount}`);
  console.log(`    Dropped/autres : ${droppedCount}`);

  // Conversion rate
  if (allRows.length > 0) {
    const convRate = ((paidCount / allRows.length) * 100).toFixed(1);
    console.log(`\n  ⭐ TAUX CONVERSION SCAN → PACK : ${convRate}%`);
  }
}

// ─── 3. Revenue total ───
console.log("\n3. REVENUE TOTAL\n");
const paidFull = await sb(`audit_requests?select=price_eur,geo&status=in.(paid,processing,report_persisted,delivered,followup_scheduled)&limit=1000`);
if (paidFull.status === 200 || paidFull.status === 206) {
  const rows = Array.isArray(paidFull.body) ? paidFull.body : [];
  const total = rows.reduce((s, r) => s + (parseFloat(r.price_eur) || 0), 0);
  console.log(`  ${rows.length} clients payants → €${total.toFixed(2)} total`);
}

// ─── 4. Intelligence scans ───
console.log("\n4. INTELLIGENCE PIPELINE RUNS\n");
const intel = await sb(`intel_runs?select=id,status&limit=1`);
if (intel.status === 200 || intel.status === 206) {
  console.log(`  intel_runs : ${intel.count} runs`);
}

// ─── 5. Checkout sessions (abandons) ───
console.log("\n5. CHECKOUT SESSIONS (abandons potentiels)\n");
const tables_checkout = ["checkout_sessions", "stripe_sessions", "recovery_sessions"];
for (const t of tables_checkout) {
  const r = await sb(`${t}?select=id&limit=1`);
  if (r.status === 200 || r.status === 206) {
    console.log(`  ✅ ${t} existe — ${r.count} rows`);
  }
}

// ─── 6. Visiteurs landing ───
console.log("\n6. VISITEURS / ANALYTICS\n");
const tables_viz = ["page_views", "visitor_intel", "landing_sessions", "sessions"];
for (const t of tables_viz) {
  const r = await sb(`${t}?select=id&limit=1`);
  if (r.status === 200 || r.status === 206) {
    console.log(`  ✅ ${t} existe — ${r.count} rows`);
  }
}

// ─── 7. Outreach events breakdown par kind ───
console.log("\n7. EMAIL ACTIVITY (outreach_events)\n");
const events = await sb(`outreach_events?select=kind&limit=5000`);
if (events.status === 200 || events.status === 206 || events.status === 206) {
  const rows = Array.isArray(events.body) ? events.body : [];
  const byKind = {};
  for (const e of rows) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  console.log(`  Total events : ${rows.length}`);
  console.log(`  Par kind : ${JSON.stringify(byKind)}`);
}

console.log("\n" + "=".repeat(72));
console.log("VERDICT");
console.log("=".repeat(72));
