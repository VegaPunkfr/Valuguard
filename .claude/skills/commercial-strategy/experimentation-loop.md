# Experimentation Loop — Strategic Hypothesis Journal

## Purpose

Every strategic decision is a bet. This system forces explicit tracking of what we believe, why we believe it, what evidence would change our mind, and what actually happened. Without this, strategy is just vibes.

---

## Hypothesis Journal Format

Each hypothesis gets one entry. Update it as evidence arrives.

```
### H-[NUMBER]: [ONE-LINE HYPOTHESIS]

Status: ACTIVE | VALIDATED | KILLED | MODIFIED | INSUFFICIENT DATA
Date opened: [YYYY-MM-DD]
Date closed: [YYYY-MM-DD or —]

**Hypothesis**: [Clear, falsifiable statement. "We believe that [X] will cause [Y] within [timeframe]."]

**Confidence level**: [1-5]
  1 = Wild guess, no data
  2 = Directional signal, limited evidence
  3 = Reasonable bet, some supporting data
  4 = Strong conviction, multiple signals
  5 = Near-certain, validated by direct evidence

**Reason for bet**: [Why do we believe this? What prior evidence, analogy, or logic supports it?]

**Asset concerned**: [Which part of the business does this affect? Pricing, messaging, channel, ICP, product, funnel step, etc.]

**Expected signal**: [What specific, observable thing should happen if the hypothesis is true? Be precise. "Conversion rate above 3%" not "people like it."]

**Signal timeline**: [When should we expect to see the signal? Days, weeks, months.]

**Minimum viable experiment**: [Smallest possible test to generate signal. Budget, time, effort required.]

**Observed signal**: [What actually happened? Raw data, not interpretation.]

**Verdict**: KEEP | KILL | MODIFY | NOT ENOUGH EVIDENCE
  - KEEP: Hypothesis confirmed. Double down.
  - KILL: Hypothesis falsified. Stop investing. Redirect resources.
  - MODIFY: Partially right. Adjust the hypothesis and re-test.
  - NOT ENOUGH EVIDENCE: Experiment was too small, too short, or poorly designed. Redesign and retry.

**Consequence**: [What changes as a result of this verdict? Be specific: budget shifts, messaging changes, channel abandonment, price adjustment, etc.]

**Next action**: [Concrete next step with owner and deadline.]
```

---

## Ghost Tax Starter Hypotheses

### H-001: DACH CFOs will pay 590 EUR for external IT exposure briefing

Status: ACTIVE
Date opened: 2026-04-07

**Hypothesis**: CFOs at mid-market DACH companies (200-2000 employees) will pay 590 EUR for a Ghost Tax Decision Pack analyzing their external IT cost exposure, delivered in 48h with zero system access required.

**Confidence level**: 3 — Supported by: SaaS budget cuts at 42%, FinOps adoption at 90%, 590 EUR is below discretionary spend threshold for DACH finance leaders. No direct sales data yet.

**Reason for bet**: DACH companies over-index on process rigor and documentation. A structured external audit with concrete EUR findings fits their decision culture. 590 EUR is an expense-report purchase, not a procurement event.

**Asset concerned**: Pricing (Rail A DACH), Market entry strategy

**Expected signal**: >2% conversion from free scan to paid report for DACH-targeted traffic. Average time-to-purchase <72h from first scan.

**Signal timeline**: First 30 days of active outreach to DACH prospects.

**Minimum viable experiment**: 50 DACH-targeted free scans via cold email campaign. Track scan-to-checkout conversion. Cost: time + Apollo credits only.

**Observed signal**: [PENDING]

**Verdict**: [PENDING]

**Consequence**: [PENDING]

**Next action**: Launch DACH cold email sequence targeting 50 CFOs. Measure scan completion and checkout initiation.

---

### H-002: Free scan converts at 3-5% to Rail A

Status: ACTIVE
Date opened: 2026-04-07

**Hypothesis**: The free intelligence scan (/intel) will convert between 3% and 5% of completions into a paid Rail A Decision Pack purchase.

**Confidence level**: 2 — Industry benchmarks for freemium-to-paid in B2B SaaS are 2-5%. Our scan delivers immediate value (findings preview) which should create urgency. But we have zero conversion data.

**Reason for bet**: The scan shows enough to prove the problem exists but not enough to solve it. The gap between "you have a problem" and "here's the fix" is worth 490 EUR to a CFO who just saw real numbers.

**Asset concerned**: Funnel architecture, Revenue model viability

**Expected signal**: Conversion rate between 3% and 5% measured over minimum 200 scan completions.

**Signal timeline**: 60 days from first traffic.

**Minimum viable experiment**: Drive 200 scan completions from mixed sources (cold email, LinkedIn, organic). Track funnel: visit > scan start > scan complete > checkout > purchase. Cost: traffic generation effort.

**Observed signal**: [PENDING]

**Verdict**: [PENDING]

**Consequence**: If below 2%, scan value proposition or report positioning needs rework. If above 5%, accelerate traffic investment.

**Next action**: Instrument full-funnel tracking. Ensure every scan completion triggers checkout prompt with clear value gap messaging.

---

### H-003: The Decision Pack circulates internally and generates Rail B inquiries

Status: ACTIVE
Date opened: 2026-04-07

**Hypothesis**: CFOs who purchase a Rail A Decision Pack will share it with 2+ internal stakeholders, and at least 10% of Rail A buyers will inquire about deeper analysis (Rail B) within 30 days.

**Confidence level**: 2 — CFO memos circulate by nature of the role. The Decision Pack is designed as a boardroom-ready document. But we have no proof of internal sharing behavior yet.

**Reason for bet**: The Decision Pack format (executive summary, findings, recommendations, EUR impact) mirrors the documents CFOs already circulate to CIO/CTO/board. It's designed to create internal demand.

**Asset concerned**: Revenue model (Rail A-to-B conversion), Product design (report format)

**Expected signal**: Rail B inquiry rate >10% from Rail A buyers. Evidence of forwarding (multiple users from same domain accessing report, or explicit "my CFO shared this" in inquiry).

**Signal timeline**: 30-60 days after first 20 Rail A deliveries.

**Minimum viable experiment**: Deliver 20 Rail A reports. Include trackable links. Add "Share with your team" CTA inside the report. Monitor inquiry source.

**Observed signal**: [PENDING]

**Verdict**: [PENDING]

**Consequence**: If confirmed, optimize report for shareability (add team-specific sections). If killed, Rail B needs its own acquisition channel.

**Next action**: Design report with embedded sharing mechanism and tracking.

---

## Running Minimum Viable Experiments

### Principles

1. **Smallest possible test.** If you can learn the same thing with 20 data points instead of 200, use 20.
2. **Time-box everything.** No experiment runs indefinitely. Set a deadline before you start.
3. **One variable at a time.** Testing price AND messaging AND channel simultaneously tells you nothing.
4. **Measure behavior, not opinions.** "Would you buy this?" is worthless. "Did they click checkout?" is data.
5. **Pre-commit to the decision.** Before running the experiment, write down: "If [result], we will [action]." This prevents post-hoc rationalization.

### MVE Design Template

```
Experiment: [NAME]
Hypothesis: H-[XXX]
What we're testing: [Single variable]
How we're testing: [Method]
Sample size needed: [N — use minimum detectable effect calculators for conversion tests]
Duration: [X days/weeks]
Cost: [EUR, time, opportunity cost]
Success criteria: [Specific metric > specific threshold]
Failure criteria: [Specific metric < specific threshold]
Decision rule: [If success → do X. If failure → do Y. If ambiguous → do Z.]
```

### Cost Guardrails for Ghost Tax (Pre-Revenue)

- **Zero-cost experiments first**: Cold email (Apollo free tier), LinkedIn organic, landing page A/B tests
- **Maximum per-experiment budget**: 50 EUR until first paying customer
- **Time budget**: No experiment should consume more than 1 full day of founder time to set up
- **Kill fast**: If an experiment shows clear negative signal in 48h, don't wait for the planned duration

---

## Signal Quality: Leading vs. Lagging

### Leading Indicators (act on these fast)
- Scan completion rate (do people finish the free scan?)
- Time-on-page for results (are they reading the findings?)
- Checkout page visits (are they considering purchase?)
- Email reply rate (are prospects engaging?)
- Report download/open rate (are buyers consuming the deliverable?)

### Lagging Indicators (confirm direction, don't steer by these alone)
- Revenue (by the time you measure monthly revenue, the decisions that caused it are weeks old)
- Rail B conversion rate (depends on Rail A volume which depends on earlier funnel)
- Churn/repeat purchase (requires months of data)
- NPS or satisfaction (requires delivered customers)

### Signal Hierarchy

```
STRONGEST: Money moved (purchase, upgrade, expansion)
STRONG:    Time invested (completed scan, read full report, replied to email)
MODERATE:  Attention given (clicked link, visited page, opened email)
WEAK:      Stated intent ("I'd be interested", "send me info")
WORTHLESS: Compliments ("great idea", "interesting concept")
```

---

## When to Pivot vs. When to Persist

### Persist when:
- Leading indicators are positive but lagging indicators haven't caught up yet
- Sample size is genuinely too small (less than statistical significance)
- The experiment was poorly executed (wrong audience, broken tracking, bad timing)
- You have a clear explanation for underperformance AND a testable fix

### Pivot when:
- Multiple experiments testing the same hypothesis all show negative signal
- Leading AND lagging indicators are both negative
- The cost to continue testing exceeds the potential upside of being right
- Market conditions have changed since the hypothesis was formed
- You've modified the hypothesis 3+ times without improvement

### Red Flags That Demand Immediate Pivot
- Zero scan completions after 100+ visits (value prop is broken)
- Zero checkout initiations after 50+ scan completions (pricing or positioning is broken)
- Zero email replies after 200+ sends (messaging or targeting is broken)
- Prospect feedback consistently identifies a problem you can't solve (market mismatch)

---

## Experiment Cadence

- **Weekly**: Review active experiments, update observed signals
- **Bi-weekly**: Verdict check — any experiment ready for KEEP/KILL/MODIFY?
- **Monthly**: Portfolio review — are we testing the right things? See revision-protocol.md
- **On any KILL verdict**: Immediately identify what replaces the killed bet
