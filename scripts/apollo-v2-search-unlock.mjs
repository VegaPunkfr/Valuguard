/**
 * Apollo v2 — endpoint api_search + unlock via match par ID
 *
 * Stratégie ajustée après diagnostic :
 * - /mixed_people/api_search retourne preview avec last_name/email masqués
 * - /people/match avec id → débloque email (consomme 1 credit)
 * - On cherche des CFO DACH/UK/NL avec contact_email_status=verified
 * - On unlock max 30 contacts (budget credit safe)
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_UNLOCK = 30;

async function apolloSearch(params) {
  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
    method: "POST",
    headers: { "X-Api-Key": APOLLO_KEY, "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify(params),
  });
  if (res.status === 429) return { rateLimited: true };
  if (!res.ok) return { error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  return await res.json();
}

async function apolloUnlock(id) {
  const res = await fetch("https://api.apollo.io/api/v1/people/match", {
    method: "POST",
    headers: { "X-Api-Key": APOLLO_KEY, "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify({
      id,
      reveal_personal_emails: true,
      reveal_phone_number: false,
    }),
  });
  if (res.status === 429) return { rateLimited: true };
  if (!res.ok) return { error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  return await res.json();
}

async function sbUpsert(rows) {
  const res = await fetch(`${SB_URL}/rest/v1/outreach_leads?on_conflict=email`, {
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

// ---------- Phase 1 : Search candidats DACH/UK/NL ----------
console.log("=".repeat(70));
console.log("PHASE 1 — Search candidats DACH / UK / NL");
console.log("=".repeat(70));

const markets = [
  { name: "DACH", countries: ["Germany", "Austria", "Switzerland"], locale: "de", geo: "DE" },
  { name: "UK", countries: ["United Kingdom"], locale: "en", geo: "UK" },
  { name: "NL", countries: ["Netherlands"], locale: "nl", geo: "NL" },
];

const titles = [
  "CFO",
  "Chief Financial Officer",
  "Head of Finance",
  "Finance Director",
  "VP Finance",
  "Director of Finance",
];

const candidates = [];
for (const m of markets) {
  console.log(`\n  ${m.name} (${m.countries.join(", ")}) — search 10 CFOs`);
  const result = await apolloSearch({
    person_titles: titles,
    person_locations: m.countries,
    organization_num_employees_ranges: ["50,500"],
    contact_email_status: ["verified", "likely_to_engage"],
    page: 1,
    per_page: 10,
  });
  if (result.rateLimited) {
    console.log(`    429 rate limited, stop`);
    break;
  }
  if (result.error) {
    console.log(`    erreur : ${result.error}`);
    continue;
  }
  const people = result.people || [];
  console.log(`    → ${people.length} candidats (sur ${result.pagination?.total_entries ?? "?"} totaux)`);
  for (const p of people) {
    candidates.push({
      id: p.id,
      firstName: p.first_name,
      previewName: p.name,
      title: p.title,
      organization: p.organization?.name,
      domain: p.organization?.primary_domain,
      country: p.country,
      city: p.city,
      headcount: p.organization?.estimated_num_employees,
      industry: p.organization?.industry,
      market: m.name,
      locale: m.locale,
      geoMarket: m.geo,
    });
  }
  await sleep(1500);
}

console.log(`\n✅ ${candidates.length} candidats trouvés (emails encore masqués).`);

// ---------- Phase 2 : Unlock emails ----------
console.log("\n" + "=".repeat(70));
console.log(`PHASE 2 — Unlock emails (max ${MAX_UNLOCK} contacts)`);
console.log("=".repeat(70));

const toUnlock = candidates.slice(0, MAX_UNLOCK);
const unlocked = [];
let credits = 0;
let noEmail = 0;

for (let i = 0; i < toUnlock.length; i++) {
  const c = toUnlock[i];
  const label = `[${String(i + 1).padStart(2, " ")}/${toUnlock.length}] ${c.firstName} — ${c.organization}`;

  const result = await apolloUnlock(c.id);
  credits++;

  if (result.rateLimited) {
    console.log(`${label} — 429 rate limited, stop`);
    break;
  }
  if (result.error) {
    console.log(`${label} — erreur : ${result.error}`);
    continue;
  }

  const person = result.person;
  if (!person) {
    console.log(`${label} — match vide`);
    continue;
  }

  const email = person.email && person.email !== "email_not_unlocked@domain.com"
    ? person.email
    : person.personal_emails?.[0] || null;

  if (!email) {
    console.log(`${label} — unlock ok mais email absent de la base Apollo`);
    noEmail++;
    continue;
  }

  const lastName = person.last_name || "";
  const domain = person.organization?.primary_domain || c.domain || "";
  const linkedin = person.linkedin_url || "";

  unlocked.push({
    ...c,
    firstName: person.first_name || c.firstName,
    lastName,
    fullName: `${person.first_name || ""} ${lastName}`.trim(),
    title: person.title || c.title,
    email,
    emailStatus: person.email_status || "unknown",
    linkedin,
    domain: domain.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    apolloId: person.id,
    enrichedAt: new Date().toISOString(),
  });

  console.log(`${label} — ✅ ${email}`);
  await sleep(900);
}

console.log(`\n✅ ${unlocked.length} emails récupérés. ${noEmail} contacts sans email dans la base.`);
console.log(`Credits Apollo consommés : ${credits}`);

// ---------- Phase 3 : Ingest outreach_leads ----------
console.log("\n" + "=".repeat(70));
console.log("PHASE 3 — Ingest dans Supabase outreach_leads");
console.log("=".repeat(70));

if (unlocked.length === 0) {
  console.log("  Aucun contact unlocked — phase 3 skippée.");
} else {
  const now = new Date().toISOString();
  const rows = unlocked.map((u) => ({
    email: u.email.toLowerCase(),
    domain: u.domain || null,
    company: u.organization || null,
    locale: u.locale,
    geo_market: u.geoMarket,
    headcount: u.headcount || null,
    industry: u.industry || null,
    drip_step: 0,
    status: "new",
    unsubscribed: false,
    converted: false,
    next_send_at: now,
    meta: {
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: u.fullName,
      title: u.title,
      linkedin: u.linkedin,
      city: u.city,
      apolloId: u.apolloId,
      sourcedVia: "apollo-v2-search-unlock-17avril",
      market: u.market,
    },
    created_at: now,
    updated_at: now,
  }));

  // dedupe
  const seen = new Set();
  const deduped = rows.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
  console.log(`  ${deduped.length} prospects uniques à upsert.`);

  const chunks = [];
  for (let i = 0; i < deduped.length; i += 50) chunks.push(deduped.slice(i, i + 50));

  let inserted = 0;
  for (const chunk of chunks) {
    const res = await sbUpsert(chunk);
    if (res.ok) {
      inserted += chunk.length;
      console.log(`  ✅ chunk ${chunk.length} rows ok`);
    } else {
      console.log(`  ❌ erreur upsert : status=${res.status} — ${res.text.slice(0, 300)}`);
    }
  }

  console.log(`\n✅ ${inserted}/${deduped.length} prospects dans outreach_leads.`);
}

// ---------- Dump JSON backup ----------
writeFileSync(
  resolve(process.cwd(), "prospects-apollo-v2.json"),
  JSON.stringify(unlocked, null, 2),
  "utf8"
);
console.log(`\n📄 Backup JSON : prospects-apollo-v2.json`);

// ---------- Summary ----------
console.log("\n" + "=".repeat(70));
console.log("RÉSUMÉ");
console.log("=".repeat(70));
console.log(`  Candidats trouvés        : ${candidates.length}`);
console.log(`  Emails unlocked          : ${unlocked.length}`);
console.log(`  Contacts sans email      : ${noEmail}`);
console.log(`  Credits Apollo utilisés  : ${credits}`);
console.log(`  Prospects insérés en DB  : ${unlocked.length}`);
console.log(``);
console.log(`Prochain cron drip (mar/mer/jeu 9h30 local) va ramasser ces leads`);
console.log(`et envoyer Touch 1 automatiquement.`);
console.log("=".repeat(70));
