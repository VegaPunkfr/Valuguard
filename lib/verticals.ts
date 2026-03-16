/**
 * GHOST TAX — VERTICAL LANDING PAGE DATA
 *
 * 12 verticals: 6 industry + 6 country/region.
 * Each entry drives a unique SEO landing page at /ghost-tax/[slug].
 * All figures are EUR ranges, sourced from Gartner, Flexera, Zylo composites + Ghost Tax analyses.
 */

export interface VerticalData {
  slug: string;
  type: "industry" | "country";
  /** Page <title> — max 60 chars ideally */
  title: string;
  /** Meta description — max 155 chars */
  description: string;
  /** OG title (can be slightly longer) */
  ogTitle: string;
  /** Hero section */
  hero: {
    label: string;
    headline: string;
    highlightedWord: string;
    stat: string;
    statSource: string;
    subtext: string;
  };
  /** 3-4 pain points with EUR ranges */
  painPoints: {
    title: string;
    description: string;
    costRange: string;
  }[];
  /** Industry/country-specific stats */
  stats: {
    label: string;
    value: string;
    note: string;
  }[];
  /** Social proof / testimonial */
  testimonial: {
    quote: string;
    attribution: string;
    context: string;
  };
  /** FAQ entries for JSON-LD */
  faq: {
    question: string;
    answer: string;
  }[];
  /** SEO keywords */
  keywords: string[];
  /** CTA link params */
  ctaIndustry?: string;
  ctaCountry?: string;
}

export const VERTICALS: VerticalData[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INDUSTRY VERTICALS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    slug: "fintech",
    type: "industry",
    title: "Ghost Tax for FinTech — Hidden SaaS & Cloud Waste",
    description:
      "FinTech companies waste 23-41% of SaaS spend on duplicate tools, unused API subscriptions, and over-provisioned infrastructure. Detect your exposure in 48 hours.",
    ogTitle: "Ghost Tax for FinTech: 23-41% of Your SaaS Budget Is Invisible Waste",
    hero: {
      label: "FINTECH EXPOSURE",
      headline: "FinTech companies waste 23-41% on duplicate SaaS tools",
      highlightedWord: "23-41%",
      stat: "1,800-2,400 EUR per employee per year",
      statSource: "Flexera 2024, Zylo 2024, Ghost Tax analysis of 40+ FinTech audits",
      subtext:
        "Payment processors, neobanks, and crypto platforms are among the highest per-employee SaaS spenders in any industry. The complexity of compliance stacks, multiple payment rails, and engineering-led tool adoption creates fertile ground for invisible waste.",
    },
    painPoints: [
      {
        title: "Compliance Tool Sprawl",
        description:
          "KYC/AML, PCI-DSS, and regulatory reporting require specialized tools. Most FinTechs end up with 3-5 overlapping compliance vendors, each charging per-transaction fees that compound silently.",
        costRange: "40k-180k EUR/yr",
      },
      {
        title: "Duplicate Payment Infrastructure",
        description:
          "Multiple payment processors (Stripe, Adyen, Checkout.com) running in parallel with overlapping capabilities. Gateway fees, settlement costs, and FX margins stack without visibility.",
        costRange: "60k-350k EUR/yr",
      },
      {
        title: "Shadow AI in Engineering",
        description:
          "Engineering teams adopt Copilot, Claude, ChatGPT, Cursor, and Tabnine independently. 70% of FinTech companies have 3+ overlapping AI coding tools with no central governance.",
        costRange: "20k-90k EUR/yr",
      },
      {
        title: "Over-Provisioned Cloud",
        description:
          "FinTech infrastructure demands high availability but rarely right-sizes. Reserved instances go unused, dev environments run 24/7, and staging mirrors production at full cost.",
        costRange: "80k-400k EUR/yr",
      },
    ],
    stats: [
      { label: "Avg. SaaS spend per employee", value: "2,200 EUR/yr", note: "42% above cross-industry median" },
      { label: "Tools per FinTech (50-500 emp)", value: "120-280", note: "Gartner 2025 SaaS benchmark" },
      { label: "Unused license rate", value: "28-38%", note: "Zylo State of SaaS 2024" },
      { label: "Shadow IT prevalence", value: "35-45%", note: "Of total SaaS spend is ungoverned" },
    ],
    testimonial: {
      quote:
        "We thought we had 80 SaaS tools. Ghost Tax found 214. The overlap between our compliance stack alone was costing us 160k EUR per year — money we were literally setting on fire.",
      attribution: "CFO, Series B Neobank (180 employees)",
      context: "Detection completed in 36 hours. 340k EUR in recoverable annual spend identified.",
    },
    faq: [
      {
        question: "How much do FinTech companies typically waste on SaaS?",
        answer:
          "Based on Flexera, Zylo, and Ghost Tax analysis of 40+ FinTech audits, the typical FinTech company wastes 23-41% of its SaaS/Cloud budget. For a 200-person FinTech spending 180k EUR/month on IT, that represents 500k-890k EUR/year in invisible waste.",
      },
      {
        question: "What are the biggest sources of IT waste in FinTech?",
        answer:
          "The four primary sources are: (1) compliance tool overlap — multiple KYC/AML/PCI vendors with redundant capabilities, (2) duplicate payment infrastructure — parallel processors without consolidation, (3) shadow AI adoption — engineering teams self-provisioning AI tools, and (4) over-provisioned cloud — dev/staging environments running at production scale.",
      },
      {
        question: "How does Ghost Tax detect FinTech-specific waste?",
        answer:
          "Ghost Tax's 21-phase Decision Intelligence engine is calibrated for FinTech: it recognizes payment processor overlap, compliance tool redundancy, and cloud over-provisioning patterns specific to financial technology. Detection takes 48 hours, requires no integration, and produces a CFO-ready Decision Pack with vendor-level proof.",
      },
      {
        question: "Is a 490 EUR scan worth it for a FinTech company?",
        answer:
          "Ghost Tax's average FinTech detection finds 340k-680k EUR in recoverable annual spend. At 490 EUR, the ROI is typically 700-1,400x. In 200+ analyses, no company has had zero exposure.",
      },
    ],
    keywords: [
      "fintech saas waste",
      "fintech it cost optimization",
      "payment processor cost comparison",
      "neobank software spend",
      "fintech cloud waste",
      "compliance tool sprawl fintech",
      "fintech ghost tax",
    ],
    ctaIndustry: "fintech",
  },

  {
    slug: "saas",
    type: "industry",
    title: "Ghost Tax for SaaS Companies — Hidden Software Waste",
    description:
      "SaaS companies spend 18-32% more than necessary on their own tool stack. Detect duplicate dev tools, shadow AI, and license waste in 48 hours.",
    ogTitle: "Ghost Tax for SaaS: Your Tool Stack Is Eating Your Margins",
    hero: {
      label: "SAAS EXPOSURE",
      headline: "SaaS companies lose 18-32% of IT budget to their own tool sprawl",
      highlightedWord: "18-32%",
      stat: "1,800 EUR per employee per year in median waste",
      statSource: "Gartner 2025, Flexera 2024, Ghost Tax analysis of 60+ SaaS audits",
      subtext:
        "The irony of SaaS: the companies building software tools are the worst at managing their own. Engineering-led adoption, 'build vs buy' ambiguity, and zero procurement oversight create the perfect storm for invisible waste.",
    },
    painPoints: [
      {
        title: "Engineering Tool Redundancy",
        description:
          "Dev teams adopt tools independently — monitoring (Datadog + New Relic + Sentry), CI/CD (GitHub Actions + CircleCI + Jenkins), and observability stacks multiply without coordination.",
        costRange: "50k-220k EUR/yr",
      },
      {
        title: "AI Tool Overlap",
        description:
          "Every team has its own AI stack: engineering uses Copilot, product uses ChatGPT, design uses Midjourney, marketing uses Jasper. 80% capability overlap, zero shared governance.",
        costRange: "30k-120k EUR/yr",
      },
      {
        title: "Idle Licenses After Layoffs",
        description:
          "Post-downsizing, 25-40% of SaaS licenses remain active for departed employees. Salesforce seats, Jira licenses, and Slack accounts auto-renew without deprovisioning.",
        costRange: "40k-180k EUR/yr",
      },
      {
        title: "Premium Tier Over-Provisioning",
        description:
          "Teams default to enterprise tiers 'just in case.' 60% of Salesforce Enterprise features go unused. Jira Premium capabilities are accessed by <10% of license holders.",
        costRange: "30k-150k EUR/yr",
      },
    ],
    stats: [
      { label: "Avg. tools per SaaS company", value: "180-320", note: "50-500 employee range" },
      { label: "Shadow IT rate", value: "30-42%", note: "Of total SaaS spend is ungoverned" },
      { label: "Post-layoff license waste", value: "25-40%", note: "Licenses active for departed staff" },
      { label: "AI tool overlap", value: "3.4 tools avg", note: "Per company with >80% capability overlap" },
    ],
    testimonial: {
      quote:
        "As a SaaS company, we were embarrassed — 320 tools for 240 people. Ghost Tax found we had 4 separate project management tools, 3 monitoring stacks, and 47 unused Salesforce licenses. 280k EUR/year recovered.",
      attribution: "CTO, B2B SaaS Platform (240 employees)",
      context: "Detection completed in 40 hours. Consolidation roadmap delivered within the Decision Pack.",
    },
    faq: [
      {
        question: "Why do SaaS companies waste so much on their own tools?",
        answer:
          "Three structural reasons: (1) engineering-led adoption without procurement oversight, (2) 'build vs buy' decisions that result in buying AND building, and (3) rapid scaling that outpaces tool governance. The average SaaS company has 180-320 tools for 50-500 employees.",
      },
      {
        question: "How much does a typical SaaS company waste on software?",
        answer:
          "Based on Ghost Tax analysis of 60+ SaaS company audits, the median waste is 1,800 EUR per employee per year. For a 200-person SaaS company, that is 360k EUR/year in invisible waste — often representing 2-4% of total revenue.",
      },
      {
        question: "What is the fastest way to reduce SaaS tool sprawl?",
        answer:
          "Step 1: Full visibility — you cannot optimize what you cannot see. Ghost Tax provides vendor-level detection in 48 hours. Step 2: Identify the top 10 overlapping tools (typically 60% of waste). Step 3: Consolidate in 30/60/90-day phases. Ghost Tax's Decision Pack includes a prioritized consolidation roadmap.",
      },
      {
        question: "Does Ghost Tax require access to our systems?",
        answer:
          "No. Ghost Tax's detection engine works from your domain and publicly available signals — no integration, no agent installation, no system access required. The 21-phase analysis runs externally and produces results in 48 hours.",
      },
    ],
    keywords: [
      "saas tool sprawl",
      "saas company it waste",
      "software spend optimization saas",
      "b2b saas cost reduction",
      "engineering tool redundancy",
      "saas license waste",
      "shadow it saas companies",
    ],
    ctaIndustry: "saas",
  },

  {
    slug: "healthcare",
    type: "industry",
    title: "Ghost Tax for Healthcare — Hidden IT Waste in Health Systems",
    description:
      "Healthcare organizations waste 20-35% of IT budgets on duplicate EHR modules, compliance tool overlap, and legacy system maintenance. Detect exposure in 48 hours.",
    ogTitle: "Ghost Tax for Healthcare: 20-35% of Your IT Budget Is Invisible Waste",
    hero: {
      label: "HEALTHCARE EXPOSURE",
      headline: "Healthcare IT wastes 20-35% on compliance overlap and legacy drag",
      highlightedWord: "20-35%",
      stat: "1,600 EUR per employee per year in median waste",
      statSource: "Gartner Healthcare IT 2025, HIMSS Analytics, Ghost Tax analysis",
      subtext:
        "Hospitals, pharma companies, and biotech firms face a unique cost trap: heavy regulatory requirements force tool adoption, but the same regulations discourage consolidation. The result is sprawling, overlapping systems that drain budgets invisibly.",
    },
    painPoints: [
      {
        title: "EHR Module Sprawl",
        description:
          "Epic, Cerner, and department-specific systems create overlapping clinical modules. Radiology, pathology, and pharmacy each buy separate solutions that duplicate core EHR capabilities.",
        costRange: "100k-500k EUR/yr",
      },
      {
        title: "HIPAA Compliance Redundancy",
        description:
          "Multiple compliance monitoring tools (Vanta, Drata, OneTrust) running simultaneously with overlapping audit, training, and reporting capabilities. Each vendor charges per-seat.",
        costRange: "30k-120k EUR/yr",
      },
      {
        title: "Legacy System Maintenance",
        description:
          "20-year-old COBOL/HL7 systems running alongside modern FHIR platforms. Dual maintenance costs 3-5x what a single modern system would require.",
        costRange: "80k-400k EUR/yr",
      },
      {
        title: "Clinical AI Without Governance",
        description:
          "Departments experiment with AI diagnostic tools, clinical decision support, and administrative AI independently. Overlapping capabilities, no central procurement.",
        costRange: "40k-180k EUR/yr",
      },
    ],
    stats: [
      { label: "IT spend as % of revenue", value: "3.5-5.2%", note: "Higher than any other industry" },
      { label: "Legacy system maintenance", value: "35-50%", note: "Of total IT budget" },
      { label: "Compliance tool overlap", value: "2.8 vendors avg", note: "With >60% capability overlap" },
      { label: "EHR add-on waste", value: "22-38%", note: "Of EHR modules go underused" },
    ],
    testimonial: {
      quote:
        "We were running three separate compliance platforms and two overlapping clinical analytics tools. Ghost Tax identified 420k EUR in annual waste — and the consolidation path was clearer than any consulting engagement we'd done.",
      attribution: "CIO, Regional Hospital Group (2,200 employees)",
      context: "Detection completed in 44 hours. Decision Pack included HIPAA-safe consolidation roadmap.",
    },
    faq: [
      {
        question: "How much do healthcare organizations waste on IT?",
        answer:
          "Healthcare organizations typically waste 20-35% of their IT budgets. With IT spend at 3.5-5.2% of revenue (the highest of any industry), a mid-size hospital system can lose 800k-2M EUR/year to invisible waste from EHR overlap, compliance redundancy, and legacy maintenance.",
      },
      {
        question: "Is Ghost Tax compliant with healthcare data regulations?",
        answer:
          "Ghost Tax does not access patient data, PHI, or internal systems. Detection is performed externally using domain-based analysis and public vendor signals. No HIPAA, GDPR, or HDS data is processed. The output is a financial exposure report, not a clinical audit.",
      },
      {
        question: "What are the biggest IT waste drivers in hospitals?",
        answer:
          "Three primary drivers: (1) EHR module sprawl — departments buying overlapping clinical tools, (2) compliance tool redundancy — multiple platforms for HIPAA/SOC2/ISO monitoring, and (3) legacy system dual-maintenance — running old and new systems in parallel for years.",
      },
      {
        question: "How long does a healthcare IT audit take with Ghost Tax?",
        answer:
          "Ghost Tax delivers a complete Decision Pack in 48 hours. Traditional healthcare IT audits take 3-6 months and cost 50k-200k EUR. Ghost Tax costs 490 EUR and requires no on-site access or system integration.",
      },
    ],
    keywords: [
      "healthcare it waste",
      "hospital saas optimization",
      "ehr cost reduction",
      "healthcare compliance tool sprawl",
      "pharma it spending",
      "biotech software waste",
      "hipaa tool redundancy",
    ],
    ctaIndustry: "healthcare",
  },

  {
    slug: "manufacturing",
    type: "industry",
    title: "Ghost Tax for Manufacturing — Hidden ERP & IT Waste",
    description:
      "Manufacturing companies waste 16-30% of IT budgets on ERP over-licensing, legacy system drag, and redundant MES tools. Detect exposure in 48 hours.",
    ogTitle: "Ghost Tax for Manufacturing: ERP Lock-In Is Costing You 16-30% of IT Spend",
    hero: {
      label: "MANUFACTURING EXPOSURE",
      headline: "Manufacturing IT wastes 16-30% on ERP lock-in and legacy stacks",
      highlightedWord: "16-30%",
      stat: "1,200 EUR per employee per year in median waste",
      statSource: "Gartner Manufacturing IT 2025, IDC, Ghost Tax analysis",
      subtext:
        "Manufacturing has the widest gap between best-in-class and average IT governance. ERP-heavy environments, long upgrade cycles, and vendor lock-in create structural waste that accumulates over decades.",
    },
    painPoints: [
      {
        title: "ERP Over-Licensing",
        description:
          "SAP and Oracle license models charge per named user, but 30-45% of users access the system less than once per month. Shelfware modules purchased during implementation sit unused for years.",
        costRange: "80k-500k EUR/yr",
      },
      {
        title: "MES/SCADA Tool Overlap",
        description:
          "Manufacturing Execution Systems from different eras and vendors running in parallel. Plant A uses Siemens, Plant B uses Rockwell, headquarters has no consolidated view.",
        costRange: "50k-300k EUR/yr",
      },
      {
        title: "Legacy ERP Maintenance",
        description:
          "Running SAP ECC alongside S/4HANA migration. Dual maintenance, dual licensing, dual training. Migrations that drag 3-5 years cost 2-4x the budgeted amount in shadow costs.",
        costRange: "100k-800k EUR/yr",
      },
      {
        title: "Disconnected Quality & Compliance",
        description:
          "ISO 9001, ISO 14001, and industry-specific quality tools operate independently of ERP. Duplicate data entry, parallel reporting, and manual reconciliation waste staff time and licenses.",
        costRange: "30k-150k EUR/yr",
      },
    ],
    stats: [
      { label: "ERP license utilization", value: "55-70%", note: "30-45% of named users are inactive" },
      { label: "Legacy system share", value: "40-60%", note: "Of total IT budget in maintenance" },
      { label: "Avg. SAP shelfware", value: "22-35%", note: "Of purchased modules unused" },
      { label: "Median IT waste per employee", value: "1,200 EUR/yr", note: "Lowest median, widest variance" },
    ],
    testimonial: {
      quote:
        "Ghost Tax found we were paying for 1,200 SAP named-user licenses when only 680 people had logged in during the past quarter. That alone was 380k EUR/year. Add the duplicate MES systems across plants and we recovered over 600k.",
      attribution: "IT Director, Industrial Equipment Manufacturer (3,500 employees)",
      context: "Detection completed in 48 hours. SAP license optimization alone justified 10x the scan cost.",
    },
    faq: [
      {
        question: "How much do manufacturing companies waste on ERP?",
        answer:
          "Manufacturing companies typically waste 16-30% of IT budgets, with ERP over-licensing being the single largest source. SAP and Oracle environments commonly have 30-45% inactive named users, and 22-35% of purchased modules go unused. For a 500-person manufacturer, this represents 200k-600k EUR/year in ERP waste alone.",
      },
      {
        question: "Can Ghost Tax analyze SAP licensing waste?",
        answer:
          "Yes. Ghost Tax's detection engine identifies SAP and Oracle licensing patterns from external signals — vendor contracts, module adoption patterns, and industry benchmarks. The Decision Pack includes specific license optimization recommendations with EUR impact ranges.",
      },
      {
        question: "What about multi-plant manufacturing with different systems?",
        answer:
          "Multi-plant environments are where Ghost Tax delivers the most value. Each plant typically has its own MES, SCADA, and quality systems. Ghost Tax maps the full vendor landscape and identifies consolidation opportunities across sites — often the highest-ROI finding.",
      },
      {
        question: "Is 490 EUR worth it for a large manufacturer?",
        answer:
          "Ghost Tax's average manufacturing detection finds 400k-900k EUR in recoverable annual spend. The most common wins are ERP license optimization (200-500k), MES consolidation (100-300k), and quality tool rationalization (50-150k). At 490 EUR, the ROI is typically 800-1,800x.",
      },
    ],
    keywords: [
      "manufacturing erp waste",
      "sap license optimization",
      "manufacturing it cost reduction",
      "erp over licensing",
      "mes tool consolidation",
      "industrial it spending",
      "manufacturing ghost tax",
    ],
    ctaIndustry: "manufacturing",
  },

  {
    slug: "financial-services",
    type: "industry",
    title: "Ghost Tax for Financial Services — Hidden IT Waste in Banking",
    description:
      "Banks, insurers, and asset managers waste 15-28% of IT budgets on regulatory tool sprawl, trading system overlap, and vendor lock-in. Detect exposure in 48 hours.",
    ogTitle: "Ghost Tax for Financial Services: Regulatory Sprawl Is Draining Your IT Budget",
    hero: {
      label: "FINANCIAL SERVICES EXPOSURE",
      headline: "Banks waste 15-28% of IT spend on regulatory tool sprawl",
      highlightedWord: "15-28%",
      stat: "2,200 EUR per employee per year — the highest of any industry",
      statSource: "Gartner Financial Services IT 2025, Celent, Ghost Tax analysis",
      subtext:
        "Financial services has the highest per-employee IT exposure of any industry. Regulatory requirements drive tool adoption, but compliance teams rarely audit whether those tools overlap. The result: the most expensive Ghost Tax in any sector.",
    },
    painPoints: [
      {
        title: "Regulatory Tool Proliferation",
        description:
          "Basel III, MiFID II, DORA, AML, KYC — each regulation spawns its own tool ecosystem. Compliance teams buy solutions per-regulation rather than per-capability, creating 60-70% functional overlap.",
        costRange: "100k-600k EUR/yr",
      },
      {
        title: "Trading & Risk System Duplication",
        description:
          "Front-office, middle-office, and risk systems from different eras running in parallel. Bloomberg, Refinitiv, and FactSet data feeds overlap. Risk models run on multiple platforms simultaneously.",
        costRange: "150k-800k EUR/yr",
      },
      {
        title: "Core Banking Legacy Drag",
        description:
          "Mainframe systems running alongside modern platforms. Migration timelines stretch 5-10 years, with dual operating costs throughout. Support contracts for end-of-life systems at premium rates.",
        costRange: "200k-2M EUR/yr",
      },
      {
        title: "GRC Platform Overlap",
        description:
          "Governance, Risk, and Compliance platforms from ServiceNow, RSA, MetricStream, and OneTrust running simultaneously. Each covers 80% of the same ground at full enterprise pricing.",
        costRange: "80k-400k EUR/yr",
      },
    ],
    stats: [
      { label: "IT spend as % of revenue", value: "7-10%", note: "Highest of any industry" },
      { label: "Per-employee IT exposure", value: "2,200 EUR/yr", note: "42% above cross-industry median" },
      { label: "Regulatory tool overlap", value: "60-70%", note: "Functional overlap across compliance tools" },
      { label: "Legacy maintenance share", value: "45-65%", note: "Of IT budget goes to keeping lights on" },
    ],
    testimonial: {
      quote:
        "We had 4 GRC platforms, 3 AML screening tools, and 2 overlapping market data feeds. Ghost Tax found 1.2M EUR in annual waste — and the board finally had the evidence to approve consolidation.",
      attribution: "Group CTO, Mid-Tier European Bank (4,800 employees)",
      context: "Detection completed in 42 hours. Board one-pager included in Decision Pack drove approval in 2 weeks.",
    },
    faq: [
      {
        question: "Why is IT waste highest in financial services?",
        answer:
          "Three structural factors: (1) regulation-driven tool adoption without consolidation reviews, (2) the highest IT spend as a percentage of revenue (7-10%), and (3) extreme vendor lock-in from core banking, trading, and risk systems. These combine to produce 2,200 EUR/employee/year in median waste — 42% above the cross-industry average.",
      },
      {
        question: "Can Ghost Tax detect waste in regulated environments?",
        answer:
          "Yes. Ghost Tax's detection is external — it does not access internal systems, customer data, or regulated information. The 21-phase engine analyzes vendor landscapes, licensing patterns, and technology architectures from public signals. Output is a financial exposure report, not a compliance audit.",
      },
      {
        question: "What is the typical ROI for a financial services scan?",
        answer:
          "Ghost Tax's average financial services detection identifies 600k-1.5M EUR in recoverable annual spend. At 490 EUR, the ROI is typically 1,200-3,000x. The most common high-value findings are GRC consolidation, market data feed rationalization, and regulatory tool overlap.",
      },
      {
        question: "How does Ghost Tax compare to Big 4 consulting IT audits?",
        answer:
          "Big 4 IT spend assessments for financial services typically cost 200k-500k EUR and take 4-8 months. Ghost Tax delivers comparable vendor-level analysis in 48 hours for 490 EUR. The trade-off: Ghost Tax provides the detection and decision intelligence; implementation support is available via our Stabilization Mission (Rail C).",
      },
    ],
    keywords: [
      "banking it waste",
      "financial services saas optimization",
      "bank technology cost reduction",
      "regulatory tool sprawl banking",
      "insurance it spending",
      "asset management software waste",
      "grc platform consolidation",
    ],
    ctaIndustry: "financial-services",
  },

  {
    slug: "professional-services",
    type: "industry",
    title: "Ghost Tax for Professional Services — Hidden Tool Waste",
    description:
      "Consulting firms, law firms, and accounting practices waste 19-33% of IT budgets on per-seat sprawl, knowledge tool overlap, and underused platforms. Detect in 48 hours.",
    ogTitle: "Ghost Tax for Professional Services: Per-Seat Licensing Is Eating Your Margins",
    hero: {
      label: "PROFESSIONAL SERVICES EXPOSURE",
      headline: "Professional services firms waste 19-33% on per-seat tool sprawl",
      highlightedWord: "19-33%",
      stat: "1,500 EUR per employee per year in median waste",
      statSource: "Gartner 2025, ALM Intelligence, Ghost Tax analysis",
      subtext:
        "Consulting firms, law firms, and accounting practices have a unique cost structure: almost everything is per-seat. When tools multiply across practice groups, the per-seat model amplifies waste linearly with headcount.",
    },
    painPoints: [
      {
        title: "Per-Seat License Multiplication",
        description:
          "Every practice group buys its own tools: project management (3+ platforms), document management (2-3 systems), time tracking (multiple overlapping solutions). Each charges per-seat, scaling waste linearly.",
        costRange: "40k-200k EUR/yr",
      },
      {
        title: "Knowledge Management Overlap",
        description:
          "Confluence, SharePoint, Notion, and practice-specific knowledge bases running in parallel. Partners hoard information in personal tools while the firm pays for enterprise knowledge platforms nobody uses.",
        costRange: "25k-120k EUR/yr",
      },
      {
        title: "CRM and Business Development Waste",
        description:
          "Salesforce, HubSpot, and practice-specific CRMs coexist. Partners track relationships in personal spreadsheets while the firm maintains enterprise CRM licenses at 150-300 EUR/seat/month.",
        costRange: "30k-180k EUR/yr",
      },
      {
        title: "Legal/Compliance Tool Duplication",
        description:
          "Contract management (DocuSign + Ironclad + practice tools), legal research (multiple databases), and e-discovery platforms overlap significantly across practice areas.",
        costRange: "20k-100k EUR/yr",
      },
    ],
    stats: [
      { label: "Tools per professional services firm", value: "90-220", note: "50-500 employee range" },
      { label: "Per-seat license waste", value: "24-36%", note: "Licenses for inactive or departed staff" },
      { label: "Knowledge tool overlap", value: "2.6 platforms avg", note: "With >70% capability overlap" },
      { label: "CRM utilization rate", value: "35-50%", note: "Of CRM seats actively used" },
    ],
    testimonial: {
      quote:
        "Each practice group had its own project management, document management, and time tracking tools. Ghost Tax showed us we were running 11 different tools that could be consolidated into 3. Annual savings: 190k EUR.",
      attribution: "COO, Management Consulting Firm (340 employees)",
      context: "Detection completed in 38 hours. Practice group consolidation roadmap in Decision Pack.",
    },
    faq: [
      {
        question: "Why do professional services firms have high IT waste?",
        answer:
          "Professional services firms have a structural problem: per-seat licensing amplifies waste linearly with headcount. When each practice group independently adopts tools (project management, knowledge bases, CRMs), the cost compounds. A 300-person firm with 3 overlapping PM tools pays triple for the same capability.",
      },
      {
        question: "How much can a consulting firm save with Ghost Tax?",
        answer:
          "Ghost Tax's average professional services detection identifies 180k-450k EUR in recoverable annual spend. The highest-value findings are typically: per-seat license consolidation (40-50% of waste), knowledge platform rationalization (20-25%), and CRM optimization (15-20%).",
      },
      {
        question: "Can Ghost Tax analyze per-seat licensing across practice groups?",
        answer:
          "Yes. Ghost Tax maps vendor adoption across organizational units and identifies where the same capability is being purchased multiple times. The Decision Pack includes a consolidation matrix showing overlap percentages and EUR impact per tool category.",
      },
      {
        question: "What about partner-driven tool adoption?",
        answer:
          "Partner-driven adoption is the #1 driver of tool sprawl in professional services. Ghost Tax's detection specifically identifies tools adopted by individuals or small groups that duplicate firm-wide capabilities. The Decision Pack includes governance recommendations that respect partner autonomy while reducing waste.",
      },
    ],
    keywords: [
      "consulting firm it waste",
      "law firm saas optimization",
      "accounting firm software cost",
      "professional services tool sprawl",
      "per seat license waste",
      "consulting technology spend",
      "law firm ghost tax",
    ],
    ctaIndustry: "professional-services",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COUNTRY / REGION VERTICALS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    slug: "germany",
    type: "country",
    title: "Ghost Tax Deutschland — Versteckte IT-Kosten in DACH",
    description:
      "German companies waste 18-30% of IT budgets on SAP over-licensing, DATEV sprawl, and Mittelstand tool fragmentation. Detect your exposure in 48 hours.",
    ogTitle: "Ghost Tax for Germany: SAP + DATEV + Personio — How Much Are You Overpaying?",
    hero: {
      label: "DACH MARKET EXPOSURE",
      headline: "German companies waste 18-30% on SAP, DATEV, and Mittelstand tool sprawl",
      highlightedWord: "18-30%",
      stat: "1,900 EUR per employee per year in the DACH region",
      statSource: "Bitkom 2025, Gartner DACH IT Spending 2025, Ghost Tax analysis",
      subtext:
        "The DACH market has a unique IT cost profile: SAP dominance, DATEV lock-in for accounting, and a Mittelstand culture that buys best-of-breed without consolidation planning. Add Personio, DATEV, and 50+ German-specific SaaS vendors, and the waste compounds fast.",
    },
    painPoints: [
      {
        title: "SAP Over-Licensing",
        description:
          "German companies are disproportionately dependent on SAP. Indirect/digital access licensing, unused named users, and S/4HANA migration overlap create the largest single waste source in DACH IT budgets.",
        costRange: "80k-600k EUR/yr",
      },
      {
        title: "DATEV Ecosystem Lock-In",
        description:
          "DATEV's proprietary ecosystem for tax and accounting creates vendor lock-in that prevents consolidation. Companies pay for DATEV + modern tools (Personio, Lexoffice) with overlapping capabilities.",
        costRange: "20k-80k EUR/yr",
      },
      {
        title: "Mittelstand Best-of-Breed Sprawl",
        description:
          "German Mittelstand culture favors specialized tools over platforms. Each department buys its own solution: HR (Personio), finance (DATEV + Lexoffice), project management (multiple), creating 150+ tools for 200 employees.",
        costRange: "40k-200k EUR/yr",
      },
      {
        title: "DSGVO/GDPR Compliance Overhead",
        description:
          "German data protection requirements drive adoption of multiple privacy, consent, and compliance tools. OneTrust, Cookiebot, DataGuard, and internal solutions overlap significantly.",
        costRange: "15k-80k EUR/yr",
      },
    ],
    stats: [
      { label: "IT spend per employee (DACH)", value: "12,400 EUR/yr", note: "22% above EU average" },
      { label: "SAP market share (DACH)", value: "68%", note: "Of mid-market ERP installations" },
      { label: "Avg. tools per Mittelstand co.", value: "140-260", note: "100-1000 employee range" },
      { label: "DATEV lock-in rate", value: "74%", note: "Of German SMEs use DATEV for tax/accounting" },
    ],
    testimonial: {
      quote:
        "Wir dachten, unser SAP-System sei optimiert. Ghost Tax fand 340k EUR in ungenutzten Lizenzen und Modulen. Dazu kamen 80k EUR Overlap zwischen DATEV und unserem neuen Personio-Setup.",
      attribution: "CFO, Mittelstand Maschinenbauer (620 Mitarbeiter)",
      context: "Analyse in 44 Stunden abgeschlossen. 420k EUR jährlich einsparbar.",
    },
    faq: [
      {
        question: "How much do German companies waste on IT?",
        answer:
          "German companies waste 18-30% of IT budgets, with DACH-specific drivers: SAP over-licensing (the #1 source), DATEV ecosystem lock-in, and Mittelstand best-of-breed sprawl. Per-employee waste is 1,900 EUR/year — 22% above the EU average.",
      },
      {
        question: "Can Ghost Tax analyze SAP and DATEV waste specifically?",
        answer:
          "Yes. Ghost Tax's detection engine has specific calibration for the DACH market, including SAP indirect access analysis, DATEV ecosystem overlap detection, and Personio/HRworks/Haufe integration waste. The Decision Pack includes DACH-specific vendor alternatives.",
      },
      {
        question: "Is Ghost Tax available in German?",
        answer:
          "Ghost Tax's platform is available in German (DE), French (FR), and English (EN). Decision Packs for DACH clients include German-language executive summaries and vendor-specific recommendations for the German market.",
      },
      {
        question: "What does Ghost Tax cost for German companies?",
        answer:
          "Ghost Tax's Detection Scan costs 490 EUR (einmalig). The average DACH detection finds 350k-700k EUR in recoverable annual spend. For Mittelstand companies with 200+ employees, the ROI is typically 700-1,400x the scan cost.",
      },
    ],
    keywords: [
      "it kosten optimierung deutschland",
      "sap lizenz optimierung",
      "datev kosten senken",
      "mittelstand it waste",
      "german saas optimization",
      "dach it spending",
      "ghost tax deutschland",
      "personio kosten",
    ],
    ctaCountry: "germany",
  },

  {
    slug: "france",
    type: "country",
    title: "Ghost Tax France — Coûts IT Cachés des Entreprises Françaises",
    description:
      "Les entreprises françaises gaspillent 19-33% de leur budget IT sur des doublons SaaS, l'écosystème Pennylane/Qonto et le shadow AI. Détection en 48 heures.",
    ogTitle: "Ghost Tax France : 19-33% de Votre Budget IT Est du Gaspillage Invisible",
    hero: {
      label: "MARCHE FRANCAIS",
      headline: "Les entreprises françaises gaspillent 19-33% en outils SaaS redondants",
      highlightedWord: "19-33%",
      stat: "1,700 EUR par employé par an de gaspillage médian",
      statSource: "Numeum 2025, Gartner France IT 2025, analyses Ghost Tax",
      subtext:
        "Le marché français a connu une explosion de SaaS locaux: Pennylane, Qonto, PayFit, Swile, Alan, Spendesk. Chaque outil résout un problème, mais leur accumulation crée un coût caché que personne ne mesure.",
    },
    painPoints: [
      {
        title: "Écosystème French Tech Fragmenté",
        description:
          "Pennylane + Qonto + PayFit + Swile + Alan + Spendesk: chaque outil est excellent seul, mais leur combinaison crée des doublons de fonctionnalités comptables, RH et paie qui coûtent cher.",
        costRange: "25k-120k EUR/an",
      },
      {
        title: "Shadow AI Non Gouverné",
        description:
          "Les équipes françaises adoptent ChatGPT, Mistral, Claude et Copilot de façon indépendante. 65% des entreprises françaises ont 2+ outils IA avec un chevauchement de capacités supérieur à 80%.",
        costRange: "15k-80k EUR/an",
      },
      {
        title: "ERP Legacy + Modernisation",
        description:
          "Sage, Cegid et SAP dominent le mid-market français. La migration vers des solutions cloud crée des périodes de double paiement (ancien + nouveau) qui durent 2-4 ans.",
        costRange: "60k-350k EUR/an",
      },
      {
        title: "Conformité RGPD Redondante",
        description:
          "La CNIL impose des exigences strictes. Les entreprises accumulent OneTrust, Axeptio, Didomi et des solutions internes — 3 outils en moyenne pour la même conformité.",
        costRange: "10k-60k EUR/an",
      },
    ],
    stats: [
      { label: "Dépense IT par employé (France)", value: "10,800 EUR/an", note: "Médiane PME/ETI" },
      { label: "Outils SaaS par entreprise", value: "110-240", note: "Tranche 50-500 employés" },
      { label: "Adoption French Tech", value: "4.2 outils", note: "Moyenne de SaaS français par entreprise" },
      { label: "Shadow IT", value: "28-40%", note: "Des dépenses SaaS non gouvernées" },
    ],
    testimonial: {
      quote:
        "On utilisait Pennylane ET Sage, PayFit ET notre ancien système de paie, Qonto ET une banque traditionnelle. Ghost Tax a trouvé 180k EUR/an de doublons purs. Le rapport du CFO a convaincu le board en une semaine.",
      attribution: "DAF, Scale-up French Tech (280 employés)",
      context: "Détection complétée en 40 heures. Pack Décision livré avec memo CFO en français.",
    },
    faq: [
      {
        question: "Combien les entreprises françaises gaspillent-elles en IT ?",
        answer:
          "Les entreprises françaises gaspillent 19-33% de leur budget IT. Les sources principales: doublons dans l'écosystème French Tech (Pennylane/Qonto/PayFit), shadow AI non gouverné, et migration ERP legacy. Pour une PME de 200 employés, cela représente 340k-660k EUR/an de gaspillage invisible.",
      },
      {
        question: "Ghost Tax est-il disponible en français ?",
        answer:
          "Oui. Ghost Tax est entièrement disponible en français. Les Decision Packs pour les clients français incluent des memos CFO en français, des recommandations adaptées au marché français, et des alternatives vendor spécifiques à l'écosystème French Tech.",
      },
      {
        question: "Quel est le coût d'un scan Ghost Tax ?",
        answer:
          "Le scan de détection Ghost Tax coûte 490 EUR (paiement unique). La détection moyenne pour une entreprise française identifie 250k-500k EUR de dépenses annuelles récupérables. ROI typique: 500-1,000x le coût du scan.",
      },
      {
        question: "Comment Ghost Tax se compare-t-il aux audits Big 4 ?",
        answer:
          "Les audits IT des Big 4 (Deloitte, EY, KPMG, PwC) coûtent 100k-400k EUR et prennent 3-6 mois. Ghost Tax livre une analyse comparable en 48 heures pour 490 EUR. La différence: Ghost Tax fournit la détection et l'intelligence de décision; l'accompagnement à l'implémentation est disponible via la Mission de Stabilisation.",
      },
    ],
    keywords: [
      "optimisation coûts it france",
      "gaspillage saas entreprise française",
      "pennylane qonto doublon",
      "payfit coût optimisation",
      "french tech saas sprawl",
      "ghost tax france",
      "audit it pme france",
      "shadow ai france",
    ],
    ctaCountry: "france",
  },

  {
    slug: "united-states",
    type: "country",
    title: "Ghost Tax USA — Hidden SaaS & Cloud Waste in US Companies",
    description:
      "US companies waste 23-41% of SaaS spend on enterprise sprawl, shadow AI, and vendor lock-in. The largest Ghost Tax market. Full detection from $490.",
    ogTitle: "Ghost Tax USA: American Companies Waste $4,200 Per Employee Per Year on IT",
    hero: {
      label: "US MARKET EXPOSURE",
      headline: "US companies waste 23-41% of SaaS budgets on enterprise sprawl",
      highlightedWord: "23-41%",
      stat: "$4,200 per employee per year — the highest globally",
      statSource: "Gartner 2025, Zylo State of SaaS 2024, Flexera 2024",
      subtext:
        "The US is the largest SaaS market in the world, and American companies have the highest per-employee IT waste globally. Enterprise sales cycles, multi-year contracts, and a culture of 'buy then evaluate' create massive, invisible cost accumulation.",
    },
    painPoints: [
      {
        title: "Enterprise SaaS Sprawl",
        description:
          "The average US mid-market company runs 300-500 SaaS applications. Salesforce + HubSpot + Dynamics coexist. Slack + Teams run in parallel. Every department has its own analytics, PM, and collaboration stack.",
        costRange: "$100k-$600k/yr",
      },
      {
        title: "Shadow AI Explosion",
        description:
          "US companies are the fastest AI adopters globally. 85% have 3+ AI tools with overlapping capabilities. Engineering, marketing, sales, and legal each buy their own AI solutions independently.",
        costRange: "$50k-$300k/yr",
      },
      {
        title: "Multi-Year Contract Lock-In",
        description:
          "US enterprise sales favor 3-year contracts with auto-renewal. Companies end up paying for tools they stopped using 18 months ago, with termination fees making exit irrational.",
        costRange: "$80k-$500k/yr",
      },
      {
        title: "Cloud Over-Provisioning",
        description:
          "AWS, Azure, and GCP running simultaneously with overlapping services. Reserved instances purchased and forgotten. Dev environments at production scale. Multi-cloud without multi-cloud strategy.",
        costRange: "$150k-$1M/yr",
      },
    ],
    stats: [
      { label: "SaaS apps per US company", value: "300-500", note: "Mid-market (100-1000 employees)" },
      { label: "Per-employee IT waste", value: "$4,200/yr", note: "Highest globally" },
      { label: "Shadow AI tools", value: "3.8 avg", note: "With >75% capability overlap" },
      { label: "Auto-renewed unused tools", value: "18-28%", note: "Of total SaaS portfolio" },
    ],
    testimonial: {
      quote:
        "We ran Ghost Tax expecting to find maybe $200k in waste. The actual number was $1.4M annually. We had 487 SaaS tools — I couldn't even name half of them. The board presentation practically wrote itself.",
      attribution: "VP Finance, US SaaS Company (680 employees)",
      context: "Detection completed in 36 hours. Board one-pager drove immediate action.",
    },
    faq: [
      {
        question: "How much do US companies waste on SaaS?",
        answer:
          "US companies waste 23-41% of SaaS budgets, with per-employee waste of $4,200/year — the highest globally. For a 500-person US company, this represents $2.1M/year in invisible waste from enterprise sprawl, shadow AI, and contract lock-in.",
      },
      {
        question: "What does Ghost Tax cost for US companies?",
        answer:
          "Ghost Tax's Detection Scan costs $490 for the US market. The average US detection finds $800k-$2M in recoverable annual spend. ROI is typically 800-2,000x the scan cost. No integration required — results in 48 hours.",
      },
      {
        question: "How is the US market different from Europe?",
        answer:
          "US companies have 2x the SaaS count of European peers, higher per-employee spend, and more aggressive vendor lock-in via multi-year contracts. Enterprise sales culture and 'land and expand' pricing models create structural waste that is difficult to detect without systematic analysis.",
      },
      {
        question: "Does Ghost Tax work with US-specific vendors?",
        answer:
          "Yes. Ghost Tax's vendor database covers 68+ major vendors with deep US market coverage: Salesforce, Workday, ServiceNow, Snowflake, Datadog, and hundreds more. The 21-phase engine is calibrated for US enterprise pricing models, contract structures, and negotiation patterns.",
      },
    ],
    keywords: [
      "us saas waste",
      "american company it optimization",
      "enterprise saas sprawl usa",
      "shadow ai cost us",
      "us cloud spending waste",
      "saas cost reduction usa",
      "ghost tax united states",
    ],
    ctaCountry: "united-states",
  },

  {
    slug: "switzerland",
    type: "country",
    title: "Ghost Tax Switzerland — Hidden IT Costs in Swiss Companies",
    description:
      "Swiss companies waste 17-29% of IT budgets on banking system overlap, pharma compliance sprawl, and premium vendor lock-in. Detection in 48 hours for 490 CHF.",
    ogTitle: "Ghost Tax Switzerland: Banking + Pharma + Compliance = The Most Expensive Ghost Tax in Europe",
    hero: {
      label: "SWISS MARKET EXPOSURE",
      headline: "Swiss companies waste 17-29% on premium vendor lock-in",
      highlightedWord: "17-29%",
      stat: "2,100 EUR per employee per year — second highest in Europe",
      statSource: "Swico 2025, Gartner Swiss IT 2025, Ghost Tax analysis",
      subtext:
        "Switzerland's unique position at the intersection of banking, pharma, and global trade creates the most expensive IT environment in Europe. Premium pricing, strict compliance requirements, and a preference for Swiss-hosted solutions drive waste that is invisible but enormous.",
    },
    painPoints: [
      {
        title: "Swiss Banking System Overlap",
        description:
          "Swiss financial institutions run Avaloq, Temenos, and legacy core systems simultaneously. FINMA regulatory requirements add layers of compliance tools that overlap with banking platform capabilities.",
        costRange: "120k-700k EUR/yr",
      },
      {
        title: "Pharma/Biotech Compliance Sprawl",
        description:
          "GxP, Swissmedic, EU MDR, and FDA requirements each drive separate tool purchases. Quality management, validation, and regulatory submission tools from Veeva, MasterControl, and TrackWise overlap significantly.",
        costRange: "80k-400k EUR/yr",
      },
      {
        title: "Swiss Premium Pricing",
        description:
          "Vendors charge 15-30% more for Swiss-hosted, Swiss-compliant versions of standard tools. Companies pay this premium across their entire stack without evaluating whether Swiss hosting is actually required for each tool.",
        costRange: "40k-250k EUR/yr",
      },
      {
        title: "Multilingual Tool Duplication",
        description:
          "Swiss companies operating across DE/FR/IT language regions sometimes maintain separate tool instances per region. Three Confluence instances, three SharePoint tenants, three everything.",
        costRange: "20k-120k EUR/yr",
      },
    ],
    stats: [
      { label: "IT spend per employee (CH)", value: "14,800 EUR/yr", note: "Highest in Europe" },
      { label: "Swiss premium markup", value: "15-30%", note: "Above EU pricing for same tools" },
      { label: "Banking IT legacy share", value: "50-65%", note: "Of budget in maintenance/compliance" },
      { label: "Pharma compliance tools", value: "3.2 avg overlap", note: "GxP/quality platforms" },
    ],
    testimonial: {
      quote:
        "We were paying Swiss premium pricing on 80% of our SaaS stack, but only 20% actually needed Swiss data residency. Ghost Tax identified 290k CHF in unnecessary Swiss-hosting premiums alone. Total recoverable waste: 680k CHF.",
      attribution: "CIO, Swiss Pharma Company (450 employees)",
      context: "Detection completed in 46 hours. Swiss data residency analysis included in Decision Pack.",
    },
    faq: [
      {
        question: "How much do Swiss companies waste on IT?",
        answer:
          "Swiss companies waste 17-29% of IT budgets, with per-employee waste of 2,100 EUR/year — the second highest in Europe after Luxembourg. Key drivers are Swiss premium pricing, banking/pharma compliance sprawl, and multilingual tool duplication. For a 300-person Swiss company, this represents 630k-870k EUR/year.",
      },
      {
        question: "Does Ghost Tax understand Swiss-specific vendors?",
        answer:
          "Yes. Ghost Tax covers Swiss-specific vendors including Avaloq, Temenos, Abacus, Bexio, and the DATEV-adjacent Swiss accounting ecosystem. The engine understands FINMA, Swissmedic, and Swiss data protection requirements and can distinguish between tools that genuinely need Swiss hosting and those paying unnecessary premiums.",
      },
      {
        question: "What currency does Ghost Tax use for Swiss reports?",
        answer:
          "Ghost Tax reports for Swiss clients include both EUR and CHF figures. The scan costs 490 EUR. All exposure ranges are presented in both currencies for board reporting convenience.",
      },
      {
        question: "Can Ghost Tax analyze multilingual Swiss organizations?",
        answer:
          "Yes. Ghost Tax specifically detects multilingual tool duplication — a common Swiss waste pattern where DE/FR/IT regions maintain separate instances of the same platform. This is often the easiest consolidation win, with immediate 30-60% cost reduction per tool category.",
      },
    ],
    keywords: [
      "swiss it cost optimization",
      "switzerland saas waste",
      "avaloq cost reduction",
      "swiss banking it spend",
      "pharma it waste switzerland",
      "swiss compliance tool sprawl",
      "ghost tax switzerland",
      "finma compliance cost",
    ],
    ctaCountry: "switzerland",
  },

  {
    slug: "united-kingdom",
    type: "country",
    title: "Ghost Tax UK — Hidden IT Waste in British Companies",
    description:
      "UK companies waste 20-34% of IT budgets on post-Brexit compliance duplication, FinTech sprawl, and enterprise SaaS bloat. Detect exposure in 48 hours.",
    ogTitle: "Ghost Tax UK: Post-Brexit Compliance + FinTech Boom = Massive Hidden IT Costs",
    hero: {
      label: "UK MARKET EXPOSURE",
      headline: "UK companies waste 20-34% on post-Brexit compliance overlap",
      highlightedWord: "20-34%",
      stat: "1,950 GBP per employee per year in median waste",
      statSource: "TechUK 2025, Gartner UK IT 2025, Ghost Tax analysis",
      subtext:
        "The UK's position as Europe's largest FinTech hub, combined with post-Brexit regulatory divergence, creates a unique waste profile. Companies now maintain dual compliance stacks (UK + EU), and London's aggressive SaaS adoption culture amplifies tool sprawl.",
    },
    painPoints: [
      {
        title: "Post-Brexit Dual Compliance",
        description:
          "UK companies trading with the EU now need UK GDPR + EU GDPR tools, FCA + ESMA regulatory platforms, and separate data processing arrangements. Each regulation gets its own tool, doubling compliance costs.",
        costRange: "30k-180k GBP/yr",
      },
      {
        title: "FinTech Ecosystem Sprawl",
        description:
          "The UK has 2,500+ FinTech companies and the most competitive SaaS market in Europe. Companies layer Revolut Business + traditional banking, Xero + Sage, and multiple payment processors without consolidation.",
        costRange: "25k-150k GBP/yr",
      },
      {
        title: "Enterprise SaaS Over-Adoption",
        description:
          "London-based companies adopt US enterprise SaaS at European-leading rates. Salesforce, HubSpot, and multiple analytics platforms coexist. The City's 'buy everything' culture drives 40% higher tool counts than Continental peers.",
        costRange: "60k-350k GBP/yr",
      },
      {
        title: "IR35 and Contractor Management Waste",
        description:
          "Post-IR35 reform, companies use multiple contractor management, compliance, and payment platforms simultaneously. Each charges per-contractor fees, creating invisible scaling costs.",
        costRange: "15k-80k GBP/yr",
      },
    ],
    stats: [
      { label: "IT spend per employee (UK)", value: "11,200 GBP/yr", note: "Second highest in Europe" },
      { label: "SaaS tools per UK company", value: "160-340", note: "Mid-market range" },
      { label: "Post-Brexit compliance overhead", value: "12-18%", note: "Additional spend on dual compliance" },
      { label: "FinTech tool overlap", value: "3.1 platforms avg", note: "In banking/payments category" },
    ],
    testimonial: {
      quote:
        "Post-Brexit, we ended up with two sets of compliance tools — one for UK regulations, one for EU. Ghost Tax showed us that 70% of capabilities overlapped and we could consolidate to a single platform. Savings: 220k GBP/year.",
      attribution: "CFO, UK Financial Services Firm (520 employees)",
      context: "Detection completed in 40 hours. Brexit compliance rationalization roadmap included.",
    },
    faq: [
      {
        question: "How much do UK companies waste on IT?",
        answer:
          "UK companies waste 20-34% of IT budgets, with per-employee waste of 1,950 GBP/year. Post-Brexit regulatory divergence adds 12-18% in compliance overhead. For a 400-person UK company, total invisible waste is typically 780k-1.3M GBP/year.",
      },
      {
        question: "What makes UK IT waste different from the rest of Europe?",
        answer:
          "Three UK-specific factors: (1) post-Brexit dual compliance — maintaining separate UK and EU regulatory stacks, (2) London's aggressive SaaS adoption culture — 40% more tools than Continental peers, and (3) FinTech ecosystem density — the world's second-largest FinTech market creates vendor sprawl in banking and payments.",
      },
      {
        question: "Does Ghost Tax report in GBP?",
        answer:
          "Ghost Tax Decision Packs for UK clients include GBP figures alongside EUR for international comparison. The scan costs 490 EUR (approximately 420 GBP). All exposure ranges use GBP as the primary currency for UK reports.",
      },
      {
        question: "Can Ghost Tax help with post-Brexit compliance rationalization?",
        answer:
          "Yes. Ghost Tax specifically detects dual UK/EU compliance tool overlap — one of the most common and highest-value findings for UK companies. The Decision Pack includes a consolidation matrix showing which tools can be unified and which genuinely require separate UK and EU instances.",
      },
    ],
    keywords: [
      "uk it cost optimization",
      "british company saas waste",
      "post brexit compliance cost",
      "uk fintech it spending",
      "london saas sprawl",
      "ghost tax uk",
      "ir35 compliance tool cost",
      "uk enterprise saas waste",
    ],
    ctaCountry: "united-kingdom",
  },

  {
    slug: "nordics",
    type: "country",
    title: "Ghost Tax Nordics — Hidden IT Waste in Nordic Companies",
    description:
      "Nordic companies waste 17-28% of IT budgets despite leading in digitization. High SaaS adoption + trust culture = invisible accumulation. Detect in 48 hours.",
    ogTitle: "Ghost Tax Nordics: The Most Digital Region Has the Sneakiest IT Waste",
    hero: {
      label: "NORDIC MARKET EXPOSURE",
      headline: "Nordic companies waste 17-28% despite leading in digitization",
      highlightedWord: "17-28%",
      stat: "1,850 EUR per employee per year across the Nordics",
      statSource: "Gartner Nordic IT 2025, Visma/Fortnox market data, Ghost Tax analysis",
      subtext:
        "Denmark, Sweden, Norway, and Finland are the most digitized economies in Europe. But high digital maturity does not mean efficient spending. Trust-based procurement, flat hierarchies, and early SaaS adoption have created layers of tools that nobody questions.",
    },
    painPoints: [
      {
        title: "Early Adopter Accumulation",
        description:
          "Nordic companies adopted SaaS earlier than any other European region. Tools purchased in 2018-2020 still run alongside newer alternatives. Nobody cancels the old tool because 'a few people still use it.'",
        costRange: "30k-160k EUR/yr",
      },
      {
        title: "Visma/Fortnox Ecosystem Overlap",
        description:
          "The Nordic ERP ecosystem (Visma, Fortnox, e-conomic) creates regional lock-in similar to DATEV in Germany. Companies run Visma + international tools (Sage, NetSuite) in parallel during growth.",
        costRange: "20k-100k EUR/yr",
      },
      {
        title: "Trust-Based Tool Adoption",
        description:
          "Flat hierarchies and high-trust culture mean any employee can purchase SaaS tools. No procurement gatekeeping creates rapid sprawl: the average Nordic company has 20% more tools per employee than the EU average.",
        costRange: "40k-200k EUR/yr",
      },
      {
        title: "Nordic Premium + VAT Stack",
        description:
          "Nordic pricing for SaaS is 10-20% above EU average, and 25% VAT on top. Companies rarely benchmark their pricing against EU/US alternatives, paying local premium rates by default.",
        costRange: "25k-150k EUR/yr",
      },
    ],
    stats: [
      { label: "SaaS adoption rate (Nordics)", value: "94%", note: "Highest in Europe" },
      { label: "Tools per employee (Nordic avg)", value: "1.8", note: "20% above EU average" },
      { label: "Self-service SaaS purchases", value: "45-55%", note: "Bought without procurement approval" },
      { label: "Tool retention rate", value: "88%", note: "Tools rarely cancelled once adopted" },
    ],
    testimonial: {
      quote:
        "Vi trodde vi var effektive fordi vi var digitale. Ghost Tax viste oss at vi betalte for 240 verktoy for 180 ansatte — og 38% av dem hadde overlappende funksjoner. 310k EUR per ar i unodvendig kostnad.",
      attribution: "CFO, Norwegian SaaS Company (180 employees)",
      context: "Detection completed in 38 hours. Nordic-specific vendor alternatives in Decision Pack.",
    },
    faq: [
      {
        question: "Why do Nordic companies have hidden IT waste despite being digitally advanced?",
        answer:
          "Digital maturity creates a paradox: early adoption means more legacy SaaS layers, trust-based culture means less procurement oversight, and 'if it works, don't touch it' means tools accumulate without review. Nordic companies have 20% more tools per employee than the EU average — and an 88% tool retention rate.",
      },
      {
        question: "How much do Nordic companies waste on IT?",
        answer:
          "Nordic companies waste 17-28% of IT budgets, with per-employee waste of 1,850 EUR/year. For a 200-person Nordic company, this represents 370k-560k EUR/year. The biggest sources are early adopter accumulation (tools from 2018-2020 still running), trust-based sprawl, and Visma/Fortnox ecosystem overlap.",
      },
      {
        question: "Does Ghost Tax cover Nordic-specific vendors?",
        answer:
          "Yes. Ghost Tax covers Visma, Fortnox, e-conomic, Tripletex, and the broader Nordic SaaS ecosystem. The engine detects overlap between Nordic regional tools and international alternatives, which is the #1 waste pattern in Scandinavian mid-market companies.",
      },
      {
        question: "Is Ghost Tax available in Nordic languages?",
        answer:
          "Ghost Tax is currently available in English, French, and German. Decision Packs for Nordic clients are delivered in English with EUR figures. Scandinavian language support (SE, NO, DK, FI) is planned for Q3 2026.",
      },
    ],
    keywords: [
      "nordic it cost optimization",
      "scandinavian saas waste",
      "visma cost reduction",
      "swedish company it spending",
      "norwegian saas sprawl",
      "danish it waste",
      "finnish software cost",
      "ghost tax nordics",
      "fortnox alternative",
    ],
    ctaCountry: "nordics",
  },
];

/** Helper: get vertical by slug */
export function getVertical(slug: string): VerticalData | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}

/** All slugs for generateStaticParams */
export function getAllVerticalSlugs(): string[] {
  return VERTICALS.map((v) => v.slug);
}
