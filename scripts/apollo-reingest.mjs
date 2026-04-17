/**
 * Ré-ingestion depuis prospects-apollo-v2.json vers outreach_leads
 * après diagnostic schema : column s'appelle "metadata" (pas "meta").
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

const backup = JSON.parse(
  readFileSync(resolve(process.cwd(), "prospects-apollo-v2.json"), "utf8")
);

console.log(`Chargement de ${backup.length} contacts unlocked.`);

const now = new Date().toISOString();
const rows = backup.map((u) => ({
  email: u.email.toLowerCase(),
  domain: u.domain || null,
  company: u.organization || null,
  company_name: u.organization || null, // legacy col
  locale: u.locale || "en",
  geo_market: u.geoMarket || u.market || "UK",
  headcount: u.headcount || null,
  industry: u.industry || null,
  drip_step: 0,
  status: "new",
  unsubscribed: false,
  converted: false,
  next_send_at: now,
  source: "apollo-v2-17avril",
  email_quality: u.emailStatus || "verified",
  metadata: {
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: u.fullName,
    title: u.title,
    linkedin: u.linkedin,
    city: u.city,
    apolloId: u.apolloId,
    sourcedVia: "apollo-v2-search-unlock-17avril",
    market: u.market,
    enrichedAt: u.enrichedAt,
  },
  created_at: now,
}));

// dedupe
const seen = new Set();
const deduped = rows.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
console.log(`${deduped.length} uniques après dédup.`);

const chunks = [];
for (let i = 0; i < deduped.length; i += 25) chunks.push(deduped.slice(i, i + 25));

let inserted = 0;
let failed = 0;

for (const [idx, chunk] of chunks.entries()) {
  const res = await fetch(`${SB_URL}/rest/v1/outreach_leads?on_conflict=email`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(chunk),
  });

  if (res.ok) {
    inserted += chunk.length;
    console.log(`✅ chunk ${idx + 1}/${chunks.length} — ${chunk.length} rows ok`);
  } else {
    failed += chunk.length;
    const err = await res.text();
    console.log(`❌ chunk ${idx + 1}/${chunks.length} — status=${res.status}\n   ${err.slice(0, 400)}`);
  }
}

console.log(`\n═══ TOTAL ═══`);
console.log(`  Inserted : ${inserted}/${deduped.length}`);
console.log(`  Failed   : ${failed}`);

// Vérifier ce qu'on voit maintenant
console.log(`\nVérification via query :`);
const verifyRes = await fetch(
  `${SB_URL}/rest/v1/outreach_leads?select=email,geo_market,status,drip_step,next_send_at,company&source=eq.apollo-v2-17avril&order=created_at.desc&limit=35`,
  {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
  }
);
const verifyData = await verifyRes.json();
console.log(`${verifyData.length} leads Apollo v2 visibles :`);
const byMarket = {};
for (const l of verifyData) {
  byMarket[l.geo_market] = (byMarket[l.geo_market] || 0) + 1;
}
console.log(`Par marché : ${JSON.stringify(byMarket)}`);
