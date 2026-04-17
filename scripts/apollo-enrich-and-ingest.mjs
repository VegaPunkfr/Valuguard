/**
 * Script autonome — 17 avril 2026
 *
 * Objectif : transformer "0 emails exploitables" en "pipeline actif".
 *
 * Phase 1 — enrichit les 20 CFOs de prospects-apollo.json (emails vides)
 *            via Apollo people/match avec organization_name + first_name.
 * Phase 2 — cherche jusqu'à 30 nouveaux CFO/CIO DACH/UK/NL mid-market.
 * Phase 3 — ingère tout dans Supabase outreach_leads avec drip_step=0,
 *            status=new, pour que le cron drip les prenne en charge
 *            automatiquement (mardi-jeudi 9h30-11h30 local).
 *
 * Rate-limit conscient : max 60 credits Apollo utilisés.
 */

import { readFileSync, writeFileSync } from "node:fs";
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
const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!APOLLO_KEY) { console.error("APOLLO_API_KEY manquante"); process.exit(1); }
if (!SB_URL || !SB_KEY) { console.error("Supabase env vars manquantes"); process.exit(1); }

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apolloMatch({ firstName, lastName, organizationName, domain, titles }) {
  const body = {
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    organization_name: organizationName || undefined,
    domain: domain || undefined,
    reveal_personal_emails: false, // safer, évite consommer crédits avancés
  };
  const res = await fetch("https://api.apollo.io/api/v1/people/match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": APOLLO_KEY,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { rateLimited: true };
  if (!res.ok) {
    const t = await res.text().catch(() => "?");
    return { error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
  }
  const json = await res.json();
  return { person: json.person || null };
}

async function apolloSearch({ titles, countries, headcountMin, headcountMax, page = 1, perPage = 10 }) {
  const body = {
    person_titles: titles,
    person_locations: countries,
    organization_num_employees_ranges: [
      `${headcountMin},${headcountMax}`,
    ],
    page,
    per_page: perPage,
    contact_email_status: ["verified", "likely_to_engage"],
  };
  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": APOLLO_KEY,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { rateLimited: true };
  if (!res.ok) {
    const t = await res.text().catch(() => "?");
    return { error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
  }
  return await res.json();
}

async function sbInsert(table, rows) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  return { ok: res.ok, status: res.status, text: res.ok ? "" : await res.text() };
}

async function sbUpsert(table, rows, onConflict) {
  const url = `${SB_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  return { ok: res.ok, status: res.status, text: res.ok ? "" : await res.text() };
}

// ---------- PHASE 1 — enrich 20 existants ----------

console.log("=".repeat(70));
console.log("PHASE 1 — Enrichissement des 20 CFOs existants");
console.log("=".repeat(70));

const existing = JSON.parse(readFileSync(resolve(process.cwd(), "prospects-apollo.json"), "utf8"));
console.log(`  ${existing.length} prospects à enrichir.\n`);

const enriched = [];
const enrichErrors = [];
let creditsUsed = 0;
const MAX_CREDITS = 60;

for (let i = 0; i < existing.length && creditsUsed < MAX_CREDITS; i++) {
  const p = existing[i];
  const label = `[${String(i + 1).padStart(2, " ")}/${existing.length}] ${p.firstName} @ ${p.company}`;

  // Cas 1 : déjà un email → skip
  if (p.email && p.email.length > 3) {
    console.log(`${label} — déjà enrichi, skip`);
    enriched.push(p);
    continue;
  }

  const result = await apolloMatch({
    firstName: p.firstName,
    lastName: p.lastName || undefined,
    organizationName: p.company,
  });
  creditsUsed++;

  if (result.rateLimited) {
    console.log(`${label} — 429 rate limited, stop enrichment phase`);
    enriched.push(p);
    enrichErrors.push({ prospect: p, error: "rate_limited" });
    break;
  }
  if (result.error) {
    console.log(`${label} — erreur : ${result.error}`);
    enriched.push(p);
    enrichErrors.push({ prospect: p, error: result.error });
    continue;
  }
  if (!result.person) {
    console.log(`${label} — aucun match Apollo`);
    enriched.push(p);
    continue;
  }

  const person = result.person;
  const newEmail = person.email || "";
  const emailStatus = person.email_status || (newEmail ? "unknown" : "missing");
  const domain = person.organization?.primary_domain || person.organization?.website_url || "";
  const linkedin = person.linkedin_url || "";
  const lastName = person.last_name || p.lastName || "";
  const headcount = person.organization?.estimated_num_employees || 0;
  const industry = person.organization?.industry || "";
  const title = person.title || p.title;
  const city = person.city || "";
  const country = person.country || p.country;

  const entry = {
    ...p,
    firstName: person.first_name || p.firstName,
    lastName,
    title,
    email: newEmail,
    emailStatus,
    linkedin,
    company: person.organization?.name || p.company,
    domain: (domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    headcount,
    industry,
    country,
    city,
    apolloId: person.id || null,
    enrichedAt: new Date().toISOString(),
  };
  enriched.push(entry);

  console.log(`${label} — ${newEmail ? "✅ " + newEmail : "⚠️  match sans email"} (${emailStatus})`);
  await sleep(800); // gentle rate limit
}

// ajoute les prospects non-traités si coupé par rate limit
for (let i = enriched.length; i < existing.length; i++) enriched.push(existing[i]);

writeFileSync(
  resolve(process.cwd(), "prospects-apollo.json"),
  JSON.stringify(enriched, null, 2),
  "utf8"
);
console.log(`\n✅ prospects-apollo.json mis à jour. ${enriched.filter((e) => e.email).length}/${enriched.length} ont un email.`);
console.log(`Credits Apollo utilisés phase 1 : ${creditsUsed}`);

// ---------- PHASE 2 — search nouveaux CFOs DACH/UK/NL ----------

console.log("\n" + "=".repeat(70));
console.log("PHASE 2 — Recherche de nouveaux CFOs DACH / UK / NL");
console.log("=".repeat(70));

const markets = [
  { name: "DACH", countries: ["Germany", "Austria", "Switzerland"] },
  { name: "UK", countries: ["United Kingdom"] },
  { name: "NL", countries: ["Netherlands"] },
];

const targetTitles = [
  "CFO",
  "Chief Financial Officer",
  "Head of Finance",
  "Finance Director",
  "VP Finance",
];

const newProspects = [];
const REMAINING = Math.max(0, MAX_CREDITS - creditsUsed);
const PER_MARKET = Math.min(10, Math.floor(REMAINING / markets.length));

if (PER_MARKET === 0) {
  console.log(`  Credits restants=${REMAINING}, skip phase 2 pour éviter dépassement.`);
} else {
  for (const m of markets) {
    console.log(`\n  ${m.name} (${m.countries.join("/")}) — cherche ${PER_MARKET}`);
    const result = await apolloSearch({
      titles: targetTitles,
      countries: m.countries,
      headcountMin: 50,
      headcountMax: 500,
      perPage: PER_MARKET,
    });

    if (result.rateLimited) {
      console.log(`    429 rate limited`);
      break;
    }
    if (result.error) {
      console.log(`    erreur : ${result.error}`);
      continue;
    }

    const people = result.people || [];
    console.log(`    → ${people.length} prospects trouvés`);

    for (const person of people) {
      if (!person.email || person.email_status === "unavailable") continue;
      const domain = person.organization?.primary_domain || person.organization?.website_url || "";
      newProspects.push({
        firstName: person.first_name || "",
        lastName: person.last_name || "",
        title: person.title || "",
        email: person.email,
        emailStatus: person.email_status || "unknown",
        linkedin: person.linkedin_url || "",
        company: person.organization?.name || "",
        domain: (domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
        headcount: person.organization?.estimated_num_employees || 0,
        industry: person.organization?.industry || "",
        country: person.country || "",
        city: person.city || "",
        market: m.name,
        apolloId: person.id,
        enrichedAt: new Date().toISOString(),
      });
      creditsUsed++;
    }
    await sleep(1500);
  }
}

console.log(`\n✅ ${newProspects.length} nouveaux prospects ajoutés.`);
console.log(`Credits Apollo utilisés total : ${creditsUsed}`);

// ---------- PHASE 3 — ingest dans outreach_leads ----------

console.log("\n" + "=".repeat(70));
console.log("PHASE 3 — Ingestion dans Supabase outreach_leads");
console.log("=".repeat(70));

const allValidProspects = [
  ...enriched.filter((p) => p.email && p.email.includes("@")),
  ...newProspects,
];

if (allValidProspects.length === 0) {
  console.log("  Aucun prospect avec email valide à insérer.");
} else {
  const rows = allValidProspects.map((p) => {
    const countryMap = { DE: "DE", AT: "DE", CH: "DE", GB: "UK", UK: "UK", NL: "NL", US: "US" };
    const market = p.market || countryMap[p.country?.slice(0, 2)] || "UK";
    const locale = market === "DACH" || market === "DE" ? "de" : market === "NL" ? "nl" : "en";
    return {
      email: p.email.toLowerCase(),
      domain: p.domain || null,
      company: p.company || null,
      locale,
      geo_market: market,
      headcount: p.headcount || null,
      industry: p.industry || null,
      drip_step: 0,
      status: "new",
      unsubscribed: false,
      converted: false,
      next_send_at: new Date().toISOString(),
      meta: {
        firstName: p.firstName,
        lastName: p.lastName,
        title: p.title,
        linkedin: p.linkedin,
        apolloId: p.apolloId,
        sourcedVia: "apollo-enrich-17avril",
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // dedupe by email avant insert
  const seen = new Set();
  const deduped = rows.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  console.log(`  ${deduped.length} prospects uniques à upsert (dédup sur email).`);

  const chunks = [];
  for (let i = 0; i < deduped.length; i += 50) chunks.push(deduped.slice(i, i + 50));

  let inserted = 0;
  for (const chunk of chunks) {
    const res = await sbUpsert("outreach_leads", chunk, "email");
    if (res.ok) {
      inserted += chunk.length;
      console.log(`  ✅ chunk ${chunk.length} rows ok`);
    } else {
      console.log(`  ❌ erreur upsert : status=${res.status} ${res.text.slice(0, 250)}`);
    }
  }

  console.log(`\n✅ ${inserted}/${deduped.length} prospects dans outreach_leads.`);
}

// ---------- SUMMARY ----------

console.log("\n" + "=".repeat(70));
console.log("RÉSUMÉ EXÉCUTION");
console.log("=".repeat(70));
console.log(`  Phase 1 enrichissement  : ${enriched.filter((e) => e.email).length}/${existing.length} emails récupérés`);
console.log(`  Phase 2 nouveaux        : ${newProspects.length} prospects ajoutés`);
console.log(`  Phase 3 ingestion       : ${allValidProspects.length} candidats, dédupés`);
console.log(`  Credits Apollo utilisés : ${creditsUsed}`);
console.log(`  Erreurs enrichissement  : ${enrichErrors.length}`);
console.log(``);
console.log(`Prochain cron drip (mar/mer/jeu 9h30 local) va ramasser ces leads`);
console.log(`et envoyer Touch 1 aux prospects avec next_send_at <= now.`);
console.log("=".repeat(70));
