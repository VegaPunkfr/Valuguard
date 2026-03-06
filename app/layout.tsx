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
const SITE_URL = "https://valuguard.com";
const SITE_NAME = "Valuguard";
const TITLE = "ValuGuard \u2014 AI Financial Control Plane for SaaS & AI Spend";
const DESCRIPTION =
  "Detect hidden SaaS, AI and cloud spend using a proprietary Causal Financial Graph. " +
  "Deterministic detection. Causal explanation. Corrective protocol in 48h.";

/* ─── Metadata (merged from layout-meta.js) ─────────── */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Valuguard",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Valuguard Inc.", url: SITE_URL }],
  creator: "Valuguard Inc.",
  publisher: "Valuguard Inc.",
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
        url: `${SITE_URL}/og/valuguard-og-us.png`,
        width: 1200,
        height: 630,
        alt: "Valuguard — Expose Your AI Ghost Tax",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@valuguard",
    creator: "@valuguard",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og/valuguard-og-us.png`],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
  name: "Valuguard",
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
    email: "audits@valuguard.com",
    contactType: "sales",
    availableLanguage: ["English", "French", "German"],
  },
  sameAs: [],
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Valuguard AI Spend Leak Monitor",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Detects 12 types of SaaS, Cloud, and AI spend leaks using a deterministic " +
    "engine with organizational entropy modeling. Zero system access required.",
  offers: {
    "@type": "Offer",
    price: "990",
    priceCurrency: "USD",
    description: "Ghost Tax Audit \u2014 one-time diagnostic",
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
        <I18nProvider>
          <Navbar />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
