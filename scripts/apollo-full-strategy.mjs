/**
 * Apollo Full Strategy — exploitation 100% API disponible
 *
 * Chaîne :
 *  Phase A — Créer les 30 prospects dans CRM Apollo (/contacts + /accounts)
 *  Phase B — Enrichir les 30 companies (/organizations/enrich)
 *            → tech stack + revenue + funding + headcount réel
 *  Phase C — Détecter signaux intent (/organizations/job_postings)
 *            → qui recrute FinOps/Finance = signal buying
 *  Phase D — Construire un rapport intelligence augmenté (JSON)
 *
 * Budget credits : 30 contacts (0 credit) + 30 enrich (~30 credits)
 *                + 30 job postings (~0-30 credits selon plan)
 *                = 30 à 60 credits supplémentaires
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

async function apolloPost(path, body) {
  const res = await fetch(`https://api.apollo.io/api/v1${path}`, {
    method: "POST",
    headers: {
      "X-Api-Key": APOLLO_KEY,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { rateLimited: true };
  if (!res.ok) return { error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
  return await res.json();
}

async function apolloGet(path) {
  const res = await fetch(`https://api.apollo.io/api/v1${path}`, {
    headers: { "X-Api-Key": APOLLO_KEY },
  });
  if (res.status === 429) return { rateLimited: true };
  if (!res.ok) return { error: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
  return await res.json();
}

// Charger les 30 prospects unlocked
const backup = JSON.parse(
  readFileSync(resolve(process.cwd(), "prospects-apollo-v2.json"), "utf8")
);
console.log(`📥 ${backup.length} prospects unlocked chargés.`);

const intelligenceReport = [];
let credits = 0;

// ════════════════════════════════════════════════════════
// PHASE A — Créer les 30 contacts dans Apollo CRM
// ════════════════════════════════════════════════════════
console.log("\n" + "=".repeat(70));
console.log("PHASE A — Création contacts Apollo CRM (pas de credit)");
console.log("=".repeat(70));

let contactsCreated = 0;
for (let i = 0; i < backup.length; i++) {
  const p = backup[i];
  const label = `[${String(i + 1).padStart(2, " ")}/${backup.length}] ${p.fullName || p.firstName}`;

  const result = await apolloPost("/contacts", {
    first_name: p.firstName,
    last_name: p.lastName || "",
    email: p.email,
    title: p.title,
    organization_name: p.organization,
    website_url: p.domain ? `https://${p.domain}` : undefined,
    label_names: ["Ghost Tax Q2 2026", `market-${p.market}`],
  });

  if (result.rateLimited) {
    console.log(`${label} — 429 rate limited, stop phase A`);
    break;
  }
  if (result.error) {
    console.log(`${label} — erreur: ${result.error.slice(0, 100)}`);
    continue;
  }

  const contactId = result.contact?.id;
  contactsCreated++;
  p.apolloContactId = contactId;
  console.log(`${label} — ✅ CRM contact ${contactId?.slice(0, 12)}...`);
  await sleep(400);
}
console.log(`\n✅ ${contactsCreated}/${backup.length} contacts créés dans Apollo CRM.`);

// ════════════════════════════════════════════════════════
// PHASE B — Enrichir les 30 companies
// ════════════════════════════════════════════════════════
console.log("\n" + "=".repeat(70));
console.log("PHASE B — Enrichissement des 30 companies");
console.log("=".repeat(70));

// Dédup par domain
const uniqueDomains = new Map();
for (const p of backup) {
  if (p.domain && !uniqueDomains.has(p.domain)) {
    uniqueDomains.set(p.domain, p);
  }
}

const enrichedCompanies = new Map();
let orgsEnriched = 0;

for (const [domain, p] of uniqueDomains.entries()) {
  const label = `[${String(orgsEnriched + 1).padStart(2, " ")}/${uniqueDomains.size}] ${p.organization}`;

  const result = await apolloPost("/organizations/enrich", { domain });
  credits++;

  if (result.rateLimited) {
    console.log(`${label} — 429 rate limited`);
    break;
  }
  if (result.error) {
    console.log(`${label} — erreur: ${result.error.slice(0, 100)}`);
    continue;
  }

  const org = result.organization;
  if (!org) {
    console.log(`${label} — pas de données`);
    continue;
  }

  const enriched = {
    domain,
    name: org.name,
    website: org.website_url,
    industry: org.industry,
    keywords: org.keywords || [],
    estimatedRevenue: org.annual_revenue_printed || null,
    numEmployees: org.estimated_num_employees,
    founded: org.founded_year,
    techStack: (org.current_technologies || []).map((t) => t.name).slice(0, 30),
    funding: {
      total: org.total_funding_printed || null,
      latestStage: org.latest_funding_stage,
      latestAmount: org.latest_funding_round_date,
    },
    linkedin: org.linkedin_url,
    country: org.country,
    city: org.city,
    description: (org.short_description || "").slice(0, 500),
    publiclyTraded: org.publicly_traded_symbol || null,
    alexa: org.alexa_ranking,
    phones: (org.phone || "").slice(0, 50),
  };

  enrichedCompanies.set(domain, enriched);
  orgsEnriched++;

  const techSummary = enriched.techStack.slice(0, 5).join(", ") || "?";
  console.log(
    `${label} — ✅ emp=${enriched.numEmployees || "?"} rev=${enriched.estimatedRevenue || "?"} tech=[${techSummary.slice(0, 40)}...]`
  );
  await sleep(500);
}

console.log(`\n✅ ${orgsEnriched}/${uniqueDomains.size} companies enrichies. Credits: ${credits}.`);

// ════════════════════════════════════════════════════════
// PHASE C — Détection signaux intent (job postings)
// ════════════════════════════════════════════════════════
console.log("\n" + "=".repeat(70));
console.log("PHASE C — Job postings intent detection");
console.log("=".repeat(70));

const intentSignals = new Map();
const financeKeywords = [
  "cfo",
  "chief financial",
  "head of finance",
  "finance director",
  "vp finance",
  "finops",
  "financial operations",
  "procurement",
  "vendor management",
  "saas ops",
  "it ops",
  "it finance",
];

let signalsFound = 0;
for (const [domain, org] of enrichedCompanies.entries()) {
  const label = `[${String(Array.from(enrichedCompanies.keys()).indexOf(domain) + 1).padStart(2, " ")}/${enrichedCompanies.size}] ${org.name}`;

  // Apollo job_postings endpoint
  const result = await apolloPost("/organizations/job_postings", {
    organization_id: null,
    organization_domain: domain,
    page: 1,
    per_page: 10,
  });

  if (result.rateLimited) {
    console.log(`${label} — 429 rate limited`);
    break;
  }
  if (result.error) {
    // Endpoint peut-être non disponible en plan Basic
    if (result.error.includes("404") || result.error.includes("403")) {
      console.log(`${label} — endpoint non dispo (plan Basic limite)`);
      continue;
    }
    console.log(`${label} — ${result.error.slice(0, 60)}`);
    continue;
  }

  const jobs = result.organization_job_postings || result.job_postings || [];
  const financeJobs = jobs.filter((j) => {
    const title = (j.title || "").toLowerCase();
    return financeKeywords.some((k) => title.includes(k));
  });

  if (financeJobs.length > 0) {
    intentSignals.set(domain, {
      financeJobs: financeJobs.map((j) => ({
        title: j.title,
        postedAt: j.posted_at,
        url: j.url,
        location: j.city || j.country,
      })),
      totalJobs: jobs.length,
    });
    signalsFound++;
    console.log(`${label} — 🔥 ${financeJobs.length} finance jobs ouverts ! signal fort`);
  } else if (jobs.length > 0) {
    console.log(`${label} — ${jobs.length} jobs, 0 finance`);
  } else {
    console.log(`${label} — 0 jobs`);
  }
  await sleep(600);
}

console.log(`\n✅ ${signalsFound} prospects avec signal intent fort (hiring finance role).`);

// ════════════════════════════════════════════════════════
// PHASE D — Rapport intelligence augmenté
// ════════════════════════════════════════════════════════
console.log("\n" + "=".repeat(70));
console.log("PHASE D — Rapport intelligence augmenté");
console.log("=".repeat(70));

for (const p of backup) {
  const org = enrichedCompanies.get(p.domain) || null;
  const signals = intentSignals.get(p.domain) || null;

  // Priorité calculée
  let priority = 5;
  const factors = [];
  if (org?.numEmployees >= 100 && org?.numEmployees <= 500) {
    priority += 2;
    factors.push("sweet-spot-headcount");
  }
  if (org?.latestFundingStage && ["Series A", "Series B", "Series C"].includes(org.funding?.latestStage)) {
    priority += 2;
    factors.push("recent-funding");
  }
  if (signals?.financeJobs?.length) {
    priority += 3;
    factors.push(`hiring-${signals.financeJobs.length}-finance-roles`);
  }
  if (org?.techStack?.some((t) => /salesforce|workday|netsuite|sap/i.test(t))) {
    priority += 1;
    factors.push("enterprise-tech-stack");
  }
  if (org?.techStack?.length > 20) {
    priority += 1;
    factors.push("heavy-saas-stack");
  }

  const angle = (() => {
    if (signals?.financeJobs?.length) return "hiring-finops";
    if (org?.funding?.latestStage) return "post-funding-spend-discipline";
    if (org?.techStack?.length > 20) return "saas-sprawl";
    if (org?.publiclyTraded) return "board-visibility";
    return "mid-market-consolidation";
  })();

  intelligenceReport.push({
    person: {
      email: p.email,
      fullName: p.fullName,
      firstName: p.firstName,
      lastName: p.lastName,
      title: p.title,
      linkedin: p.linkedin,
      apolloContactId: p.apolloContactId || null,
    },
    company: {
      name: p.organization,
      domain: p.domain,
      ...(org || {}),
    },
    signals: signals || null,
    scoring: {
      priority,
      factors,
      market: p.market,
      suggestedAngle: angle,
    },
    geoMarket: p.geoMarket,
    locale: p.locale,
  });
}

// Trier par priorité
intelligenceReport.sort((a, b) => b.scoring.priority - a.scoring.priority);

writeFileSync(
  resolve(process.cwd(), "intelligence-report-17avril.json"),
  JSON.stringify(intelligenceReport, null, 2),
  "utf8"
);
console.log(`📄 intelligence-report-17avril.json écrit (${intelligenceReport.length} prospects priorisés).`);

// Top 5 priorité
console.log(`\n🎯 TOP 5 PRIORITÉ :\n`);
for (const p of intelligenceReport.slice(0, 5)) {
  console.log(
    `  Score ${p.scoring.priority} | ${p.person.fullName} @ ${p.company.name} (${p.geoMarket})`
  );
  console.log(`    Angle: ${p.scoring.suggestedAngle} | Facteurs: ${p.scoring.factors.join(", ")}`);
  console.log(
    `    ${p.person.email} | emp=${p.company.numEmployees || "?"} rev=${p.company.estimatedRevenue || "?"}`
  );
  if (p.signals?.financeJobs?.length) {
    console.log(`    🔥 Jobs finance ouverts: ${p.signals.financeJobs.map((j) => j.title).slice(0, 2).join(", ")}`);
  }
  console.log(``);
}

// Update outreach_leads avec priority + angle
console.log(`\n📤 Update outreach_leads avec intelligence enrichie...`);
let updated = 0;
for (const p of intelligenceReport) {
  const updateRes = await fetch(
    `${SB_URL}/rest/v1/outreach_leads?email=eq.${encodeURIComponent(p.person.email.toLowerCase())}`,
    {
      method: "PATCH",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        headcount: p.company.numEmployees || null,
        industry: p.company.industry || null,
        metadata: {
          firstName: p.person.firstName,
          lastName: p.person.lastName,
          fullName: p.person.fullName,
          title: p.person.title,
          linkedin: p.person.linkedin,
          apolloContactId: p.person.apolloContactId,
          market: p.scoring.market,
          priority: p.scoring.priority,
          factors: p.scoring.factors,
          suggestedAngle: p.scoring.suggestedAngle,
          techStack: p.company.techStack?.slice(0, 15) || [],
          latestFunding: p.company.funding?.latestStage || null,
          estimatedRevenue: p.company.estimatedRevenue,
          financeJobsOpen: p.signals?.financeJobs?.length || 0,
          financeJobsSample: p.signals?.financeJobs?.slice(0, 3) || [],
          sourcedVia: "apollo-full-strategy-17avril",
        },
      }),
    }
  );
  if (updateRes.ok) updated++;
}

console.log(`✅ ${updated}/${intelligenceReport.length} leads updatés dans Supabase avec intelligence complète.`);

// ════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════
console.log("\n" + "=".repeat(70));
console.log("RÉSUMÉ EXPLOITATION APOLLO FULL STRATEGY");
console.log("=".repeat(70));
console.log(`  Contacts créés dans Apollo CRM : ${contactsCreated}`);
console.log(`  Companies enrichies            : ${orgsEnriched}`);
console.log(`  Signaux intent détectés        : ${signalsFound}`);
console.log(`  Credits Apollo utilisés        : ${credits}`);
console.log(`  Intelligence report généré     : ${intelligenceReport.length} prospects priorisés`);
console.log(`  outreach_leads updatés         : ${updated}`);
console.log(``);
console.log(`Fichier: intelligence-report-17avril.json`);
console.log("=".repeat(70));
