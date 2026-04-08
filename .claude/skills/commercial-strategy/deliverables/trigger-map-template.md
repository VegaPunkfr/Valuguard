# Trigger Map Template — Signal-to-Action Mapping

## Purpose

Map observable market signals to specific actions. Every trigger has a detection method, a response, and a timeline. No signal should go unacted upon.

---

## Trigger Categories

### A. Company-Level Triggers

| # | Trigger Signal | Why It Matters | Detection Method | Action | Timeline | Priority |
|---|---------------|---------------|-----------------|--------|----------|----------|
| A1 | [e.g., New CFO/VP Finance hired] | [New finance leader audits spend in first 90 days] | [LinkedIn Sales Navigator alert, Apollo job change] | [SPECIFIC ACTION: Send cold email variant #X, trigger scan invite] | [Within 48h of detection] | [HIGH/MED/LOW] |
| A2 | [e.g., Company announced cost reduction initiative] | [Active mandate to cut costs = budget available for tools that help] | [Press monitoring, LinkedIn posts, earnings calls] | [ACTION] | [TIMELINE] | [PRIORITY] |
| A3 | [e.g., M&A announced (acquirer or target)] | [Due diligence creates urgency for IT cost visibility] | [Crunchbase alerts, press] | [ACTION] | [TIMELINE] | [PRIORITY] |
| A4 | [e.g., Major SaaS vendor raised prices] | [Affected companies actively seeking alternatives/audit] | [Vendor announcement monitoring, LinkedIn complaints] | [ACTION] | [TIMELINE] | [PRIORITY] |
| A5 | [e.g., Company posted FinOps/IT procurement job] | [Signals they know they have a problem but don't have internal capability yet] | [Job board monitoring, Apollo] | [ACTION] | [TIMELINE] | [PRIORITY] |
| A6 | [e.g., Failed compliance audit] | [Regulatory pressure creates urgency and budget] | [Industry news, regulatory filings] | [ACTION] | [TIMELINE] | [PRIORITY] |
| A7 | [e.g., Fiscal year-end approaching] | [Budget allocation decisions being made] | [Calendar-based, varies by market] | [ACTION] | [TIMELINE] | [PRIORITY] |

---

### B. Market-Level Triggers

| # | Trigger Signal | Why It Matters | Detection Method | Action | Timeline | Priority |
|---|---------------|---------------|-----------------|--------|----------|----------|
| B1 | [e.g., New regulation announced (NIS2 enforcement, DORA deadline)] | [Entire ICP segment suddenly has compliance urgency] | [Regulatory monitoring, industry publications] | [ACTION: Update messaging, create regulation-specific content] | [TIMELINE] | [PRIORITY] |
| B2 | [e.g., Major data breach at a SaaS vendor] | [Fear event drives audit demand] | [News monitoring] | [ACTION: Fast-response content, targeted outreach to affected vendor's customers] | [Within 24h] | [HIGH] |
| B3 | [e.g., Industry analyst publishes FinOps/SaaS spend report] | [Creates awareness, prospects start searching] | [Analyst publication monitoring] | [ACTION: Reference in outreach, create response content] | [TIMELINE] | [PRIORITY] |
| B4 | [e.g., Competitor raises prices or shuts down] | [Displaced customers looking for alternatives] | [Competitor monitoring] | [ACTION: Targeted campaign to affected segment] | [TIMELINE] | [PRIORITY] |
| B5 | [e.g., Economic downturn signals (layoffs, budget freezes)] | [Cost optimization becomes top priority] | [Macro indicators, industry layoff trackers] | [ACTION: Adjust messaging to emphasize ROI and quick payback] | [TIMELINE] | [PRIORITY] |

---

### C. Engagement Triggers (Prospect Behavior)

| # | Trigger Signal | Why It Matters | Detection Method | Action | Timeline | Priority |
|---|---------------|---------------|-----------------|--------|----------|----------|
| C1 | [e.g., Prospect visited pricing page 2+ times] | [Active purchase consideration] | [Website analytics] | [ACTION: Send checkout recovery email] | [Within 2h] | [HIGH] |
| C2 | [e.g., Prospect completed free scan but didn't purchase] | [Interested but not converted] | [Funnel tracking] | [ACTION: Trigger drip sequence with findings teaser] | [24h after scan] | [HIGH] |
| C3 | [e.g., Prospect opened email 3+ times] | [Interest but hesitation] | [Email tracking] | [ACTION: Send value reinforcement email] | [48h after third open] | [MED] |
| C4 | [e.g., Multiple people from same company scanned] | [Internal discussion happening] | [Domain-level tracking] | [ACTION: Send team/enterprise messaging] | [Within 24h] | [HIGH] |
| C5 | [e.g., Prospect downloaded/shared report] | [Active evaluation, possible internal champion] | [Report analytics] | [ACTION: Follow up with Rail B teaser] | [TIMELINE] | [PRIORITY] |

---

## Response Playbooks

### For Each High-Priority Trigger, Define:

```
## Playbook: [TRIGGER NAME]

Trigger: [Which signal from the map above]
Confidence: [How reliable is this signal? HIGH/MED/LOW]
False positive rate: [How often does this trigger fire without real opportunity?]

### Immediate Response (0-24h)
1. [Step 1 — e.g., Verify trigger is real, not false positive]
2. [Step 2 — e.g., Enrich prospect data via Apollo]
3. [Step 3 — e.g., Send email variant #X]

### Follow-Up (24-72h)
1. [Step 1 — e.g., Check for engagement signal]
2. [Step 2 — e.g., If no engagement, send LinkedIn connection request]

### Escalation (72h+)
1. [Step 1 — e.g., If engaged but not converted, enter drip sequence]
2. [Step 2 — e.g., If no engagement at all, mark as "cold" and re-trigger in 30 days]

### Automation
- [ ] Can this trigger be detected automatically? [YES/NO — how?]
- [ ] Can the response be automated? [YES/NO — which steps?]
- [ ] Current automation status: [MANUAL / SEMI-AUTO / FULLY AUTO]
```

---

## Trigger Prioritization Matrix

```
                    HIGH CONFIDENCE          LOW CONFIDENCE
                    (signal is reliable)     (signal is noisy)

HIGH IMPACT         AUTOMATE & ACT           TEST MANUALLY FIRST
(strong buying      immediately.             Verify 20 instances
signal)             Full playbook.           before automating.

LOW IMPACT          BATCH & SCHEDULE         IGNORE
(weak buying        Process weekly,          Not worth the effort
signal)             not in real-time.        until volume justifies it.
```

---

## Trigger Inventory Audit

Review monthly. For each trigger in the map:

- [ ] Is detection still working? (Data source still available, alerts still firing)
- [ ] Response still appropriate? (Messaging still current, action still makes sense)
- [ ] What was the conversion rate from this trigger last month?
- [ ] Should this trigger be promoted (to higher priority) or demoted?
- [ ] Any new triggers observed that aren't in the map?

---

## Seasonal Trigger Calendar

| Month | Trigger | Market | Action |
|-------|---------|--------|--------|
| Jan | [e.g., New year budget allocation] | [ALL] | [New year cost audit campaign] |
| Feb | [TRIGGER] | [MARKET] | [ACTION] |
| Mar | [e.g., Q1 close — budget underspend] | [ALL] | [Quick-win spend analysis pitch] |
| Apr | [TRIGGER] | [MARKET] | [ACTION] |
| May | [TRIGGER] | [MARKET] | [ACTION] |
| Jun | [e.g., Mid-year review, H1 close] | [DE especially] | [Half-year IT audit positioning] |
| Jul | [TRIGGER] | [MARKET] | [ACTION] |
| Aug | [TRIGGER] | [MARKET] | [ACTION] |
| Sep | [e.g., Budget planning season starts] | [ALL] | [Budget intelligence campaign] |
| Oct | [e.g., SaaS renewal season ramp-up] | [ALL] | [Renewal preparation audit pitch] |
| Nov | [e.g., Black Friday SaaS deals — hidden cost of new tools] | [US/UK] | [New tool cost analysis] |
| Dec | [e.g., Year-end compliance deadline] | [DE — GoBD/GDPR] | [Compliance cost audit] |
