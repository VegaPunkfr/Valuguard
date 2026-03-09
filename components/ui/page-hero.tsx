"use client";

import { c } from "@/lib/tokens";
import Section from "@/components/ui/section";

export default function PageHero({
  label,
  title,
  subtitle,
  maxWidth = 600,
}: {
  label: string;
  title: string;
  subtitle: string;
  maxWidth?: number;
}) {
  return (
    <Section style={{ textAlign: "center", paddingTop: 80, paddingBottom: 20 }}>
      <p className="gt-section-label">{label}</p>
      <h1 style={{ marginBottom: 16 }}>{title}</h1>
      <p style={{ fontSize: 18, color: c.text2, maxWidth, margin: "0 auto", lineHeight: 1.6 }}>
        {subtitle}
      </p>
    </Section>
  );
}
