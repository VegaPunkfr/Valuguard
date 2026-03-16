import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Executive ROI Report — Board-Ready Summary",
  description:
    "Generate a C-suite summary of IT exposure findings. Quantified ROI, corrective timeline, and governance impact for board presentations.",
  alternates: { canonical: "https://ghost-tax.com/roi-report" },
  openGraph: {
    title: "Executive ROI Report | Ghost Tax",
    description:
      "Board-ready ROI summary. Quantified exposure, corrective timeline, governance impact.",
    url: "https://ghost-tax.com/roi-report",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
