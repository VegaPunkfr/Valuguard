# Signal Intelligence — Buy-Readiness Detection Framework

## Purpose
Catalog of observable signals indicating a company is ready to buy Ghost Tax, with detection methods, confidence scoring, and approach strategy. Every signal maps to a specific pain state that Ghost Tax addresses.

---

## Signal Categories

### 1. HIRING SIGNALS

#### 1A. New CFO / VP Finance Appointed
- **Detection:** LinkedIn job changes, press releases, Apollo people search filtered by title change date, company announcement pages
- **Confidence:** HIGH
- **Urgency:** HIGH — first 90 days. New CFOs audit everything. They need quick wins to establish authority.
- **Why it matters:** A new CFO inherits their predecessor's cost structure and has zero loyalty to it. They're actively looking for problems to fix because finding problems = demonstrating competence. They need ammunition for their first board presentation.
- **Approach angle:** "External cost intelligence for incoming finance leadership — independent baseline assessment before you inherit assumptions"
- **Window:** Days 15-90 after start date. Before day 15 they're still onboarding. After day 90 they've already committed to their own narrative.

#### 1B. New CIO / IT Director Appointed
- **Detection:** LinkedIn, Apollo, industry press
- **Confidence:** MEDIUM-HIGH
- **Urgency:** MEDIUM — first 120 days. CIOs need longer to assess before acting.
- **Why it matters:** New CIOs evaluate the technology stack they inherit. They want to know where the waste is before being blamed for it.
- **Approach angle:** "Independent technology cost assessment — understand what you've inherited before your first architecture review"
- **Window:** Days 30-120.

#### 1C. FinOps / IT Cost Analyst Roles Posted
- **Detection:** LinkedIn Jobs, Indeed, Glassdoor, company careers page
- **Confidence:** HIGH
- **Urgency:** MEDIUM — the role takes 2-4 months to fill. Ghost Tax can deliver value before the hire starts.
- **Why it matters:** If they're hiring for FinOps, they've already decided IT cost is a problem. They've just committed to a 6-month timeline (3 months to hire + 3 months to ramp). Ghost Tax provides immediate intelligence while they wait.
- **Approach angle:** "Get an independent cost baseline now — your new FinOps hire will have a starting point on day one instead of spending their first quarter just mapping the landscape"
- **Window:** From posting date until 2 weeks after the role is filled.

#### 1D. Procurement / Vendor Management Roles Posted
- **Detection:** Job boards, LinkedIn
- **Confidence:** MEDIUM
- **Urgency:** LOW-MEDIUM
- **Why it matters:** Signals procurement capacity expansion, often triggered by vendor sprawl recognition.
- **Approach angle:** "Independent cost exposure assessment to help scope the vendor management mandate"

---

### 2. RESTRUCTURING SIGNALS

#### 2A. Announced Layoffs / Workforce Reduction
- **Detection:** Press releases, TechCrunch/Handelsblatt/Financial Times, LinkedIn layoff posts, layoffs.fyi, WARN Act filings (US), Massenentlassungsanzeige filings (DE)
- **Confidence:** HIGH
- **Urgency:** HIGH — companies cutting headcount are actively seeking all cost reduction levers.
- **Why it matters:** Layoffs reduce headcount but rarely trigger proportional SaaS license reduction. A company that fires 200 people is likely still paying for 200 licenses across multiple tools. This is the most acute Ghost Tax use case.
- **Approach angle:** "After workforce restructuring, technology costs rarely adjust proportionally. Independent assessment of license-to-headcount alignment."
- **Window:** 2-8 weeks after announcement. Too early = chaos, too late = they've already done their own review.

#### 2B. M&A Activity (Acquirer Side)
- **Detection:** Press releases, Crunchbase, PitchBook, regulatory filings
- **Confidence:** HIGH
- **Urgency:** HIGH — post-acquisition integration creates massive tool duplication.
- **Why it matters:** Acquiring company now has two of everything: two CRMs, two HR systems, two project management tools. The integration team needs to rationalize, but they're focused on people and process, not tool costs.
- **Approach angle:** "Post-acquisition technology cost exposure assessment — identify overlap before integration planning locks in redundancy"
- **Window:** 30-180 days post-close. Pre-close is too early (deal might not happen). After 180 days, integration decisions are already made.

#### 2C. M&A Activity (Target Side — Pre-Acquisition)
- **Detection:** Rumored deals, PE interest signals, advisor appointments
- **Confidence:** MEDIUM
- **Urgency:** MEDIUM
- **Why it matters:** Companies being acquired want to demonstrate operational discipline. A clean cost structure increases valuation.
- **Approach angle:** "Independent verification of IT cost efficiency — due diligence readiness"

#### 2D. Division Spin-Off / Carve-Out
- **Detection:** Press, regulatory filings
- **Confidence:** HIGH
- **Urgency:** HIGH
- **Why it matters:** Carve-outs must establish independent IT infrastructure. They inherit enterprise agreements at enterprise prices but only need a fraction of the capacity.
- **Approach angle:** "Right-sizing technology costs for standalone operations — avoid inheriting enterprise-scale pricing for division-scale needs"

#### 2E. New CEO Appointed
- **Detection:** Press, LinkedIn, board announcements
- **Confidence:** MEDIUM
- **Urgency:** MEDIUM — CEO restructuring is broader but always includes cost review
- **Why it matters:** New CEOs commission operational reviews. They need to establish a "before" baseline so they can later claim "after" improvements.
- **Approach angle:** "Independent operational cost baseline for new leadership — establish the benchmark you'll improve against"

---

### 3. GROWTH SIGNALS

#### 3A. Significant Funding Round (Series B+)
- **Detection:** Crunchbase, PitchBook, press releases, Apollo company enrichment
- **Confidence:** MEDIUM
- **Urgency:** LOW-MEDIUM — growth-stage companies are spending, not cutting. But investors are watching.
- **Why it matters:** Post-funding companies add tools aggressively. By Series C, the average SaaS company is running 120+ tools. The board will eventually ask "where is the money going?" — Ghost Tax helps answer proactively.
- **Approach angle:** "As you scale, technology costs compound faster than headcount. Independent baseline before your next board review."
- **Window:** 6-12 months post-funding, when the spending spree starts showing in burn rate.

#### 3B. Headcount Doubling in 12 Months
- **Detection:** LinkedIn headcount data, Apollo company data, press mentions of hiring targets
- **Confidence:** MEDIUM
- **Urgency:** MEDIUM
- **Why it matters:** Rapid hiring = rapid tool adoption with zero coordination. Each new team picks their preferred tools. By the time someone notices the overlap, there are 15 project management tools.
- **Approach angle:** "Rapid growth typically creates 30-40% technology cost redundancy within 18 months. Independent assessment before the sprawl becomes structural."

#### 3C. International Expansion
- **Detection:** New office announcements, international job postings, new domain registrations
- **Confidence:** MEDIUM
- **Urgency:** LOW-MEDIUM
- **Why it matters:** International offices often deploy parallel tool stacks due to regional preferences, compliance requirements, or simple lack of coordination with HQ.
- **Approach angle:** "Multi-geography operations typically carry 25-35% technology cost premium from tool duplication across regions"

---

### 4. TECHNOLOGY SIGNALS

#### 4A. Stack Proliferation Visible in Job Postings
- **Detection:** Analyze job posting requirements sections — companies listing 8+ different tools in their required/preferred qualifications reveal stack sprawl
- **Confidence:** HIGH
- **Urgency:** MEDIUM
- **Why it matters:** A job posting that requires "Salesforce, HubSpot, Pipedrive" for a single sales role reveals CRM fragmentation. This is directly observable Ghost Tax intelligence.
- **Approach angle:** "Your public job postings suggest technology stack fragmentation in [department]. This typically indicates 15-25% cost exposure in that category."
- **Detection method detail:** Scrape job postings, extract tool mentions, flag companies with 3+ tools in the same category.

#### 4B. Multiple Tools in Same Category on G2/Review Platforms
- **Detection:** G2, Capterra, TrustRadius review profiles — companies reviewing competing products simultaneously
- **Confidence:** MEDIUM
- **Urgency:** LOW
- **Why it matters:** If employees from the same company are reviewing both Asana and Monday.com, both are deployed. That's redundancy.

#### 4C. Technology Partnership Announcements
- **Detection:** Press releases, partner directories, integration marketplace listings
- **Confidence:** LOW-MEDIUM
- **Urgency:** LOW
- **Why it matters:** Adding new technology partnerships signals stack expansion. Each new platform brings its own cost structure.

#### 4D. Cloud Migration Announcements
- **Detection:** Press releases, AWS/Azure/GCP partner directories, job postings mentioning migration
- **Confidence:** MEDIUM
- **Urgency:** MEDIUM-HIGH
- **Why it matters:** Cloud migrations often result in running parallel infrastructure (on-prem + cloud) for 12-24 months, doubling infrastructure costs during transition.
- **Approach angle:** "During cloud migration, organizations typically carry 40-60% cost premium from parallel infrastructure. Independent assessment of transition cost exposure."

---

### 5. TIMING SIGNALS

#### 5A. Fiscal Year End Approaching (Budget Cycle)
- **Detection:** Company financial calendar (public filings for public companies, typical patterns by country — DE: mostly Dec year-end, UK: mixed, NL: mostly Dec)
- **Confidence:** MEDIUM
- **Urgency:** HIGH — 8-12 weeks before fiscal year end
- **Why it matters:** Budget planning forces cost review. The CFO needs to justify next year's IT budget. Ghost Tax provides external validation.
- **Approach angle:** "Independent IT cost benchmark for your upcoming budget cycle — external data point for budget discussions"
- **Window:** Q4 for Dec year-end companies (October-November is the sweet spot for budget planning meetings).

#### 5B. Q1 Budget Pressure (Post-Approval)
- **Detection:** Calendar-based — January-February for Dec year-end companies
- **Confidence:** MEDIUM
- **Urgency:** MEDIUM
- **Why it matters:** New budgets often come with mandated savings targets. Department heads need to identify where to cut.
- **Approach angle:** "Quick-scan of technology cost exposure to identify optimization targets for your new fiscal year objectives"

#### 5C. Board Meeting Proximity
- **Detection:** Public companies: quarterly earnings calendar. Private companies: typically quarterly, dates estimatable from industry patterns.
- **Confidence:** LOW-MEDIUM (timing is uncertain for private companies)
- **Urgency:** HIGH — 3-6 weeks before board meeting
- **Why it matters:** Executives prepare for board questions. "What are we doing about cost optimization?" is a standard board question. Ghost Tax provides a ready answer.
- **Approach angle:** "Board-ready IT cost intelligence — independent external assessment delivered before your next governance review"

#### 5D. Major Contract Renewal Window
- **Detection:** Job postings mentioning specific tool evaluations, G2 comparison shopping, LinkedIn posts about "evaluating alternatives"
- **Confidence:** HIGH (when detectable)
- **Urgency:** HIGH — 60-90 days before renewal
- **Why it matters:** Companies renegotiating a major contract (Salesforce, SAP, Microsoft EA) are in active cost-review mode. Ghost Tax provides negotiation intelligence.
- **Approach angle:** "Independent market rate assessment for your technology category — benchmark data for your upcoming renewal negotiation"

---

### 6. COMPETITIVE SIGNALS

#### 6A. Competitor Using FinOps / Cost Optimization Publicly
- **Detection:** LinkedIn posts from competitor employees, press mentions, conference presentations about FinOps initiatives
- **Confidence:** MEDIUM
- **Urgency:** MEDIUM
- **Why it matters:** If a competitor announces "we saved 30% on IT costs through optimization," every peer company's board will ask "are we doing this too?"
- **Approach angle:** "Your industry peers are actively optimizing IT costs. Independent assessment to benchmark your position."

#### 6B. Industry Analyst Report on Cost Waste
- **Detection:** Gartner, Forrester, IDC publications mentioning SaaS waste, cost optimization trends
- **Confidence:** MEDIUM
- **Urgency:** MEDIUM — creates a window of attention that lasts 4-8 weeks
- **Why it matters:** Analyst reports create board-level awareness. CFOs get asked "did you see the Gartner report about SaaS waste?"
- **Approach angle:** Reference the analyst finding and offer a company-specific assessment.

#### 6C. Regulatory Pressure on Cost Governance
- **Detection:** New regulations, industry body publications, compliance deadline announcements
- **Confidence:** MEDIUM-HIGH
- **Urgency:** Varies by compliance deadline
- **Why it matters:** DORA (EU financial services), NIS2 (critical infrastructure) — these regulations increasingly require demonstrable IT governance. Cost visibility is a governance component.
- **Approach angle:** "IT cost governance assessment — demonstrate management discipline for regulatory compliance"

---

### 7. PAIN SIGNALS

#### 7A. Job Postings Mentioning "SaaS Rationalization"
- **Detection:** LinkedIn Jobs, Indeed — search for "SaaS rationalization," "SaaS management," "tool consolidation," "application rationalization," "software asset management"
- **Confidence:** HIGH
- **Urgency:** HIGH — they've already identified the problem and are hiring to fix it
- **Why it matters:** This is the most direct signal possible. They're investing headcount in exactly the problem Ghost Tax solves.
- **Approach angle:** "We deliver the initial landscape assessment your SaaS rationalization program needs — 48-hour independent baseline instead of 3 months of internal discovery"
- **Search terms:** "SaaS rationalization" OR "SaaS optimization" OR "software asset management" OR "tool consolidation" OR "application portfolio" OR "Schatten-IT" (DE) OR "Software-Konsolidierung" (DE)

#### 7B. Job Postings Mentioning "Cloud Cost Optimization"
- **Detection:** Same as above — "cloud cost optimization," "cloud FinOps," "cloud spend management," "Cloudkosten" (DE)
- **Confidence:** HIGH
- **Urgency:** HIGH
- **Why it matters:** Cloud cost optimization roles signal active cost pressure in technology spending.
- **Approach angle:** "Independent assessment of your overall technology cost exposure — including the SaaS layer that cloud FinOps tools typically miss"

#### 7C. CFO/CIO LinkedIn Posts About Cost Pressure
- **Detection:** LinkedIn content monitoring for relevant keywords from target company executives
- **Confidence:** MEDIUM-HIGH
- **Urgency:** MEDIUM — they're thinking about it, may not be ready to act
- **Why it matters:** Executives who publicly discuss cost challenges are signaling openness to solutions.
- **Approach angle:** Engage with the content authentically, then follow up with a relevant insight (not a pitch). "Your point about hidden IT costs resonates — we've been analyzing this across [industry]. [Specific data point]."

#### 7D. Glassdoor/Kununu Reviews Mentioning Tool Frustration
- **Detection:** Glassdoor, Kununu (DACH) — search for "too many tools," "tool overload," "software chaos," "zu viele Tools"
- **Confidence:** LOW-MEDIUM (employee frustration doesn't always correlate with management awareness)
- **Urgency:** LOW
- **Why it matters:** Bottom-up signal that tool proliferation is creating operational friction, not just cost waste.
- **Approach angle:** Not directly usable (you can't tell a prospect "your employees complain about tools on Glassdoor"). But it validates targeting the company.

#### 7E. Public Budget Cuts or Cost Reduction Programs
- **Detection:** Press releases, earnings calls (public companies), industry press
- **Confidence:** HIGH
- **Urgency:** HIGH
- **Why it matters:** Announced cost reduction programs need quick wins. IT cost optimization is a classic quick win — it doesn't affect product or revenue.
- **Approach angle:** "Independent technology cost assessment — identify quick-win optimization opportunities for your cost reduction program. 48-hour delivery, no internal resource requirement."

---

## Signal Scoring Matrix

### Priority Score = Confidence x Urgency x Relevance

| Signal | Confidence | Urgency | Priority |
|--------|-----------|---------|----------|
| 7A. "SaaS rationalization" job posting | HIGH | HIGH | **CRITICAL** |
| 2A. Announced layoffs | HIGH | HIGH | **CRITICAL** |
| 1A. New CFO appointed | HIGH | HIGH | **CRITICAL** |
| 2B. Post-acquisition integration | HIGH | HIGH | **CRITICAL** |
| 1C. FinOps role posted | HIGH | MEDIUM | **HIGH** |
| 7E. Public cost reduction program | HIGH | HIGH | **CRITICAL** |
| 5D. Contract renewal window | HIGH | HIGH | **CRITICAL** |
| 2D. Division carve-out | HIGH | HIGH | **CRITICAL** |
| 4A. Stack sprawl in job postings | HIGH | MEDIUM | **HIGH** |
| 5A. Fiscal year end approaching | MEDIUM | HIGH | **HIGH** |
| 7B. Cloud cost optimization hiring | HIGH | HIGH | **CRITICAL** |
| 4D. Cloud migration announced | MEDIUM | MEDIUM-HIGH | **MEDIUM-HIGH** |
| 1B. New CIO appointed | MEDIUM-HIGH | MEDIUM | **MEDIUM-HIGH** |
| 7C. CFO/CIO posting about cost pressure | MEDIUM-HIGH | MEDIUM | **MEDIUM-HIGH** |
| 2E. New CEO appointed | MEDIUM | MEDIUM | **MEDIUM** |
| 3A. Series B+ funding (6mo ago) | MEDIUM | LOW-MEDIUM | **MEDIUM** |
| 3B. Headcount doubling | MEDIUM | MEDIUM | **MEDIUM** |
| 6C. Regulatory pressure | MEDIUM-HIGH | Variable | **MEDIUM** |
| 6A. Competitor doing FinOps publicly | MEDIUM | MEDIUM | **MEDIUM** |
| 7D. Glassdoor tool complaints | LOW-MEDIUM | LOW | **LOW** |
| 4B. Multiple G2 reviews | MEDIUM | LOW | **LOW** |

---

## Detection Automation

### Apollo Filters (Primary Tool — €49/mo budget)
- **People search:** Title changed in last 90 days + title contains (CFO OR "VP Finance" OR "Chief Financial") + company size 200-5000 + HQ in DE/UK/NL
- **Company search:** Industry filters + headcount growth >50% in 12 months + technology tags
- **Job postings:** apollo_organizations_job_postings for target companies — scan for FinOps/rationalization keywords

### LinkedIn (Free Tier)
- **Job search alerts:** "SaaS rationalization" OR "FinOps" OR "cloud cost" + location DE/UK/NL
- **People feed:** Follow CFOs and CIOs at target companies — watch for job change announcements
- **Content monitoring:** Search posts from target roles containing "cost," "optimization," "budget"

### Press Monitoring (Free)
- **Google Alerts:** Company names + "layoffs" / "restructuring" / "acquisition" / "cost reduction"
- **TechCrunch/Handelsblatt/Financial Times:** RSS feeds filtered by relevant keywords
- **layoffs.fyi:** Direct monitoring for tech layoff announcements

### Job Board Scraping (Free)
- **Indeed/LinkedIn Jobs:** Weekly search for "SaaS rationalization" OR "SaaS management" OR "FinOps" OR "Schatten-IT" in DE/UK/NL
- **Glassdoor/Kununu:** Periodic checks for tool frustration signals at target companies

---

## Signal Stacking

Single signals are suggestive. Stacked signals are actionable.

### Tier 1 Stack (Immediate Outreach — Same Day)
Any combination of:
- New CFO + announced cost cuts
- Post-acquisition + FinOps hiring
- Layoffs + SaaS rationalization job posting
- New CEO + public cost reduction program

### Tier 2 Stack (Priority Outreach — Within 1 Week)
Any combination of:
- Fiscal year end + new finance leadership
- Stack sprawl in postings + headcount doubling
- Cloud migration + cost optimization hiring
- Industry peer doing FinOps publicly + board meeting proximity

### Tier 3 Stack (Nurture / Content Engagement)
Single signals without reinforcement:
- Only a funding round (no cost pressure yet)
- Only a CIO LinkedIn post (awareness, not action)
- Only Glassdoor complaints (bottom-up, no executive awareness)

---

## Market-Specific Signal Nuances

### Germany (DACH)
- **Fiscal year:** Almost universally January-December. Budget planning peaks October-November.
- **M&A disclosure:** BaFin filings, Bundesanzeiger publications
- **Hiring signals:** Xing/LinkedIn both relevant. StepStone for job postings.
- **Language:** Job postings often in German. Search "IT-Kostenoptimierung," "SaaS-Verwaltung," "Schatten-IT," "Software-Konsolidierung," "Lizenzmanagement"
- **Cultural note:** German CFOs expect methodological rigor. The approach angle must lead with methodology, not savings promises.

### United Kingdom
- **Fiscal year:** Mixed (April-March for many, especially financial services; January-December for others). Check Companies House.
- **M&A disclosure:** Companies House filings, FCA announcements for regulated entities
- **Hiring signals:** LinkedIn dominant. Reed, Totaljobs for job postings.
- **Language:** English. Search terms straightforward.
- **Cultural note:** UK buyers are more skeptical of "AI-powered" claims. Lead with the deliverable and the speed, not the technology.

### Netherlands
- **Fiscal year:** Almost universally January-December.
- **M&A disclosure:** KvK (Chamber of Commerce) filings, AFM for regulated entities
- **Hiring signals:** LinkedIn dominant. Indeed NL for job postings.
- **Language:** Job postings often in English for international companies, Dutch for domestic. Search "IT-kostenoptimalisatie," "SaaS-beheer," "schaduw-IT"
- **Cultural note:** Dutch business culture values directness and no-nonsense value propositions. Keep the angle factual and quantitative — no dramatic framing.

---

## Signal-to-Message Translation Rules

1. **Never reference the signal source directly.** Don't say "I saw on LinkedIn that you just became CFO." Say "For finance leaders in their first quarter, we provide..."
2. **Match urgency tone to signal urgency.** Layoffs = direct, time-sensitive language. Funding round = strategic, forward-looking language.
3. **Lead with the pain, not the product.** The message should make the problem vivid before introducing Ghost Tax as the resolution.
4. **One signal per message.** Don't stack multiple signals in outreach ("I see you had layoffs AND hired a new CFO AND have a cloud migration"). Pick the strongest one.
5. **The CTA must match the signal stage.** High-urgency signals → direct to paid report. Low-urgency signals → free scan first.
