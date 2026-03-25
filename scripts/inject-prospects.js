const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  "https://cuvxhrzrwzuysnfnoqje.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dnhocnpyd3p1eXNuZm5vcWplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgzMjU1MCwiZXhwIjoyMDg4NDA4NTUwfQ.6ntf-Gc4kpjy9D29oWJdMi2CD4S3XgBH3pYJ9SsQoI4"
);

const prospects = [
  { company: "Databricks", domain: "databricks.com", headcount: 7000, industry: "AI / Data Platform", geo: "US", rail: "C", priority: "high", title: "CFO" },
  { company: "Airtable", domain: "airtable.com", headcount: 1200, industry: "No-code / SaaS", geo: "US", rail: "B", priority: "high", title: "CFO" },
  { company: "Notion", domain: "notion.so", headcount: 800, industry: "Productivity SaaS", geo: "US", rail: "B", priority: "high", title: "CFO" },
  { company: "Calendly", domain: "calendly.com", headcount: 700, industry: "Scheduling SaaS", geo: "US", rail: "A", priority: "medium", title: "CFO" },
  { company: "Supabase", domain: "supabase.com", headcount: 500, industry: "Dev Infra / Backend", geo: "US", rail: "B", priority: "high", title: "CTO" },
  { company: "Workato", domain: "workato.com", headcount: 1000, industry: "iPaaS / Automation", geo: "US", rail: "B", priority: "high", title: "CFO" },
  { company: "Braze", domain: "braze.com", headcount: 1500, industry: "MarTech / CRM SaaS", geo: "US", rail: "B", priority: "high", title: "CFO" },
  { company: "Drata", domain: "drata.com", headcount: 700, industry: "Compliance / Security", geo: "US", rail: "A", priority: "medium", title: "CFO" },
  { company: "Celonis", domain: "celonis.com", headcount: 3000, industry: "Process Mining / AI", geo: "DE", rail: "C", priority: "high", title: "CFO" },
  { company: "Personio", domain: "personio.com", headcount: 1800, industry: "HR Tech / SaaS", geo: "DE", rail: "B", priority: "high", title: "CFO" },
  { company: "Contentful", domain: "contentful.com", headcount: 750, industry: "CMS / DXP SaaS", geo: "DE", rail: "B", priority: "high", title: "CFO" },
  { company: "DeepL", domain: "deepl.com", headcount: 1000, industry: "AI / Translation", geo: "DE", rail: "B", priority: "high", title: "CFO" },
  { company: "Adjust (AppLovin)", domain: "adjust.com", headcount: 500, industry: "Mobile Analytics", geo: "DE", rail: "B", priority: "medium", title: "CTO" },
  { company: "Sennder", domain: "sennder.com", headcount: 1000, industry: "Logistics Tech", geo: "DE", rail: "A", priority: "medium", title: "CFO" },
  { company: "Mollie", domain: "mollie.com", headcount: 850, industry: "FinTech / Payments", geo: "NL", rail: "B", priority: "high", title: "CFO" },
  { company: "Bird", domain: "bird.com", headcount: 500, industry: "CPaaS / Comms", geo: "NL", rail: "B", priority: "high", title: "CFO" },
  { company: "Miro", domain: "miro.com", headcount: 1800, industry: "Collaboration SaaS", geo: "NL", rail: "B", priority: "high", title: "CFO" },
  { company: "Remote", domain: "remote.com", headcount: 1500, industry: "HR Tech / EOR", geo: "NL", rail: "B", priority: "high", title: "CFO" },
  { company: "Sendcloud", domain: "sendcloud.com", headcount: 500, industry: "Shipping SaaS", geo: "NL", rail: "A", priority: "medium", title: "CFO" },
  { company: "Darktrace", domain: "darktrace.com", headcount: 2000, industry: "Cybersecurity / AI", geo: "UK", rail: "C", priority: "high", title: "CFO" },
  { company: "GoCardless", domain: "gocardless.com", headcount: 800, industry: "FinTech / Payments", geo: "UK", rail: "B", priority: "high", title: "CFO" },
  { company: "Thought Machine", domain: "thoughtmachine.net", headcount: 700, industry: "Banking SaaS", geo: "UK", rail: "B", priority: "high", title: "CFO" },
  { company: "Paddle", domain: "paddle.com", headcount: 500, industry: "Billing / SaaS", geo: "UK", rail: "A", priority: "medium", title: "CFO" },
  { company: "Cleo", domain: "web.cleo.me", headcount: 600, industry: "FinTech / AI", geo: "UK", rail: "A", priority: "medium", title: "CFO" },
  { company: "Multiverse", domain: "multiverse.io", headcount: 1000, industry: "EdTech / SaaS", geo: "UK", rail: "A", priority: "medium", title: "CFO" },
];

async function inject() {
  const rows = prospects.map((p) => ({
    email: "tbd@" + p.domain,
    domain: p.domain,
    company_name: p.company,
    company: p.company,
    headcount: p.headcount,
    industry: p.industry,
    source: "linkedin_prospect_list",
    status: "new",
    score: p.priority === "high" ? 80 : 50,
    locale: "en",
    geo_market: p.geo,
    drip_step: 0,
    metadata: {
      rail_target: p.rail,
      priority: p.priority,
      decision_maker_title: p.title,
      batch: "product-hunt-launch-2026-03",
    },
  }));

  const { data, error } = await sb
    .from("outreach_leads")
    .upsert(rows, { onConflict: "email" });

  if (error) {
    console.error("Error:", error.message);
    return;
  }
  console.log("Inserted", rows.length, "prospects");

  const { count } = await sb
    .from("outreach_leads")
    .select("*", { count: "exact", head: true });
  console.log("Total outreach_leads:", count);

  // Show breakdown by geo
  for (const geo of ["US", "DE", "NL", "UK"]) {
    const { count: c } = await sb
      .from("outreach_leads")
      .select("*", { count: "exact", head: true })
      .eq("geo_market", geo);
    console.log("  " + geo + ":", c);
  }
}

inject();
