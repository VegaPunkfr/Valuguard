/**
 * Audit Apollo existant — ne consomme AUCUN credit unlock.
 * Liste les contacts déjà dans la base perso + credits restants.
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

const APOLLO_KEY = env.APOLLO_API_KEY;

console.log("=".repeat(70));
console.log("1. Contacts ALREADY in Apollo database (sa base perso)");
console.log("=".repeat(70));

// /contacts/search liste les contacts sauvegardés (ceux dont elle a payé l'unlock)
const res1 = await fetch("https://api.apollo.io/api/v1/contacts/search", {
  method: "POST",
  headers: { "X-Api-Key": APOLLO_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    per_page: 100,
    page: 1,
    sort_ascending: false,
    sort_by_field: "contact_last_activity_date",
  }),
});

if (!res1.ok) {
  console.log(`  HTTP ${res1.status}: ${(await res1.text()).slice(0, 200)}`);
} else {
  const data = await res1.json();
  const total = data.pagination?.total_entries ?? data.contacts?.length ?? 0;
  const contacts = data.contacts || [];
  console.log(`  ${total} contacts total dans la base Apollo perso.`);
  console.log(`  (${contacts.length} affichés, page 1/page_size=100)\n`);

  const byCountry = {};
  const byStatus = {};
  const byTitle = {};
  const withEmail = [];

  for (const c of contacts) {
    const country = c.country || c.present_raw_address?.split(",").pop()?.trim() || "?";
    byCountry[country] = (byCountry[country] || 0) + 1;
    const status = c.email_status || "?";
    byStatus[status] = (byStatus[status] || 0) + 1;
    const title = (c.title || "").toLowerCase();
    if (title.includes("cfo") || title.includes("chief financial") || title.includes("finance")) {
      byTitle["CFO/Finance"] = (byTitle["CFO/Finance"] || 0) + 1;
    } else if (title.includes("ceo") || title.includes("cto")) {
      byTitle["CEO/CTO"] = (byTitle["CEO/CTO"] || 0) + 1;
    } else {
      byTitle[c.title || "?"] = (byTitle[c.title || "?"] || 0) + 1;
    }
    if (c.email && c.email.includes("@")) {
      withEmail.push({
        email: c.email,
        name: `${c.first_name || ""} ${c.last_name || ""}`.trim(),
        title: c.title,
        org: c.organization?.name || c.account?.name,
        domain: c.organization?.primary_domain || c.account?.domain,
        country,
        emailStatus: c.email_status,
        lastActivity: c.contact_last_activity_date,
      });
    }
  }

  console.log(`📊 Breakdown :`);
  console.log(`  Avec email valide : ${withEmail.length}`);
  console.log(`  Par pays : ${JSON.stringify(byCountry).slice(0, 300)}`);
  console.log(`  Par email_status : ${JSON.stringify(byStatus).slice(0, 300)}`);
  console.log(``);

  // Filter par marché cible
  const dachContacts = withEmail.filter(c => ["Germany", "Austria", "Switzerland", "DE", "AT", "CH"].includes(c.country));
  const ukContacts = withEmail.filter(c => ["United Kingdom", "UK", "GB"].includes(c.country));
  const nlContacts = withEmail.filter(c => ["Netherlands", "NL"].includes(c.country));
  const usContacts = withEmail.filter(c => ["United States", "US", "USA"].includes(c.country));

  console.log(`🎯 Marchés cibles (CFO/Finance avec email) :`);
  console.log(`  DACH : ${dachContacts.filter(c => (c.title || "").toLowerCase().includes("finan") || (c.title || "").toLowerCase().includes("cfo")).length}`);
  console.log(`  UK   : ${ukContacts.filter(c => (c.title || "").toLowerCase().includes("finan") || (c.title || "").toLowerCase().includes("cfo")).length}`);
  console.log(`  NL   : ${nlContacts.filter(c => (c.title || "").toLowerCase().includes("finan") || (c.title || "").toLowerCase().includes("cfo")).length}`);
  console.log(`  US   : ${usContacts.filter(c => (c.title || "").toLowerCase().includes("finan") || (c.title || "").toLowerCase().includes("cfo")).length}`);

  console.log(`\n📋 10 premiers contacts avec email :\n`);
  for (const c of withEmail.slice(0, 10)) {
    console.log(`  ${c.email.padEnd(40)} | ${(c.title || "?").slice(0, 30).padEnd(30)} | ${(c.org || "?").slice(0, 25).padEnd(25)} | ${c.country}`);
  }
}

console.log("\n" + "=".repeat(70));
console.log("2. Sequences / Campaigns Apollo existants");
console.log("=".repeat(70));

const res2 = await fetch("https://api.apollo.io/api/v1/emailer_campaigns/search", {
  method: "POST",
  headers: { "X-Api-Key": APOLLO_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ per_page: 20, page: 1 }),
});

if (!res2.ok) {
  console.log(`  HTTP ${res2.status}: ${(await res2.text()).slice(0, 200)}`);
} else {
  const data = await res2.json();
  const campaigns = data.emailer_campaigns || [];
  console.log(`  ${campaigns.length} campagnes existent.\n`);
  for (const c of campaigns) {
    console.log(`  ${(c.name || "?").slice(0, 40).padEnd(40)} | status=${c.active ? "active" : "paused"} | sent=${c.num_stepsends || 0}`);
  }
}

console.log("\n" + "=".repeat(70));
console.log("3. Try to estimate credits remaining");
console.log("=".repeat(70));

// Apollo renvoie parfois rate-limit headers avec quota
const testRes = await fetch("https://api.apollo.io/api/v1/auth/health", {
  method: "GET",
  headers: { "X-Api-Key": APOLLO_KEY },
});
console.log(`  Rate-limit headers :`);
for (const [k, v] of testRes.headers.entries()) {
  if (k.toLowerCase().includes("rate") || k.toLowerCase().includes("limit") || k.toLowerCase().includes("credit") || k.toLowerCase().includes("remaining")) {
    console.log(`    ${k}: ${v}`);
  }
}

// /usage_stats endpoint si dispo
const res3 = await fetch("https://api.apollo.io/api/v1/usage_stats/api_usage_stats", {
  method: "GET",
  headers: { "X-Api-Key": APOLLO_KEY },
});
console.log(`\n  /usage_stats status: ${res3.status}`);
if (res3.ok) {
  const data = await res3.json().catch(() => ({}));
  console.log(JSON.stringify(data, null, 2).slice(0, 1500));
}

console.log("\n" + "=".repeat(70));
console.log("CONCLUSION");
console.log("=".repeat(70));
console.log("Si la base perso Apollo contient déjà >20 CFOs avec email dans DACH/UK/NL :");
console.log("  → Pas besoin de unlock, on peut ingérer directement dans outreach_leads.");
console.log("Si <20 :");
console.log("  → Lancer apollo-v2-search-unlock.mjs pour compléter via search+unlock.");
