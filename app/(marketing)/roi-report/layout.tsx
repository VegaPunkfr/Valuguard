import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Executive ROI Report — Board-Ready Summary",
  description:
    "Generate a C-suite summary of IT exposure findings. Quantified ROI, corrective timeline, and governance impact for board presentations.",
  openGraph: {
    title: "Executive ROI Report | Ghost Tax",
    description:
      "Board-ready ROI summary. Quantified exposure, corrective timeline, governance impact.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
