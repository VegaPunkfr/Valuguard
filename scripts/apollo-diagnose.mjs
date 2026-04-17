/**
 * Diagnostic Apollo Basic — comprendre pourquoi 0 emails retournés
 * en Phase 1 enrichissement du 17 avril 2026.
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

// --- 1. User profile : quel plan ---
console.log("=".repeat(70));
console.log("1. PROFIL APOLLO (plan, credits restants)");
console.log("=".repeat(70));

const profileRes = await fetch("https://api.apollo.io/api/v1/auth/health", {
  method: "GET",
  headers: { "X-Api-Key": APOLLO_KEY, "Content-Type": "application/json" },
});
console.log(`HTTP ${profileRes.status}`);
console.log(JSON.stringify(await profileRes.json(), null, 2).slice(0, 500));

// --- 2. Users/me pour voir plan et credits ---
console.log("\n" + "=".repeat(70));
console.log("2. /users/me — détails compte");
console.log("=".repeat(70));

const meRes = await fetch("https://api.apollo.io/api/v1/auth/get_users_me", {
  method: "POST",
  headers: { "X-Api-Key": APOLLO_KEY, "Content-Type": "application/json" },
});
console.log(`HTTP ${meRes.status}`);
const meJson = await meRes.json().catch(() => ({}));
console.log(JSON.stringify(meJson, null, 2).slice(0, 1200));

// --- 3. People match avec reveal_personal_emails: true pour 1 prospect connu ---
console.log("\n" + "=".repeat(70));
console.log("3. /people/match — test avec reveal_personal_emails:true");
console.log("=".repeat(70));

const testPerson = {
  first_name: "Martin",
  organization_name: "Rodday Wundmanagement GmbH",
  reveal_personal_emails: true,
};

const matchRes = await fetch("https://api.apollo.io/api/v1/people/match", {
  method: "POST",
  headers: {
    "X-Api-Key": APOLLO_KEY,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  },
  body: JSON.stringify(testPerson),
});
console.log(`HTTP ${matchRes.status}`);
const matchJson = await matchRes.json().catch(() => ({}));
console.log(JSON.stringify(matchJson, null, 2).slice(0, 2500));

// --- 4. mixed_people/api_search (nouveau endpoint) ---
console.log("\n" + "=".repeat(70));
console.log("4. /mixed_people/api_search — nouveau endpoint (test 1 DACH CFO)");
console.log("=".repeat(70));

const searchRes = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
  method: "POST",
  headers: {
    "X-Api-Key": APOLLO_KEY,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  },
  body: JSON.stringify({
    person_titles: ["CFO", "Chief Financial Officer"],
    person_locations: ["Germany"],
    organization_num_employees_ranges: ["50,500"],
    page: 1,
    per_page: 3,
  }),
});
console.log(`HTTP ${searchRes.status}`);
const searchJson = await searchRes.json().catch(() => ({}));
console.log(`Total results: ${searchJson.pagination?.total_entries ?? "?"}`);
console.log(`Returned: ${searchJson.people?.length ?? 0}`);
if (searchJson.people?.length) {
  const p = searchJson.people[0];
  console.log("Premier résultat :");
  console.log(
    JSON.stringify(
      {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        title: p.title,
        email: p.email,
        email_status: p.email_status,
        organization: p.organization?.name,
        domain: p.organization?.primary_domain,
      },
      null,
      2
    )
  );
} else {
  console.log(JSON.stringify(searchJson, null, 2).slice(0, 600));
}
