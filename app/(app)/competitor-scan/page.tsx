import type { Metadata } from "next";
import { Suspense } from "react";
import CompetitorScanClient from "./CompetitorScanClient";

export const metadata: Metadata = {
  title: "Competitor Scan — Ghost Tax",
  description:
    "Compare your tech stack with your competitor's. Discover tools they use that you don't.",
  openGraph: {
    title: "Competitor Scan — Ghost Tax",
    description:
      "Compare your tech stack with your competitor's. Discover tools they use that you don't.",
    type: "website",
    url: "https://ghost-tax.com/competitor-scan",
  },
};

export default function CompetitorScanPage() {
  return (
    <Suspense>
      <CompetitorScanClient />
    </Suspense>
  );
}
