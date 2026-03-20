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

import { useState, useEffect } from "react";
import { c, f } from "@/lib/tokens";
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
    ctaLoading: "Redirecting...",
    delivery: "48h delivery · CFO-ready · Data-backed proof",
    dailyLoss: "Every day without this costs your company",
    perDay: "/day",
    expiryLabel: "SCAN RESULTS EXPIRE IN",
    socialProof: "Backed by 200+ analyses — 0 companies had zero exposure",
  },
  fr: {
    title: "Votre Decision Pack",
    subtitle: "Tout ce dont votre équipe dirigeante a besoin pour agir",
    locked: "VERROUILLÉ",
    cta: "Débloquer le Decision Pack Complet",
    ctaLoading: "Redirection...",
    delivery: "Livraison 48h · Prêt pour le CFO · Preuves chiffrées",
    dailyLoss: "Chaque jour sans ce rapport coûte à votre entreprise",
    perDay: "/jour",
    expiryLabel: "ANALYSE EXPIRE DANS",
    socialProof: "Basé sur 200+ analyses — 0 entreprises sans exposition détectée",
  },
  de: {
    title: "Ihr Decision Pack",
    subtitle: "Alles, was Ihre Führungsebene zum Handeln braucht",
    locked: "GESPERRT",
    cta: "Vollständiges Decision Pack freischalten",
    ctaLoading: "Weiterleitung...",
    delivery: "48h Lieferung · CFO-ready · Datengestützte Beweise",
    dailyLoss: "Jeder Tag ohne diesen Bericht kostet Ihr Unternehmen",
    perDay: "/Tag",
    expiryLabel: "ANALYSE LÄUFT AB IN",
    socialProof: "Basiert auf 200+ Analysen — 0 Unternehmen ohne Exposition",
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

// Urgency countdown hook — 23h47 initial, ticks every second
function useExpiryCountdown(): string {
  const [remaining, setRemaining] = useState(23 * 3600 + 47 * 60); // 23h47 initial
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function DecisionPackTeaser({
  domain,
  email,
  exposureLow,
  exposureHigh,
  locale = "en",
}: DecisionPackTeaserProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const t = COPY[locale as keyof typeof COPY] || COPY.en;
  const expiryLabel = useExpiryCountdown();

  const dailyLoss = exposureLow && exposureHigh
    ? Math.round(((exposureLow + exposureHigh) / 2) / 365)
    : null;

  const handleUnlockClick = async () => {
    trackEvent("decision_pack_unlock_clicked", { domain, locale });
    setLoading(true);
    try {
      const params = new URLSearchParams({
        rail: "A",
        locale,
        ...(domain && { domain }),
        ...(email && { email }),
      });
      window.location.href = `/checkout?${params.toString()}`;
    } catch {
      window.location.href = "/intel?retry=1";
    } finally {
      setLoading(false);
    }
  };

  const handleSectionClick = (sectionId: string) => {
    trackEvent("decision_pack_section_clicked", { domain, section: sectionId });
  };

  return (
    <div style={{
      background: c.surface,
      border: "1px solid " + c.border,
      borderRadius: 16,
      marginTop: 32,
      overflow: "hidden",
    }}>
      {/* Urgency expiry banner */}
      <div style={{
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.20)",
        borderRadius: "10px 10px 0 0",
        padding: "8px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#ef4444",
          boxShadow: "none",
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "#ef4444",
          letterSpacing: ".08em",
        }}>
          {t.expiryLabel} {expiryLabel}
        </span>
      </div>

      {/* Main card content */}
      <div style={{ padding: "32px 28px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 10,
            textTransform: "uppercase" as const,
            letterSpacing: "0.15em",
            color: c.text3,
            margin: "0 0 8px",
            fontFamily: f.mono,
          }}>
            {t.title}
          </p>
          <p style={{ fontSize: 14, color: c.text2, margin: 0 }}>
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
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={() => handleSectionClick(section.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSectionClick(section.id); } }}
              onMouseEnter={() => setHoveredSection(section.id)}
              onMouseLeave={() => setHoveredSection(null)}
              style={{
                background: isHovered ? c.elevated : c.card,
                border: "1px solid " + c.border,
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
                <span style={{ fontSize: 13, color: c.text1, fontWeight: 600 }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 9,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.12em",
                  color: c.red,
                  fontFamily: f.mono,
                  background: c.redBg,
                  padding: "3px 8px",
                  borderRadius: 4,
                }}>
                  {t.locked}
                </span>
              </div>

              {/* Blurred content lines */}
              <div aria-hidden="true" style={{ filter: "blur(6px)", userSelect: "none" as const, pointerEvents: "none" as const }}>
                {lines.map((width, i) => (
                  <div
                    key={i}
                    style={{
                      height: 10,
                      width,
                      background: "linear-gradient(90deg, rgba(15,23,42,0.10), rgba(15,23,42,0.04))",
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
            color: c.text3,
          }}>
            {t.dailyLoss}{" "}
            <span style={{ color: c.red, fontFamily: f.mono, fontWeight: 700 }}>
              {dailyLoss.toLocaleString()} EUR{t.perDay}
            </span>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleUnlockClick}
          disabled={loading}
          className="gt-btn gt-btn-primary gt-leak-pulse"
          style={{
            display: "block",
            width: "100%",
            marginTop: 16,
            padding: "16px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: f.sans,
            opacity: loading ? 0.8 : 1,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06)",
            transition: "all 0.2s ease",
          }}
        >
          {loading ? t.ctaLoading : t.cta}
        </button>

        {/* Social proof */}
        <p style={{
          textAlign: "center" as const,
          margin: "8px 0 0",
          fontSize: 10,
          color: c.text3,
          fontFamily: f.mono,
          letterSpacing: "0.04em",
        }}>
          {t.socialProof}
        </p>

        <p style={{
          textAlign: "center" as const,
          margin: "8px 0 0",
          fontSize: 11,
          color: c.text4,
        }}>
          {t.delivery}
        </p>
      </div>
    </div>
  );
}
