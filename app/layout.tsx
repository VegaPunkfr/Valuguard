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
    price: "490",
    priceCurrency: "EUR",
    description: "Financial Exposure Detection \u2014 one-time corrective protocol unlock",
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
