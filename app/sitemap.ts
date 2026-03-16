import type { MetadataRoute } from "next";
import { getAllVerticalSlugs } from "@/lib/verticals";

const BASE = "https://ghost-tax.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const verticalPages: MetadataRoute.Sitemap = getAllVerticalSlugs().map((slug) => ({
    url: `${BASE}/ghost-tax/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [
    // Core public surfaces
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/platform`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/intel`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },

    // Trust & credibility
    { url: `${BASE}/methodology`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/security-vault`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },

    // Tools
    { url: `${BASE}/ghost-tax`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },

    // Intelligence index
    { url: `${BASE}/intel-benchmarks`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/intel-benchmarks/saas-ai-cost-exposure`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/intel-benchmarks/shadow-ai-governance`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/intel-benchmarks/cfo-technology-spend-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },

    // Tools & additional pages
    { url: `${BASE}/procurement`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/estimator`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/sample-report`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/peer-gap`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/roi-report`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/case-studies`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // /competitor-scan is an (app) route behind auth — excluded from public sitemap
    { url: `${BASE}/integrations`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },

    // Legal
    { url: `${BASE}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },

    // Ghost Tax vertical landing pages (industry + country SEO)
    ...verticalPages,

    // Post-conversion pages excluded (noindex, private user flow)
  ];
}
