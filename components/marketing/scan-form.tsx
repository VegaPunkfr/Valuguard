"use client";

import { useEffect, useState } from "react";

interface ScanFormProps {
  variant?: "hero" | "cta";
  detectLabel?: string;
  freeLabel?: string;
  placeholder?: string;
}

interface GeoResult {
  country: string;
  locale: "en" | "fr" | "de";
  isDACH: boolean;
  priceEur: number;
  priceFormatted: string;
}

export default function ScanForm({
  variant = "hero",
  detectLabel = "DETECT",
  freeLabel = "→ Launch a free scan",
  placeholder = "your-company.com",
}: ScanFormProps) {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [geo, setGeo] = useState<GeoResult | null>(null);

  // Fix 17 avril 2026 : detect country early pour afficher le bon prix + passer
  // country au checkout (DACH paie 590€, pas 490€ comme avant le fix).
  useEffect(() => {
    fetch("/api/geo")
      .then((r) => r.json())
      .then((data: GeoResult) => setGeo(data))
      .catch(() => setGeo(null));
  }, []);

  const handleDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.trim(),
          rail: "A",
          // Passer country + locale détectés pour que Stripe affiche cohérent
          country: geo?.country,
          locale: geo?.locale,
        }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeScan = () => {
    const q = domain.trim() ? `?domain=${encodeURIComponent(domain)}` : "";
    window.location.href = `/intel${q}`;
  };

  const priceLabel = geo
    ? geo.isDACH
      ? `${geo.priceFormatted} · Decision Pack (DACH)`
      : `${geo.priceFormatted} · Decision Pack`
    : null;

  if (variant === "cta") {
    return (
      <form
        onSubmit={handleDetection}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "520px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: "16px 20px",
              background: "transparent",
              border: "none",
              color: "#E2E8F0",
              fontFamily: "var(--gt-font-mono)",
              fontSize: "15px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "16px 32px",
              background: "#00CFC4",
              color: "#060912",
              border: "none",
              fontFamily: "var(--gt-font-mono)",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              cursor: isLoading ? "wait" : "pointer",
            }}
          >
            {isLoading ? "..." : detectLabel}
          </button>
        </div>
        {priceLabel && (
          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              color: "rgba(226,232,240,0.55)",
              textAlign: "center",
            }}
          >
            {priceLabel}
          </div>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleDetection} style={{ maxWidth: "480px" }}>
      <div style={{ display: "flex", gap: "0", marginBottom: "10px" }}>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "17px 20px",
            background: "rgba(10,13,25,0.85)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRight: "none",
            color: "#E2E8F0",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "16px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "17px 32px",
            background: "#E2E8F0",
            color: "#060912",
            border: "none",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            cursor: isLoading ? "wait" : "pointer",
          }}
        >
          {isLoading ? "..." : detectLabel}
        </button>
      </div>
      {priceLabel && (
        <div
          style={{
            fontFamily: "var(--gt-font-mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            color: "rgba(226,232,240,0.55)",
            marginBottom: "12px",
          }}
        >
          {priceLabel}
        </div>
      )}
      <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleFreeScan}
          style={{
            background: "none",
            border: "none",
            color: "#00CFC4",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {freeLabel}
        </button>
        {/* P0.3 17 avril 2026 : lien sample public pour réduire friction
            (un CFO veut voir avant de scanner) — locale-aware */}
        <a
          href={
            geo?.locale === "de"
              ? "/sample-report-de.pdf"
              : geo?.locale === "fr"
                ? "/sample-report-fr.pdf"
                : "/sample-report-en.pdf"
          }
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "rgba(226,232,240,0.7)",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            textDecoration: "underline",
            textDecorationColor: "rgba(226,232,240,0.3)",
            textUnderlineOffset: "3px",
          }}
        >
          {geo?.locale === "de" ? "→ Beispielbericht ansehen" : geo?.locale === "fr" ? "→ Voir un exemple" : "→ See sample report"}
        </a>
      </div>
    </form>
  );
}
