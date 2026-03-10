import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import Navbar from "@/components/ui/navbar";

/* ─── Fonts ─────────────────────────────────────────── */
const fontSans = Inter({
  subsets: ["latin"],
  variable: "--vg-font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--vg-font-mono",
  display: "swap",
});

/* ─── Constants ─────────────────────────────────────── */
const SITE_URL = "https://ghost-tax.com";
const SITE_NAME = "Ghost Tax";
const TITLE = "Ghost Tax \u2014 AI Financial Control Plane for SaaS & AI Spend";
const DESCRIPTION =
  "Detect hidden SaaS, AI and cloud spend using a proprietary Causal Financial Graph. " +
  "Deterministic detection. Causal explanation. Corrective protocol in 48h.";

/* ─── Metadata (merged from layout-meta.js) ─────────── */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Ghost Tax",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Ghost Tax Inc.", url: SITE_URL }],
  creator: "Ghost Tax Inc.",
  publisher: "Ghost Tax Inc.",
  keywords: [
    "SaaS spend management",
    "AI cost governance",
    "Ghost Tax",
    "FinOps",
    "SaaS audit",
    "Cloud cost optimization",
    "Shadow IT detection",
    "license optimization",
    "IT spend analytics",
    "vendor management",
  ],
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-US": SITE_URL,
      "fr-FR": `${SITE_URL}/fr`,
      "de-DE": `${SITE_URL}/de`,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og/ghost-tax-og-us.png`,
        width: 1200,
        height: 630,
        alt: "Ghost Tax — Expose Your Hidden IT Spend",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ghosttaxhq",
    creator: "@ghosttaxhq",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og/ghost-tax-og-us.png`],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "GOOGLE_SITE_VERIFICATION_ID",
  },
  category: "Finance Technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060912" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

/* ─── JSON-LD Structured Data ───────────────────────── */
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Ghost Tax",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: DESCRIPTION,
  foundingDate: "2026",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Wilmington",
    addressRegion: "DE",
    addressCountry: "US",
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "audits@ghost-tax.com",
    contactType: "sales",
    availableLanguage: ["English", "French", "German"],
  },
  sameAs: ["https://www.linkedin.com/company/ghost-tax"],
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Ghost Tax — AI Spend Leak Monitor",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Detects 12 types of SaaS, Cloud, and AI spend leaks using a deterministic " +
    "engine with organizational entropy modeling. Zero system access required.",
  offers: {
    "@type": "Offer",
    price: "990",
    priceCurrency: "USD",
    description: "Financial Exposure Detection — one-time corrective protocol unlock. From $990 USD / 890 EUR.",
  },
  featureList: [
    "12-type anomaly detection",
    "Organizational entropy coefficient",
    "Peer benchmarking across 7 industries",
    "Board-ready executive summary",
    "Zero-Knowledge audit protocol",
    "SOC2 Type II readiness",
    "US data residency",
  ],
};

function JsonLdScripts() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
    </>
  );
}

/* ─── Root Layout ───────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
        style={{ background: "#060912" }}
      >
        <JsonLdScripts />
        {/* PostHog analytics — loads async, non-blocking */}
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}',{api_host:'${process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com"}',person_profiles:'identified_only',capture_pageview:true,capture_pageleave:true})`,
            }}
          />
        )}
        <I18nProvider>
          <Navbar />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
