# Offer Architecture — Ghost Tax Commercial Strategy

## What Ghost Tax Actually Sells

**What the buyer thinks they're buying:** A report that tells them how much money they're wasting on IT vendors.

**What Ghost Tax actually sells:** A decision-forcing artifact. A document that gives a CFO permission to act — to renegotiate, consolidate, or kill contracts — without commissioning a 6-month internal audit or hiring Big 4.

The distinction matters. A "report" competes with other reports. A "decision artifact" competes with inaction. Inaction is the real competitor, not Zylo or Gartner.

---

## The Three Rails

### Rail A — The Door (€490 / €590 DACH)

**What it is:** Ghost Tax Decision Pack. External-only analysis of a company's IT cost exposure based on public signals, benchmark data, and AI inference. Delivered as a structured PDF/digital report within 48 hours.

**What it contains:**
- Estimated annual IT spend vs. industry benchmark
- Vendor exposure map (identified contracts, estimated values)
- Cost anomaly flags (where spend deviates from norm)
- Negotiation leverage indicators per vendor
- Confidence levels on every estimate (low/medium/high)
- 3-5 specific action items with estimated savings range
- Executive summary a CFO can forward to their board

**What it explicitly excludes:**
- Access to internal systems (no credentials, no integrations)
- Guaranteed accuracy (it's intelligence, not audit)
- Implementation support
- Vendor negotiation execution
- Ongoing monitoring

**Why it must be self-serve:**
- Solo founder, no sales team, no calls
- €490 is below CFO discretionary spend threshold — no committee needed
- Friction kills conversion at this price point. Every form field, every "schedule a demo" button, every "talk to sales" link is a leak
- The checkout must be: enter domain → see free scan teaser → pay → get report in 48h

**The one-sentence test:** "I paid €490 and got a report showing we're overspending €340K/year on IT vendors, with specific renegotiation opportunities." If a CFO can't say that, the offer is unclear.

### Rail B — The Value (€4,990)

**What it is:** IT Cost Stabilization engagement. Takes the findings from Rail A and builds a 90-day action plan with deeper analysis, vendor-specific negotiation briefs, and priority sequencing.

**What it contains:**
- Everything in Rail A, refined with any additional data the client shares
- Vendor-by-vendor negotiation playbook
- Contract renewal calendar with optimal timing
- Consolidation opportunities mapped
- Priority matrix: what to kill, renegotiate, or consolidate first
- ROI projection per action item
- Board-ready memo format

**When to offer Rail B:**
- Only after Rail A delivery. Never before.
- Only when Rail A findings show >€200K in addressable exposure
- Only when the report lands with someone who has authority to act
- The report itself contains a section that naturally leads to "want us to build the action plan?"

**When it's premature:**
- Before Rail A is delivered (no proof of value yet)
- When Rail A findings are thin (<€100K exposure)
- When the buyer is a researcher, not a decision-maker
- When the company is <50 employees (exposure too small to justify)

### Rail C — The Anchor (€20K+)

**What it is:** Institutional IT Cost Intelligence. Ongoing monitoring, quarterly reviews, vendor negotiation support, compliance mapping. This is the real business — recurring, high-margin, deeply embedded.

**Role in the architecture:** Rail C exists to make Rail B look reasonable and Rail A look like a no-brainer. Most early buyers won't reach Rail C. That's fine. Its existence in the pricing page anchors perception.

**When it happens organically:** A Rail B client sees 6-figure savings materialize. Their CFO asks "can we get this on an ongoing basis?" That's when Rail C converts. Never push it.

---

## The "Deliverable IS the Sales Tool" Principle

The Rail A report is not a deliverable that leads to a sales conversation. It IS the sales conversation. There is no follow-up call, no demo, no account executive.

**How the report sells Rail B internally:**

1. **The executive summary** is written so the CFO can forward it to their CEO or board with zero additional context
2. **The savings estimates** create internal urgency — once a number is on paper, ignoring it becomes a decision someone has to justify
3. **The "what we found vs. what we could find with access" section** shows the gap between external intelligence and full analysis — this is the Rail B sell
4. **The confidence levels** (low/medium/high) on every estimate create a natural desire to upgrade from "estimated" to "confirmed"
5. **The action items** are specific enough to be exciting but complex enough that execution help (Rail B) is obviously valuable

The report must circulate. If it sits in one person's inbox, it dies. Design every page assuming it will be screenshot and shared in a Slack channel or forwarded to 3 people.

---

## The Free Scan as Qualification Mechanism

The free scan (`/intel` endpoint) is not a lead magnet. It's a qualification filter.

**What the free scan shows:**
- Company identified (confirms we can analyze them)
- 2-3 headline metrics (enough to create curiosity)
- A teaser of vendor exposure (specific enough to be credible, vague enough to be incomplete)
- Estimated savings range (the hook)

**What the free scan qualifies:**
- Is this company large enough to have meaningful IT spend? (Filter: >50 employees)
- Does the scan surface enough public signal to build a credible report? (Filter: >3 identifiable vendors)
- Does the visitor engage with results? (Behavioral signal: time on page, scroll depth)

**What the free scan disqualifies:**
- Companies too small to have the problem
- Domains with no detectable IT footprint
- Visitors who scan and bounce (not in pain, or not the buyer)

The scan costs ~€0.05-0.15 in API calls. At a 3-5% conversion to Rail A, the economics work: 100 scans = €5-15 cost, 3-5 purchases = €1,470-2,950 revenue.

---

## Offer Clarity Checklist

Before any copy, page, or email goes live, it must pass:

- [ ] Can a CFO explain what they're buying in one sentence?
- [ ] Is the price visible without scrolling or clicking?
- [ ] Is the delivery timeline explicit (48 hours)?
- [ ] Is "no system access needed" stated clearly?
- [ ] Are exclusions as clear as inclusions?
- [ ] Does the free scan give enough value to be credible but not enough to be sufficient?
- [ ] Does the checkout flow have fewer than 4 steps?
- [ ] Is there zero mention of "schedule a call" or "talk to sales"?
