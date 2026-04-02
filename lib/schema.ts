/**
 * Schema Orchestrator — JSON-LD structured data for Ghost Tax pages
 *
 * Rules:
 * - @graph (Organization + WebSite + WebApplication + Product + Service) ONLY on 'homepage'
 * - BreadcrumbList on ALL sub-pages
 * - WebPage on all sub-pages
 * - FAQPage when faqItems provided
 * - AboutPage for 'about' type
 */

const SITE_URL = "https://ghost-tax.com";
const SITE_NAME = "Ghost Tax";
const SITE_DESCRIPTION =
  "Ghost Tax detects hidden SaaS, AI & cloud spending exposure. " +
  "$490 one-time analysis. Board-ready decision pack in 48 hours. 21-phase autonomous detection.";

/* ─── Homepage @graph (Organization + WebSite + WebApplication + Product + Service) ─── */
export const homepageGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Ghost Tax",
      legalName: "Ghost Tax SAS",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        "@id": `${SITE_URL}/#logo`,
        url: `${SITE_URL}/logo.png`,
        width: 512,
        height: 512,
        caption: "Ghost Tax",
      },
      image: `${SITE_URL}/logo.png`,
      description: SITE_DESCRIPTION,
      foundingDate: "2025-01-01",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Paris",
        addressCountry: "FR",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "audits@ghost-tax.com",
        contactType: "sales",
        availableLanguage: ["English", "French", "German", "Dutch"],
      },
      sameAs: ["https://www.linkedin.com/company/ghost-tax"],
      knowsAbout: [
        "SaaS spend management",
        "FinOps",
        "Cloud cost optimization",
        "Shadow IT detection",
        "AI cost governance",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: "Detect hidden SaaS, AI & cloud spending exposure",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#application`,
      name: "Ghost Tax",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Detects 12 types of SaaS, Cloud, and AI spend leaks using a deterministic " +
        "engine with organizational entropy modeling. Zero system access required.",
      provider: { "@id": `${SITE_URL}/#organization` },
      screenshot: `${SITE_URL}/api/og`,
      featureList: [
        "12-type anomaly detection",
        "Organizational entropy coefficient",
        "Peer benchmarking across 7 industries",
        "Board-ready executive summary",
        "Zero-Knowledge audit protocol",
        "Enterprise-grade data handling",
        "US data residency",
      ],
      offers: [
        {
          "@type": "Offer",
          "@id": `${SITE_URL}/#offer-usd`,
          name: "Decision Pack — Financial Exposure Detection",
          price: "490.00",
          priceCurrency: "USD",
          url: `${SITE_URL}/checkout`,
          availability: "https://schema.org/InStock",
          priceValidUntil: "2026-12-31",
          seller: { "@id": `${SITE_URL}/#organization` },
          description: "One-time financial exposure analysis. Board-ready Decision Pack delivered in 48 hours.",
        },
        {
          "@type": "Offer",
          "@id": `${SITE_URL}/#offer-eur`,
          name: "Decision Pack — Financial Exposure Detection",
          price: "490.00",
          priceCurrency: "EUR",
          url: `${SITE_URL}/checkout`,
          availability: "https://schema.org/InStock",
          priceValidUntil: "2026-12-31",
          seller: { "@id": `${SITE_URL}/#organization` },
          description: "One-time financial exposure analysis. Board-ready Decision Pack delivered in 48 hours.",
        },
      ],
    },
    {
      "@type": "Product",
      "@id": `${SITE_URL}/#product`,
      name: "Ghost Tax Decision Pack",
      description:
        "Complete financial exposure analysis covering SaaS, AI, and Cloud spending. " +
        "Includes exposure detection, negotiation playbooks, and corrective protocols. Delivered in 48 hours.",
      brand: { "@id": `${SITE_URL}/#organization` },
      image: `${SITE_URL}/api/og`,
      url: SITE_URL,
      category: "Business Intelligence Software",
      offers: { "@id": `${SITE_URL}/#offer-usd` },
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#service`,
      name: "Ghost Tax Financial Exposure Audit",
      serviceType: "IT Financial Audit",
      description:
        "Automated detection of 12 types of hidden SaaS, Cloud, and AI spend leaks. " +
        "Zero system access required. Results delivered as a board-ready Decision Pack within 48 hours.",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: [
        { "@type": "Country", name: "Germany" },
        { "@type": "Country", name: "United States" },
        { "@type": "Country", name: "United Kingdom" },
        { "@type": "Country", name: "Netherlands" },
        { "@type": "Country", name: "France" },
      ],
    },
  ],
};

/* ─── Page Schema Generator ─── */

export interface PageSchemaConfig {
  type: 'homepage' | 'about' | 'faq' | 'pricing' | 'methodology' | 'platform' | 'contact' | 'vertical' | 'benchmark' | 'other';
  url: string;
  title: string;
  description: string;
  breadcrumbs?: { name: string; url: string }[];
  faqItems?: { q: string; a: string }[];
}

function buildBreadcrumbList(breadcrumbs: { name: string; url: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

function buildWebPage(config: PageSchemaConfig): object {
  const pageType = config.type === 'about' ? 'AboutPage' : 'WebPage';
  return {
    "@context": "https://schema.org",
    "@type": pageType,
    "@id": `${config.url}/#webpage`,
    url: config.url,
    name: config.title,
    description: config.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
  };
}

function buildFAQPage(faqItems: { q: string; a: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/**
 * Generate the correct JSON-LD schema objects for a given page type.
 * Returns an array of schema objects — each should be serialized into its own
 * <script type="application/ld+json"> tag, or combined as needed.
 */
export function generatePageSchema(config: PageSchemaConfig): object[] {
  // Homepage gets the full @graph — no BreadcrumbList, no WebPage
  if (config.type === 'homepage') {
    return [homepageGraph];
  }

  const schemas: object[] = [];

  // WebPage (or AboutPage) on all sub-pages
  schemas.push(buildWebPage(config));

  // BreadcrumbList on all sub-pages
  if (config.breadcrumbs && config.breadcrumbs.length > 0) {
    schemas.push(buildBreadcrumbList(config.breadcrumbs));
  }

  // FAQPage when faqItems provided
  if (config.faqItems && config.faqItems.length > 0) {
    schemas.push(buildFAQPage(config.faqItems));
  }

  return schemas;
}
