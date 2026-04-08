# Failure Postmortem Template — Strategy Failure Analysis

## Header

```
FAILURE POSTMORTEM
Title: [DESCRIPTIVE NAME — e.g., "DACH LinkedIn Campaign Q1 2026"]
Date of postmortem: [YYYY-MM-DD]
Period covered: [START DATE — END DATE]
Category: [STRATEGY / CHANNEL / PRICING / MESSAGING / ICP / PRODUCT / EXPERIMENT]
Severity: [MINOR — wasted time | MODERATE — wasted time + money | MAJOR — strategic setback]
```

---

## 1. What Failed

[One paragraph. State what was attempted, what was expected, and what actually happened. Numbers required.]

[PLACEHOLDER: e.g., "We launched a cold email campaign targeting 200 CFOs in DACH companies (200-2000 employees) between March 1-31. Expected: 15% open rate, 3% reply rate, 2 scan completions. Actual: 8% open rate, 0.5% reply rate, 0 scan completions. Total cost: 15 hours of founder time + 20 EUR Apollo credits."]

---

## 2. Timeline

| Date | Event | Signal | Action Taken |
|------|-------|--------|-------------|
| [DATE] | [What happened] | [What data showed] | [What we did about it] |
| [DATE] | [What happened] | [What data showed] | [What we did about it] |
| [DATE] | [What happened] | [What data showed] | [What we did about it] |
| [DATE] | [Failure acknowledged] | [Final data] | [Decision to stop] |

---

## 3. Root Cause Analysis

### Primary Cause
[PLACEHOLDER — the single biggest reason this failed. Be honest. Not "the market wasn't ready" but specific: "Our subject lines referenced a problem the audience didn't recognize as urgent."]

### Contributing Factors
1. [FACTOR — e.g., "Email list quality: 30% bounced, indicating stale data"]
2. [FACTOR — e.g., "Timing: Sent on Mondays, DACH email engagement peaks Tue-Thu"]
3. [FACTOR — e.g., "Message: Led with product features instead of prospect's problem"]
4. [FACTOR — e.g., "Targeting: Company size filter too broad, included companies too small to benefit"]

### What We Got Wrong

| Assumption | What We Believed | What Was True | How We Know |
|-----------|-----------------|---------------|-------------|
| [PLACEHOLDER] | [Our assumption] | [Reality] | [Evidence] |
| [PLACEHOLDER] | [Our assumption] | [Reality] | [Evidence] |
| [PLACEHOLDER] | [Our assumption] | [Reality] | [Evidence] |

---

## 4. Warning Signs We Missed

[What signals appeared early that we ignored, rationalized, or didn't notice?]

| Signal | When It Appeared | Why We Missed/Ignored It |
|--------|-----------------|-------------------------|
| [PLACEHOLDER] | [DATE/EVENT] | [PLACEHOLDER — e.g., "Attributed low open rate to A/B test noise instead of fundamental subject line problem"] |
| [PLACEHOLDER] | [DATE/EVENT] | [PLACEHOLDER] |

---

## 5. Cost of Failure

| Cost Type | Amount | Notes |
|-----------|--------|-------|
| Direct spend (EUR) | [AMOUNT] | [Tools, ads, etc.] |
| Time invested (hours) | [HOURS] | [At opportunity cost of EUR/hr] |
| Opportunity cost | [DESCRIPTION] | [What else could we have done with those resources?] |
| Reputation cost | [NONE / LOW / MODERATE / HIGH] | [Did this damage our brand or burn prospects?] |
| Data cost | [DESCRIPTION] | [Did we lose access to prospects? Burn a list?] |

**Total cost**: [EUR equivalent]

---

## 6. What We Learned

### Validated (now we know this is true)
- [LEARNING — e.g., "DACH CFOs don't respond to English-language cold emails about cost savings. Need German or different angle."]
- [LEARNING]

### Invalidated (now we know this is false)
- [LEARNING — e.g., "Subject lines with company name + 'IT exposure' don't create curiosity in DACH market."]
- [LEARNING]

### Still Unknown (failure didn't clarify this)
- [QUESTION — e.g., "Would the same message work in German? We didn't test."]
- [QUESTION]

---

## 7. Hypothesis Impact

| Hypothesis Affected | Previous Status | New Status | Change Reason |
|--------------------|----------------|------------|---------------|
| [H-XXX: Statement] | [ACTIVE / Confidence X] | [MODIFIED / KILLED / Confidence Y] | [What this failure taught us about the hypothesis] |

---

## 8. Systemic Issues

[Did this failure reveal a problem with our process, not just this specific initiative?]

| Systemic Issue | Evidence | Fix |
|---------------|---------|-----|
| [e.g., "No kill criteria set before launch"] | [We ran the campaign 4 weeks instead of killing at week 2] | [All campaigns must have pre-set kill criteria per experimentation-loop.md] |
| [e.g., "No A/B testing on small sample before full launch"] | [Sent to 200 people without testing on 20 first] | [Mandatory 20-person test batch before any campaign >50 recipients] |
| [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |

---

## 9. Recovery Plan

### Immediate Actions (This Week)
- [ ] [ACTION — e.g., "Remove bounced emails from prospect database"]
- [ ] [ACTION — e.g., "Update ICP disqualification criteria based on findings"]

### Strategic Adjustments (This Month)
- [ ] [ACTION — e.g., "Redesign DACH outreach with German-language variant"]
- [ ] [ACTION — e.g., "Test new value proposition angle on 20-person batch"]

### Prevention (Ongoing)
- [ ] [ACTION — e.g., "Add kill criteria to all campaign plans before launch"]
- [ ] [ACTION — e.g., "Weekly campaign health check against benchmarks"]

---

## 10. Should We Try Again?

```
[ ] YES — with these specific changes: [LIST CHANGES]
    Rationale: [The core idea is sound, execution was the problem]
    Modified hypothesis: [H-XXX restated]
    New experiment design: [Brief description]
    Kill criteria: [What would make us stop again]

[ ] NO — permanently kill this approach
    Rationale: [The core idea is flawed, not just execution]
    Redirect resources to: [What instead?]

[ ] NOT YET — wait for [CONDITION] before retrying
    Condition: [What needs to change before this becomes viable?]
    Check date: [When do we re-evaluate?]
```

---

## 11. Postmortem Quality Check

- [ ] Root cause is specific, not generic ("bad timing" is not a root cause)
- [ ] All numbers are included (not "it didn't work" but "0.5% reply rate vs. 3% target")
- [ ] At least one systemic issue identified (not just "this campaign failed")
- [ ] Recovery plan has specific actions, not "try harder"
- [ ] Hypothesis impact documented
- [ ] Warning signs section is honest (not "there were no warning signs")
- [ ] This postmortem was completed within 7 days of failure recognition

---

## Usage Notes

- **Do a postmortem for every failure that cost >5 hours or >50 EUR.** Small failures compound.
- **Write it while the memory is fresh.** Within 7 days of acknowledging failure.
- **No blame, just facts.** Solo founder means there's nobody to blame anyway. Focus on the system.
- **The most valuable section is "Warning Signs We Missed."** This is where future failures get prevented.
- **File postmortems chronologically.** They become your institutional memory. Pattern recognition across postmortems is where the real insight lives.
