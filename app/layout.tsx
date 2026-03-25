import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import CrispChat from "@/components/ui/crisp-chat";
import ErrorBoundary from "@/components/ui/error-boundary";

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

const fontDmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--gt-font-dm-sans",
  display: "swap",
});

const fontIbmPlex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--gt-font-ibm-plex",
  display: "swap",
});

/* ─── Constants ─────────────────────────────────────── */
const SITE_URL = "https://ghost-tax.com";
const SITE_NAME = "Ghost Tax";
const TITLE = "Ghost Tax \u2014 AI Financial Control Plane for SaaS & AI Spend";
const DESCRIPTION =
  "Ghost Tax detects hidden SaaS, AI & cloud spending exposure. " +
  "$490 one-time analysis. Board-ready decision pack in 48 hours. Used by 200+ companies.";

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
      "en": SITE_URL,
      "de": `${SITE_URL}?lang=de`,
      "fr": `${SITE_URL}?lang=fr`,
      "nl": `${SITE_URL}?lang=nl`,
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
        url: `${SITE_URL}/api/og`,
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
    images: [`${SITE_URL}/api/og`],
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
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  category: "Finance Technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
};

/* ─── JSON-LD Structured Data (unified @graph) ────── */
const structuredDataGraph = {
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
      description: DESCRIPTION,
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

function JsonLdScripts() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataGraph) }}
    />
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
        className={`${fontSans.variable} ${fontMono.variable} ${fontDmSans.variable} ${fontIbmPlex.variable} font-sans antialiased`}
        style={{ background: "#060912" }}
      >
        <JsonLdScripts />
        {/* PostHog analytics — deferred, non-blocking */}
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
          <Script
            id="posthog-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${(process.env.NEXT_PUBLIC_POSTHOG_KEY || "").trim()}',{api_host:'${(process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").trim()}',person_profiles:'identified_only',capture_pageview:true,capture_pageleave:true})`,
            }}
          />
        )}
        <I18nProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </I18nProvider>
        <CrispChat />
      </body>
    </html>
  );
}
