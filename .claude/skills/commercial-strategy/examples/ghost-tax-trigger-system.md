# Ghost Tax — Trigger-to-Action System
## Complete Detection, Scoring, and Response Framework

---

## 1. Trigger Inventory

### 18 Observable Triggers with Full Specification

---

### T01: New CFO/VP Finance Hired

**Signal**: Executive with finance title starts at target company
**Detection Method**: 
- Apollo "changed jobs" filter (Title: CFO/VP Finance/Finance Director, changed jobs in last 30 days)
- LinkedIn job change notifications (follow target company pages)
- Press releases for C-level appointments
**Confidence**: 95% — job changes are highly reliable signals
**Urgency**: HIGH — first 90 days is the decision window. They're auditing everything.
**Action**: 
1. Run free scan on their domain within 24h
2. Send personalized email within 48h referencing their new role
3. Follow-up at day 7 if no response
**Apollo Credits**: 1 credit (enrichment)
**Worth It?**: YES — highest-conversion trigger. Spend credits freely here.

**Email Angle**: "Congratulations on the new role at {company}. Many CFOs in their first 90 days want a quick external view of IT cost exposure. We ran a preliminary analysis on {company} — happy to share the summary. No system access needed, takes 2 minutes to review."

---

### T02: Funding Round Announced (Series A-D)

**Signal**: Company raises new round, especially Series B+ where cost discipline becomes expected
**Detection Method**:
- Apollo funding filter (Funding: last 90 days)
- Crunchbase alerts
- TechCrunch / EU-Startups / Gruenderszene RSS feeds
- LinkedIn announcements from founders
**Confidence**: 99% — funding is public record
**Urgency**: MEDIUM-HIGH — post-funding audit typically happens within 60 days
**Action**:
1. Run free scan
2. Email CFO within 1 week of announcement
3. Angle: cost discipline post-raise
**Apollo Credits**: 1 credit
**Worth It?**: YES — recently funded = has budget AND motivation to optimize

**Email Angle**: "After raising {round}, {company} has a great opportunity to benchmark IT costs against peer companies. We noticed {specific observation from scan}. Happy to share a full analysis — EUR 590, 48h, zero system access."

---

### T03: Layoffs / Headcount Reduction Announced

**Signal**: Company announces layoffs, hiring freeze, or restructuring
**Detection Method**:
- News alerts (Google Alerts for "[company name] layoffs", "Stellenabbau")
- LinkedIn posts about layoffs
- Layoffs.fyi, Trueup.io trackers
- Job posting count drops (Apollo or LinkedIn)
**Confidence**: 85% — some restructurings are quiet
**Urgency**: HIGH — active cost-cutting mode, receptive to any savings lever
**Action**:
1. Wait 2 weeks after announcement (too soon feels predatory)
2. Run free scan
3. Email with "savings without headcount cuts" angle
**Apollo Credits**: 1 credit
**Worth It?**: YES — but timing/tone is critical. Don't be a vulture.

**Email Angle**: "{Company} is clearly focused on efficiency. One lever we help companies explore is IT cost structure — specifically SaaS spend, vendor overlap, and contract terms. Our analysis uses only external signals, takes 48h, and typically identifies 10-15% in spend worth investigating. No disruption to your team."

---

### T04: CTO/CIO Departure

**Signal**: Head of technology leaves the company
**Detection Method**:
- LinkedIn job changes
- Press releases
- Apollo alerts on key contacts
**Confidence**: 90%
**Urgency**: HIGH — power vacuum creates audit opportunity. CFO temporarily has more IT oversight.
**Action**:
1. Run free scan immediately
2. Email CFO within 1 week
3. Angle: "visibility during transition"
**Apollo Credits**: 1 credit
**Worth It?**: YES — organizational transitions are prime buying windows

**Email Angle**: "During technology leadership transitions, many CFOs want an independent view of IT cost exposure. We provide external intelligence on vendor relationships, spend patterns, and blind spots — delivered in 48h, no system access required."

---

### T05: Major Vendor Contract Renewal (Detectable)

**Signal**: Company's tech stack shows a vendor relationship likely up for renewal
**Detection Method**:
- Job postings mentioning vendor migration or evaluation
- LinkedIn posts about vendor changes
- Press releases about partnership renewals
- Technology review sites (G2, Gartner Peer Insights)
**Confidence**: 40% — renewal timing is usually not public
**Urgency**: MEDIUM — useful but timing is uncertain
**Action**:
1. Include in general outbound, not triggered action
2. Reference the specific vendor in email
**Apollo Credits**: 0 (use existing enrichment data)
**Worth It?**: Only if combined with another trigger

**Email Angle**: "We noticed {company} uses {vendor}. With {vendor} renewals often coming with 20-40% increases, an independent benchmark can strengthen your negotiation position."

---

### T06: Rapid Headcount Growth (>30% in 12 months)

**Signal**: Company is growing fast, implying SaaS sprawl and uncontrolled IT procurement
**Detection Method**:
- Apollo employee count filter (growth rate)
- LinkedIn company page employee count trends
- Job posting volume (10+ open positions)
**Confidence**: 80%
**Urgency**: MEDIUM — problem is building but CFO may not feel it yet
**Action**:
1. Run free scan
2. Email with "growth creates blind spots" angle
3. Lower urgency — can batch with weekly outbound
**Apollo Credits**: 1 credit
**Worth It?**: YES — high-growth companies have the most waste and the budget to address it

**Email Angle**: "{Company} has grown significantly. In our experience, companies that grow 30%+ in a year accumulate 15-25% in redundant or underutilized SaaS tools. Our external analysis identifies these patterns without disrupting your team."

---

### T07: New Compliance/Audit Role Posted

**Signal**: Company hiring for compliance, internal audit, FinOps, or IT governance roles
**Detection Method**:
- Job board monitoring (LinkedIn Jobs, Indeed, StepStone for DACH)
- Apollo job posting data
- Google Alerts for "[company] + compliance + hiring"
**Confidence**: 75% — the role may be for different compliance area
**Urgency**: MEDIUM — they're building governance capability, receptive to tools
**Action**:
1. Run free scan
2. Email CFO with "complement your governance initiative" angle
**Apollo Credits**: 1 credit
**Worth It?**: YES — signals budget and attention for IT cost governance

**Email Angle**: "We noticed {company} is building out [compliance/governance] capability. Our IT cost intelligence report provides an external baseline that complements internal audit — useful as a starting point or independent validation."

---

### T08: Board Member with FinOps/Cost Background Joins

**Signal**: New board member with consulting, finance, or operational efficiency background
**Detection Method**:
- Press releases about board appointments
- LinkedIn monitoring of target companies
- Company website board page changes
**Confidence**: 70%
**Urgency**: MEDIUM — board influence takes months to manifest
**Action**:
1. Note in CRM, include in next outbound batch
2. Reference board composition in email if relevant
**Apollo Credits**: 0 (public information)
**Worth It?**: Only as enrichment data for other triggers

---

### T09: Negative Glassdoor/Blind Reviews About Tools or Processes

**Signal**: Employees complaining about too many tools, tool fatigue, IT bureaucracy
**Detection Method**:
- Glassdoor monitoring (quarterly spot checks)
- Blind app monitoring
- Reddit mentions
**Confidence**: 50% — reviews may be outliers
**Urgency**: LOW — interesting context but not an action trigger alone
**Action**:
1. Note in company profile
2. Use as personalization data in outreach
**Apollo Credits**: 0
**Worth It?**: Only as enrichment, never as sole trigger

---

### T10: Competitor of Existing Client Identified

**Signal**: After analyzing Company A, their direct competitor Company B becomes a target
**Detection Method**:
- Manual mapping of competitive landscapes
- Apollo "similar companies" feature
- Industry reports
**Confidence**: 80% — competitors face similar cost structures
**Urgency**: MEDIUM-HIGH — can leverage "your competitor benchmarked their costs" angle
**Action**:
1. Run free scan on competitor
2. Email with "industry benchmark" angle (never reveal the original client)
**Apollo Credits**: 1 credit
**Worth It?**: YES — competitive intelligence angle is powerful for DACH companies

**Email Angle**: "We've been analyzing IT cost structures across the {industry} sector. Companies of {company}'s size and profile typically have {finding}. Happy to share how {company} compares."

---

### T11: Company Mentioned in FinOps/Cost Optimization Press

**Signal**: Company quoted in articles about cost management, SaaS optimization, budget discipline
**Detection Method**:
- Google Alerts for company names + cost-related keywords
- Trade publication RSS feeds (CFO Magazine, Finance Magazin for DACH)
**Confidence**: 60%
**Urgency**: LOW-MEDIUM — signals awareness but not necessarily buying intent
**Action**:
1. Add to outbound list
2. Reference the article in email
**Apollo Credits**: 1 credit
**Worth It?**: MAYBE — only if company fits ICP well

---

### T12: SaaS Stack Change Detected

**Signal**: Company migrates or adds major SaaS tool (visible via job postings, integrations, tech stack databases)
**Detection Method**:
- BuiltWith / Wappalyzer tech stack changes
- Job postings mentioning new tools ("experience with Workday required")
- Integration announcements
**Confidence**: 65%
**Urgency**: MEDIUM — stack changes = procurement activity = CFO attention on IT spend
**Action**:
1. Note specific tools in company profile
2. Reference in outbound email
**Apollo Credits**: 0 (public information)
**Worth It?**: As enrichment for other triggers

---

### T13: Fiscal Year End Approaching (Budget Cycle)

**Signal**: Company's fiscal year end is approaching (typically Dec 31 for DACH, varies for UK/NL)
**Detection Method**:
- Annual report publication dates
- Known fiscal year calendars by company
- General calendar awareness: Q4 for Dec FY, Q1 for March FY
**Confidence**: 95% (for known FY companies)
**Urgency**: MEDIUM — budget planning happens 2-3 months before FY end
**Action**:
1. Email CFO 2-3 months before FY end
2. Angle: "input for next year's IT budget"
**Apollo Credits**: 0 (use existing enrichment)
**Worth It?**: YES — natural budget conversation timing

**Email Angle**: "With {company}'s budget planning underway, an external IT cost benchmark can help calibrate next year's IT allocation. Our analysis delivers in 48h — useful input before budget lock."

---

### T14: Acquisition or Merger Announced

**Signal**: Company announces acquisition, merger, or is acquired
**Detection Method**:
- Press releases, Crunchbase alerts
- LinkedIn announcements
- M&A news feeds
**Confidence**: 99%
**Urgency**: HIGH — integration creates massive IT cost overlap and waste
**Action**:
1. Run free scan on both entities
2. Email CFO/integration lead within 2 weeks of announcement
3. Angle: "IT cost overlap assessment for integration planning"
**Apollo Credits**: 2 credits (both entities)
**Worth It?**: YES — M&A is the highest-value trigger for potential Rail B/C upsell

**Email Angle**: "Post-acquisition IT cost overlap is one of the largest and least visible integration costs. We can provide an external assessment of the combined tech stack — useful for integration planning without slowing down due diligence."

---

### T15: Company Appears on "Fastest Growing" or "Best Workplace" Lists

**Signal**: Company featured on growth lists (Deloitte Fast 50, FT 1000, etc.)
**Detection Method**:
- Annual list publications
- Press mentions
**Confidence**: 95%
**Urgency**: LOW — vanity trigger, but indicates growth-stage company with budget
**Action**:
1. Add to outbound list
2. Congratulatory angle
**Apollo Credits**: 1 credit
**Worth It?**: MAYBE — low conversion but easy to batch

---

### T16: SOC 2 / ISO 27001 Certification Pursuit

**Signal**: Company pursuing or recently achieving security certification
**Detection Method**:
- Job postings for compliance roles
- Press releases about certification
- LinkedIn posts from CISO/CTO
**Confidence**: 70%
**Urgency**: MEDIUM — compliance mindset = receptive to governance tools
**Action**:
1. Run free scan
2. Email with governance/compliance angle
**Apollo Credits**: 1 credit
**Worth It?**: YES — compliance-minded companies value external validation

---

### T17: CFO/Finance Team Posting Content About Cost Management

**Signal**: Target CFO is actively posting about or engaging with cost optimization content on LinkedIn
**Detection Method**:
- LinkedIn monitoring of target contacts
- Content engagement tracking
**Confidence**: 85% — active thought = active need
**Urgency**: HIGH — they're thinking about this right now
**Action**:
1. Engage with their content (genuine comment, not sales pitch)
2. DM after 2-3 engagements with soft offer
3. Run free scan and share results
**Apollo Credits**: 0 (organic engagement)
**Worth It?**: YES — warm lead via content engagement

---

### T18: Industry Regulatory Change Affecting IT Spend

**Signal**: New regulation impacts IT cost reporting, procurement, or governance (e.g., NIS2, DORA, AI Act)
**Detection Method**:
- Regulatory news feeds
- Industry association publications
- Government gazette monitoring
**Confidence**: 99% (regulation is public)
**Urgency**: MEDIUM — regulation creates need but timeline is usually long
**Action**:
1. Create content about the regulatory impact on IT costs
2. Email targeted companies in affected sectors
3. Angle: "assess your exposure before compliance deadline"
**Apollo Credits**: batch targeting
**Worth It?**: YES — regulation is a non-dismissible trigger

---

## 2. Apollo Search Queries by Trigger

### High-Priority Queries (Spend Credits on These)

```
QUERY 1: New CFO Hires (DACH)
- Title: CFO, VP Finance, Finance Director, Kaufmännischer Leiter, Leiter Finanzen
- Changed jobs: Last 30 days
- Company size: 50-500
- Industry: Software, SaaS, Financial Services, IT Services
- Location: Germany, Austria, Switzerland
- Expected results: 5-15/month
- Credits: 5-15/month

QUERY 2: Recently Funded (DACH + UK)
- Title: CFO, VP Finance
- Company funding: Last 90 days, Series A-D
- Company size: 50-500
- Industry: Software, SaaS, Fintech
- Location: Germany, UK, Netherlands
- Expected results: 10-30/month
- Credits: 10-30/month

QUERY 3: High-Growth Companies (DACH + UK)
- Title: CFO, VP Finance
- Company employee growth: >30% in last 12 months
- Company size: 100-800
- Industry: Technology, Software
- Location: Germany, UK, Netherlands
- Expected results: 15-40/month
- Credits: 15-40/month

QUERY 4: Fintech CFOs (All Target Markets)
- Title: CFO, VP Finance, Head of Finance
- Company size: 50-500
- Industry: Financial Services, Fintech
- Location: Germany, UK, Netherlands, Austria, Switzerland
- Expected results: 20-50/month
- Credits: 20-50/month
```

### Monthly Credit Budget Allocation (385 credits)

| Query | Credits/Month | Priority |
|-------|--------------|----------|
| New CFO hires | 50 | P0 — always run |
| Recently funded | 50 | P0 — always run |
| High-growth companies | 80 | P1 — run if budget allows |
| Fintech CFOs | 80 | P1 — run if budget allows |
| Re-enrichment (follow-ups) | 50 | P1 — nurture existing |
| Reserve for triggered lookups | 75 | P2 — manual trigger responses |
| **Total** | **385** | |

---

## 3. LinkedIn Monitoring Signals

### What to Monitor (Free Methods)

**Company Page Follows** (set up for top 50 target companies):
- New executive announcements
- Funding/milestone posts
- Headcount change indicators
- Technology partnership announcements

**Hashtag/Keyword Monitoring**:
- #FinOps, #SaaSManagement, #ITCostOptimization
- #CFO, #DigitalTransformation (in DACH context)
- "SaaS audit", "software spend", "vendor consolidation"
- "Stellenabbau" (layoffs in German)

**Individual Follow** (top 100 target CFOs):
- Content they post about costs, efficiency, budgets
- Job change announcements
- Content they engage with (like, comment, share)

### LinkedIn Signal Scoring

| Signal | Score | Action |
|--------|-------|--------|
| CFO posts about cost management | 8/10 | DM within 48h |
| CFO changes jobs | 9/10 | Email + free scan immediately |
| Company posts about growth milestone | 5/10 | Add to outbound list |
| CFO engages with FinOps content | 7/10 | Comment on their activity, then DM |
| Company posts about new tool adoption | 4/10 | Note in profile, use as personalization |
| CFO posts about board presentation | 6/10 | Email with "board-ready analysis" angle |

---

## 4. Job Board Monitoring Signals

### High-Value Job Postings to Watch For

| Job Title Pattern | Signal Strength | What It Means |
|-------------------|----------------|---------------|
| "FinOps Engineer/Manager" | 9/10 | Company is formalizing IT cost management — receptive to tools |
| "IT Procurement Manager" | 8/10 | Building procurement capability — needs benchmarks |
| "VP Finance" (new role, not replacement) | 8/10 | Finance team growing — budget available |
| "Cloud Cost Analyst" | 7/10 | Cloud spend is a problem they're trying to solve |
| "Internal Audit Manager" | 6/10 | Governance mindset — receptive to external validation |
| "SaaS Administrator" | 5/10 | SaaS sprawl acknowledged — may be interested in analysis |
| Job posting mentions "cost optimization" | 7/10 | Active cost initiative underway |
| Job posting mentions specific vendor evaluation | 6/10 | Procurement activity — benchmark useful |

### Monitoring Methods

1. **LinkedIn Jobs**: Weekly search for "FinOps" + "CFO" + "IT procurement" in DACH/UK/NL
2. **StepStone/Indeed (DACH)**: Weekly search for "Kostenoptimierung IT", "SaaS Management"
3. **Google Alerts**: "[company name] hiring finance" for top 50 targets
4. **Apollo job posting data**: Available via API, check for target companies

---

## 5. Press/News Monitoring Signals

### Keywords to Monitor

**English**:
- "{company name} + cost reduction / cost optimization / restructuring"
- "{company name} + SaaS spending / software audit / IT budget"
- "{company name} + layoffs / hiring freeze / efficiency"
- "{company name} + funding / series / acquisition / merger"
- "{company name} + new CFO / new CTO / leadership change"

**German**:
- "{company name} + Kostensenkung / Kostenoptimierung"
- "{company name} + SaaS / Softwarekosten / IT-Budget"
- "{company name} + Stellenabbau / Einstellungsstopp"
- "{company name} + Finanzierung / Übernahme / Fusion"
- "{company name} + neuer CFO / Geschäftsführer Finanzen"

### Monitoring Setup (Free)

1. **Google Alerts**: Set up 20 alerts for top target companies + generic terms
2. **Feedly/RSS**: Subscribe to Gruenderszene, Finance Magazin, Tech.eu, Sifted, TechCrunch
3. **Twitter/X lists**: Follow DACH tech journalists and VC accounts

---

## 6. Trigger Scoring Matrix

### Which Triggers Justify Spending Apollo Credits?

| Trigger | Score /10 | Spend Credits? | Max Credits |
|---------|----------|----------------|-------------|
| T01: New CFO | 10 | YES | 3 (enrichment + research) |
| T02: Funding round | 9 | YES | 2 |
| T03: Layoffs | 8 | YES | 1 |
| T04: CTO departure | 8 | YES | 1 |
| T14: M&A announced | 9 | YES | 3 |
| T06: Rapid growth | 7 | YES | 1 |
| T07: Compliance hiring | 6 | YES | 1 |
| T17: CFO posting about costs | 8 | NO (organic) | 0 |
| T13: Budget cycle | 6 | NO (batch) | 0 |
| T05: Vendor renewal | 4 | NO | 0 |
| T09: Glassdoor reviews | 3 | NO | 0 |
| T08: Board change | 4 | NO | 0 |
| T15: Growth list | 3 | NO | 0 |

### Composite Scoring

When multiple triggers apply to the same company, scores compound:
- 2 triggers = multiply by 1.5x
- 3+ triggers = multiply by 2x
- Example: New CFO (10) + Recent funding (9) = (10+9) x 1.5 = 28.5 — top priority target

---

## 7. Trigger-to-Message Mapping

### Complete Message Framework by Trigger

**Format**: Each message has a subject line, opening hook, bridge, offer, and close. All follow the rules: specific, honest, no fake urgency, no call required.

---

**T01: New CFO**

Subject: "External IT cost view for your first 90 days"

> Hi {first_name},
>
> Congratulations on joining {company} as {title}. 
>
> In the first 100 days, most CFOs want a quick read on cost structure — especially areas like IT spend where the outgoing team may not have left great documentation.
>
> We provide external IT cost intelligence: using public signals and market data, we map vendor relationships, benchmark spend against peers, and identify blind spots. No system access, no IT team involvement, delivered in 48h.
>
> I ran a preliminary scan on {company_domain} — happy to share the summary if useful. The full analysis is EUR {price}.
>
> {signature}

---

**T02: Post-Funding**

Subject: "IT cost benchmark for {company} post-{round}"

> Hi {first_name},
>
> After a {round_type}, most boards start asking sharper questions about cost structure. IT spend — especially SaaS and cloud — is often the least audited category.
>
> We analyzed {company_domain} externally and noticed {specific_observation}. Across similar {industry} companies at your stage, we typically see {benchmark_stat}.
>
> Full analysis: EUR {price}, 48h delivery, zero system access. Happy to share the preliminary results first.
>
> {signature}

---

**T03: Post-Layoffs (Send 2 weeks after announcement)**

Subject: "Efficiency lever beyond headcount"

> Hi {first_name},
>
> {Company} has been making tough decisions. One area that often contains significant optimization potential without further team impact is IT cost structure.
>
> Our external analysis typically identifies 10-15% of IT spend worth investigating — SaaS overlap, unused licenses, above-market contract terms. Uses only public signals, no IT team involvement.
>
> EUR {price}, 48h delivery. Happy to share what we see from the outside first.
>
> {signature}

---

**T04: CTO/CIO Departure**

Subject: "IT cost visibility during leadership transition"

> Hi {first_name},
>
> During technology leadership transitions, IT cost structure often becomes a temporary blind spot for finance teams.
>
> We provide an external IT cost analysis that doesn't depend on internal IT cooperation — useful precisely in transition periods. Based on public signals and market benchmarks, delivered in 48h.
>
> I ran a preliminary scan on {company_domain}. Happy to share the summary.
>
> {signature}

---

**T06: Rapid Growth**

Subject: "SaaS sprawl check for {company}"

> Hi {first_name},
>
> {Company} has grown significantly over the past year. In our experience, companies growing at your pace accumulate 15-25% in redundant or underutilized SaaS tools — simply because procurement doesn't scale linearly with headcount.
>
> We analyze this externally: no system access, no IT team disruption, 48h delivery. Our preliminary scan of {company_domain} flagged {observation_count} areas worth examining.
>
> Full report: EUR {price}. Happy to share the preliminary view first.
>
> {signature}

---

**T14: M&A**

Subject: "IT cost overlap: {company} + {acquired_company}"

> Hi {first_name},
>
> Post-acquisition IT integration is one of the largest hidden cost centers. Based on our external analysis of both {company} and {acquired_company}, there appear to be several areas of tech stack overlap worth quantifying.
>
> We can provide a combined IT cost landscape assessment — useful for integration planning. EUR {price} per entity, 48h delivery, no system access on either side.
>
> Happy to share preliminary findings.
>
> {signature}

---

## 8. Trigger Response Time SLAs

| Trigger Priority | Detection-to-Scan | Scan-to-Email | Follow-up |
|-----------------|-------------------|---------------|-----------|
| P0 (New CFO, M&A, Layoffs) | Within 24h | Within 48h | Day 7 |
| P1 (Funding, Growth, CTO exit) | Within 48h | Within 72h | Day 10 |
| P2 (Compliance, Budget cycle) | Within 1 week | Batch with weekly outbound | Day 14 |
| P3 (Context enrichment only) | No scan needed | Include in next batch | No follow-up |

### Weekly Trigger Processing Workflow

**Monday**:
1. Review all triggers detected in past week
2. Score and prioritize
3. Run free scans on P0 and P1 targets
4. Queue emails for Tuesday-Thursday send window

**Tuesday-Thursday**:
1. Send triggered emails (9:30-11:30 local time)
2. Respond to any replies within 4h
3. Process any new P0 triggers immediately

**Friday**:
1. Review trigger hit rates and conversion
2. Adjust monitoring parameters
3. Update trigger scoring based on results
