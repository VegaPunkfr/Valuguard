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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase env vars missing");
  process.exit(1);
}

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "count=exact",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, count: res.headers.get("content-range") };
};

console.log("=".repeat(70));
console.log("FORENSIC : replies, bounces, opens, clicks sur Ghost Tax");
console.log("=".repeat(70));

// 1. Liste des tables potentiellement porteuses d'events
const tables = [
  "outreach_events",
  "outreach_sends",
  "outreach_leads",
  "sprint_accounts",
  "osint_prospects",
  "drip_state",
  "drip_queue",
  "visitor_intel",
  "replies",
  "inbox_messages",
  "conversations",
  "messages",
];

console.log("\n📊 AUDIT DES TABLES\n");

for (const table of tables) {
  const { status, count, body } = await sb(`${table}?select=*&limit=1`);
  if (status === 200) {
    const total = count?.split("/")[1] || "?";
    console.log(`  ✅ ${table.padEnd(25)} ${total} rows`);
  } else if (status === 404 || (body && body.code === "42P01")) {
    console.log(`  ⬜ ${table.padEnd(25)} table inexistante`);
  } else {
    console.log(`  ❌ ${table.padEnd(25)} status=${status} : ${JSON.stringify(body).slice(0, 80)}`);
  }
}

// 2. Détail outreach_events par kind
console.log("\n📨 outreach_events — breakdown par kind\n");
const { status: s1, body: events } = await sb(
  `outreach_events?select=kind&limit=2000`
);
if (s1 === 200 && Array.isArray(events)) {
  const counts = {};
  for (const e of events) counts[e.kind] = (counts[e.kind] || 0) + 1;
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }
  if (events.length === 0) console.log("  (aucun event)");
} else {
  console.log(`  table inaccessible (${s1})`);
}

// 3. Détail outreach_events les 30 derniers
console.log("\n📬 outreach_events — 30 derniers (plus récents)\n");
const { status: s2, body: recent } = await sb(
  `outreach_events?select=*&order=created_at.desc&limit=30`
);
if (s2 === 200 && Array.isArray(recent) && recent.length) {
  for (const e of recent) {
    const date = (e.created_at || "").slice(0, 16);
    const kind = (e.kind || "").padEnd(15);
    const to = (e.to_email || e.email || e.recipient || "?").padEnd(35);
    console.log(`  ${date}  ${kind}  ${to}`);
  }
} else {
  console.log(`  aucun event récent (${s2})`);
}

// 4. Sprint accounts avec status REPLIED
console.log("\n💬 sprint_accounts avec status=REPLIED\n");
const { status: s3, body: replied } = await sb(
  `sprint_accounts?select=*&status=eq.REPLIED`
);
if (s3 === 200 && Array.isArray(replied)) {
  if (replied.length === 0) console.log("  (aucun)");
  else {
    for (const a of replied.slice(0, 20)) {
      console.log(`  ${JSON.stringify({ id: a.id, name: a.name, email: a.email, last_at: a.last_contact_at }).slice(0, 140)}`);
    }
  }
} else {
  console.log(`  status=${s3}`);
}

// 5. outreach_leads avec bounced status
console.log("\n💥 outreach_leads bounced / réponses possibles\n");
const { status: s4, body: leads } = await sb(
  `outreach_leads?select=email,status,drip_step,bounced_at,last_sent_at,converted&order=last_sent_at.desc.nullslast&limit=30`
);
if (s4 === 200 && Array.isArray(leads)) {
  if (leads.length === 0) console.log("  (table vide)");
  else {
    for (const l of leads) {
      console.log(`  ${(l.email || "?").padEnd(45)} step=${l.drip_step} status=${l.status} sent=${(l.last_sent_at || "").slice(0,10)} conv=${l.converted}`);
    }
  }
}

// 6. osint_prospects avec status=replied
console.log("\n🔍 osint_prospects avec status=replied\n");
const { status: s5, body: osint } = await sb(
  `osint_prospects?select=*&status=eq.replied&limit=20`
);
if (s5 === 200) {
  if (Array.isArray(osint) && osint.length === 0) console.log("  (aucun)");
  else if (Array.isArray(osint)) for (const o of osint) console.log(`  ${JSON.stringify(o).slice(0, 200)}`);
}

// 7. visitor_intel — quelqu'un a visité le site récemment ?
console.log("\n👁️  visitor_intel — 20 visiteurs récents\n");
const { status: s6, body: visitors } = await sb(
  `visitor_intel?select=*&order=created_at.desc&limit=20`
);
if (s6 === 200 && Array.isArray(visitors) && visitors.length) {
  for (const v of visitors) {
    console.log(`  ${(v.created_at || "").slice(0, 16)}  ${(v.domain || v.company || "?").padEnd(30)}  ${JSON.stringify(v).slice(0, 100)}`);
  }
} else {
  console.log(`  (aucun visiteur loggé, status=${s6})`);
}

// 8. Test live : envoyer un mail à audits@ghost-tax.com et capturer la réponse
console.log("\n📤 TEST LIVE : envoi de test vers audits@ghost-tax.com\n");
if (RESEND_KEY) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Ghost Tax Forensic <noreply@ghost-tax.com>",
      to: ["audits@ghost-tax.com"],
      reply_to: "hashirama973@gmail.com",
      subject: "Forensic test — existence audits@ghost-tax.com",
      text: "Test forensic. Si ce mail arrive quelque part dans un GWorkspace, on confirme la boîte existe. Sinon un bounce reviendra à noreply@ghost-tax.com.",
    }),
  });
  const body = await res.json();
  console.log(`  Resend HTTP ${res.status}, id=${body.id || body.name || "?"}`);
  console.log(`  (Resend accepte même si destinataire n'existe pas. Le bounce reviendrait via webhook si MX bounce.)`);
}

console.log("\n" + "=".repeat(70));
console.log("Fin forensic. Check le détail ci-dessus pour signaux de réponses cachées.");
console.log("=".repeat(70));
