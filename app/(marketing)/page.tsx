/**
 * Ghost Tax Homepage — Server Component Wrapper
 *
 * This is the entry point. It:
 * 1. Pre-renders the JSON-LD schema on the server (Google sees it without JS)
 * 2. Pre-renders critical SEO text (h1, meta) on the server
 * 3. Delegates interactive rendering to HomePageClient (Client Component)
 *
 * Architecture: Server Component + Client Island pattern
 * The full visual page is still in HomePageClient for now.
 * Next step: extract static sections into this Server Component.
 */

import { HomePageClient } from "@/components/marketing/home-client";
import { homepageGraph } from "@/lib/schema";
import en from "@/messages/en.json";

// Pre-resolve critical i18n keys for SSR SEO
const seoText = {
  h1: [
    en["v2.hero.h1_line1"] || "YOUR COSTS",
    en["v2.hero.h1_line2"] || "SAAS & AI",
    en["v2.hero.h1_line3"] || "BLEED.",
  ].join(" "),
  description: en["v2.hero.sub"] || "Ghost Tax exposes hidden financial leaks in your SaaS, AI and Cloud tools — in 48 hours, zero system access.",
  proof: en["v2.proof.title"] || "No access. No integration. Just proof.",
};

export default function HomePage() {
  return (
    <>
      {/* Server-rendered JSON-LD — Google sees this without executing JS */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageGraph) }}
      />

      {/* Server-rendered SEO anchor text — invisible but crawlable */}
      <div aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        <h1>{seoText.h1}</h1>
        <p>{seoText.description}</p>
        <p>{seoText.proof}</p>
      </div>

      {/* Client Component renders the full interactive page */}
      <HomePageClient />
    </>
  );
}
