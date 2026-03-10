"use client";

/**
 * GROWTH HACK #4: CFO MEMO TEASER
 *
 * Shows blurred Decision Pack sections after free scan.
 * Visible structure, locked content. +30-50% scan→checkout conversion.
 *
 * Props:
 *   domain — for checkout redirect
 *   email — for checkout pre-fill
 *   exposureLow / exposureHigh — for contextual urgency
 *   locale — for i18n
 */

import { useState } from "react";
import { trackEvent } from "@/lib/events";

interface DecisionPackTeaserProps {
  domain: string;
  email: string;
  exposureLow?: number;
  exposureHigh?: number;
  locale?: string;
}

const SECTIONS = [
  { id: "executive", labelEN: "Executive Snapshot", labelFR: "Synthèse Exécutive", labelDE: "Executive Summary", lines: 4 },
  { id: "cfo", labelEN: "CFO Memo", labelFR: "Mémo CFO", labelDE: "CFO Memo", lines: 6 },
  { id: "cio", labelEN: "CIO / IT Director Brief", labelFR: "Brief CIO / DSI", labelDE: "CIO / IT-Leiter Brief", lines: 5 },
  { id: "procurement", labelEN: "Procurement Playbook", labelFR: "Playbook Achats", labelDE: "Beschaffungs-Playbook", lines: 5 },
  { id: "negotiation", labelEN: "Vendor Negotiation Scripts", labelFR: "Scripts de Négociation", labelDE: "Verhandlungsskripte", lines: 4 },
  { id: "board", labelEN: "Board One-Pager", labelFR: "Synthèse Conseil d'Administration", labelDE: "Board-Zusammenfassung", lines: 3 },
] as const;

const COPY = {
  en: {
    title: "Your Decision Pack",
    subtitle: "Everything your leadership team needs to act",
    locked: "LOCKED",
    cta: "Unlock Full Decision Pack",
    delivery: "48h delivery · CFO-ready · Data-backed proof",
    dailyLoss: "Every day without this costs your company",
    perDay: "/day",
  },
  fr: {
    title: "Votre Decision Pack",
    subtitle: "Tout ce dont votre équipe dirigeante a besoin pour agir",
    locked: "VERROUILLÉ",
    cta: "Débloquer le Decision Pack Complet",
    delivery: "Livraison 48h · Prêt pour le CFO · Preuves chiffrées",
    dailyLoss: "Chaque jour sans ce rapport coûte à votre entreprise",
    perDay: "/jour",
  },
  de: {
    title: "Ihr Decision Pack",
    subtitle: "Alles, was Ihre Führungsebene zum Handeln braucht",
    locked: "GESPERRT",
    cta: "Vollständiges Decision Pack freischalten",
    delivery: "48h Lieferung · CFO-ready · Datengestützte Beweise",
    dailyLoss: "Jeder Tag ohne diesen Bericht kostet Ihr Unternehmen",
    perDay: "/Tag",
  },
} as const;

// Generate deterministic pseudo-random blur lines
function blurLines(count: number, seed: number): string[] {
  const widths = [95, 88, 72, 60, 82, 45, 90, 68, 55, 78];
  return Array.from({ length: count }, (_, i) => {
    const w = widths[(seed + i) % widths.length];
    return `${w}%`;
  });
}

export function DecisionPackTeaser({
  domain,
  email,
  exposureLow,
  exposureHigh,
  locale = "en",
}: DecisionPackTeaserProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const t = COPY[locale as keyof typeof COPY] || COPY.en;

  const dailyLoss = exposureLow && exposureHigh
    ? Math.round(((exposureLow + exposureHigh) / 2) / 365)
    : null;

  const handleUnlockClick = () => {
    trackEvent("decision_pack_unlock_clicked", { domain, locale });
    const params = new URLSearchParams({ domain, email, rail: "A" });
    window.location.href = `/api/stripe/checkout?${params.toString()}`;
  };

  const handleSectionClick = (sectionId: string) => {
    trackEvent("decision_pack_section_clicked", { domain, section: sectionId });
  };

  return (
    <div style={{
      background: "#0a0d19",
      border: "1px solid rgba(36,48,78,0.28)",
      borderRadius: 16,
      padding: "32px 28px",
      marginTop: 32,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontSize: 10,
          textTransform: "uppercase" as const,
          letterSpacing: "0.15em",
          color: "#55637d",
          margin: "0 0 8px",
          fontFamily: "var(--font-mono)",
        }}>
          {t.title}
        </p>
        <p style={{ fontSize: 14, color: "#8d9bb5", margin: 0 }}>
          {t.subtitle}
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map((section, idx) => {
        const label = locale === "fr" ? section.labelFR
          : locale === "de" ? section.labelDE
          : section.labelEN;
        const lines = blurLines(section.lines, idx * 3);
        const isHovered = hoveredSection === section.id;

        return (
          <div
            key={section.id}
            onClick={() => handleSectionClick(section.id)}
            onMouseEnter={() => setHoveredSection(section.id)}
            onMouseLeave={() => setHoveredSection(null)}
            style={{
              background: isHovered ? "#0e1221" : "#0c1019",
              border: "1px solid rgba(36,48,78,0.20)",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 8,
              cursor: "pointer",
              transition: "all 0.2s ease",
              transform: isHovered ? "scale(1.005)" : "none",
            }}
          >
            {/* Section header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "#e4e9f4", fontWeight: 600 }}>
                {label}
              </span>
              <span style={{
                fontSize: 9,
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                color: "#ef4444",
                fontFamily: "var(--font-mono)",
                background: "rgba(239,68,68,0.08)",
                padding: "3px 8px",
                borderRadius: 4,
              }}>
                {t.locked}
              </span>
            </div>

            {/* Blurred content lines */}
            <div style={{ filter: "blur(6px)", userSelect: "none" as const, pointerEvents: "none" as const }}>
              {lines.map((width, i) => (
                <div
                  key={i}
                  style={{
                    height: 10,
                    width,
                    background: "linear-gradient(90deg, rgba(141,155,181,0.25), rgba(141,155,181,0.08))",
                    borderRadius: 3,
                    marginBottom: 6,
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Daily loss urgency */}
      {dailyLoss && (
        <div style={{
          textAlign: "center" as const,
          margin: "20px 0 4px",
          fontSize: 12,
          color: "#55637d",
        }}>
          {t.dailyLoss}{" "}
          <span style={{ color: "#ef4444", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {dailyLoss.toLocaleString()} EUR{t.perDay}
          </span>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleUnlockClick}
        style={{
          display: "block",
          width: "100%",
          marginTop: 16,
          padding: "16px 24px",
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          transition: "background 0.2s",
          fontFamily: "var(--font-sans)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#60a5fa")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}
      >
        {t.cta}
      </button>

      <p style={{
        textAlign: "center" as const,
        margin: "10px 0 0",
        fontSize: 11,
        color: "#3a4560",
      }}>
        {t.delivery}
      </p>
    </div>
  );
}
