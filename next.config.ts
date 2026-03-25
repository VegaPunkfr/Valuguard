import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false, // Never expose source maps in production
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@sentry/nextjs",
    ],
  },
  headers: async () => [
    {
      source: "/_next/static/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      source: "/fonts/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
    {
      // Marketing pages — edge-cached for fast TTFB
      source: "/(about|pricing|platform|methodology|security-vault|faq|contact|procurement|estimator|sample-report|peer-gap|roi-report|case-studies|integrations|ghost-tax|intel-benchmarks)(.*)",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
      ],
    },
    {
      // Homepage — edge-cached
      source: "/",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.stripe.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://client.crisp.chat; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com https://*.stripe.network https://api.exa.ai https://eu.i.posthog.com https://eu.posthog.com https://client.crisp.chat wss://client.relay.crisp.chat; frame-src https://js.stripe.com https://*.stripe.com https://*.stripe.network https://game.crisp.chat; font-src 'self' data: https://client.crisp.chat https://*.stripe.com; base-uri 'self'; form-action 'self' https://*.stripe.com; object-src 'none';",
        },
      ],
    },
  ],
};

export default nextConfig;
