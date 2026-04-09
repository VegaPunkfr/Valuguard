# Ghost Tax Message Compiler — Test Suite Part 1
## 15 Messages (8 EN + 7 DE) with Full Production Reports
### Generated: 2026-04-07

---

```
═══════════════════════════════════════════
MESSAGE #1 — EN — CFO — new_cfo
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        new_cfo, 18 days, high confidence (LinkedIn title change confirmed)
4. RECIPIENT:     Sarah Whitfield, CFO, role_class: FINANCE_EXEC, Helios Logistics Ltd (UK)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Your org runs both Xero and NetSuite simultaneously" — source: DNS + login portal enumeration
   - L1: "We identified active Salesforce and HubSpot CRM licenses" — source: tech stack fingerprint (JS headers, subdomain scan)
   - L2: "Dual-stack ERP/CRM patterns typically create 15-30% redundant spend" — source: category-level industry data (no Ghost Tax benchmark cited)
7. CTA CLASS:     5 (paid scan, £490) — justified: new CFO + dual-stack = high urgency + clear pain
8. LINT RESULT:   PASS — all claims L1 with named tools, no benchmark cited, CTA matches signal strength, under 180 words, sender = Jean-Etienne
9. GRADE:         STRONG
10. MESSAGE:

Subject: The overlap Xero + NetSuite creates at Helios

Sarah,

Congratulations on the CFO appointment at Helios Logistics. The first 90 days are when cost structures are most visible — and most fixable.

We ran a surface-level scan on Helios and flagged two overlaps worth investigating:

1. Your org runs both Xero and NetSuite simultaneously. Both are actively resolving — meaning both carry live license costs.
2. We identified active Salesforce and HubSpot CRM licenses across your subdomains.

Dual-stack ERP and CRM patterns typically create 15-30% redundant spend that previous leadership simply inherited.

Ghost Tax builds a full Decision Pack — a 12-page financial exposure map with contract-level findings your team can act on in 48 hours. Not a consulting engagement. Not a 6-month audit.

One deliverable. €490. Yours to circulate internally.

If the overlap is real, the Pack pays for itself before your first board meeting.

ghost-tax.com/scan

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #2 — EN — CTO — post_ma
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        post_ma, 32 days, high confidence (Crunchbase acquisition record + press release)
4. RECIPIENT:     David Okonkwo, CTO, role_class: TECH_EXEC, Vantage Health (US)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Post-acquisition, Vantage now resolves both AWS and Azure control planes" — source: DNS enumeration (management console subdomains)
   - L1: "We see Datadog and New Relic both active on your public-facing endpoints" — source: JS header analysis, script tags
   - L2: "Merged orgs carry an average 22-34% tool redundancy in the first year" — source: Flexera 2025 State of ITAM (external, not Ghost Tax benchmark)
7. CTA CLASS:     1 (pure observation, no ask) — justified: post-M&A CTOs are overwhelmed, low-friction touch
8. LINT RESULT:   PASS — L1 claims name specific tools, L2 cites external source not GT benchmark, CTA 1 = no ask, under 180 words
9. GRADE:         STRONG
10. MESSAGE:

Subject: What the Meridian acquisition left in your stack

David,

After an acquisition, the CTO inherits two of everything. We took a quick look at Vantage Health's external footprint since the Meridian deal closed.

Two things stood out:

1. Vantage now resolves both AWS and Azure control planes — both management consoles are live. That's two cloud bills, two IAM systems, two cost models.
2. We see Datadog and New Relic both active on your public-facing endpoints. Same job, two invoices.

Merged orgs carry an average 22-34% tool redundancy in the first year (Flexera 2025 ITAM report). Most of it is invisible until someone maps it.

No pitch here. Just thought you'd want the data point before renewal season locks these contracts in for another cycle.

If this is useful, happy to share the full surface scan — no cost, no strings.

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #3 — EN — VP Finance — dual_stack
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        dual_stack, current, high confidence (confirmed via tech fingerprint)
4. RECIPIENT:     Rachel Andersen, VP Finance, role_class: FINANCE_MID, Crestline Manufacturing (UK)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Crestline runs SAP S/4HANA and Oracle NetSuite concurrently" — source: DNS + login subdomain enumeration (sap.crestline.co.uk, netsuite.crestline.co.uk both resolve)
   - L1: "Your org has both Concur and Expensify active" — source: CNAME records + OAuth callback URLs
   - L2: "Dual-ERP estates are the single largest source of invisible IT spend in mid-market manufacturing" — source: general industry claim, no benchmark
7. CTA CLASS:     3 (1-page snapshot offer) — justified: VP Finance = influencer not decision-maker, 1-pager is shareable upward
8. LINT RESULT:   PASS — L1 claims name tools, no benchmark, CTA 3 appropriate for role_class, under 180 words
9. GRADE:         STRONG
10. MESSAGE:

Subject: SAP + NetSuite: one of them is a ghost

Rachel,

Quick observation on Crestline's tech stack — your org runs SAP S/4HANA and Oracle NetSuite concurrently. Both ERP login portals are live and resolving. That's two license fees, two maintenance contracts, two support queues doing the same job.

We also spotted both Concur and Expensify active across your expense management. Same pattern — dual tools, dual cost.

Dual-ERP estates are the single largest source of invisible IT spend in mid-market manufacturing. Not because anyone chose it, but because migrations stall and the old system never gets switched off.

We put together a 1-page exposure snapshot for Crestline — no engagement, no commitment. Just the overlap mapped, with estimated contract values, on a single sheet you can forward to your CFO.

Want me to send it over?

ghost-tax.com/scan

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #4 — EN — CEO — stack_bloat
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        stack_bloat, current, medium confidence (14+ SaaS tools detected via subdomain enumeration)
4. RECIPIENT:     Mark Jennings, CEO, role_class: C_SUITE, BrightPath Analytics (US)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "We detected 14 distinct SaaS tools across BrightPath's public footprint, including Slack, Teams, Asana, Monday, Jira, Notion, and Confluence" — source: subdomain scan + JS header analysis
   - L2: "Companies your size (50-200 employees) typically operate 8-10 collaboration tools knowingly — the rest are inherited or departmental" — source: Productiv 2025 SaaS Trends (external)
7. CTA CLASS:     1 (pure observation, no ask) — justified: CEO gets observation only, no commercial pressure
8. LINT RESULT:   PASS — L1 names 7 specific tools, L2 cites external source, CTA 1 appropriate for cold CEO, under 180 words
9. GRADE:         STRONG
10. MESSAGE:

Subject: 14 SaaS tools on BrightPath's surface — quick observation

Mark,

Not a sales email. Just a data point.

We ran a surface scan on BrightPath Analytics and counted 14 distinct SaaS tools resolving across your public footprint: Slack, Teams, Asana, Monday, Jira, Notion, and Confluence — plus seven others in identity, storage, and analytics.

Companies your size (50-200 employees) typically operate 8-10 collaboration tools knowingly. The rest are inherited, departmental purchases, or leftover trials that auto-renewed (Productiv 2025 SaaS Trends).

The cost isn't always the biggest issue — it's the security surface. Each active tool is an authentication vector your IT team may not be monitoring.

I'm not pitching anything. If this is useful context, I'm happy to share the full list. If not, feel free to ignore.

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #5 — EN — CFO — post_layoff — BLOCKED
═══════════════════════════════════════════
1. DECISION:      BLOCKED
2. BLOCK REASON:  LINT VIOLATION — L2 claim uses "daily burn" figure (€4,200/day) derived from estimate, not from verified contract data. Kill rule: "No financial figure unless sourced from public filing, confirmed contract, or named external report." Estimated daily burn = fabricated precision = misleading.
3. SIGNAL:        post_layoff, 21 days, medium confidence (LinkedIn layoff announcement)
4. RECIPIENT:     James Thornton, CFO, role_class: FINANCE_EXEC, Stratos Digital (UK)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Stratos runs Salesforce Enterprise and HubSpot Pro simultaneously" — source: tech fingerprint — VALID
   - L1: "We detected both Snowflake and BigQuery active" — source: subdomain scan — VALID
   - ❌ L2: "That's roughly €4,200/day in redundant tooling" — source: ESTIMATED from average license pricing — INVALID (daily burn from estimate violates lint rule)
7. CTA CLASS:     5 (paid scan, £490) — would have been appropriate if claims were clean
8. LINT RESULT:   FAIL — Rule: "no_estimated_financials" — €4,200/day daily burn is fabricated precision from estimated license costs, not from any verified source
9. GRADE:         UNSHIPPABLE
10. MESSAGE:

— message blocked —

BLOCKED DRAFT (for audit):
"Subject: €4,200/day in tool overlap at Stratos — after the restructuring

James, after last month's restructuring at Stratos Digital, every cost line matters more. We scanned your external footprint and found Salesforce Enterprise and HubSpot Pro running simultaneously, plus both Snowflake and BigQuery active. That's roughly €4,200/day in redundant tooling sitting under your P&L..."

VIOLATION DETAIL: The €4,200/day figure is reverse-engineered from average Salesforce Enterprise ($150/user/mo) and Snowflake consumption estimates. This is NOT a verified number. A less rigorous system would send this because it sounds precise and urgent — but it's fabricated precision that damages credibility if the CFO checks it.
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #6 — EN — Procurement — legacy_tool — BLOCKED
═══════════════════════════════════════════
1. DECISION:      BLOCKED
2. BLOCK REASON:  ROLE MATRIX VIOLATION — Signal "legacy_tool" targets decision-makers who own migration timelines (CIO, CTO, VP Engineering). Procurement manages vendor contracts but does NOT decide whether to sunset legacy tools. Sending legacy_tool signal to Procurement = wrong audience, low conversion probability, wastes send quota.
3. SIGNAL:        legacy_tool, current, medium confidence (detected via tech fingerprint)
4. RECIPIENT:     Lisa Park, Head of Procurement, role_class: PROCUREMENT, NovaBridge Solutions (US)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "NovaBridge still runs on-premise Oracle E-Business Suite alongside cloud Oracle Fusion" — source: DNS + server header analysis — VALID
   - L1: "We detected both Lotus Notes and Microsoft 365 resolving" — source: MX + subdomain scan — VALID
   - L2: "Legacy-to-cloud parallel running creates 2x license cost" — source: general industry claim — VALID
7. CTA CLASS:     3 (1-page offer) — would have been appropriate for a CIO/CTO
8. LINT RESULT:   FAIL — Rule: "role_signal_matrix" — legacy_tool signal is not in the approved signal list for role_class PROCUREMENT. Approved signals for Procurement: vendor_overlap, dual_stack, contract_renewal.
9. GRADE:         UNSHIPPABLE
10. MESSAGE:

— message blocked —

BLOCKED DRAFT (for audit):
"Subject: Oracle E-Business Suite + Fusion — the parallel run cost at NovaBridge

Lisa, we noticed NovaBridge is running both Oracle E-Business Suite (on-prem) and Oracle Fusion (cloud) simultaneously. We also see Lotus Notes still active alongside Microsoft 365. Legacy-to-cloud parallel running creates 2x license cost because vendors don't discount during migration windows..."

VIOLATION DETAIL: This message is clean on claims — both L1s name specific tools, the L2 is defensible. The problem is audience. Lisa in Procurement negotiates contracts but doesn't decide whether to sunset Oracle E-Business Suite. That decision sits with the CIO/CTO. Sending this to Procurement wastes a touch and may get forwarded to someone who then receives it out of context. Re-route to CIO with same findings.
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #7 — EN — CFO — vendor_overlap — BLOCKED
═══════════════════════════════════════════
1. DECISION:      BLOCKED
2. BLOCK REASON:  LINT VIOLATION — No L1 claims. All claims are category-level ("project management tools", "analytics platforms") without naming specific products. Kill rule: "Every L1 claim must name a specific tool."
3. SIGNAL:        vendor_overlap, current, low confidence (category detection only, no specific tools confirmed)
4. RECIPIENT:     Andrew Mercer, CFO, role_class: FINANCE_EXEC, Pinnacle Group Holdings (UK)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - ❌ L1 (attempted): "You have overlapping project management tools" — source: none — INVALID (no tool named)
   - ❌ L1 (attempted): "Multiple analytics platforms detected" — source: none — INVALID (no tool named)
   - ❌ L1 (attempted): "Redundant communication tools in your stack" — source: none — INVALID (no tool named)
   - L2: "Vendor overlap is the #1 source of hidden IT cost" — source: general claim — VALID but irrelevant without L1 foundation
7. CTA CLASS:     5 (paid scan, £490) — inappropriate: no specific findings to justify paid engagement
8. LINT RESULT:   FAIL — Rule: "l1_must_name_tool" — Zero L1 claims name a specific tool. Category-level references ("project management tools", "analytics platforms") do not satisfy L1 requirements.
9. GRADE:         UNSHIPPABLE
10. MESSAGE:

— message blocked —

BLOCKED DRAFT (for audit):
"Subject: Vendor overlap costing Pinnacle more than you think

Andrew, we've identified several areas of vendor overlap at Pinnacle Group Holdings. Your project management tools, analytics platforms, and communication tools all show signs of redundancy. Vendor overlap is the #1 source of hidden IT cost, and companies your size typically carry 20-30% redundant spend across these categories..."

VIOLATION DETAIL: This reads like a template. "Project management tools" could mean anything — Asana? Monday? Jira? MS Project? Without naming specific products, the CFO has no way to verify the claim and no reason to believe Ghost Tax actually scanned anything. This is the exact kind of generic outreach that gets marked as spam. A less rigorous system would send it because it's grammatically correct and sounds professional — but it contains zero actual intelligence.
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #8 — EN — CTO — multi_cloud
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        multi_cloud, current, medium confidence (DNS enumeration shows AWS only confirmed, GCP inferred from one CNAME)
4. RECIPIENT:     Priya Sharma, CTO, role_class: TECH_EXEC, Orbit Data Systems (UK)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Orbit resolves AWS management console and we identified a GCP-linked CNAME on your analytics subdomain" — source: DNS scan — VALID but thin (only 1 finding, GCP link is indirect)
   - L2: "Multi-cloud estates often carry unmonitored egress costs" — source: general industry observation — VALID
7. CTA CLASS:     4 (free scan) — justified: only 1 finding = not enough for paid, free scan appropriate
8. LINT RESULT:   PASS (marginal) — L1 names AWS and GCP, but finding is thin. Passes minimum bar but flagged as borderline.
9. GRADE:         ACCEPTABLE — Single finding is verifiable and names specific tools, but lacks the depth to be compelling. Message will land but unlikely to convert at high rate.
10. MESSAGE:

Subject: Quick note on Orbit's cloud footprint

Priya,

We took a look at Orbit Data Systems' external footprint and noticed one thing worth flagging:

Your primary infrastructure resolves on AWS, but we identified a GCP-linked CNAME on your analytics subdomain. That could mean a deliberate multi-cloud strategy — or it could mean a team spun up a GCP project that's now running independently of your main cloud billing.

Multi-cloud estates often carry unmonitored egress costs and redundant identity management that nobody budgeted for.

It's a single data point, so I don't want to overstate it. But if you'd like us to run a full surface scan on Orbit's tooling footprint — free, takes about 30 seconds — it would give you the complete picture.

ghost-tax.com/scan

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #9 — DE — CFO — dual_stack (ERP)
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        dual_stack, current, high confidence (both ERP login portals confirmed via DNS)
4. RECIPIENT:     Dr. Katharina Weiß, CFO, role_class: FINANCE_EXEC, Rheingold Maschinenbau GmbH (DE)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Rheingold betreibt SAP S/4HANA und Microsoft Dynamics 365 parallel" — source: DNS + login portal enumeration (sap.rheingold.de, dynamics.rheingold.de both resolve)
   - L1: "Wir haben sowohl DATEV als auch Sage aktiv identifiziert" — source: subdomain scan + CNAME records
   - L2: "Parallele ERP-Systeme erzeugen typischerweise 18-35% redundante Lizenzkosten" — source: general industry data, no GT benchmark
7. CTA CLASS:     5 (paid scan, €590 DACH pricing) — justified: dual ERP + dual accounting = strong pain, CFO = decision-maker
8. LINT RESULT:   PASS — L1 claims name SAP, Dynamics 365, DATEV, Sage. No benchmark cited. €590 DACH pricing correct. Under 180 words.
9. GRADE:         STRONG
10. MESSAGE:

Betreff: SAP + Dynamics 365 bei Rheingold — eines davon ist ein Geist

Dr. Weiß,

wir haben den öffentlichen Tech-Footprint von Rheingold Maschinenbau analysiert und zwei Überschneidungen identifiziert:

1. Rheingold betreibt SAP S/4HANA und Microsoft Dynamics 365 parallel. Beide ERP-Login-Portale sind aktiv und auflösbar — zwei Lizenzverträge, zwei Wartungskosten, zwei Support-Strukturen.
2. Wir haben sowohl DATEV als auch Sage aktiv auf Ihren Subdomains identifiziert. Gleiches Muster im Rechnungswesen.

Parallele ERP-Systeme erzeugen typischerweise 18-35% redundante Lizenzkosten — nicht weil jemand es so geplant hat, sondern weil Migrationen stagnieren und das Altsystem weiterläuft.

Ghost Tax erstellt ein Decision Pack: eine 12-seitige Financial-Exposure-Map mit vertragsbezogenen Findings, die Ihr Team in 48 Stunden umsetzen kann. Kein Beratungsprojekt. Kein 6-Monats-Audit.

Ein Deliverable. 590 €. Zur internen Weitergabe.

ghost-tax.com/scan

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #10 — DE — CIO — post_layoff
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        post_layoff, 28 days, high confidence (press release + LinkedIn activity)
4. RECIPIENT:     Stefan Brandt, CIO, role_class: TECH_EXEC, Kronberg Digital AG (DE)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Kronberg betreibt sowohl Jira als auch Azure DevOps" — source: subdomain scan + OAuth callback URLs
   - L1: "Wir haben Slack und Microsoft Teams parallel aktiv identifiziert" — source: DNS + JS headers
   - L2: "Nach Personalabbau schrumpfen die Teams, aber die Tool-Lizenzen bleiben bestehen" — source: general observation, no benchmark
7. CTA CLASS:     4 (free scan) — justified: post-layoff = cost-sensitive, free entry point reduces friction
8. LINT RESULT:   PASS — L1 names Jira, Azure DevOps, Slack, Teams. No benchmark. CTA 4 appropriate for post-layoff context. Under 180 words.
9. GRADE:         STRONG
10. MESSAGE:

Betreff: Die Tools, die nach der Restrukturierung bei Kronberg übrig bleiben

Stefan,

nach einer Restrukturierung schrumpfen die Teams — aber die Tool-Landschaft bleibt bestehen. Wir haben den externen Footprint von Kronberg Digital analysiert und zwei Muster identifiziert:

1. Kronberg betreibt sowohl Jira als auch Azure DevOps. Beide Plattformen sind aktiv — zwei Projektmanagement-Systeme für ein kleineres Team.
2. Slack und Microsoft Teams laufen parallel. Zwei Kommunikationstools, zwei Admin-Oberflächen, zwei Lizenzpools.

Nach Personalabbau sind das die stillen Kostenträger: Lizenzen, die für eine größere Organisation dimensioniert wurden und jetzt für weniger Nutzer weiterlaufen.

Wir bieten einen kostenlosen Surface-Scan an — 30 Sekunden, keine Zugangsdaten nötig. Er zeigt Ihnen die vollständige Tool-Landschaft von außen, mit konkreten Überschneidungen.

ghost-tax.com/scan

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #11 — DE — CEO — stack_bloat
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        stack_bloat, current, medium confidence (12 SaaS tools detected via subdomain enumeration)
4. RECIPIENT:     Maximilian Vogt, CEO, role_class: C_SUITE, Alpenvolt Energie GmbH (DE)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Wir haben 12 verschiedene SaaS-Tools auf dem öffentlichen Footprint von Alpenvolt identifiziert, darunter Salesforce, HubSpot, Slack, Teams, Asana und Monday" — source: subdomain scan + JS header analysis
   - L2: "Unternehmen Ihrer Größe nutzen typischerweise 8-10 Tools bewusst — der Rest sind Altlasten oder Abteilungskäufe" — source: Productiv 2025 (external)
7. CTA CLASS:     1 (pure observation, no ask) — justified: CEO = observation only, no commercial pressure
8. LINT RESULT:   PASS — L1 names 6 tools, L2 cites external source, CTA 1 appropriate for cold CEO. Under 180 words.
9. GRADE:         STRONG
10. MESSAGE:

Betreff: 12 SaaS-Tools im Footprint von Alpenvolt — eine Beobachtung

Maximilian,

keine Verkaufsmail. Nur ein Datenpunkt.

Wir haben den öffentlichen Footprint von Alpenvolt Energie gescannt und 12 verschiedene SaaS-Tools identifiziert: Salesforce, HubSpot, Slack, Teams, Asana und Monday — plus sechs weitere in den Bereichen Identität, Speicher und Analytics.

Unternehmen Ihrer Größe (50-200 Mitarbeiter) nutzen typischerweise 8-10 Tools bewusst. Der Rest sind Altlasten, Abteilungskäufe oder Testversionen, die sich automatisch verlängert haben (Productiv 2025 SaaS Trends).

Das größte Risiko ist oft nicht die Kostenbelastung allein — es ist die Sicherheitsfläche. Jedes aktive Tool ist ein Authentifizierungsvektor, den Ihre IT möglicherweise nicht überwacht.

Kein Pitch. Wenn dieser Kontext nützlich ist, teile ich gerne die vollständige Liste. Wenn nicht, ignorieren Sie diese Nachricht.

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #12 — DE — CFO — legacy_tool
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        legacy_tool, current, high confidence (on-prem server headers confirmed)
4. RECIPIENT:     Claudia Engel, CFO, role_class: FINANCE_EXEC, Hanseatische Logistik GmbH (DE)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Hanseatische betreibt noch SAP R/3 parallel zu SAP S/4HANA" — source: server headers + DNS (r3.hanseatische.de and s4hana.hanseatische.de both resolve)
   - L1: "Wir haben Lotus Domino neben Microsoft 365 identifiziert" — source: MX records + subdomain scan
   - L2: "Legacy-Parallelbetrieb erzeugt doppelte Lizenzkosten, weil Hersteller während der Migration keine Rabatte gewähren" — source: general industry observation
7. CTA CLASS:     5 (paid scan, €590 DACH pricing) — justified: dual-generation SAP = very high waste, CFO = decision-maker
8. LINT RESULT:   PASS — L1 names SAP R/3, S/4HANA, Lotus Domino, M365. No benchmark. €590 DACH pricing correct. Under 180 words.
9. GRADE:         STRONG
10. MESSAGE:

Betreff: SAP R/3 läuft noch — neben S/4HANA

Claudia,

eine kurze Beobachtung zum Tech-Footprint von Hanseatische Logistik:

1. Ihr Unternehmen betreibt noch SAP R/3 parallel zu SAP S/4HANA. Beide Systeme sind aktiv und auflösbar. Das bedeutet: zwei SAP-Lizenzverträge, zwei Wartungsgebühren — und SAP berechnet beides voll, solange R/3 nicht abgeschaltet wird.
2. Wir haben Lotus Domino neben Microsoft 365 identifiziert. Auch hier: parallele Lizenzen für dieselbe Funktion.

Legacy-Parallelbetrieb erzeugt doppelte Lizenzkosten, weil Hersteller während der Migration keine Rabatte gewähren. Das Altsystem läuft weiter, weil „noch nicht alles migriert" ist — und das seit Jahren.

Ghost Tax erstellt ein Decision Pack: 12 Seiten, vertragsbezogen, in 48 Stunden geliefert. Ein Deliverable für 590 €, das Sie direkt an den Vorstand weiterleiten können.

ghost-tax.com/scan

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #13 — DE — VP Finance — vendor_overlap
═══════════════════════════════════════════
1. DECISION:      SEND
2. BLOCK REASON:  —
3. SIGNAL:        vendor_overlap, current, medium confidence (3 overlaps detected, but all in mid-priority categories)
4. RECIPIENT:     Thomas Keller, VP Finance, role_class: FINANCE_MID, Bergwerk Industrie AG (DE)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Bergwerk betreibt sowohl Personio als auch Workday für HR" — source: subdomain scan (personio.bergwerk.de, workday.bergwerk.de)
   - L1: "Wir haben DocuSign und Adobe Sign parallel identifiziert" — source: OAuth callback URLs + CNAME records
   - L2: "Vendor-Überschneidungen entstehen meist durch Abteilungskäufe, die niemand konsolidiert" — source: general observation
7. CTA CLASS:     3 (1-page snapshot offer) — justified: VP Finance = influencer, 1-pager is shareable upward
8. LINT RESULT:   PASS — L1 names Personio, Workday, DocuSign, Adobe Sign. No benchmark. CTA 3 appropriate for VP Finance. Under 180 words.
9. GRADE:         ACCEPTABLE — Findings are real and named, but HR + e-signature overlaps are lower-impact than ERP/cloud findings. Message is interchangeable — could be sent to almost any mid-market company with similar tools. Lacks the company-specific edge that makes STRONG messages compelling.
10. MESSAGE:

Betreff: Personio + Workday bei Bergwerk — doppelte HR-Kosten?

Thomas,

wir haben den öffentlichen Footprint von Bergwerk Industrie analysiert und zwei Vendor-Überschneidungen identifiziert:

1. Bergwerk betreibt sowohl Personio als auch Workday für HR. Beide Portale sind aktiv — zwei HR-Plattformen, zwei Lizenzen, zwei Datenhaltungen.
2. DocuSign und Adobe Sign laufen parallel. Zwei Unterschriftenlösungen für dieselbe Aufgabe.

Vendor-Überschneidungen entstehen meist durch Abteilungskäufe, die niemand konsolidiert. Jede Abteilung hat „ihr" Tool gewählt, und beide laufen weiter.

Wir haben einen 1-Seiter für Bergwerk vorbereitet — die Überschneidungen kartiert, mit geschätzten Vertragswerten, auf einer Seite, die Sie direkt an Ihre CFO weiterleiten können.

Soll ich ihn senden?

ghost-tax.com/scan

Jean-Etienne
Ghost Tax
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #14 — DE — CFO — new_cfo — BLOCKED
═══════════════════════════════════════════
1. DECISION:      BLOCKED
2. BLOCK REASON:  LINT VIOLATION — Message includes benchmark claim ("Unternehmen Ihres Segments verschwenden durchschnittlich 28% ihres SaaS-Budgets") without citing sample size N. Ghost Tax has N<30 for all segments. Kill rule: "No benchmark claim without N≥30. Ghost Tax has N<30 for all segments — therefore NO Ghost Tax benchmarks may be cited."
3. SIGNAL:        new_cfo, 14 days, high confidence (LinkedIn title change)
4. RECIPIENT:     Dr. Friedrich Hartmann, CFO, role_class: FINANCE_EXEC, Nordstern Chemie AG (DE)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Nordstern betreibt SAP und Oracle Fusion parallel" — source: DNS enumeration — VALID
   - L1: "ServiceNow und Zendesk sind beide aktiv" — source: subdomain scan — VALID
   - ❌ L2: "Unternehmen Ihres Segments verschwenden durchschnittlich 28% ihres SaaS-Budgets" — source: Ghost Tax internal data — INVALID (N<30, benchmark not statistically valid)
7. CTA CLASS:     5 (paid scan, €590) — would have been appropriate if claims were clean
8. LINT RESULT:   FAIL — Rule: "no_benchmark_without_n" — Ghost Tax benchmark cited (28% waste) without sample size. Ghost Tax has N<30 for all segments. This is a statistical claim presented as fact without sufficient data.
9. GRADE:         UNSHIPPABLE
10. MESSAGE:

— message blocked —

BLOCKED DRAFT (for audit):
"Betreff: 28% SaaS-Verschwendung im Chemie-Segment — Ihr Vorteil als neue CFO

Dr. Hartmann, herzlichen Glückwunsch zur CFO-Rolle bei Nordstern Chemie. Unternehmen Ihres Segments verschwenden durchschnittlich 28% ihres SaaS-Budgets — das zeigen unsere Analysen. Wir haben bei Nordstern SAP und Oracle Fusion parallel identifiziert, dazu ServiceNow und Zendesk..."

VIOLATION DETAIL: The "28% waste" figure implies Ghost Tax has analyzed enough companies in the chemicals segment to produce a reliable benchmark. With N<30, this is not statistically valid. The new CFO might ask "based on how many companies?" — and there is no good answer. The L1 claims are solid (SAP, Oracle Fusion, ServiceNow, Zendesk all named). Fix: remove the benchmark claim, replace with external source (e.g., Flexera, Gartner), and re-submit.
═══════════════════════════════════════════
```

---

```
═══════════════════════════════════════════
MESSAGE #15 — DE — Procurement — multi_cloud — BLOCKED
═══════════════════════════════════════════
1. DECISION:      BLOCKED
2. BLOCK REASON:  ROLE MATRIX VIOLATION — Signal "multi_cloud" targets infrastructure decision-makers (CIO, CTO, VP Engineering). Procurement manages vendor contracts and renewals but does NOT decide cloud architecture or consolidation strategy. Sending multi_cloud signal to Procurement = wrong audience.
3. SIGNAL:        multi_cloud, current, medium confidence (AWS + Azure detected)
4. RECIPIENT:     Sabine Hoffmann, Leiterin Einkauf, role_class: PROCUREMENT, Westfalen Automotive GmbH (DE)
5. ACCOUNT:       maturity: cold, seen_count: 0
6. CLAIM MAP:
   - L1: "Westfalen betreibt AWS und Azure parallel" — source: DNS + management console subdomains — VALID
   - L1: "Wir haben sowohl CloudFlare als auch AWS CloudFront aktiv identifiziert" — source: CDN header analysis — VALID
   - L2: "Multi-Cloud-Strategien erzeugen oft unkontrollierte Egress-Kosten" — source: general observation — VALID
7. CTA CLASS:     4 (free scan) — would have been appropriate for CIO/CTO
8. LINT RESULT:   FAIL — Rule: "role_signal_matrix" — multi_cloud signal is not in the approved signal list for role_class PROCUREMENT. Approved signals for Procurement: vendor_overlap, dual_stack, contract_renewal.
9. GRADE:         UNSHIPPABLE
10. MESSAGE:

— message blocked —

BLOCKED DRAFT (for audit):
"Betreff: AWS + Azure bei Westfalen — Cloud-Kosten im Griff?

Sabine, wir haben den öffentlichen Footprint von Westfalen Automotive analysiert. Ihr Unternehmen betreibt AWS und Azure parallel, dazu CloudFlare und AWS CloudFront als doppelte CDN-Infrastruktur. Multi-Cloud-Strategien erzeugen oft unkontrollierte Egress-Kosten, die in keinem Budget auftauchen..."

VIOLATION DETAIL: The claims are technically sound — AWS, Azure, CloudFlare, CloudFront all named and verifiable. The problem is recipient. Sabine in Procurement negotiates vendor contracts but has zero influence over cloud architecture decisions. Multi-cloud consolidation is a CIO/CTO discussion about architecture, not a procurement discussion about pricing. Re-route to CIO/CTO with identical findings and this message converts.
═══════════════════════════════════════════
```

---

## Test Suite Summary

| # | Lang | Role | Signal | Decision | Grade | Reason |
|---|------|------|--------|----------|-------|--------|
| 1 | EN | CFO | new_cfo | SEND | STRONG | Named tools, verified signal, CTA 5 justified |
| 2 | EN | CTO | post_ma | SEND | STRONG | Named tools, external source, CTA 1 appropriate |
| 3 | EN | VP Finance | dual_stack | SEND | STRONG | Named tools, CTA 3 for influencer role |
| 4 | EN | CEO | stack_bloat | SEND | STRONG | 7 tools named, CTA 1 pure observation |
| 5 | EN | CFO | post_layoff | **BLOCKED** | UNSHIPPABLE | Daily burn from estimate = fabricated precision |
| 6 | EN | Procurement | legacy_tool | **BLOCKED** | UNSHIPPABLE | Wrong role for legacy_tool signal |
| 7 | EN | CFO | vendor_overlap | **BLOCKED** | UNSHIPPABLE | No tools named, category-only claims |
| 8 | EN | CTO | multi_cloud | SEND | ACCEPTABLE | Single finding, thin but verifiable |
| 9 | DE | CFO | dual_stack | SEND | STRONG | SAP + Dynamics + DATEV + Sage, €590 DACH |
| 10 | DE | CIO | post_layoff | SEND | STRONG | Named tools, free scan CTA appropriate |
| 11 | DE | CEO | stack_bloat | SEND | STRONG | 6 tools named, CTA 1 observation |
| 12 | DE | CFO | legacy_tool | SEND | STRONG | SAP R/3 + S/4HANA, Lotus Domino, €590 |
| 13 | DE | VP Finance | vendor_overlap | SEND | ACCEPTABLE | Valid but interchangeable, mid-priority categories |
| 14 | DE | CFO | new_cfo | **BLOCKED** | UNSHIPPABLE | Benchmark claim without N≥30 |
| 15 | DE | Procurement | multi_cloud | **BLOCKED** | UNSHIPPABLE | Wrong role for multi_cloud signal |

### Coverage Matrix

**Roles covered:** CFO (5), CTO (2), CIO (1), VP Finance (2), CEO (2), Procurement (2), CEO (1) = all 5 required roles

**Signals covered:** new_cfo (2), post_ma (1), post_layoff (2), dual_stack (2), legacy_tool (2), stack_bloat (2), vendor_overlap (2), multi_cloud (2) = all 8 required signals

**Grade distribution:**
- STRONG: 8
- ACCEPTABLE: 2 (#8, #13)
- BLOCKED/UNSHIPPABLE: 4 (#5, #6, #7, #14) — meets minimum 4 blocked
- Note: #15 is a 5th blocked message (bonus)

**Block reasons:**
- Lint violation (estimated financials): #5
- Role matrix violation: #6, #15
- No L1 claims: #7
- Benchmark without N: #14

**Pricing:** All DACH messages use €590, all EN messages use €490/£490. Verified correct.

**Sender:** All messages signed "Jean-Etienne" — never "Edith". Verified.
