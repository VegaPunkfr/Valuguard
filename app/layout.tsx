import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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

/* DM Sans and IBM Plex Mono removed — 2 fonts max for performance */

/* ─── Constants ─────────────────────────────────────── */
const SITE_URL = "https://ghost-tax.com";
const SITE_NAME = "Ghost Tax";
const TITLE = "Ghost Tax \u2014 AI Financial Control Plane for SaaS & AI Spend";
const DESCRIPTION =
  "Ghost Tax detects hidden SaaS, AI & cloud spending exposure. " +
  "$490 one-time analysis. Board-ready decision pack in 48 hours. 21-phase autonomous detection.";

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
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ghost Tax",
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

/* ─── SSR locale detection ────────────────────────────── */
function detectLocaleSSR(): "en" | "fr" | "de" | "nl" {
  try {
    const { cookies } = require("next/headers");
    const cookieStore = cookies();
    const stored = cookieStore.get("vg-locale")?.value;
    if (stored && ["en", "fr", "de", "nl"].includes(stored)) return stored as any;
  } catch {}
  return "en";
}

function loadMessagesSSR(locale: "en" | "fr" | "de" | "nl"): Record<string, string> {
  try {
    return require(`@/messages/${locale}.json`);
  } catch {
    return require("@/messages/en.json");
  }
}

/* ─── Root Layout ───────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ssrLocale = detectLocaleSSR();
  const ssrMessages = loadMessagesSSR(ssrLocale);

  return (
    <html lang={ssrLocale} suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
        style={{ background: "#060912" }}
      >
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
        <I18nProvider initialLocale={ssrLocale} initialMessages={ssrMessages}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </I18nProvider>
        <CrispChat />
      </body>
    </html>
  );
}
