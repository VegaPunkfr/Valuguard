# MESSAGE COMPILER SPECIFICATION — GHOST TAX

**Version**: 1.0 — Blocs 1–4 (of 8)
**Scope**: Engineering specification for message production under constraints
**Companion**: MESSAGING-DOCTRINE.md (philosophy). This document is implementation.
**Status**: Active. All outbound messages MUST pass this compiler before sending.

This is not a copywriting guide. It is a constraint-satisfaction engine. A message is a compiled artifact. The compiler takes structured inputs (Apollo data, signal age, role classification, account history) and produces a constrained output (a message that satisfies all rules simultaneously) or rejects the build. There is no "try harder" fallback. If the inputs cannot satisfy the constraints, the message is not sent. Silence is always an option. Noise never is.

**Sender identity**: All messages are sent by "Jean-Etienne". Never "Edith". Never "Ghost Tax Team". Never "The Ghost Tax AI". Jean-Etienne is a named human. The sender line is not a variable.

**Epistemic position**: Ghost Tax has zero customers, zero case studies, zero testimonials, and no benchmark with N>30. Every claim must survive this constraint. Any message that implies scale, social proof, or statistical authority is fraudulent. The only authority Ghost Tax has is observational: "We looked at your public-facing infrastructure and found something specific."

---

## BLOC 1 — 12-STEP COMPILATION PIPELINE

Each step has four fields. No step is optional. Steps execute sequentially. A KILL at any step terminates the pipeline. The message is not sent. The prospect record is updated with the kill reason. No human override.

---

### Step 1: Signal Classification

**Input**: Apollo enrichment payload — `technologies[]`, `estimated_num_employees`, `latest_funding_*`, `person.employment_history[]`, `organization.short_description`, `organization.industry`, news mentions (if available via Exa/OSINT).

**Output**:
- `signal_type`: exactly one of:

| Signal | Detection method | Example |
|--------|-----------------|---------|
| `new_cfo` | `employment_history[0].start_date` < 180 days, title contains CFO/Finance Director/VP Finance | CFO joined 4 months ago |
| `post_layoff` | `estimated_num_employees` decreased >15% vs 12mo prior, or news match "layoff\|restructuring\|workforce reduction" | Headcount 1,200 → 980 |
| `post_ma` | News match "acqui\|merg\|übernah" within 18 months, or `organization.short_description` update | Acquired by PE fund Q2 2025 |
| `dual_stack` | Two tools in same category detected in `technologies[]` (e.g., Salesforce + HubSpot CRM, AWS + Azure IaaS) | Salesforce + HubSpot both active |
| `legacy_tool` | Tool in `technologies[]` has known EOL/sunset date in the past | Skype for Business detected |
| `stack_bloat` | `technologies[].length` > 40 (absolute) or > 0.08 per employee (ratio) | 67 tools for 400 employees |
| `vendor_overlap` | 3+ tools from same vendor (e.g., Microsoft 365 + Azure + Dynamics + Power BI) or 2+ tools solving identical function | 4 Microsoft products + competing Google Workspace |
| `multi_cloud` | 2+ IaaS/PaaS providers detected (AWS + Azure, GCP + Azure, etc.) | AWS and Azure both detected |
| `post_funding` | `latest_funding_date` < 12 months AND `latest_funding_amount` > $10M | Series C $45M, 8 months ago |
| `finops_hiring` | Job posting match "FinOps\|Cloud Cost\|IT Cost\|SaaS Management\|Vendor Management" active | FinOps Manager role posted 3 weeks ago |

- `signal_age_days`: integer, calculated from detection date.
- `signal_confidence`: `high` (direct Apollo field match), `medium` (inference from two data points), `low` (single weak indicator).

**Blocking error**: No signal detected across all categories → **KILL**. Reason: "No actionable signal. Do not send observation-free messages."

**Rejection condition**: `signal_age_days` > 90 → **KILL**. Reason: "Signal stale. Re-enrich before contacting." Exception: `legacy_tool` signals have no age limit (the tool is still deprecated regardless).

---

### Step 2: Recipient Classification

**Input**: Apollo `person.title`, `person.seniority`, `person.departments[]`.

**Output**:
- `role_class`: exactly one of:

| Role class | Title patterns | Budget authority | Forwarding target |
|-----------|---------------|-----------------|-------------------|
| `CFO` | CFO, Chief Financial Officer, Finanzvorstand, Finance Director (if C-level) | Direct | CIO for technical detail |
| `CIO_CTO` | CIO, CTO, Chief Information Officer, Chief Technology Officer, IT Director, VP Engineering, VP IT, Leiter IT | Direct (IT budget) | CFO for cost approval |
| `VP_FINANCE` | VP Finance, Head of Finance, Finance Manager (if >500 employees), Controller, Head of Controlling | Indirect (recommends) | CFO |
| `PROCUREMENT` | VP Procurement, Head of Procurement, Chief Procurement Officer, Einkaufsleiter | Indirect (negotiates) | CFO or CIO depending on category |
| `CEO` | CEO, Managing Director, Geschäftsführer, General Manager, Founder/CEO | Direct (but delegates) | CFO or CIO (always delegates operational) |

- `budget_authority`: `direct` / `indirect` / `none`
- `forwarding_target`: the role this person would forward a relevant finding to.

**Blocking error**: Role has `budget_authority: none` AND no viable `forwarding_target` → **KILL**. Reason: "No path to budget authority."

**Rejection condition**: Title matches any of: HR Director, CHRO, VP Marketing, CMO, VP Sales, CRO, Head of People, General Counsel, VP Legal → **KILL**. Reason: "Role has no relevance to IT cost decisions."

---

### Step 3: Account Maturity Classification

**Input**: Supabase `companies` record — `seen_count`, `thesis_status`, `committee_coverage` (% of buying committee identified), `contacts[].last_contacted_at`, `contacts[].suppressed`.

**Output**:
- `maturity_level`: exactly one of:

| Level | Criteria |
|-------|---------|
| `cold` | seen_count = 0 OR no prior contact with any person at domain |
| `warm` | 1+ messages sent to domain, 0 replies, seen_count > 0 |
| `qualified` | 1+ replies received OR scan completed OR checkout started |
| `active` | Paid customer or in delivery pipeline |

**Blocking error**: None. `cold` is a valid maturity level. Cold accounts can receive messages if signals are strong enough.

**Rejection conditions**:
- Any person at this domain contacted within last 90 days and not replied → **KILL**. Reason: "Cooling period active."
- Any person at this domain has `suppressed: true` → **KILL** for that person (other contacts at domain remain eligible).
- Domain is on global suppression list (competitor, partner, press, investor) → **KILL**. Reason: "Domain suppressed."

---

### Step 4: Claim Mapping

Every statement in the draft message is classified. No statement escapes classification.

**Input**: Each sentence or clause in the proposed message body.

**Output**: `claim_level` for each, from the following taxonomy:

| Level | Definition | Example | Allowed presentation |
|-------|-----------|---------|---------------------|
| `L1_observable` | Directly visible in Apollo tech stack or public data. Verifiable by recipient in 30 seconds. | "Salesforce and HubSpot both detected on acme.com" | Stated as fact. No hedge needed. |
| `L2_inference` | Logical consequence of L1 data + domain knowledge. Requires one reasoning step. | "Parallel CRM systems typically create duplicate data costs" | Stated as likely. Must be anchored to the L1 that produced it. |
| `L3_estimate` | Quantitative claim derived from L1/L2 + public pricing. Requires calculation. | "Based on published Salesforce Enterprise pricing, the second CRM likely costs €3,200–4,800/mo" | Stated with range. Must cite pricing source or methodology. Never single-point. |
| `L4_hypothesis` | Claim about internal processes, decisions, or intentions. Not verifiable externally. | "Your teams probably haven't reviewed this overlap" | **FORBIDDEN as fact**. May only appear as explicit question: "Has this been reviewed?" |
| `L5_projection` | Future prediction. Market trend, expected behavior, outcome forecast. | "This will cost €200K over 3 years if unaddressed" | **FORBIDDEN in outbound messages**. Reserved for paid deliverables only. |

**Blocking error**: Any L4 or L5 claim presented as a factual statement → **KILL**. Reason: "Unverifiable claim presented as fact. Rewrite or remove."

**Rejection conditions**:
- More than 2 L2 claims without at least 1 L1 anchor preceding them → **KILL**. Reason: "Inference chain unsupported. Add observable evidence."
- Zero L1 claims in entire message → **KILL**. Reason: "No observable evidence. Message is pure speculation."
- Any L3 estimate presented as a single number instead of a range → **KILL**. Reason: "False precision. Use ranges."
- Any L3 estimate without methodology note (even brief) → **KILL**. Reason: "Unattributed number."

---

### Step 5: Kill Check (Master Gate)

**Input**: All outputs from Steps 1–4.

**Output**: `PASS` or `KILL` with reason code.

Execute every rule. Any single rule triggered = **KILL**. No partial passes. No "close enough."

#### The 20 Kill Rules

| # | Rule | Trigger | Reason |
|---|------|---------|--------|
| K1 | No signal | `signal_type` is null | Nothing to say. |
| K2 | Stale signal | `signal_age_days` > 90 (except `legacy_tool`) | Signal no longer actionable. |
| K3 | No budget path | `budget_authority: none` AND no forwarding target | Message cannot reach a decision. |
| K4 | Irrelevant role | Title match on HR/Marketing/Sales/Legal | Wrong audience entirely. |
| K5 | Cooling period | Domain contacted <90 days ago, no reply | Respect silence. |
| K6 | Suppressed contact | `suppressed: true` on this person | Explicit opt-out. |
| K7 | Suppressed domain | Domain on global suppression list | Strategic exclusion. |
| K8 | L4/L5 as fact | Claim map contains L4/L5 stated as fact | Epistemic fraud. |
| K9 | No L1 claims | Zero L1 claims in message | No observable evidence = no authority. |
| K10 | Orphan inferences | >2 L2 claims without L1 anchor | Reasoning without evidence. |
| K11 | False precision | L3 estimate as single number, not range | Manufactured authority. |
| K12 | Benchmark without N | Any "companies like yours" or "X% of companies" without sample size | Statistical fraud from a company with 0 customers. |
| K13 | Case study reference | Any mention of "our clients", "we helped", "our customers" | We have none. Lying. |
| K14 | Fake urgency | "Limited time", "offer expires", "only X spots" | Manipulation. Destroys trust permanently. |
| K15 | Call request | "Would you be open to a call?", "Can we schedule 15 minutes?" | Product is async. Calls contradict the value prop. |
| K16 | Self-referential opening | First sentence contains "We help", "Ghost Tax is", "Our platform" | Prospect does not care about us. |
| K17 | Template detection | Message matches >70% structure of any message sent to same domain in prior 90 days | Repetition = spam. |
| K18 | Interchangeable message | Remove company name and tool names. If message still makes sense for any company → KILL | Not personalized. It's a template with variables. |
| K19 | Forbidden phrase | Contains any phrase from the Forbidden Phrases list (Bloc 6, future) | Phrase has been tested and found to destroy credibility. |
| K20 | Active customer | `maturity_level: active` | Do not prospect existing customers. Route to CS. |

---

### Step 6: Opening Pattern Selection

**Input**: `signal_type`, `role_class`, `maturity_level`.

**Output**: `opening_pattern_id` — one of:

| Pattern ID | Structure | Best for |
|-----------|-----------|----------|
| `signal_first` | Lead with the observable finding. No preamble. | Strong L1 signal, any role, any maturity. Default choice. |
| `context_first` | Lead with a company event or change. | `post_ma`, `post_layoff`, `new_cfo` — situational signals. |
| `question_first` | Lead with a verifiable question. | `stack_bloat` to CFO/VP Finance. Never CEO. |
| `timing_first` | Lead with time-in-role or time-since-event. | `new_cfo` (first 180 days), `post_ma` (integration window). |
| `fact_first` | Lead with a pure number. No interpretation. | `stack_bloat` (tool count), `multi_cloud` (provider count). |

**Blocking error**: None. Every valid combination maps to at least one pattern.

**Rejection condition**: Selected `opening_pattern_id` identical to pattern used in last message to same domain → **SWITCH** to next-best pattern. If all patterns exhausted for this domain → **KILL**. Reason: "Pattern exhaustion. No novel angle available."

---

### Step 7: Signal Ordering (Evidence Stack)

**Input**: All available findings for this domain — named tools, overlaps, legacy detections, category duplications, headcount data.

**Output**: Ordered list of findings by impact, structured as:

```
finding[0]: { tool_names: [...], category: "...", claim_level: L1, impact_rank: 1 }
finding[1]: { tool_names: [...], category: "...", claim_level: L1, impact_rank: 2 }
...
```

**Ordering rules**:
1. Named tool pairs (dual_stack) outrank single-tool findings.
2. Findings with public pricing (allowing L3 estimates) outrank those without.
3. Findings in categories the recipient controls (CTO → infra, CFO → SaaS spend) rank higher for that role.
4. Deprecated/EOL tools rank high for CIO/CTO, lower for CEO.
5. Maximum 3 findings per message. Density, not volume.

**Blocking error**: Fewer than 1 named tool in the findings → **KILL**. Reason: "No specific tool to reference. Message would be generic."

**Rejection condition**: None. But if only 1 finding exists, enforce light proof density — no stacking of L2 inferences around a single L1.

---

### Step 8: CTA Class Selection

**Input**: `maturity_level`, `role_class`, `activation_readiness_score` (from lead scoring), `signal_confidence`.

**Output**: `cta_class` — integer 1–6 (defined in Bloc 3).

**Selection logic** (executed as decision tree, first match wins):

```
1. IF role_class = CEO                                        → Class 1
2. IF maturity_level = active                                 → KILL (K20, not prospect)
3. IF sequence_position = M5                                  → Class 6
4. IF maturity_level = cold AND findings.length < 2           → Class 1 or 2
5. IF maturity_level = cold AND findings.length >= 2
        AND signal_confidence = high                          → Class 5
6. IF maturity_level = warm AND no prior engagement signal    → Class 3 or 4
7. IF maturity_level = warm AND prior engagement
        (open 2x+ OR reply OR scan)                           → Class 5
8. IF maturity_level = qualified                              → Class 5
9. IF signal_confidence = low                                 → Class 1
10. ELSE                                                      → Class 4
```

**Blocking errors**:
- CTA Class 5 selected for CEO → **KILL**. Reason: "Never pitch CEO directly. CEOs delegate purchasing."
- CTA Class 5 on cold account with <2 findings → **KILL**. Reason: "Insufficient evidence density for paid CTA."

**Rejection condition**: CTA class incompatible with maturity level (e.g., Class 6 on M1) → **force downgrade** to Class 1. Log mismatch.

---

### Step 9: Forwardability Check

**Input**: Complete draft message (post-assembly, pre-lint).

**Output**: `PASS` or `FAIL` with specific failure reasons.

**The test**: "Can the recipient forward this email to their CIO, CFO, or CEO without editing a single word, and without embarrassment?"

This is the single most important quality gate. A forwardable message:
- Contains no informal language ("Hey", "Just wanted to", "Quick question")
- Contains no jokes, puns, or wordplay
- Contains no presumptuous claims about internal processes ("your teams probably...", "you're likely dealing with...")
- Contains no first-person selling ("We can help", "I'd love to", "Our solution")
- Contains no pressure language ("before it's too late", "competitors are already")
- Reads as a professional observation memo, not a sales email
- Has a subject line that could appear in an internal email thread without signaling "vendor pitch"

**Blocking error**: Any of the above detected → **FAIL** → rewrite with specific violation flagged. After 2 failed rewrites → **KILL**. Reason: "Message cannot be made forwardable."

**Rejection condition**: Message contains any claim about the recipient's internal state ("your teams probably haven't reviewed...", "this may have slipped through...") → **FAIL**. Reason: "Internal-state assumption. We cannot know this."

---

### Step 10: Mobile Density Check

**Input**: Complete draft message.

**Output**:
- `word_count`: integer
- `line_count`: integer (including blank lines)
- `estimated_mobile_screens`: float (1 screen ≈ 60 words on mobile email client)

**Hard limits**:

| Channel | Max words | Max lines | Max screens |
|---------|-----------|-----------|-------------|
| Email | 180 | 25 | 3 |
| LinkedIn InMail | 130 | 18 | 2.5 |
| LinkedIn connection note | 45 | 5 | 1 |

**Blocking error**: Exceeds word limit for channel → **FAIL** → trim. Identify lowest-value sentence and remove. Re-run Steps 9–10.

**Rejection condition**: Exceeds max screens → **FAIL**. No message should require scrolling past 3 screens on mobile. If trimming to word limit still exceeds screen count (due to short lines / excessive line breaks), consolidate lines.

---

### Step 11: Lint Pass

**Input**: Complete draft message (post-density-check).

**Output**: List of issues, each classified as `BLOCK` or `WARN`.

**Rule**: Any `BLOCK` → rewrite that sentence. 3+ `WARN` → manual review (flag for human check, do not auto-send).

The lint rules are defined in Bloc 6 (future). The top 15 structural lint rules enforced in this version:

| # | Rule | Level | Detection |
|---|------|-------|-----------|
| L1 | Forbidden phrase detected | BLOCK | Match against forbidden phrases list |
| L2 | Sentence >30 words | WARN | Word count per sentence |
| L3 | Passive voice in claim | WARN | "was detected", "has been identified" — prefer active: "detected", "identified" |
| L4 | Weasel word | WARN | "probably", "might", "maybe", "perhaps" in a factual claim (L1/L2) |
| L5 | Exclamation mark | BLOCK | Zero exclamation marks in professional B2B. No exceptions. |
| L6 | Emoji | BLOCK | Zero emoji. No exceptions. |
| L7 | ALL CAPS word (not acronym) | BLOCK | "FREE", "GUARANTEED", "URGENT" → spam filter trigger |
| L8 | First person plural in opening | BLOCK | "We" as first word of first sentence |
| L9 | Question to CEO | WARN | `role_class: CEO` AND message contains "?" — CEOs don't answer vendor questions |
| L10 | Price without currency | BLOCK | "490" without "€" or "EUR" — ambiguous |
| L11 | URL without context | WARN | Bare link without 1-sentence explanation of what it does |
| L12 | Greeting with "Dear" | WARN | "Dear Mr./Ms." is formal but reads as mass-mail in 2026. Prefer name-only or no greeting. |
| L13 | Sign-off with "Best regards" | WARN | Generic. Prefer "Jean-Etienne" alone, or contextual closing. |
| L14 | Repeated tool name | WARN | Same tool mentioned 3+ times — reduce to 2 max |
| L15 | Subject line >50 chars | WARN | Mobile truncation. Subject should be fully visible on iPhone lock screen. |

---

### Step 12: Final Grading

**Input**: Fully linted message.

**Output**: Grade — one of four levels:

#### UNSHIPPABLE (any one criterion = this grade)
- L4 or L5 claim presented as fact
- No named tool in the message body
- Benchmark claim without sample size N
- Daily/monthly/annual burn figure derived from L3 estimate stated without range
- Forbidden phrase detected and not removed
- Word count exceeds channel limit after trimming
- Forwardability check failed twice
- CTA class mismatch with role (Class 5 to CEO)

#### ACCEPTABLE (all required)
- 1+ L1 claims
- CTA class matches maturity and role
- Under word limit
- No BLOCK lint issues
- Forwardable

#### STRONG (all required)
- 2+ L1 claims
- Correct CTA class (not just "not wrong" — positively correct per Bloc 3 decision tree)
- Under word limit with 10%+ margin
- Forwardable
- Non-interchangeable (fails the "remove company name" test — the message clearly applies only to this company)
- Opening pattern matches signal type

#### EXCEPTIONAL (STRONG + all of these)
- Teaches the prospect something they did not know about their own infrastructure
- EUR estimate derived from verifiable public pricing with range and methodology note
- CTA matches the exact readiness state of the account
- Message could be printed in a FinOps trade publication without embarrassing Ghost Tax

**Shipping rule**: Messages graded below STRONG are not sent. They are either rewritten (one attempt) or killed. ACCEPTABLE messages may be sent only if the account is warm+ and no STRONG alternative can be produced within the same compilation cycle.

---

## BLOC 2 — ROLE x SIGNAL MATRIX

This matrix governs what angle is authorized for each combination of recipient role and detected signal. It is not advisory. It is a constraint. If the matrix says "DO NOT SEND," the compiler must KILL regardless of how compelling the message seems.

### How to read each cell

- **Angle**: The specific framing authorized. Not "talk about costs" but the exact angle.
- **Forbidden angle**: What you must NOT argue, even if true.
- **Max claim level**: Highest claim level permitted. L1-only means no inferences, no estimates.
- **CTA class**: Which CTA classes are permitted. Others are blocked.
- **Primary risk**: The most likely way this message fails.
- **Kill reason**: If "DO NOT SEND" — why.

---

### CFO (5 roles x 8 signals = 8 entries)

| Signal | Angle | Forbidden angle | Max claim | CTA class | Primary risk |
|--------|-------|----------------|-----------|-----------|-------------|
| `new_cfo` | Building cost baseline in first 90/180 days. External scan as input to initial assessment. | Do not imply predecessor was negligent. Do not reference "cleaning up." | L3 | 3, 4, 5 | CFO may have already commissioned an internal audit. Counter: Ghost Tax finds what internal audits miss (external stack only). |
| `post_layoff` | IT cost per remaining employee has increased if licenses not adjusted. Headcount decreased but SaaS spend is sticky. | Do not mention layoffs by name. Do not say "after the reduction." Use "with headcount at [current number]." | L2 | 3, 4, 5 | Tone-deaf if layoffs were traumatic. Mitigate by focusing on tools, never people. |
| `post_ma` | Merged entity likely running parallel stacks. Integration creates temporary cost duplication that becomes permanent if unaudited. | Do not assume integration hasn't happened. Do not reference "synergies" (PE/consulting cliché). | L3 | 4, 5 | CFO is overwhelmed with integration tasks. Message must be short and obviously actionable. |
| `dual_stack` | Two tools in same category = at minimum, dual licensing cost. One is probably underused. | Do not claim one should be eliminated (you don't know which serves what function). Just surface the overlap. | L3 | 4, 5 | The dual stack may be intentional (different teams, different use cases). Acknowledge possibility: "if intentional, no action needed." |
| `legacy_tool` | Deprecated tool still detected. May still be incurring license fees. Replacement may already exist in stack. | Do not claim it's a security risk (that's CTO territory, and unverifiable externally). | L2 | 3, 4 | The tool may be detected in DNS but not actually in use. Hedge: "detected in external infrastructure." |
| `stack_bloat` | [N] tools detected. Industry median for this headcount is [range]. Each unused license is a line item. | Do not call the stack "bloated" or "wasteful." Use neutral: "above the median range." | L3 | 4, 5 | The count may include free tools or marketing pixels that don't cost anything. Mitigate by focusing on tools with known paid tiers. |
| `vendor_overlap` | Multiple products from same vendor + competing product. Potential for consolidation pricing or vendor lock-in audit. | Do not assume vendor consolidation is desirable (it creates dependency). | L2 | 3, 4 | CFO may have negotiated an enterprise agreement covering all vendor products. Your observation still stands — the competing product is the anomaly. |
| `multi_cloud` | Two+ cloud providers detected. Multi-cloud is expensive — egress fees, duplicate tooling, split volume discounts. | Do not argue for single-cloud (that's a CTO architecture decision). Focus on cost visibility. | L3 | 4, 5 | Multi-cloud may be a deliberate strategy (resilience, best-of-breed). Acknowledge: "if deliberate, the cost differential is still worth quantifying." |

---

### CIO / CTO (8 entries)

| Signal | Angle | Forbidden angle | Max claim | CTA class | Primary risk |
|--------|-------|----------------|-----------|-----------|-------------|
| `new_cfo` | New CFO will ask for IT cost justification within 90 days. Having an external baseline ready is a defensive move. | Do not imply CIO should fear the new CFO. Frame as: "preparing for the ask." | L2 | 2, 3, 4 | CIO may see this as political — someone else's hire as a threat. Keep it practical. |
| `post_layoff` | Reduced headcount often leaves orphan licenses. IT team is usually too stretched post-reduction to audit them. | Do not assume IT team is understaffed. State the pattern, not the assumption. | L2 | 2, 3, 4 | CIO is defensive about operational gaps post-layoff. Never imply they missed something. |
| `post_ma` | Stack integration is a CTO's operational problem. External view shows what's currently running across both entities. | Do not suggest an integration strategy (that's their job). Only surface what's visible. | L2 | 2, 3, 4 | CTO is already drowning in integration work. Message must be ultra-brief and obviously useful, not adding work. |
| `dual_stack` | Technical angle — two systems in same category, likely API overlap, data sync issues, maintenance burden on engineering. | Do not talk about cost (that's CFO angle). Talk about engineering overhead and maintenance surface area. | L2 | 2, 3 | CTO may have architected the dual stack intentionally. Respect that. Phrase as observation, not critique. |
| `legacy_tool` | Deprecated tool in infrastructure. Known security/support implications. Replacement likely exists in current stack. | Do not lecture on security (CTO knows). Surface the detection, note the EOL date, stop. | L1 | 2, 3 | CTO knows about it and has it on a backlog. Your message adds nothing unless you can name the specific tool and EOL date. |
| `stack_bloat` | Engineering team maintaining integrations across [N] tools. Each tool is an API surface, a security surface, a training surface. | Do not call it "bloated." Do not count marketing pixels as engineering tools. Focus on tools with APIs and user accounts. | L2 | 2, 3 | CTO will dismiss if count includes non-engineering tools. Filter to dev/infra/security tools before citing the number. |
| `vendor_overlap` | Multiple vendor products creating lock-in risk or redundant capability. CTO can evaluate consolidation paths. | Do not recommend which vendor to cut. Observation only. | L1 | 2, 3 | CTO will dismiss if you conflate different product tiers (e.g., Azure DevOps ≠ Azure IaaS). Be precise about which products. |
| `multi_cloud` | Two cloud providers = two sets of IAM, networking, monitoring, billing. CTO can assess if the complexity is justified by the use case. | Do not argue for single-cloud. Do not cite cost (CFO angle). Focus on operational complexity. | L2 | 2, 3 | CTO chose multi-cloud for a reason. Never assume it's accidental. Phrase as: "deliberate or inherited?" |

---

### VP Finance (8 entries)

| Signal | Angle | Forbidden angle | Max claim | CTA class | Primary risk |
|--------|-------|----------------|-----------|-----------|-------------|
| `new_cfo` | New CFO will request IT cost breakdown. VP Finance is the one who has to produce it. External data as input to that deliverable. | Do not imply VP Finance has been failing to track this. Frame as: "new baseline for new leadership." | L3 | 3, 4 | VP Finance may feel threatened by external audit. Position as "supplementary input," not replacement of their work. |
| `post_layoff` | License cost reconciliation after headcount change. VP Finance owns the P&L lines where these appear. | Same as CFO: do not mention layoffs explicitly. | L2 | 3, 4 | VP Finance is busy with restructuring financials. Be brief. |
| `post_ma` | Post-acquisition cost consolidation. VP Finance needs to present combined IT spend to new CFO or board. | Do not assume they haven't started. Offer data input. | L3 | 3, 4 | Same as CFO but less authority. Message must be forwardable to CFO. |
| `dual_stack` | Two systems in same category appearing in IT cost lines. VP Finance can flag for review. | Do not suggest a decision — VP Finance recommends, doesn't decide. | L2 | 3, 4 | VP Finance may not know what the tools do. Keep it to cost, not function. |
| `legacy_tool` | Deprecated tool may still appear on renewal schedules. VP Finance can verify in AP/procurement records. | Do not claim cost without evidence. Just flag the tool name and EOL date. | L1 | 3, 4 | VP Finance may not control IT renewals. But they see the invoices. |
| `stack_bloat` | [N] SaaS tools detected. Total spend per tool often invisible at the line-item level. | Do not overwhelm with technical tool names. Group by category. | L2 | 3, 4 | VP Finance cares about EUR, not tool names. Lead with estimated spend range, not tool count. |
| `vendor_overlap` | Multiple vendor invoices for overlapping capability. Consolidation could simplify AP. | Do not recommend vendor strategy. Focus on invoice line simplification. | L2 | 3, 4 | VP Finance sees invoices, not architecture. Message must translate technical overlap into financial overlap. |
| `multi_cloud` | Two cloud invoices. Combined spend likely has volume discount potential if consolidated. | Do not recommend cloud strategy. Focus on billing and discount structure. | L3 | 3, 4 | VP Finance may not understand cloud billing. Keep it simple: "two invoices where one might get better rates." |

---

### Procurement (8 entries)

| Signal | Angle | Forbidden angle | Max claim | CTA class | Primary risk | Kill? |
|--------|-------|----------------|-----------|-----------|-------------|-------|
| `new_cfo` | DO NOT SEND | — | — | — | — | Procurement has no relationship with new CFO onboarding. |
| `post_layoff` | DO NOT SEND | — | — | — | — | Procurement doesn't own headcount-license reconciliation. |
| `post_ma` | Post-acquisition vendor consolidation. Procurement negotiates combined contracts. | Do not suggest which vendors to cut. | L2 | 3, 4 | Procurement may not be involved in IT vendor decisions at this company. |
| `dual_stack` | Two products in same category = potential for competitive bid or consolidation negotiation. | Do not frame as waste. Frame as negotiation leverage. | L2 | 3, 4 | Procurement may not manage SaaS contracts (IT may buy direct). Verify if company has centralized procurement. |
| `legacy_tool` | DO NOT SEND | — | — | — | — | Procurement has no authority over legacy migration decisions. Tool lifecycle is CTO's domain. |
| `stack_bloat` | DO NOT SEND | — | — | — | — | Procurement can't act on "too many tools" — that's a CTO/CFO decision. Procurement negotiates terms, not portfolio. |
| `vendor_overlap` | Multiple contracts with overlapping scope. Procurement can use this to negotiate better terms or consolidate. | Do not suggest eliminating a vendor. Frame as leverage for next renewal. | L2 | 3, 4 | Procurement may only handle specific vendor categories. |
| `multi_cloud` | DO NOT SEND | — | — | — | — | Cloud contracts are typically negotiated at CTO/CFO level, not procurement. |

**Procurement kill count**: 4 of 8 combinations are DO NOT SEND.

---

### CEO (8 entries)

| Signal | Angle | Forbidden angle | Max claim | CTA class | Primary risk | Kill? |
|--------|-------|----------------|-----------|-----------|-------------|-------|
| `new_cfo` | DO NOT SEND | — | — | — | — | CEO hired the CFO. Do not second-guess by offering cost intelligence to the boss. Route to CFO directly. |
| `post_layoff` | DO NOT SEND | — | — | — | — | CEO made the layoff decision. Messaging about cost savings from their own decision is tone-deaf and presumptuous. |
| `post_ma` | Observation-only. "Since the [acquisition], [N] technology overlaps are externally visible." No price, no recommendation. | Do not recommend actions. Do not mention cost. CEO receives observation, delegates investigation. | L1 | 1 only | CEO ignores vendor emails. Message must be 3 sentences max. Open rate <5%. Accept this. |
| `dual_stack` | Pure observation. "[Tool A] and [Tool B] both active." No inference about cost or waste. | No price. No "you should." No implication of inefficiency. | L1 | 1 only | CEO delegates. The value is the CEO forwarding to CFO/CIO. Message must be forwardable with zero editing. |
| `legacy_tool` | DO NOT SEND | — | — | — | — | CEO does not care about individual deprecated tools. Wrong altitude. |
| `stack_bloat` | "[N] SaaS tools detected across [domain]." One sentence. No interpretation. | No analysis. No cost. No recommendation. Just the number. | L1 | 1 only | CEO will delegate or ignore. If the number is noteworthy (>50), it may trigger an internal investigation. |
| `vendor_overlap` | DO NOT SEND | — | — | — | — | Too tactical for CEO. Route to CFO or Procurement. |
| `multi_cloud` | DO NOT SEND | — | — | — | — | Cloud strategy is CTO territory. CEO involvement only at board level for major decisions. |

**CEO kill count**: 5 of 8 combinations are DO NOT SEND. CEOs receive messages only for `post_ma`, `dual_stack`, and `stack_bloat` — and only Class 1 CTA with L1 claims.

---

### Summary: DO NOT SEND Matrix

| | new_cfo | post_layoff | post_ma | dual_stack | legacy_tool | stack_bloat | vendor_overlap | multi_cloud |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **CFO** | OK | OK | OK | OK | OK | OK | OK | OK |
| **CIO/CTO** | OK | OK | OK | OK | OK | OK | OK | OK |
| **VP Finance** | OK | OK | OK | OK | OK | OK | OK | OK |
| **Procurement** | KILL | KILL | OK | OK | KILL | KILL | OK | KILL |
| **CEO** | KILL | KILL | OK | OK | KILL | OK | KILL | KILL |

**Total valid combinations**: 29 of 40.
**Total DO NOT SEND**: 11 of 40.

---

## BLOC 3 — CTA DECISION ENGINE

Six CTA classes. Each is a complete specification — not a suggestion, not a "consider using." The class selected by Step 8 determines the exact closing structure. No mixing. No improvising.

---

### Class 1: Pure Observation

**What it does**: Delivers the finding with zero ask. The message is the product. No link, no price, no request.

**Closing pattern**:
- EN: `"[Finding summary]. Worth investigating internally."`
- DE: `"[Finding]. Ob das für Ihre Organisation relevant ist, können nur Sie beurteilen."`
- FR: `"[Finding]. À investiguer en interne si pertinent."`

**Use when**:
- `role_class = CEO` (always, regardless of other factors)
- `signal_confidence = low` (any role)
- `maturity_level = cold` AND `findings.length = 1`
- First contact with a domain where no prior intelligence exists
- When the finding is genuinely interesting but not dense enough to justify a paid CTA

**Never use when**:
- Account is `warm` or `qualified` with 3+ findings and verified email engagement (you're leaving money on the table — upgrade to Class 3 or 5)
- `signal_confidence = high` AND `findings.length >= 3` (the evidence justifies a stronger CTA)

**Reputational risk**: Zero. You gave them something for free, asked for nothing. If the observation is accurate, you've established credibility for future contact. If inaccurate, you've lost nothing — you made no promise.

**Conversion path**: Indirect. Recipient investigates internally → finds the problem → remembers Ghost Tax surfaced it → returns to ghost-tax.com organically. This is a 30-90 day loop. Patience required.

---

### Class 2: Internal-Check Prompt

**What it does**: Tells the recipient exactly where to verify the finding internally, within a specific system or dashboard they already have access to.

**Closing pattern**:
- EN: `"Your IT team can verify this in [specific system] → [specific location/dashboard/console]."`
- DE: `"Ihr IT-Team kann das im [System] → [Dashboard/Konsole] überprüfen."`

**Use when**:
- `role_class = CIO_CTO` or VP Engineering (people who access admin consoles)
- Finding is easily verifiable: dual_stack (check both admin consoles), legacy_tool (check license manager), multi_cloud (check billing dashboards)
- You want to demonstrate Ghost Tax's specificity without selling anything

**Never use when**:
- `role_class = CEO` (CEOs don't check dashboards)
- `role_class = CFO` (CFOs don't access IT admin consoles — unless they're at a <50 person company, which is below ICP)
- `role_class = PROCUREMENT` (they access AP systems, not IT consoles)
- Finding requires Ghost Tax's analysis to verify (you're giving away competitive advantage)

**Reputational risk**: Low. You're suggesting they verify your claim, which signals confidence. If your finding is wrong, however, the recipient verifies it's wrong and you lose all credibility with that domain permanently. Only use when L1 confidence is high.

**Conversion path**: Recipient verifies → finds the problem is real → realizes Ghost Tax found it from outside → values the capability → Class 3/4 on next message becomes credible.

---

### Class 3: One-Page Summary Offer

**What it does**: Offers to compile existing findings into a structured 1-page document. No cost. No commitment.

**Closing pattern**:
- EN: `"I can send you a 1-page summary of these findings — no cost, no commitment. Would that be useful?"`
- DE: `"Ich kann Ihnen eine einseitige Zusammenfassung dieser Befunde zusenden — kostenlos, unverbindlich. Wäre das hilfreich?"`
- FR: `"Je peux vous envoyer un résumé d'une page de ces observations — sans engagement. Est-ce que ce serait utile ?"`

**Use when**:
- Prospect has shown engagement (opened 2x+, or account is `warm`)
- You have 2+ findings ready to compile
- The buying committee is partially mapped (you know at least 2 people at the company)
- You want to move from observation to relationship without introducing price

**Never use when**:
- The summary isn't actually prepared or preparable within 24h (do not offer what you cannot deliver)
- Account is `cold` with no engagement signals (premature — they haven't validated your observations yet)
- `role_class = CEO` (CEOs don't review 1-pagers from unknown vendors)

**Reputational risk**: Medium. You're committing Ghost Tax to produce a deliverable. If the prospect says "yes" and you deliver garbage, the relationship is over. Only offer when the findings are genuinely worth documenting.

**Conversion path**: Prospect says "yes" → you deliver 1-pager → 1-pager circulates internally (it's forwardable by design) → recipient or colleague returns for full briefing (Rail A). Conversion window: 7-21 days post-delivery.

---

### Class 4: Free Preliminary Scan

**What it does**: Directs to the self-serve scan at ghost-tax.com/intel. Zero friction. Prospect drives.

**Closing pattern**:
- EN: `"Free preliminary scan available: ghost-tax.com/intel"`
- DE: `"Kostenloser Vorab-Scan verfügbar: ghost-tax.com/intel"`
- FR: `"Scan préliminaire gratuit : ghost-tax.com/intel"`

**Use when**:
- M5 (final message in sequence) as a no-pressure alternative
- `maturity_level = warm` but no engagement signals (the message sequence didn't work — give them a self-serve path)
- Any role, any signal — this is the universal fallback
- You want to generate scan data that enriches the account for future contact

**Never use when**:
- Prospect already completed a scan (sending them to a tool they already used insults their intelligence)
- Account is `active` or `qualified` (they're past the scan stage — route to checkout or deliverable)
- You're using it as a lazy alternative to writing a specific CTA (the free scan is not a substitute for thinking)

**Reputational risk**: Low. Self-serve tool. Prospect controls the experience. If the scan produces good results, conversion is likely. If not, Ghost Tax's scan needs improvement — that's a product problem, not a messaging problem.

**Conversion path**: Prospect visits /intel → runs scan → receives findings → is impressed (or not) → clicks through to checkout. Conversion window: 0-48h (scan creates immediate context).

---

### Class 5: Paid Briefing Direct

**What it does**: Presents the price and links directly to checkout. This is a sales close.

**Closing pattern**:
- EN: `"Full briefing: €490, delivered in 48h. ghost-tax.com/checkout"`
- DE: `"Vollständiges Briefing: €590, Lieferung in 48h. ghost-tax.com/checkout"`
- FR: `"Briefing complet : €490, livré sous 48h. ghost-tax.com/checkout"`

**Price selection logic**:
- DACH markets (DE, AT, CH): €590
- All other markets (UK, NL, US, other): €490
- Determined by `company.country` or `person.country`, not by language of message

**Use when (ALL conditions required)**:
1. 2+ strong L1 findings with named tools
2. Verified email (not guessed/inferred)
3. `signal_confidence = high`
4. `signal_age_days < 30`
5. Snapshot ready OR findings dense enough to produce briefing within 48h
6. `maturity_level` is `cold` with dense findings, `warm` with engagement, or `qualified`
7. `role_class` is CFO, VP_FINANCE, or CIO_CTO with budget authority

**Never use when**:
- `role_class = CEO` (never pitch CEO directly — they delegate purchasing)
- `maturity_level = cold` AND `findings.length < 2` (insufficient evidence density — feels presumptuous)
- Message contains only benchmark data without company-specific findings (you're selling a commodity observation)
- Previous message to same domain used Class 5 and got no response (do not repeat the close — step down to Class 3 or 4)

**Reputational risk**: Medium-high. This is an explicit ask for money. If the findings are thin and the CTA is Class 5, the message reads as aggressive cold-selling. The findings must justify the ask. The €490/€590 must feel like an obvious bargain relative to the exposure surfaced.

**Conversion path**: Direct. Prospect clicks → checkout → payment → delivery in 48h. This is Rail A. The scan at /intel is NOT required — checkout is independent.

---

### Class 6: Permission Reset / Graceful Close

**What it does**: Ends the sequence with dignity. Signals that you will stop messaging. Preserves the relationship for future re-entry (6-12 months).

**Closing pattern**:
- EN: `"If this isn't relevant right now, no need to reply. I won't follow up again."`
- DE: `"Falls das derzeit nicht relevant ist — kein Handlungsbedarf. Ich melde mich nicht erneut."`
- FR: `"Si ce n'est pas pertinent actuellement, inutile de répondre. Bonne continuation."`

**Use when**:
- M5 (final message in sequence) — this is the primary use case
- Sequence exhausted with no engagement signals
- Prospect has soft-bounced or shown zero opens across 4 messages (they're not reading — stop)

**Never use when**:
- M1 (first message) — never close before you've opened. This signals defeat before engagement.
- M2 or M3 — too early. You haven't demonstrated enough value to earn the graceful exit.
- Account is `qualified` or `active` (they've engaged — don't abandon a warm lead)

**Reputational risk**: Zero. In fact, this is reputation-positive. The prospect who receives a "I won't follow up again" message from a vendor — and the vendor actually stops — remembers that vendor favorably. This is a long-term investment. The 6-12 month re-entry, triggered by a new signal, starts from a position of established respect.

**Conversion path**: None immediate. The conversion is deferred. When Ghost Tax re-enters this account in 6-12 months with a new signal, the prospect is more likely to read the message because the previous sequence ended with respect, not desperation.

---

### CTA SELECTION DECISION TREE (formal)

```
FUNCTION select_cta_class(role, maturity, findings, signal, sequence_pos, prior_cta):

  // Hard rules (non-negotiable)
  IF role = CEO → RETURN Class 1
  IF maturity = active → RETURN KILL("K20: active customer")
  IF sequence_pos = M5 → RETURN Class 6

  // Prior CTA escalation protection
  IF prior_cta = Class 5 AND no response → RETURN Class 4
  IF prior_cta = Class 3 AND accepted → RETURN Class 5 (upgrade after engagement)

  // Cold account logic
  IF maturity = cold:
    IF findings.length < 2 → RETURN Class 1
    IF findings.length >= 2 AND signal.confidence = high:
      IF role IN (CFO, VP_FINANCE, CIO_CTO) → RETURN Class 5
      IF role = PROCUREMENT → RETURN Class 3
    IF findings.length >= 2 AND signal.confidence = medium → RETURN Class 3
    ELSE → RETURN Class 1

  // Warm account logic
  IF maturity = warm:
    IF engagement_signals = 0 → RETURN Class 4
    IF engagement_signals > 0:
      IF role IN (CFO, VP_FINANCE) → RETURN Class 5
      IF role = CIO_CTO → RETURN Class 3
      IF role = PROCUREMENT → RETURN Class 3

  // Qualified account logic
  IF maturity = qualified:
    IF role IN (CFO, VP_FINANCE, CIO_CTO) → RETURN Class 5
    IF role = PROCUREMENT → RETURN Class 4

  // Fallback
  IF signal.confidence = low → RETURN Class 1
  RETURN Class 4
```

---

## BLOC 4 — OPENING / CLOSING LIBRARY

These are not templates. They are structural patterns. Each one defines the shape of the first sentence. The specific words change per prospect. The shape does not.

A pattern becomes a template when you stop adapting it. If you've sent the same pattern to 5 domains in a row, you've stopped adapting. Switch.

---

### 12 OPENING PATTERNS

---

#### O1: Named-Tool-First

**Pattern**: `"[Tool A] and [Tool B] both active on [domain]."`

**Language**: EN, adaptable to DE/FR
**Fits roles**: CFO, VP Finance
**Fits signals**: `dual_stack`, `vendor_overlap`
**Fits maturity**: Any
**Forbidden**: CEO (too tactical), weak signal with only 1 tool (need 2+ to use this pattern), when tools serve clearly different functions (e.g., Salesforce CRM vs Salesforce Marketing Cloud — same vendor, different category)

**Why it works**: Immediate specificity. The recipient knows within 5 words that this is not a generic email. Two named tools are undeniable L1 evidence. The prospect cannot dismiss it as speculation.

**Failure mode**: If the two tools are not actually in the same category, the observation is meaningless. Verify category overlap before using this pattern.

---

#### O2: Headcount-Context

**Pattern**: `"With [company] at [N] employees, down from [N+X] twelve months ago..."`

**Language**: EN
**Fits roles**: CFO, CIO/CTO
**Fits signals**: `post_layoff`
**Fits maturity**: Any
**Forbidden**: If headcount data is older than 6 months (unreliable). If decrease is <10% (not noteworthy). Never use "after layoffs" or "after the reduction" — use neutral headcount language.

**Why it works**: Headcount change implies license misalignment. Every HR change that reduces headcount by >10% creates an IT cost exposure window of 6-12 months where licenses are still provisioned for people who have left.

**Failure mode**: Headcount data from Apollo is estimated, not exact. Always use "approximately" or cite the source: "per LinkedIn data."

---

#### O3: Tool-Count-Fact

**Pattern**: `"[N] tools detected across [domain]."`

**Language**: EN, DE, FR
**Fits roles**: CEO, CFO
**Fits signals**: `stack_bloat`
**Fits maturity**: Cold (especially effective — the number speaks)
**Forbidden**: If N < 20 (not noteworthy for 100+ employee company). If N includes browser extensions or marketing pixels that don't represent paid SaaS.

**Why it works**: A single number that creates cognitive dissonance. "67 tools for a 400-person company" forces the question: "do we really use 67 tools?" The prospect doesn't need to trust Ghost Tax to find this interesting. They need to count.

**Failure mode**: If the count is inflated by non-paid tools, the number loses impact when the prospect investigates and finds most are free. Quality of count matters more than size.

---

#### O4: Role-Timing

**Pattern**: `"[X] months into the [title] role at [company]..."`

**Language**: EN
**Fits roles**: CFO, CIO/CTO (newly appointed)
**Fits signals**: `new_cfo`
**Fits maturity**: Cold, Warm
**Forbidden**: If time in role > 18 months (the "new leader" window has closed). If the person was promoted internally (the angle "building a baseline" is weaker — they already know the stack).

**Why it works**: New executives have a mandate to assess. They need data to make their first recommendations. An external scan is exactly what a new CFO/CIO needs in months 2-6 — they haven't yet built internal relationships that would bias their assessment.

**Failure mode**: If the person has been in role >12 months, this opening sounds like you're late. They've already done their assessment. Drop this pattern and use signal_first instead.

---

#### O5: Acquisition-Context

**Pattern**: `"Since [acquirer] acquired [company] in [month/year]..."`

**Language**: EN
**Fits roles**: CTO, CFO
**Fits signals**: `post_ma`
**Fits maturity**: Any
**Forbidden**: If acquisition is >18 months ago (integration window has passed or is well underway). If the acquisition is not publicly confirmed (do not reference non-public deals). If the acquisition is hostile (tone-sensitive — avoid entirely).

**Why it works**: M&A creates guaranteed stack overlap. Two companies, both with IT infrastructure, now under one roof. The question isn't "is there overlap?" — it's "how much?" This is the strongest buying signal for Ghost Tax because the cost exposure is structurally inevitable.

**Failure mode**: PE-backed acquisitions often have professional cost optimization already running (Bain, McKinsey, internal ops teams). Ghost Tax's angle must differentiate: "we find what shows in external infrastructure, which integration teams typically assess last."

---

#### O6: Legacy-Fact (DE)

**Pattern**: `"[Tool] (eingestellt [year]) noch in der Infrastruktur von [domain] erkannt."`

**Language**: DE
**Fits roles**: CFO, CIO/CTO
**Fits signals**: `legacy_tool`
**Fits maturity**: Any
**Forbidden**: If the tool isn't actually deprecated — verify the EOL date before using this pattern. If the tool was sunsetted <6 months ago (migration may be in progress). If the "detection" is from a DNS record or technology header that persists after the tool is actually decommissioned.

**Why it works**: Naming a deprecated tool with its sunset year is maximally specific. It cannot be mistaken for a generic email. It demonstrates that Ghost Tax did actual research. The EOL date is verifiable — the recipient can Google it in 10 seconds.

**Failure mode**: If the tool is detected in infrastructure but not actually in use (residual DNS, old headers), the claim is technically true but practically misleading. Hedge: "detected in external infrastructure" rather than "in use."

---

#### O7: Dual-System (DE)

**Pattern**: `"[System A] und [System B] laufen parallel auf [domain]."`

**Language**: DE
**Fits roles**: CFO, CIO/CTO
**Fits signals**: `dual_stack`
**Fits maturity**: Any
**Forbidden**: If the two tools serve genuinely different purposes (e.g., Jira for engineering, Monday.com for marketing — different departments, not overlap). If one tool is a free tier and the other is paid (the "overlap" may be intentional tiering).

**Why it works**: German business communication values precision and directness. Naming two systems running in parallel is a statement of fact that requires no interpretation. It lands cleanly with DACH recipients who expect technical specificity.

**Failure mode**: Same as O1 — ensure the tools are in the same functional category before claiming parallel operation.

---

#### O8: Question-Hook

**Pattern**: `"How many of [company]'s [N] SaaS tools are actively used?"`

**Language**: EN
**Fits roles**: CFO, VP Finance
**Fits signals**: `stack_bloat`
**Fits maturity**: Cold
**Forbidden**: CEO (never ask CEOs vendor questions — they don't answer them). If N is unknown or unreliable. If the question is purely rhetorical with no finding to back it up (questions without evidence are lazy).

**Why it works**: A specific question with a specific number is harder to ignore than a statement. The CFO who reads "How many of your 53 tools are actively used?" cannot help but wonder. The question plants a seed that grows internally — they'll ask their IT team.

**Failure mode**: If the recipient replies "all of them" (possible for well-managed companies), the conversation is over. Only use when N is high enough (>35) that the answer is almost certainly "fewer than N."

---

#### O9: Signal-First (FR)

**Pattern**: `"Deux signaux dans la stack de [domain] :"`

**Language**: FR
**Fits roles**: CFO, CTO
**Fits signals**: `dual_stack`, `vendor_overlap`
**Fits maturity**: Any
**Forbidden**: If only 1 signal (don't claim "deux" when there's one). NL/UK/DE prospects (use target's business language).

**Why it works**: The colon after the opening creates a list structure. The recipient's eye naturally moves to the list below. This is a structural trick — colon-then-list has higher readthrough than paragraph form.

**Failure mode**: If the two signals are weak, the list format makes them look weaker (sparse list = sparse evidence). Only use when both signals are L1.

---

#### O10: Post-Deal-Pattern (FR)

**Pattern**: `"Suite à la transaction de [year], la stack de [domain] présente [N] chevauchements visibles."`

**Language**: FR
**Fits roles**: CFO, CTO
**Fits signals**: `post_ma`
**Fits maturity**: Any
**Forbidden**: If the deal is not publicly confirmed. If the word "transaction" is inappropriate for the type of deal (use "acquisition" for buyouts, "fusion" for mergers). If the deal is >18 months old.

**Why it works**: Anchoring to a known event (the deal) establishes temporal context. The recipient immediately understands why Ghost Tax is contacting them now, not 6 months ago. Timing legitimacy.

**Failure mode**: If the company is tired of M&A-related vendor outreach (common for large public acquisitions), this opening groups Ghost Tax with every consultant who piled on post-announcement. Differentiate by being specific about the stack findings, not the deal itself.

---

#### O11: Observation-Pure (DE)

**Pattern**: `"Bei einer externen Analyse von [domain] sind [N] Signale aufgefallen:"`

**Language**: DE
**Fits roles**: Any
**Fits signals**: Any
**Fits maturity**: Cold
**Forbidden**: If used as the default opening for all DE messages. This pattern is deliberately neutral — if overused, it becomes a recognizable template. Rotate with O6 and O7 for DACH messages. Never use for >30% of DE messages in a given week.

**Why it works**: "Bei einer externen Analyse" is factual and non-presumptuous. It says "we looked from outside" — no claim of deep access, no claim of internal knowledge. This is the safest DE opening for any situation.

**Failure mode**: Blandness. This opening is correct but not memorable. Pair with strong findings in the body to compensate for the neutral opening.

---

#### O12: Procurement-Angle

**Pattern**: EN: `"[N] active tools in the [category] category detected on [domain]."`  FR: `"[N] outils actifs dans la catégorie [category] détectés sur [domain]."`

**Language**: EN, FR
**Fits roles**: Procurement
**Fits signals**: `vendor_overlap`
**Fits maturity**: Warm (Procurement rarely responds to cold outreach from cost intelligence vendors)
**Forbidden**: CFO (too tactical — CFOs think in total spend, not tool categories). CEO (too detailed). Cold account without prior contact at the company (Procurement is almost never the first point of contact).

**Why it works**: Procurement thinks in categories and contracts, not in tool names. Framing the finding as "3 tools in the project management category" maps directly to how procurement organizes vendor relationships.

**Failure mode**: If the "category" is loose (e.g., "collaboration tools" could mean anything), the observation lacks punch. Use tight categories: "CRM", "project management", "cloud infrastructure", "ERP."

---

### 12 CLOSING PATTERNS

Each closing belongs to exactly one CTA class. Closings are not interchangeable. The CTA class selected in Step 8 determines which closings are permitted.

---

#### C1: Observation-Close (EN)
`"Worth investigating internally."`
**CTA Class**: 1 | **Fits roles**: CEO, any role on weak signal | **Forbidden**: Never on warm account with 3+ dense findings (too passive).

#### C2: Verification-Close (EN)
`"Your IT team can verify this in your [Salesforce Admin / AWS Console / Azure Portal / Google Workspace Admin]."`
**CTA Class**: 2 | **Fits roles**: CIO/CTO, VP Engineering | **Forbidden**: CFO (doesn't access these), CEO (doesn't access these), Procurement (doesn't access these). Must name the specific console — never use generic "your systems."

#### C3: Summary-Offer-Close (EN)
`"I can send you a 1-page summary of these findings — no cost, no commitment. Would that be useful?"`
**CTA Class**: 3 | **Fits roles**: VP Finance, Procurement, CIO/CTO | **Forbidden**: If the 1-pager isn't actually ready or producible within 24h. CEO (won't review).

#### C4: Scan-Close (EN)
`"Free preliminary scan available: ghost-tax.com/intel"`
**CTA Class**: 4 | **Fits roles**: Any | **Forbidden**: Prospect already completed a scan. Account is already qualified or active.

#### C5: Paid-Close (EN)
`"Full briefing: €490, delivered in 48h. ghost-tax.com/checkout"`
**CTA Class**: 5 | **Fits roles**: CFO, VP Finance, CIO/CTO with budget authority | **Forbidden**: CEO. Cold account with <2 findings. Benchmark-only message without company-specific findings.

#### C6: Paid-Close (DE)
`"Vollständiges Briefing: €590, Lieferung in 48h. ghost-tax.com/checkout"`
**CTA Class**: 5 | **Fits roles**: CFO DE, VP Finance DE, CIO/CTO DE | **Forbidden**: Same as C5. Price is €590 for DACH.

#### C7: Paid-Close (FR)
`"Briefing complet : €490, livré sous 48h. ghost-tax.com/checkout"`
**CTA Class**: 5 | **Fits roles**: CFO FR, VP Finance FR | **Forbidden**: Same as C5.

#### C8: Permission-Reset (EN)
`"If this isn't relevant right now, no need to reply. I won't follow up again."`
**CTA Class**: 6 | **Fits roles**: Any | **Forbidden**: M1 (never close before opening). M2, M3 (too early — sequence hasn't earned a close).

#### C9: Observation-Close (DE)
`"Kein Handlungsbedarf, falls das eine bewusste Entscheidung ist."`
**CTA Class**: 1 | **Fits roles**: Any DE | **Forbidden**: Warm account with engagement signals (too passive). Translation: "No action needed, if this is a deliberate decision." — this is subtly powerful because it implies the overlap might NOT be deliberate.

#### C10: Summary-Offer-Close (FR)
`"Est-ce que ce serait utile ?"`
**CTA Class**: 3 | **Fits roles**: VP Finance FR, Procurement FR, CIO/CTO FR | **Forbidden**: CEO (never ask CEOs if something is useful — they don't answer vendor questions). Must follow a concrete offer sentence (e.g., "Je peux vous envoyer un résumé...").

#### C11: Judgment-Defer (DE)
`"Ob das für Ihre Organisation angemessen ist, können nur Sie beurteilen."`
**CTA Class**: 1 | **Fits roles**: CEO DE, senior CFO DE | **Forbidden**: Never on a tactical message about specific tools (this closing is too elevated for tactical findings). Use only when the message is observation-level and the finding is strategic.

#### C12: Graceful-Exit (FR)
`"Bonne continuation."`
**CTA Class**: 6 | **Fits roles**: Any FR, M5 | **Forbidden**: M1–M3 (haven't earned the exit). Not appropriate for DE or EN messages (language must match message body). Pair with: no further sentences after this. "Bonne continuation." is the final line. No signature block embellishment.

---

### CLOSING SELECTION MATRIX

| CTA Class | EN | DE | FR |
|-----------|----|----|-----|
| Class 1 | C1 | C9 or C11 | (use C1 in FR adaptation) |
| Class 2 | C2 | C2 (translate console name) | C2 (translate) |
| Class 3 | C3 | C3 (translate) | C10 (after offer sentence) |
| Class 4 | C4 | C4 (translate URL stays same) | C4 (translate) |
| Class 5 | C5 (€490) | C6 (€590) | C7 (€490) |
| Class 6 | C8 | C8 (translate) | C12 |

---

### PATTERN ROTATION RULES

To prevent template detection (by recipients, by email providers, and by internal quality checks):

1. **Same domain**: Never use the same opening pattern on consecutive messages to the same domain. If M1 used O1 (Named-Tool-First), M2 must use a different pattern.
2. **Same batch**: In any outbound batch of >5 messages, no single opening pattern may exceed 40% of the batch.
3. **Same role**: If sending to 3+ CFOs in a single batch, each must use a different opening pattern.
4. **Language consistency**: Opening and closing must be in the same language. Do not mix DE opening with EN closing.
5. **CTA class consistency**: The closing must match the CTA class selected in Step 8. No mixing — e.g., a Class 1 observation close on a message that contains a price is a contradiction.

---

*End of Blocs 1–4. Blocs 5–8 (Sequence Architecture, Lint Rules, Language-Specific Constraints, Audit Protocol) will be specified separately.*
# MESSAGE COMPILER — BLOCS 5-8

Ghost Tax Message Production System — Part 2
Engineering specification. Internal reference only.

---

## BLOC 5 — LANGUAGE-SPECIFIC BLACKLISTS

Every message produced by the compiler passes through a language-specific lexical filter before shipping. Three tiers per language: FORBIDDEN (instant block), TOLERATED (flag for review), STRONG (preferred replacements).

The purpose of this bloc is structural: Ghost Tax messages must not read like translated Anglo-SaaS templates. Each language has distinct failure modes. German formal register is not English formal register translated. French B2B has its own cliche ecosystem independent of English.

---

### 5.1 ENGLISH

#### FORBIDDEN (20) — Message is BLOCKED if any of these appear

| # | Formulation | Why it fails |
|---|-------------|-------------|
| EN-F01 | "I hope this finds you well" | Template opener. Signals mass mail. |
| EN-F02 | "I'm reaching out because" | Passive. Puts sender's intent before recipient's problem. |
| EN-F03 | "Our platform" | Product-centric. Ghost Tax is not a platform pitch. |
| EN-F04 | "Innovative solution" | Empty adjective. Says nothing measurable. |
| EN-F05 | "Save money" / "reduce costs" | Generic claim. Every vendor says this. |
| EN-F06 | "Best practices" | Consulting-speak. Irrelevant to signal-based messaging. |
| EN-F07 | "I'd be happy to" | Performative politeness. Weak positioning. |
| EN-F08 | "Circle back" | Corporate jargon. Signals internal meeting culture, not external intel. |
| EN-F09 | "At your earliest convenience" | Vague CTA. No temporal anchor. |
| EN-F10 | "Just checking in" | Implies previous relationship that doesn't exist. |
| EN-F11 | "Quick question" | Manipulative framing. The question is never quick. |
| EN-F12 | "Following up on my previous email" | Self-referential. Recipient doesn't remember previous email. |
| EN-F13 | "We help companies like yours" | Category claim without specificity. Interchangeable. |
| EN-F14 | "Book a call" / "Schedule a demo" | Ghost Tax is self-serve. No calls. Ever. |
| EN-F15 | "Take your business to the next level" | Meaningless escalation language. |
| EN-F16 | "Low-hanging fruit" | Cliche. Implies the recipient is incompetent. |
| EN-F17 | "Synergies" | Consulting residue. No place in signal-based comms. |
| EN-F18 | "Unlock value" | Vague promise. Unverifiable. |
| EN-F19 | "End-to-end" | Feature-speak. Not relevant to external observation. |
| EN-F20 | "Streamline your operations" | Generic improvement claim. Could be any vendor. |

#### TOLERATED (10) — Acceptable but flag if frequency > 1 per 5 messages

| # | Formulation | Condition for tolerance |
|---|-------------|----------------------|
| EN-T01 | "Based on public data" | Fine once. Becomes defensive if repeated. |
| EN-T02 | "We noticed" | Acceptable if followed by specific named tool or signal. |
| EN-T03 | "Your infrastructure" | Generic unless qualified (e.g., "your public-facing infrastructure"). |
| EN-T04 | "It may be worth" | Soft CTA. Acceptable for cold accounts. Weak for warm. |
| EN-T05 | "From what we can see externally" | Transparency framing. Good once, redundant if stacked. |
| EN-T06 | "This is common in [vertical]" | Only if backed by verifiable sector pattern. No invented norms. |
| EN-T07 | "No system access required" | Differentiator. But overuse makes it sound like a disclaimer. |
| EN-T08 | "Happy to share details" | Passive CTA. Tolerable for M1, weak for M2+. |
| EN-T09 | "Depending on your setup" | Appropriate hedge. Don't overuse. |
| EN-T10 | "If relevant" | Soft qualifier. Fine for closing. |

#### STRONG (10) — Preferred formulations. Use these.

| # | Formulation | Why it works |
|---|-------------|-------------|
| EN-S01 | "Two signals from [domain]" | Specific. Implies observation, not pitch. |
| EN-S02 | "Worth investigating internally" | Transfers ownership. No pressure. |
| EN-S03 | "We detected [X] and [Y] running simultaneously" | Named tools. Concrete. Verifiable. |
| EN-S04 | "[Tool A] and [Tool B] — functional overlap in [category]" | Precise finding. Hard to ignore. |
| EN-S05 | "Public DNS and tech stack data — no system access" | Clean provenance statement. One line. |
| EN-S06 | "The scan is free. 90 seconds. No login." | CTA that removes friction without selling. |
| EN-S07 | "Whether this matters depends on your internal context" | Disarms objection by acknowledging limitation. |
| EN-S08 | "This surfaces in [X]% of scans we run on [vertical] companies" | Benchmark with qualifier. Only if N >= 30. |
| EN-S09 | "Jean-Etienne — Ghost Tax" | Clean sign-off. No title inflation. |
| EN-S10 | "Not urgent. But visible." | Tension without pressure. Institutional tone. |

---

### 5.2 GERMAN

#### FORBIDDEN (20) — Message is BLOCKED if any of these appear

| # | Formulation | Why it fails |
|---|-------------|-------------|
| DE-F01 | "Ich hoffe, es geht Ihnen gut" | Direct translation of EN template opener. Germans don't open B2B mail this way. |
| DE-F02 | "Ich wollte mich kurz melden" | Implies familiarity that doesn't exist. Unprofessional for cold. |
| DE-F03 | "Innovative Lösung" | Empty. German CFOs distrust adjectives without data. |
| DE-F04 | "Kosten sparen" | Generic claim. Every Anbieter says this. |
| DE-F05 | "Ich würde mich freuen" | Konjunktiv II hedging. Reads as insecure, not polite. |
| DE-F06 | "Bei Gelegenheit" | Vague. No temporal anchor. Germans expect precision. |
| DE-F07 | "Kurzes Gespräch" / "Termin vereinbaren" | No calls. Ghost Tax is self-serve. |
| DE-F08 | "Erstaunliche Ergebnisse" | Hyperbole. Triggers skepticism in DACH markets. |
| DE-F09 | "Sie werden überrascht sein" | Clickbait register. Inappropriate for CFO communication. |
| DE-F10 | "Unser Tool" | Product-centric. Ghost Tax is intelligence, not a tool. |
| DE-F11 | "Effizienter arbeiten" | Vague improvement claim. Not signal-based. |
| DE-F12 | "Mehrwert schaffen" | Consulting-Deutsch. Says nothing specific. |
| DE-F13 | "Wir helfen Unternehmen" | Category claim. Interchangeable with any vendor. |
| DE-F14 | "Win-Win" | Anglicism. Sounds unserious in German B2B. |
| DE-F15 | "Best Practice" | Anglicism used as filler. Not a finding. |
| DE-F16 | "Zeitnah" | Urgency word without justification. Reads as pressure. |
| DE-F17 | "Proaktiv" | Buzzword. Not a verb. Not a finding. |
| DE-F18 | "Synergieeffekte" | Consulting residue. Meaningless in signal context. |
| DE-F19 | "Optimierungspotenzial" | Vague promise. Every vendor claims this. |
| DE-F20 | "Wir bieten Ihnen" | Seller-frame. Ghost Tax observes, it doesn't "offer." |

#### TOLERATED (10) — Acceptable but flag if frequency > 1 per 5 messages

| # | Formulation | Condition for tolerance |
|---|-------------|----------------------|
| DE-T01 | "Auf Basis öffentlicher Daten" | Fine once per message. Redundant if stacked with provenance line. |
| DE-T02 | "Uns ist aufgefallen" | Acceptable if followed by named tool signal. |
| DE-T03 | "In Ihrer Infrastruktur" | Generic unless qualified. |
| DE-T04 | "Möglicherweise relevant" | Soft hedge. Fine for cold. Weak for warm. |
| DE-T05 | "Ohne Systemzugang" | Differentiator. One use per thread max. |
| DE-T06 | "In vergleichbaren Unternehmen" | Only with N >= 30 benchmark backing. |
| DE-T07 | "Falls für Sie von Interesse" | Closing hedge. Acceptable. |
| DE-T08 | "Gerne teile ich Details" | Passive but tolerable for M1. |
| DE-T09 | "Je nach interner Konfiguration" | Honest hedge. Don't overuse. |
| DE-T10 | "Kurzer Hinweis" | Acceptable as subject line prefix. Not in body. |

#### STRONG (10) — Preferred formulations. Use these.

| # | Formulation | Why it works |
|---|-------------|-------------|
| DE-S01 | "Zwei Signale aus der Infrastruktur von [domain]" | Specific. Observation-frame. |
| DE-S02 | "Öffentliche Daten — kein Systemzugriff" | Clean one-line provenance. |
| DE-S03 | "Ob das für Ihre Organisation angemessen ist, können nur Sie beurteilen" | Transfers ownership. Respectful. |
| DE-S04 | "[Tool A] und [Tool B] laufen parallel — funktionale Überschneidung in [Kategorie]" | Named tools. Concrete finding. |
| DE-S05 | "Der Scan ist kostenlos. 90 Sekunden. Kein Login." | Friction-free CTA in German. |
| DE-S06 | "Nicht dringend. Aber sichtbar." | Tension without Druck. Institutional. |
| DE-S07 | "Das taucht bei [X]% der Scans in [Branche]-Unternehmen auf" | Benchmark with N >= 30 qualifier required. |
| DE-S08 | "Ein Signal, das interne Prüfung verdient" | Respectful escalation. |
| DE-S09 | "Jean-Etienne — Ghost Tax" | Clean. No "Geschäftsführer" or title inflation. |
| DE-S10 | "Drei Tools für [Kategorie] — ungewöhnlich für Unternehmen dieser Größe" | Comparative observation. Forces internal check. |

---

### 5.3 FRENCH

#### FORBIDDEN (20) — Message is BLOCKED if any of these appear

| # | Formulation | Why it fails |
|---|-------------|-------------|
| FR-F01 | "J'espère que vous allez bien" | Template. Every mass mailer in France opens this way. |
| FR-F02 | "Je me permets de vous contacter" | False modesty. Signals spam awareness. |
| FR-F03 | "Solution innovante" | Empty adjective. French CFOs are especially allergic. |
| FR-F04 | "Gain de temps" | Generic claim. Not signal-based. |
| FR-F05 | "Réduire vos coûts" | Every vendor says this. Zero differentiation. |
| FR-F06 | "Je serais ravi" | Conditionnel de politesse. Reads as form letter. |
| FR-F07 | "À votre convenance" | Vague CTA. No temporal anchor. |
| FR-F08 | "Un bref échange" / "Planifier un appel" | No calls. Self-serve only. |
| FR-F09 | "Notre outil" | Product-centric framing. |
| FR-F10 | "Gagner en efficacité" | Vague improvement. Not a finding. |
| FR-F11 | "Créer de la valeur" | Consulting-speak. Meaningless without specifics. |
| FR-F12 | "Nous aidons les entreprises" | Category claim. Interchangeable. |
| FR-F13 | "Gagnant-gagnant" | Cliche. Undermines credibility. |
| FR-F14 | "Bonne pratique" | Filler. Not a signal. |
| FR-F15 | "Dans les meilleurs délais" | False urgency with no justification. |
| FR-F16 | "Proactif" | Buzzword. Not an observation. |
| FR-F17 | "Levier de performance" | Consulting-French. Empty. |
| FR-F18 | "Optimiser vos process" | Generic. Could be any vendor email. |
| FR-F19 | "Accompagner votre transformation" | ESN language. Ghost Tax is not Capgemini. |
| FR-F20 | "N'hésitez pas à" | Weak CTA disguised as invitation. Signals mass mail. |

#### TOLERATED (10) — Acceptable but flag if frequency > 1 per 5 messages

| # | Formulation | Condition for tolerance |
|---|-------------|----------------------|
| FR-T01 | "Sur la base de données publiques" | Fine once. Defensive if repeated. |
| FR-T02 | "Nous avons observé" | Acceptable if followed by named tool. |
| FR-T03 | "Dans votre infrastructure" | Generic unless qualified. |
| FR-T04 | "Potentiellement pertinent" | Soft hedge. OK for cold. |
| FR-T05 | "Sans accès système" | One use per thread. |
| FR-T06 | "Dans des entreprises comparables" | Only with N >= 30. |
| FR-T07 | "Si cela vous semble pertinent" | Closing hedge. Acceptable. |
| FR-T08 | "Je peux détailler" | Passive but tolerable for M1. |
| FR-T09 | "Selon votre configuration interne" | Honest hedge. |
| FR-T10 | "Un point d'attention" | Acceptable as framing device. Not in subject line. |

#### STRONG (10) — Preferred formulations. Use these.

| # | Formulation | Why it works |
|---|-------------|-------------|
| FR-S01 | "Deux signaux dans la stack de [domain]" | Specific. Observation-first. |
| FR-S02 | "Données publiques uniquement" | Clean provenance. Three words. |
| FR-S03 | "Un signal qui mérite vérification" | Transfers ownership. Non-directive. |
| FR-S04 | "[Tool A] et [Tool B] — recouvrement fonctionnel sur [catégorie]" | Named tools. Concrete. |
| FR-S05 | "Le scan est gratuit. 90 secondes. Sans login." | Friction-free CTA. |
| FR-S06 | "Pas urgent. Mais visible." | Tension without pressure. |
| FR-S07 | "Ce signal apparaît dans [X]% des scans sur le secteur [vertical]" | Benchmark with N >= 30 only. |
| FR-S08 | "Trois outils pour [catégorie] — inhabituel pour cette taille d'entreprise" | Comparative. Forces internal check. |
| FR-S09 | "Jean-Etienne — Ghost Tax" | Clean. No "Fondateur" or title. |
| FR-S10 | "La question est interne — le signal est externe" | Frames Ghost Tax's role precisely. |

---

## BLOC 6 — MESSAGE LINT ENGINE

30 rules. Each message runs through all 30 before shipping. Any BLOCK = message does not ship. Any WARN = message flagged for review before shipping.

The lint engine runs AFTER language blacklist (Bloc 5) and AFTER claim classification (Blocs 1-4 from Part 1). It is the final gate.

---

### Category A: Benchmark Integrity (5 rules)

**LINT-001 — Benchmark without visible N**
- Type: BLOCK
- Description: Any benchmark claim (median, average, percentage, "most companies") must include visible sample size or be scoped to a verified dataset.
- Reason: Ghost Tax has zero customers. Any benchmark without N is fabricated precision.
- Violation example: "The median for companies your size is 35 tools."
- Fix: Remove the benchmark or add verifiable source. "In the 2025 Productiv SaaS Benchmark (N=500), the median is 35 tools."

**LINT-002 — Daily burn rate derived from annual estimate**
- Type: BLOCK
- Description: Dividing an annual cost estimate by 365 to produce a "daily waste" figure is forbidden.
- Reason: Creates fabricated urgency. The math is technically correct but the framing is manipulative. No CFO thinks in daily burn for SaaS.
- Violation example: "That's approximately €466/day lost since our last message."
- Fix: State the annual figure only, or remove entirely.

**LINT-003 — Benchmark presented as company-specific finding**
- Type: BLOCK
- Description: A sector or size-class benchmark must never be presented as if it applies to the specific recipient's company.
- Reason: External observation cannot determine internal spend. Presenting industry data as company data is dishonest.
- Violation example: "Companies your size typically waste €170k annually — your stack suggests you're above that."
- Fix: "In the [source] benchmark, companies in [vertical] with [size] employees average [X]. Your external signals may warrant comparison."

**LINT-004 — Invented benchmark source**
- Type: BLOCK
- Description: Any benchmark must reference a real, verifiable source. "Our data shows" is not a valid source when N < 30.
- Reason: Ghost Tax has zero customers. "Our data" does not exist yet.
- Violation example: "Our analysis of similar companies shows an average of 12 redundant licenses."
- Fix: Use published third-party benchmarks (Gartner, Productiv, Zylo, Flexera) or remove.

**LINT-005 — Percentile claim without methodology**
- Type: WARN
- Description: Claims like "top quartile" or "above the 80th percentile" require methodology context.
- Reason: Percentile framing implies statistical rigor that may not exist in the underlying data.
- Violation example: "Your tool count puts you in the top quartile of SaaS sprawl."
- Fix: "Based on [source], organizations with [X]+ tools in [category] are above the 75th percentile (N=[Y])."

---

### Category B: Claim Integrity (5 rules)

**LINT-006 — L3 claim presented as fact**
- Type: BLOCK
- Description: Any L3 inference (speculative, not directly observable) must be explicitly marked as hypothesis or removed.
- Reason: L3 claims are not verifiable. Presenting them as findings destroys credibility.
- Violation example: "Your team is likely frustrated with the overlap between Slack and Teams."
- Fix: Remove. Or: "Slack and Teams running simultaneously is observable. Internal impact is for your team to assess."

**LINT-007 — Cost estimate without range or qualifier**
- Type: BLOCK
- Description: Any cost figure must include a range or explicit qualifier ("estimated", "public pricing suggests", "list price").
- Reason: External observation cannot determine negotiated pricing, volume discounts, or contract terms.
- Violation example: "You're spending approximately €340,000 on redundant project management tools."
- Fix: "At list pricing, [Tool A] + [Tool B] for [estimated seats] would be in the €280k-€400k range. Your negotiated terms may differ."

**LINT-008 — Claim about internal processes**
- Type: BLOCK
- Description: No message may claim knowledge of internal workflows, team satisfaction, adoption rates, or usage patterns.
- Reason: Ghost Tax sees tech stacks externally. It cannot see what happens inside.
- Violation example: "Your teams are probably using both tools inconsistently."
- Fix: Remove. State the external observation only: "[Tool A] and [Tool B] are both externally visible. Whether both are actively used is an internal question."

**LINT-009 — Named tool not traceable to signal source**
- Type: WARN
- Description: Every named tool in a message must be traceable to Apollo tech stack data, DNS records, public job postings, or another declared source.
- Reason: If a recipient asks "how do you know we use [Tool]?", there must be a clear answer.
- Violation example: Mentioning "Notion" when it doesn't appear in any signal source.
- Fix: Only name tools that appear in the signal data. Add provenance if questioned.

**LINT-010 — Conflation of "detected" and "confirmed"**
- Type: WARN
- Description: "Detected" means externally visible signal. "Confirmed" implies verification. Do not use "confirmed" for external-only data.
- Reason: Precision in language prevents overpromising.
- Violation example: "We confirmed that you're running Jira and Asana."
- Fix: "We detected Jira and Asana in your public-facing tech stack."

---

### Category C: Urgency/Pressure (4 rules)

**LINT-011 — Artificial deadline**
- Type: BLOCK
- Description: No message may create a deadline that doesn't exist ("offer expires", "limited spots", "this week only").
- Reason: Manufactured scarcity is incompatible with institutional tone. Ghost Tax does not run promotions.
- Violation example: "This complimentary scan is available until Friday."
- Fix: "The scan is free. No deadline." Or simply omit the temporal frame.

**LINT-012 — Fear-based framing**
- Type: BLOCK
- Description: No message may use loss-aversion language designed to create anxiety ("before it's too late", "risk exposure", "you can't afford to ignore").
- Reason: Ghost Tax is intelligence, not insurance. Fear-based selling destroys the observer positioning.
- Violation example: "Every day without visibility is a day of uncontrolled spend."
- Fix: State the signal. Let the recipient assess urgency internally.

**LINT-013 — Countdown or accumulation language**
- Type: BLOCK
- Description: No language that implies a running counter ("since our last email, €X has been wasted", "every hour you delay").
- Reason: Same as LINT-002. Fabricated temporal pressure from static observation data.
- Violation example: "In the 14 days since our first message, that's approximately €6,500 in potential waste."
- Fix: Remove entirely.

**LINT-014 — Implied competitor urgency**
- Type: WARN
- Description: Claims like "your competitors are already doing this" or "the market is moving" without specific evidence.
- Reason: Vague competitive pressure is a sales tactic, not intelligence.
- Violation example: "Leading companies in your sector have already addressed this."
- Fix: Only cite specific, named examples with sources, or remove.

---

### Category D: Template Smell (4 rules)

**LINT-015 — Interchangeable message test**
- Type: BLOCK
- Description: If replacing [company_name] and [recipient_name] with any other company/name produces an equally valid message, the message is blocked.
- Reason: A message with no company-specific signal has no reason to be sent.
- Test: Substitute "Acme Corp" and "Jane Smith." If nothing breaks, the message fails.
- Violation example: "Hi [Name], I noticed your company might benefit from reviewing its SaaS portfolio."
- Fix: Include at least one named tool and one specific signal from the target domain.

**LINT-016 — Same opening as previous message to same domain**
- Type: WARN
- Description: If the message opens with the same structure (first 15 words substantially similar) as a previous message to the same domain, flag it.
- Reason: Repeated openings signal automation. Recipients notice.
- Violation example: M1 opens "Two signals from acme.com" — M2 opens "Two signals from acme.com's infrastructure."
- Fix: Vary the opening structure. Start M2 with a different framing.

**LINT-017 — Three or more consecutive messages with identical structure**
- Type: BLOCK
- Description: If M1, M2, M3 to different domains follow the same [signal → overlap → CTA] skeleton, the third is blocked.
- Reason: Structural repetition is detectable by recipients who talk to each other, especially in the same vertical.
- Fix: Rotate message architecture. Use the variant matrix from Bloc 3 (Part 1).

**LINT-018 — "We ran an external analysis" as opening in 3+ messages**
- Type: BLOCK
- Description: This specific opening is overused. If it appears as the first sentence in three or more messages within the same batch, all after the second are blocked.
- Reason: It's the default AI-generated opening for external intelligence messaging. Its frequency is a tell.
- Fix: Use alternative framings: direct signal statement, question, observation.

---

### Category E: Role Alignment (3 rules)

**LINT-019 — Paid CTA sent to CEO**
- Type: BLOCK
- Description: CEO-class recipients must never receive a direct paid CTA (e.g., "€490 Decision Pack"). CEOs receive scan CTAs or internal forwarding prompts only.
- Reason: CEOs don't buy €490 products. They delegate. The CTA must match the action a CEO would actually take.
- Violation example: "The Ghost Tax Decision Pack is €490 — here's the link."
- Fix: "This might be worth routing to your finance team. The scan takes 90 seconds."

**LINT-020 — Legacy tool message sent to Procurement**
- Type: WARN
- Description: Procurement recipients should receive messages framed around vendor consolidation, contract timing, and renewal leverage — not legacy tool warnings.
- Reason: Procurement thinks in contracts and vendors, not in tool categories.
- Violation example: Sending a "legacy CRM detected" message to Head of Procurement.
- Fix: Reframe: "[Tool A] contract likely renewing in [window]. Two overlapping tools in [category] may create consolidation leverage."

**LINT-021 — Technical signal sent to non-technical recipient**
- Type: WARN
- Description: Messages to CFO, CEO, or Procurement should not lead with DNS records, subdomain findings, or infrastructure terminology.
- Reason: Technical framing alienates non-technical buyers. The same finding can be expressed in business terms.
- Violation example: "We found CNAME records pointing to both Zendesk and Freshdesk."
- Fix: "Two customer support platforms are externally visible — Zendesk and Freshdesk."

---

### Category F: Length/Density (3 rules)

**LINT-022 — Message exceeds 180 words**
- Type: BLOCK
- Description: Total message body (excluding signature) must not exceed 180 words.
- Reason: Mobile readability. CFOs scan on phones. Anything over 180 words gets scrolled past.
- Fix: Cut. If you can't say it in 180 words, you don't have a clear enough signal.

**LINT-023 — More than 3 distinct findings in one message**
- Type: WARN
- Description: A single message should present at most 3 signals. More than that creates cognitive overload and dilutes impact.
- Reason: Each additional finding reduces the perceived importance of all findings.
- Fix: Select the 2-3 strongest signals. Save remaining for follow-up.

**LINT-024 — Paragraph exceeds 3 lines (mobile rendering)**
- Type: WARN
- Description: No single paragraph should exceed 3 lines on a standard mobile screen (~40 characters per line, ~120 characters per paragraph).
- Reason: Dense paragraphs get skipped on mobile.
- Fix: Break into shorter paragraphs or use line breaks.

---

### Category G: Language Quality (3 rules)

**LINT-025 — Language blacklist violation**
- Type: BLOCK
- Description: Any formulation from the FORBIDDEN list in Bloc 5 (for the message's target language) triggers an immediate block.
- Reason: Blacklisted phrases are structural failures, not style preferences.
- Fix: Replace with STRONG alternatives from Bloc 5 or rephrase entirely.

**LINT-026 — Mixed language registers**
- Type: WARN
- Description: A German message must not contain untranslated English SaaS jargon (e.g., "Pain Point", "Use Case", "Stakeholder" used casually). A French message must not use franglais without good reason.
- Reason: Register inconsistency signals translation, not composition.
- Exception: Tool names are always in English (Salesforce, Jira, Slack). These are proper nouns, not jargon.

**LINT-027 — Formality mismatch by market**
- Type: WARN
- Description: German messages must use Sie-form consistently. UK English should avoid American colloquialisms. Dutch messages should match standard zakelijk register.
- Reason: Formality errors destroy credibility faster than content errors.
- Violation example: German message switching between "Sie" and "du." UK message saying "reach out."
- Fix: Enforce consistent register per market. Review for Americanisms in UK-targeted English.

---

### Category H: Operational (3 rules)

**LINT-028 — No signal source declared**
- Type: BLOCK
- Description: Every message must be linked to at least one signal source (Apollo tech stack, DNS, job posting, public filing, press release). If no source exists, the message has no basis.
- Reason: Ghost Tax messages are observation-based. No observation = no message.
- Fix: Do not produce the message. Return BLOCKED with reason "insufficient signal."

**LINT-029 — Sender name not "Jean-Etienne"**
- Type: BLOCK
- Description: Every Ghost Tax message must be signed "Jean-Etienne" or "Jean-Etienne — Ghost Tax." No other sender name is permitted.
- Reason: Brand consistency. "Jean-Etienne" is the sole external identity.
- Violation example: Message signed "Edith" or "The Ghost Tax Team" or "Best, GT."
- Fix: Replace signature with "Jean-Etienne — Ghost Tax."

**LINT-030 — Message sent outside permitted send window**
- Type: BLOCK
- Description: Messages must only be queued within the permitted send window for the target timezone (Tuesday-Thursday, 9:30-11:30 local time of recipient).
- Reason: Send timing affects open rates. Weekend or late-night sends signal automation.
- Fix: Queue for next valid window. Do not send immediately.

---

## BLOC 7 — BEFORE / AFTER LIBRARY

12 pairs. Each demonstrates a specific failure mode, the rule that catches it, and the corrected version. All AFTER versions use "Jean-Etienne" as sender.

---

### PAIR 1 — Benchmark without N

**BEFORE:**
> Subject: Your SaaS stack vs. industry median
>
> Hi Marcus,
>
> Companies your size typically run 28-35 SaaS tools. Based on our external scan, your stack appears to be well above that median.
>
> This usually means 15-25% of spend goes to redundant or underused licenses. For a company of 800 employees, that's roughly €170,000 annually.
>
> Worth a look?
>
> Best,
> Jean-Etienne

**WHY IT FAILS:**
- LINT-001 (BLOCK): "Companies your size" benchmark with no N, no source.
- LINT-003 (BLOCK): Industry benchmark presented as company-specific finding.
- LINT-007 (BLOCK): "€170,000" with no range, no qualifier, no methodology.

**AFTER:**
> Subject: Zwei Signale — acme.de
>
> Herr Braun,
>
> Jira, Asana und Monday sind in der Tech-Stack von acme.de gleichzeitig sichtbar. Drei Projektmanagement-Tools — ungewöhnlich für Unternehmen dieser Größe.
>
> Öffentliche Daten — kein Systemzugriff.
>
> Ob das intern bewusst so aufgesetzt ist, können nur Sie beurteilen. Der Scan ist kostenlos. 90 Sekunden. Kein Login.
>
> ghost-tax.com/scan
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** Named tools (Jira, Asana, Monday). No benchmark. No cost figure. Observation only. LINT-001, LINT-003, LINT-007 all clear.

---

### PAIR 2 — Daily burn urgency

**BEFORE:**
> Hi Sarah,
>
> Since our last message 14 days ago, your company has likely spent approximately €6,500 on redundant SaaS licenses. That's €466 per day in potential waste.
>
> The longer this goes unaddressed, the more it accumulates.
>
> Jean-Etienne

**WHY IT FAILS:**
- LINT-002 (BLOCK): Daily burn rate from annual estimate.
- LINT-013 (BLOCK): Accumulation language ("since our last message").
- LINT-012 (BLOCK): Fear-based framing ("the longer this goes unaddressed").

**AFTER:**
> Sarah,
>
> Following up on the overlap we flagged — Zendesk and Freshdesk both visible on globalcorp.co.uk.
>
> No change needed if both serve distinct functions internally. But if one is legacy, the renewal window for Zendesk is typically Q1 — may be worth checking before it auto-renews.
>
> ghost-tax.com/scan
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** No daily burn. No accumulation clock. Added renewal timing (verifiable). Signal stays the same, framing is operational, not emotional.

---

### PAIR 3 — Template opening repeated

**BEFORE (M1):**
> We ran an external analysis of techcorp.de and found two signals worth reviewing.

**BEFORE (M2):**
> We ran an external analysis of techcorp.de — a quick update on what we found.

**BEFORE (M3 to different company):**
> We ran an external analysis of globaltech.de and noticed some overlap.

**WHY IT FAILS:**
- LINT-018 (BLOCK): "We ran an external analysis" in 3+ messages.
- LINT-016 (WARN): Same opening structure to same domain (M1/M2).

**AFTER (M2 rewritten):**
> Herr Fischer,
>
> Slack und Microsoft Teams — beide aktiv auf techcorp.de. Beim letzten Signal war auch Zoom neben Teams sichtbar.
>
> Zwei Überschneidungen in Kommunikationstools. Nicht dringend. Aber sichtbar.
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** No "we ran an external analysis." Opens with the finding directly. M2 adds a new signal (Zoom) instead of rehashing M1.

---

### PAIR 4 — CEO receiving paid CTA

**BEFORE:**
> Dear Mr. Holzmann,
>
> Ghost Tax detected 4 areas of tool overlap in klinikgruppe.de. Our Decision Pack (€590) provides a detailed breakdown with negotiation leverage data.
>
> Shall I send the checkout link?
>
> Jean-Etienne

**WHY IT FAILS:**
- LINT-019 (BLOCK): Paid CTA (€590) sent to CEO.
- CTA class mismatch: CEO receives purchase prompt instead of delegation prompt.

**AFTER:**
> Herr Holzmann,
>
> Vier Signale aus der öffentlichen Infrastruktur von klinikgruppe.de — Überschneidungen in Projektmanagement, Kommunikation und CRM.
>
> Falls relevant: ein kostenloser Scan (90 Sek.) liefert die Details. Ggf. für Ihr Finance-Team interessant.
>
> ghost-tax.com/scan
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** No price. CTA is free scan. Delegation prompt ("für Ihr Finance-Team"). CEO-appropriate action.

---

### PAIR 5 — Procurement receiving legacy tool message

**BEFORE:**
> Hi Emma,
>
> We detected a legacy CRM (Siebel) still running alongside Salesforce on hendricks.nl. Legacy tools often mean hidden maintenance costs and integration complexity.
>
> Jean-Etienne

**WHY IT FAILS:**
- LINT-020 (WARN): Procurement doesn't think in "legacy tool" terms. They think in contracts.
- LINT-008 (BLOCK): "hidden maintenance costs" is an internal process claim.

**AFTER:**
> Emma,
>
> Siebel and Salesforce — both visible on hendricks.nl. Two CRM contracts, potentially with overlapping scope.
>
> If one is scheduled for sunset, the renewal window on the other may be leverage. The scan shows contract timing indicators.
>
> ghost-tax.com/scan
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** Reframed from legacy/technical to contract/renewal. Procurement-native language. No internal claims.

---

### PAIR 6 — Interchangeable message (swap company = still works)

**BEFORE:**
> Hi Thomas,
>
> Many growing companies accumulate SaaS tools faster than they can track them. This often leads to redundant spend and security blind spots.
>
> Ghost Tax helps you see what's really running — from the outside, in 90 seconds.
>
> Jean-Etienne

**WHY IT FAILS:**
- LINT-015 (BLOCK): Replace "Thomas" with any name, remove nothing — message still works. Zero company-specific content.
- LINT-028 (BLOCK): No signal source declared. No observation from any data source.

**AFTER:**
> Thomas,
>
> HubSpot, Pipedrive und Salesforce — drei CRM-Tools auf mittelstand-gmbh.de sichtbar.
>
> Öffentliche DNS- und Stack-Daten. Ob alle drei aktiv genutzt werden, ist eine interne Frage. Aber drei parallele CRM-Verträge sind ungewöhnlich.
>
> ghost-tax.com/scan
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** Three named tools. Domain-specific. Cannot be reused for another company without changing the signals. LINT-015 clear.

---

### PAIR 7 — Too many L2 inferences stacked

**BEFORE:**
> Hi Anna,
>
> Based on your tech stack, it looks like your company is running Slack, Teams, and Zoom for communication; Jira, Asana, and Trello for project management; and both HubSpot and Salesforce for CRM. That's 8 tools across 3 categories with significant overlap. The estimated annual cost at list pricing is €380,000-€520,000, suggesting €95,000-€180,000 in potential savings through consolidation.
>
> Jean-Etienne

**WHY IT FAILS:**
- LINT-023 (WARN): 8 tools across 3 categories = too many findings. Cognitive overload.
- LINT-022 (BLOCK): Far exceeds 180 words with the full message.
- LINT-007 (BLOCK): Cost estimate without qualifier on methodology.
- Multiple L2 inferences stacked without acknowledging inference level.

**AFTER:**
> Anna,
>
> Stärkstes Signal aus globalfirma.de: drei Projektmanagement-Tools parallel — Jira, Asana, Trello.
>
> Es gibt weitere Überschneidungen in Kommunikation und CRM, aber das PM-Cluster ist der deutlichste Befund.
>
> Der Scan zeigt alle Kategorien. 90 Sekunden. Kostenlos.
>
> ghost-tax.com/scan
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** Led with strongest signal (1 category, 3 tools). Acknowledged other findings without listing all. Under 180 words. No cost estimate. CTA earns attention through restraint.

---

### PAIR 8 — Follow-up that repeats M1 findings

**BEFORE (M2):**
> Hi James,
>
> Just following up — we detected Slack and Teams running simultaneously on corpsolutions.co.uk, along with overlap in your project management stack.
>
> Have you had a chance to look into this?
>
> Jean-Etienne

**WHY IT FAILS:**
- LINT-016 (WARN): Repeats M1 findings verbatim.
- EN-F10 (BLOCK): "Just following up" — blacklisted.
- EN-F11 vibes: "Have you had a chance" — passive-aggressive check-in.

**AFTER (M2):**
> James,
>
> New signal on corpsolutions.co.uk — Zoom also visible alongside Slack and Teams. Three communication tools.
>
> The free scan breaks down all categories. No login required.
>
> ghost-tax.com/scan
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** M2 adds a NEW signal (Zoom). Does not repeat M1's findings verbatim. No "following up." Fresh observation earns the follow-up.

---

### PAIR 9 — CTA too aggressive for cold account

**BEFORE:**
> Herr Müller,
>
> Wir haben Ihre IT-Infrastruktur analysiert und erhebliche Einsparpotenziale identifiziert. Unser Decision Pack (€590) enthält eine vollständige Analyse mit Handlungsempfehlungen.
>
> Hier ist der Checkout-Link: ghost-tax.com/checkout
>
> Jean-Etienne

**WHY IT FAILS:**
- Account maturity = cold (M1, never interacted). CTA class 5 (direct purchase) requires maturity >= warm.
- LINT-008 (BLOCK): "erhebliche Einsparpotenziale identifiziert" — internal process claim.
- DE-F04 (BLOCK): "Kosten sparen" derivative.
- DE-F19 (BLOCK): "Einsparpotenziale" — blacklisted.

**AFTER:**
> Herr Müller,
>
> Zwei Signale aus der Infrastruktur von muellerwerke.de — Überschneidung in der Kategorie Projektmanagement (Jira + Asana) und Kommunikation (Slack + Teams).
>
> Öffentliche Daten. Kein Systemzugriff. Ob das intern relevant ist, wissen nur Sie.
>
> ghost-tax.com/scan — kostenlos, 90 Sekunden.
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** CTA class 2 (free scan) appropriate for cold. Named tools. No cost estimate. No purchase link. Observer positioning intact.

---

### PAIR 10 — German message with Anglo-SaaS tone

**BEFORE:**
> Hallo Herr Schneider,
>
> Ich hoffe, es geht Ihnen gut! Ich wollte mich kurz melden, weil wir eine innovative Lösung für SaaS-Kostenoptimierung entwickelt haben. Unser Tool hilft Unternehmen wie Ihrem, effizienter zu arbeiten und Kosten zu sparen.
>
> Lassen Sie uns einen kurzen Termin vereinbaren?
>
> Beste Grüße,
> Jean-Etienne

**WHY IT FAILS:**
- DE-F01 (BLOCK): "Ich hoffe, es geht Ihnen gut"
- DE-F02 (BLOCK): "Ich wollte mich kurz melden"
- DE-F03 (BLOCK): "Innovative Lösung"
- DE-F04 (BLOCK): "Kosten sparen"
- DE-F07 (BLOCK): "Termin vereinbaren"
- DE-F10 (BLOCK): "Unser Tool"
- DE-F11 (BLOCK): "Effizienter arbeiten"
- DE-F13 (BLOCK): "Wir helfen Unternehmen"
- 8 blacklist violations. This is a translated American SaaS email.

**AFTER:**
> Herr Schneider,
>
> SAP Concur und Spendesk — beide auf schneider-ag.de sichtbar. Zwei Expense-Management-Systeme parallel.
>
> Öffentliche Daten — kein Systemzugriff. Ob beide aktiv genutzt werden, ist intern zu prüfen.
>
> ghost-tax.com/scan — kostenlos, 90 Sekunden, kein Login.
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** Zero blacklist violations. German business register (Sie-form, no anglicisms). Named tools. No adjectives. No claims. Observation only.

---

### PAIR 11 — French message with "je me permets" opening

**BEFORE:**
> Bonjour Monsieur Dupont,
>
> Je me permets de vous contacter car j'ai remarqué que votre entreprise utilise plusieurs outils de gestion de projet simultanément. Notre solution innovante vous permettrait de réduire vos coûts et de gagner en efficacité.
>
> Je serais ravi d'échanger avec vous à votre convenance.
>
> Cordialement,
> Jean-Etienne

**WHY IT FAILS:**
- FR-F02 (BLOCK): "Je me permets de vous contacter"
- FR-F03 (BLOCK): "Solution innovante"
- FR-F05 (BLOCK): "Réduire vos coûts"
- FR-F06 (BLOCK): "Je serais ravi"
- FR-F07 (BLOCK): "À votre convenance"
- FR-F10 (BLOCK): "Gagner en efficacité"
- 6 blacklist violations. Standard French commercial email template.

**AFTER:**
> Monsieur Dupont,
>
> Jira, Asana et Monday — trois outils de gestion de projet visibles sur dupont-sa.fr.
>
> Données publiques uniquement. Un signal qui mérite vérification si les trois sont encore actifs.
>
> ghost-tax.com/scan — gratuit, 90 secondes, sans login.
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** Zero blacklist violations. Named tools. No "je me permets." No adjectives. Observation-first. STRONG formulations from Bloc 5.3 used (FR-S02, FR-S03).

---

### PAIR 12 — Message with no named tools (category-only claims)

**BEFORE:**
> Hi David,
>
> We've detected overlap in your project management, communication, and CRM categories. This kind of tool sprawl typically results in 20-30% wasted spend.
>
> A quick scan would reveal the specifics.
>
> Jean-Etienne

**WHY IT FAILS:**
- LINT-028 (BLOCK): No named tools. Categories alone are not signals.
- LINT-001 (BLOCK): "20-30% wasted spend" — benchmark without N.
- LINT-015 (BLOCK): Interchangeable. Swap company name, nothing breaks.

**AFTER:**
> David,
>
> Jira and Monday.com — both visible on techgroup.co.uk. Two project management tools running in parallel.
>
> Whether both are active is an internal question. But the overlap is externally visible.
>
> ghost-tax.com/scan — free, 90 seconds.
>
> Jean-Etienne — Ghost Tax

**WHAT FIXED IT:** Named tools (Jira, Monday.com). Domain-specific. No percentage claims. No category-only framing. One clear signal, not three vague ones.

---

## BLOC 8 — OPERATIONAL SEND STANDARD

This bloc defines the production protocol for every Ghost Tax message. No message ships without passing through this protocol. No exceptions.

---

### 8.1 Required Output Format

Every message produced by the compiler must be wrapped in a production report. The report is generated BEFORE the message text. If the report results in BLOCKED, no message text is produced.

```
═══════════════════════════════════════════
MESSAGE PRODUCTION REPORT
═══════════════════════════════════════════

1. DECISION:      [SEND / BLOCKED]
2. BLOCK REASON:  [if blocked: rule ID + description. If SEND: "—"]
3. SIGNAL:        [signal_type (tech_overlap / legacy_detect / vendor_count / contract_timing),
                   signal_age (days since data refresh),
                   confidence (L1 / L2 / L3)]
4. RECIPIENT:     [full_name, title, role_class (CFO / CTO / CEO / Procurement / IT-Ops),
                   company_name]
5. ACCOUNT:       [maturity_level (cold / aware / engaged / warm),
                   seen_count (number of previous messages to this domain),
                   thesis_status (draft / validated / evolved)]
6. CLAIM MAP:
   - "[claim 1 text]" → L1 / source: [Apollo tech stack / DNS / job posting / etc.]
   - "[claim 2 text]" → L2 / source: [inference from L1 data]
   - "[claim 3 text]" → L3 / source: [speculative — must be flagged or removed]
7. CTA CLASS:     [1-6] + justification
                   1 = No CTA (pure signal)
                   2 = Free scan link
                   3 = Free scan + forwarding suggestion
                   4 = Decision Pack mention (no price)
                   5 = Decision Pack with price
                   6 = Direct checkout link
8. LINT RESULT:   [PASS / N warnings / N blocks]
                   If blocks > 0: list rule IDs
                   If warnings > 0: list rule IDs
9. GRADE:         [UNSHIPPABLE / ACCEPTABLE / STRONG / EXCEPTIONAL]
10. MESSAGE:      [final message text, or "—" if BLOCKED]

═══════════════════════════════════════════
```

---

### 8.2 Grading Criteria

**UNSHIPPABLE** — Any of:
- One or more BLOCK lint rules fired
- No named tools in the message
- Interchangeable test fails (LINT-015)
- Grade < ACCEPTABLE after rewrite attempt
- Signal source missing (LINT-028)

**ACCEPTABLE** — All of:
- Zero BLOCK rules
- At least 1 named tool from signal data
- CTA class appropriate for account maturity
- Under 180 words
- No blacklist violations
- But: may have 1-2 WARN flags, or use TOLERATED formulations

**STRONG** — All of ACCEPTABLE, plus:
- Zero WARN flags
- Uses STRONG formulations from Bloc 5
- Claim map contains zero L3 inferences
- CTA class precisely matched to role + maturity
- Opening is unique (not reused from recent messages)

**EXCEPTIONAL** — All of STRONG, plus:
- Contains a signal the recipient cannot easily see themselves (e.g., competitor comparison, renewal timing inference from public filing)
- Message creates genuine informational value independent of Ghost Tax's product
- Would be useful to the recipient even if Ghost Tax didn't exist

---

### 8.3 Decision Logic

```
START
  │
  ├── Signal exists for this domain?
  │     NO  → BLOCKED (LINT-028: no signal source)
  │     YES ↓
  │
  ├── Signal age < 90 days?
  │     NO  → BLOCKED (stale data)
  │     YES ↓
  │
  ├── Recipient role identified?
  │     NO  → BLOCKED (cannot match CTA class)
  │     YES ↓
  │
  ├── Account seen_count < 4?
  │     NO  → BLOCKED (max 3 messages per domain per quarter)
  │     YES ↓
  │
  ├── Previous message to this domain < 7 days ago?
  │     YES → BLOCKED (minimum 7-day spacing)
  │     NO  ↓
  │
  ├── Compose message
  │     ↓
  ├── Run Bloc 5 blacklist check
  │     VIOLATION → BLOCKED (LINT-025)
  │     CLEAR ↓
  │
  ├── Run Bloc 6 lint engine (all 30 rules)
  │     BLOCK rule fired → BLOCKED
  │     WARN only → flag for review, continue
  │     CLEAR ↓
  │
  ├── Grade assignment
  │     UNSHIPPABLE → rewrite once, re-lint
  │       Still UNSHIPPABLE → BLOCKED
  │     ACCEPTABLE → SEND (with warnings logged)
  │     STRONG → SEND
  │     EXCEPTIONAL → SEND
  │
  └── Produce MESSAGE PRODUCTION REPORT
```

---

### 8.4 Operational Rules

1. **Report before message.** The production report is generated BEFORE the message text, not after. The message is an output of the report, not an input to it.

2. **BLOCKED = silence.** If DECISION = BLOCKED, no message text is produced. Only the block reason is recorded. The default state of the system is silence.

3. **Grade floor = STRONG.** If GRADE < STRONG, the message is rewritten automatically. If the rewrite still grades below STRONG, the message is BLOCKED. ACCEPTABLE messages ship only if the rewrite budget (1 attempt) is exhausted and the message has zero BLOCK flags.

4. **One rewrite maximum.** The compiler gets one rewrite attempt. If the rewrite does not reach STRONG, the message is BLOCKED. No infinite loops.

5. **Claim map is mandatory.** Every factual statement in the message must appear in the CLAIM MAP with its inference level and source. Unmapped claims trigger LINT-006 or LINT-009.

6. **CTA class ceiling by maturity:**
   - Cold account (seen_count = 0): CTA class 1-2 only
   - Aware account (seen_count = 1): CTA class 1-3
   - Engaged account (seen_count = 2, opened/clicked): CTA class 1-4
   - Warm account (scan completed or reply received): CTA class 1-6

7. **Maximum 3 messages per domain per quarter.** After 3 messages with no engagement (no open, no click, no reply), the domain enters cooldown for 90 days.

8. **Minimum 7-day spacing between messages to the same domain.** No exceptions.

9. **Send window enforcement.** All messages queued for Tuesday-Thursday, 9:30-11:30 local time of recipient. Messages produced outside this window are queued, not sent.

10. **Sender identity.** Every message is signed "Jean-Etienne" or "Jean-Etienne — Ghost Tax." No other sender identity is permitted. No title. No "Founder." No "CEO." No "Team."

---

### 8.5 Refusal Protocol

The compiler MUST refuse to produce a message when:

- No signal data exists for the target domain
- The only available signals are older than 90 days
- The recipient's role cannot be determined
- The domain has received 3+ messages this quarter with no engagement
- The previous message to this domain was sent fewer than 7 days ago
- The message cannot pass Bloc 6 lint after one rewrite attempt

In all refusal cases, the compiler outputs:

```
═══════════════════════════════════════════
MESSAGE PRODUCTION REPORT
═══════════════════════════════════════════

1. DECISION:      BLOCKED
2. BLOCK REASON:  [specific rule or condition]
3-9.              [filled as available]
10. MESSAGE:      —

═══════════════════════════════════════════
```

No message text. No draft. No "here's what I would have sent." Silence.

---

### 8.6 Closing Doctrine

If the system cannot explain why a message should be sent, the message does not get sent. The default state is silence. Every message must earn its right to exist.

A message earns its right when:
1. A specific, named signal exists for the target domain
2. The signal is fresh (< 90 days)
3. The signal is relevant to the recipient's role
4. The message adds informational value the recipient doesn't already have
5. The message passes all 30 lint rules
6. The message grades STRONG or above
7. The send timing is appropriate
8. The account has not been over-contacted

If any of these conditions fails, the correct output is silence.

---

*End of MESSAGE COMPILER specification — Blocs 5-8.*
*Sender identity for all Ghost Tax communications: Jean-Etienne.*
*Compiler version: 1.0 — April 2026.*
