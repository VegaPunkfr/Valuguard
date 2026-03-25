import type { MetadataRoute } from "next";
import { getAllVerticalSlugs } from "@/lib/verticals";

const BASE = "https://ghost-tax.com";

// Use meaningful dates — Google ignores lastmod when all URLs share the same timestamp
const LAUNCH_DATE = "2026-03-24";
const CONTENT_UPDATE = "2026-03-20";

export default function sitemap(): MetadataRoute.Sitemap {
  const verticalPages: MetadataRoute.Sitemap = getAllVerticalSlugs().map((slug) => ({
    url: `${BASE}/ghost-tax/${slug}`,
    lastModified: CONTENT_UPDATE,
  }));

  return [
    // Core public surfaces
    { url: BASE, lastModified: LAUNCH_DATE },
    { url: `${BASE}/platform`, lastModified: LAUNCH_DATE },
    { url: `${BASE}/pricing`, lastModified: LAUNCH_DATE },
    { url: `${BASE}/intel`, lastModified: LAUNCH_DATE },

    // Trust & credibility
    { url: `${BASE}/methodology`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/security-vault`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/about`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/faq`, lastModified: CONTENT_UPDATE },

    // Tools
    { url: `${BASE}/ghost-tax`, lastModified: LAUNCH_DATE },
    { url: `${BASE}/contact`, lastModified: CONTENT_UPDATE },

    // Intelligence index
    { url: `${BASE}/intel-benchmarks`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/intel-benchmarks/saas-ai-cost-exposure`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/intel-benchmarks/shadow-ai-governance`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/intel-benchmarks/cfo-technology-spend-guide`, lastModified: CONTENT_UPDATE },

    // Tools & additional pages
    { url: `${BASE}/procurement`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/estimator`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/sample-report`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/peer-gap`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/roi-report`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/case-studies`, lastModified: CONTENT_UPDATE },
    { url: `${BASE}/integrations`, lastModified: CONTENT_UPDATE },

    // Legal
    { url: `${BASE}/legal/privacy`, lastModified: "2026-03-01" },
    { url: `${BASE}/legal/terms`, lastModified: "2026-03-01" },

    // Ghost Tax vertical landing pages (industry + country SEO)
    ...verticalPages,
  ];
}
