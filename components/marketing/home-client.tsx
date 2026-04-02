"use client";

/**
 * Ghost Tax V2 — Editorial Financial Landing Page
 * Design: Ghost Tax Light Design System (March 2026)
 * Aesthetic: Bloomberg Terminal data inserts in a WSJ/FT editorial layout.
 * Parchment/white base. Dark only for data panels. Heavy ink typography.
 *
 * NOT the generic Claude dark theme. See: .claude/skills/ghost-tax-light-design/SKILL.md
 */

import React, { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { homepageGraph } from "@/lib/schema";

// ─── Palette (dark theme — matches Three.js terrain) ─────────────────────────
const C = {
  parchment: "transparent",
  paper:     "rgba(10,13,25,0.85)",
  cream:     "rgba(14,18,33,0.80)",
  ink:       "#E2E8F0",
  ink2:      "#CBD5E1",
  ink3:      "#94A3B8",
  rule:      "rgba(255,255,255,0.08)",
  red:       "#D62828",
  cyan:      "#00CFC4",
  gold:      "#B28C28",
  green:     "#1A7A4A",
  obsidian:  "#060912",
  obs2:      "#0A0D19",
  obs3:      "#0E1221",
};

// ─── Live Leak Counter — obsidian context only ────────────────────────────────
const LeakCounter: React.FC = () => {
  const [amount, setAmount] = useState(294847);
  useEffect(() => {
    const t = setInterval(() => {
      setAmount((p) => p + Math.floor(Math.random() * 800 + 200));
    }, 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          display: "inline-block",
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: C.red,
          animation: "gt-pulse 1.5s ease-in-out infinite",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--gt-font-mono)",
          fontSize: "13px",
          fontWeight: 700,
          color: C.red,
          letterSpacing: "0.02em",
        }}
      >
        €{amount.toLocaleString("de-DE")} DÉTECTÉS AUJOURD&apos;HUI
      </span>
    </div>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────
const HeroSection: React.FC = () => {
  const { t } = useI18n();
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), rail: "A" }),
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

  return (
    <section
      style={{
        background: C.parchment,
        paddingTop: "0",
      }}
    >
      {/* ── Top rule: double newspaper line ── */}
      <div
        style={{
          borderTop: `2px solid rgba(255,255,255,0.08)`,
          borderBottom: `1px solid rgba(255,255,255,0.04)`,
          height: "6px",
          background: C.parchment,
        }}
      />

      <div
        className="gt-container"
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: "64px",
          alignItems: "start",
          padding: "56px 24px 0",
        }}
      >
        {/* ── Left: editorial copy ── */}
        <div>
          {/* Eyebrow */}
          <div style={{ marginBottom: "20px" }}>
            <LeakCounter />
          </div>

          {/* Section tag */}
          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.ink3,
              marginBottom: "12px",
            }}
          >
            {t("v2.hero.eyebrow") || "FINANCIAL EXPOSURE DETECTION"}
          </div>

          {/* Big editorial headline */}
          <h1
            style={{
              fontSize: "clamp(56px, 6.5vw, 96px)",
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              color: C.ink,
              marginBottom: "0",
            }}
          >
            {t("v2.hero.h1_line1") || "VOS DÉPENSES"}
            <br />
            <span style={{ color: C.ink2 }}>
              {t("v2.hero.h1_line2") || "SAAS & IA"}
            </span>
            <br />
            {t("v2.hero.h1_line3") || "SAIGNENT."}
          </h1>

          {/* Red strike diagnostic */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              margin: "20px 0",
            }}
          >
            <div
              style={{
                height: "3px",
                width: "48px",
                background: C.red,
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.55,
                color: C.ink2,
                margin: 0,
                fontWeight: 400,
              }}
            >
              {t("v2.hero.sub") ||
                "Ghost Tax expose les fuites financières cachées dans vos outils SaaS, IA et Cloud — en 48 heures, sans accès système."}
            </p>
          </div>

          {/* CTA form */}
          <form
            onSubmit={handleDetection}
            style={{
              display: "flex",
              gap: "0",
              marginBottom: "12px",
              border: `2px solid ${C.ink}`,
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <input
              type="text"
              placeholder="votre-entreprise.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              style={{
                flex: 1,
                padding: "14px 18px",
                border: "none",
                background: C.paper,
                color: C.ink,
                fontSize: "15px",
                fontFamily: "var(--gt-font-mono)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: "14px 28px",
                background: C.ink,
                color: C.parchment,
                border: "none",
                fontFamily: "var(--gt-font-mono)",
                fontWeight: 700,
                fontSize: "13px",
                letterSpacing: "0.1em",
                cursor: isLoading ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                textTransform: "uppercase",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? "..." : t("v2.hero.cta_detect") || "DÉTECTER"}
            </button>
          </form>

          <button
            onClick={handleFreeScan}
            style={{
              fontSize: "13px",
              color: C.ink,
              background: "transparent",
              border: "none",
              padding: "0",
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: "var(--gt-font-mono)",
              letterSpacing: "0.06em",
            }}
          >
            {t("v2.hero.cta_free") || "→ Lancer un scan gratuit"}
          </button>

          {/* Proof line */}
          <div
            style={{
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: `1px solid ${C.rule}`,
              fontFamily: "var(--gt-font-mono)",
              fontSize: "12px",
              color: C.ink3,
              letterSpacing: "0.06em",
            }}
          >
            21 phases autonomes · Livraison 48h · Zéro accès système
          </div>
        </div>

        {/* ── Right: obsidian data panel ── */}
        <div
          style={{
            background: C.obsidian,
            padding: "28px",
            border: `1px solid ${C.ink}`,
          }}
        >
          {/* Panel header */}
          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.cyan,
              marginBottom: "4px",
            }}
          >
            SIGNAL ACTIF
          </div>
          <div
            style={{
              height: "1px",
              background: `rgba(0,188,212,0.25)`,
              marginBottom: "20px",
            }}
          />

          {/* Metrics */}
          {[
            { val: "48H",        lbl: "Délai de livraison garanti",      color: C.green },
            { val: "21",         lbl: "Phases de détection autonomes",   color: C.cyan },
            { val: "€490",       lbl: "Détection one-shot, pas abonnement", color: C.red },
            { val: "12",         lbl: "Types de fuites détectées",       color: C.gold },
            { val: "48 HEURES",  lbl: "Détection → pack décisionnel",    color: C.parchment },
          ].map(({ val, lbl, color }, i) => (
            <div
              key={i}
              style={{
                paddingBottom: "14px",
                marginBottom: "14px",
                borderBottom: `1px solid rgba(255,255,255,0.05)`,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--gt-font-mono)",
                  fontSize: "22px",
                  fontWeight: 700,
                  color,
                  lineHeight: 1.1,
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontFamily: "var(--gt-font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(141,155,181,0.65)",
                  marginTop: "3px",
                }}
              >
                {lbl}
              </div>
            </div>
          ))}

          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "10px",
              color: C.cyan,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginTop: "8px",
              opacity: 0.75,
            }}
          >
            PIPELINE 21 PHASES · ZÉRO ACCÈS SYSTÈME
          </div>
        </div>
      </div>

      {/* ── Bottom rule before stats strip ── */}
      <div
        style={{
          marginTop: "56px",
          borderTop: `2px solid ${C.ink}`,
        }}
      />
    </section>
  );
};

// ─── Stats Strip (dark obsidian bar) ─────────────────────────────────────────
const StatsStrip: React.FC = () => {
  const { t } = useI18n();
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const targets = [21, 48, 12, 490];

  useEffect(() => {
    const timers = targets.map((target, i) => {
      let current = 0;
      const steps = 50;
      const inc = target / steps;
      return setInterval(() => {
        current = Math.min(current + inc, target);
        setCounts((prev) => {
          const n = [...prev];
          n[i] = Math.round(current);
          return n;
        });
        if (current >= target) clearInterval(timers[i]);
      }, 40 + i * 10);
    });
    return () => timers.forEach(clearInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = [
    { val: `${counts[0]}`,    label: t("stats.phases")     || "Phases de détection IA" },
    { val: `${counts[1]}h`,   label: t("stats.delivery")   || "Livraison garantie" },
    { val: `${counts[2]}`,    label: t("stats.leakTypes")  || "Types de fuites" },
    { val: `€${counts[3]}`,   label: t("stats.price")      || "Détection one-shot" },
  ];

  return (
    <section style={{ background: C.obsidian }}>
      <div
        className="gt-container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          padding: "0 24px",
        }}
      >
        {stats.map(({ val, label }, i) => (
          <div
            key={i}
            style={{
              padding: "28px 24px",
              borderRight: i < 3 ? `1px solid rgba(255,255,255,0.07)` : "none",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--gt-font-mono)",
                fontSize: "32px",
                fontWeight: 700,
                color: i === 2 ? C.cyan : i === 0 ? C.green : C.parchment,
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              {val}
            </div>
            <div
              style={{
                fontFamily: "var(--gt-font-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(141,155,181,0.6)",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: "2px", background: C.ink }} />
    </section>
  );
};

// ─── Problem Section ──────────────────────────────────────────────────────────
const ProblemSection: React.FC = () => {
  const { t } = useI18n();

  const problems = [
    {
      num: "01",
      amount: "€2 400 / mois",
      label: t("v2.problem.p1") || "Licences inactives non détectées",
    },
    {
      num: "02",
      amount: "€1 800 / mois",
      label: t("v2.problem.p2") || "Doublons d'outils non gouvernés",
    },
    {
      num: "03",
      amount: "€3 100 / mois",
      label: t("v2.problem.p3") || "Dépenses IA hors contrat",
    },
    {
      num: "04",
      amount: "€4 700 / mois",
      label: t("v2.problem.p4") || "Cloud mal dimensionné non corrigé",
    },
  ];

  return (
    <section style={{ background: C.paper, padding: "96px 0" }}>
      <div className="gt-container" style={{ padding: "0 24px" }}>
        {/* Section header */}
        <div style={{ marginBottom: "64px" }}>
          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.red,
              marginBottom: "12px",
            }}
          >
            {t("section.problem") || "LE PROBLÈME"}
          </div>
          <div style={{ display: "flex", alignItems: "start", gap: "40px" }}>
            <h2
              style={{
                fontSize: "clamp(40px, 4.5vw, 64px)",
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
                color: C.ink,
                flex: 1,
                maxWidth: "520px",
              }}
            >
              {t("v2.problem.title") ||
                "Le CFO ne sait pas.\u00a0Le CTO ne sait pas.\u00a0Personne ne regarde."}
            </h2>
            <p
              style={{
                flex: 1,
                fontSize: "17px",
                lineHeight: 1.65,
                color: C.ink2,
                paddingTop: "8px",
                maxWidth: "440px",
              }}
            >
              {t("v2.problem.body") ||
                "Les dépenses SaaS, IA et Cloud s'accumulent dans des angles morts organisationnels. Aucun département n'a la visibilité complète. Ghost Tax cartographie l'exposition totale en 48 heures."}
            </p>
          </div>
        </div>

        {/* Problem items — editorial numbered list */}
        <div
          style={{
            borderTop: `2px solid ${C.ink}`,
          }}
        >
          {problems.map(({ num, amount, label }, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr auto",
                alignItems: "center",
                gap: "32px",
                padding: "24px 0",
                borderBottom: `1px solid ${C.rule}`,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--gt-font-mono)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: C.ink3,
                  letterSpacing: "0.1em",
                }}
              >
                {num}
              </div>
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 500,
                  color: C.ink,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "var(--gt-font-mono)",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: C.red,
                  whiteSpace: "nowrap",
                }}
              >
                {amount}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "48px",
            padding: "28px 32px",
            background: C.obsidian,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(141,155,181,0.7)",
            }}
          >
            {t("v2.problem.never_zero") || "PIPELINE AUTONOME 21 PHASES"}
          </div>
          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "20px",
              fontWeight: 700,
              color: C.green,
            }}
          >
            {t("v2.problem.zero_stat") || "AUCUNE N'A RETOURNÉ ZÉRO EXPOSITION"}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Pipeline Section ─────────────────────────────────────────────────────────
const PipelineSection: React.FC = () => {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);

  const phases = [
    ["01", "Enrichment",        "Contexte entreprise complet"],
    ["02", "Context",           "Cartographie des dépenses"],
    ["03", "Exposure",          "Détection des fuites"],
    ["04", "Loss Velocity",     "Vitesse de perte journalière"],
    ["05", "Cost of Delay",     "Coût du retard cumulé"],
    ["06", "Diagnosis",         "Diagnostic causal"],
    ["07", "Causal Graph",      "Graphe de causalité"],
    ["08", "Proof Engine",      "Moteur de preuves"],
    ["09", "Proof",             "Preuves documentées"],
    ["10", "Market Memory",     "Mémoire marché"],
    ["11", "Peer Comparison",   "Comparaison pairs sectoriels"],
    ["12", "Drift Monitor",     "Surveillance dérive"],
    ["13", "Momentum",          "Momentum correctif"],
    ["14", "Scenarios",         "Modélisation scénarios"],
    ["15", "Counterfactual",    "Contrefactuel quantifié"],
    ["16", "Decision Friction", "Friction décisionnelle"],
    ["17", "Decision Pressure", "Pression décisionnelle"],
    ["18", "Negotiation",       "Intelligence négociation"],
    ["19", "Confidence",        "Score de confiance"],
    ["20", "Decision Pack",     "Pack décisionnel complet"],
    ["21", "Exec Snapshot",     "Résumé exécutif final"],
  ];

  return (
    <section style={{ background: C.cream, padding: "96px 0" }}>
      <div className="gt-container" style={{ padding: "0 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "56px" }}>
          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.ink3,
              marginBottom: "12px",
            }}
          >
            {t("section.pipeline") || "PIPELINE INTELLIGENCE"}
          </div>
          <div
            style={{
              borderTop: `2px solid ${C.ink}`,
              borderBottom: `1px solid ${C.ink}`,
              padding: "16px 0",
              marginBottom: "0",
            }}
          >
            <h2
              style={{
                fontSize: "clamp(36px, 4vw, 56px)",
                fontWeight: 900,
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
                color: C.ink,
              }}
            >
              {t("v2.pipeline.title") || "21 phases. Preuve avant conclusion."}
            </h2>
          </div>
        </div>

        {/* 7×3 grid of phases */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "0",
            border: `1px solid ${C.ink}`,
          }}
        >
          {phases.map(([num, name, desc], i) => {
            const isLast = i === 20;
            const isActive = active === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                style={{
                  padding: "20px 14px",
                  borderRight: (i % 7 < 6) ? `1px solid ${C.rule}` : "none",
                  borderBottom: i < 14 ? `1px solid ${C.rule}` : "none",
                  background: isActive
                    ? C.obsidian
                    : isLast
                    ? C.ink
                    : C.paper,
                  cursor: "pointer",
                  transition: "background 150ms ease",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--gt-font-mono)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: isActive
                      ? C.cyan
                      : isLast
                      ? C.green
                      : C.red,
                    marginBottom: "6px",
                  }}
                >
                  {num}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: isActive || isLast ? C.parchment : C.ink,
                    marginBottom: "4px",
                    lineHeight: 1.2,
                  }}
                >
                  {name}
                </div>
                {isActive && (
                  <div
                    style={{
                      fontFamily: "var(--gt-font-mono)",
                      fontSize: "10px",
                      color: "rgba(141,155,181,0.65)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "32px",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "12px",
            color: C.ink3,
            letterSpacing: "0.08em",
          }}
        >
          ↑ {t("v2.pipeline.hover_hint") || "Survolez chaque phase pour le détail"}
        </div>
      </div>
    </section>
  );
};

// ─── Proof Section ────────────────────────────────────────────────────────────
const ProofSection: React.FC = () => {
  const { t } = useI18n();

  return (
    <section style={{ background: C.obsidian, padding: "80px 0" }}>
      <div className="gt-container" style={{ padding: "0 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "64px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--gt-font-mono)",
                fontSize: "11px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.cyan,
                marginBottom: "16px",
              }}
            >
              {t("v2.proof.label") || "ZÉRO ACCÈS SYSTÈME"}
            </div>
            <h2
              style={{
                fontSize: "clamp(36px, 4vw, 52px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: C.parchment,
                marginBottom: "24px",
              }}
            >
              {t("v2.proof.title") ||
                "Pas d'accès. Pas d'intégration. Juste des preuves."}
            </h2>
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.65,
                color: "rgba(228,233,244,0.65)",
                marginBottom: "32px",
              }}
            >
              {t("v2.proof.body") ||
                "Ghost Tax reconstruit votre exposition financière à partir de signaux publics et sectoriels. Aucun accès à vos systèmes internes. RGPD-safe. Résultat en 48 heures."}
            </p>
            <Link
              href="/intel"
              style={{
                display: "inline-block",
                padding: "13px 28px",
                border: `1px solid ${C.cyan}`,
                color: C.cyan,
                fontFamily: "var(--gt-font-mono)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textDecoration: "none",
                textTransform: "uppercase",
              }}
            >
              {t("v2.proof.cta") || "→ VOIR UN RAPPORT EXEMPLE"}
            </Link>
          </div>

          <div
            style={{
              border: `1px solid rgba(255,255,255,0.07)`,
              padding: "28px",
              background: C.obs2,
            }}
          >
            <div
              style={{
                fontFamily: "var(--gt-font-mono)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: C.cyan,
                marginBottom: "20px",
              }}
            >
              LIVRABLES — DECISION PACK
            </div>
            {[
              ["EXPOSITION TOTALE",         "Quantifiée en EUR/an", C.green],
              ["VITESSE DE PERTE",          "Calculée en EUR/jour", C.red],
              ["COÛT DU RETARD",            "Composé, non linéaire", C.gold],
              ["PREUVES DOCUMENTÉES",       "Signaux + sources", C.cyan],
              ["SCÉNARIOS",                 "3 niveaux de correction", C.parchment],
              ["PACK EXÉCUTIF",             "Prêt pour le board", C.parchment],
            ].map(([label, val, color], i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "10px 0",
                  borderBottom: `1px solid rgba(255,255,255,0.05)`,
                  gap: "16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--gt-font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.1em",
                    color: "rgba(141,155,181,0.55)",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--gt-font-mono)",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: color as string,
                    textAlign: "right",
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Pricing Section ──────────────────────────────────────────────────────────
const PricingSection: React.FC = () => {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const handleRailA = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "demo.com", rail: "A" }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const rails = [
    {
      tag:   t("price.free_name") || "SCAN GRATUIT",
      price: "€0",
      sub:   t("v2.price.free_sub") || "Première cartographie",
      features: [
        t("v2.price.free_f1") || "Scan du domaine",
        t("v2.price.free_f2") || "Estimation d'exposition",
        t("v2.price.free_f3") || "Signaux échantillon",
      ],
      cta: t("v2.price.free_cta") || "Lancer le scan",
      ctaHref: "/intel",
      highlight: false,
    },
    {
      tag:   t("price.rail_a_name") || "RAIL A — DÉTECTION",
      price: "€490",
      sub:   t("v2.price.a_sub") || "Rapport complet one-shot",
      features: [
        t("v2.price.a_f1") || "21 phases d'analyse",
        t("v2.price.a_f2") || "Protocole correctif complet",
        t("v2.price.a_f3") || "Pack décisionnel board-ready",
      ],
      cta: t("v2.price.a_cta") || "Débloquer le protocole",
      ctaAction: handleRailA,
      highlight: true,
    },
    {
      tag:   t("price.rail_b_name") || "RAIL B+C — MONITORING",
      price: t("v2.price.custom") || "Sur devis",
      sub:   t("v2.price.bc_sub") || "Surveillance continue",
      features: [
        t("v2.price.bc_f1") || "Monitoring mensuel",
        t("v2.price.bc_f2") || "Plan de stabilisation",
        t("v2.price.bc_f3") || "Support institutionnel dédié",
      ],
      cta: t("v2.price.bc_cta") || "Demander un devis",
      ctaHref: "mailto:audits@ghost-tax.com",
      highlight: false,
    },
  ];

  return (
    <section style={{ background: C.parchment, padding: "96px 0" }}>
      <div className="gt-container" style={{ padding: "0 24px" }}>
        {/* Header */}
        <div
          style={{
            borderTop: `2px solid ${C.ink}`,
            borderBottom: `1px solid ${C.ink}`,
            padding: "20px 0",
            marginBottom: "56px",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: "var(--gt-font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: C.ink3,
            }}
          >
            {t("section.pricing") || "TARIFICATION"}
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 48px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: C.ink,
            }}
          >
            {t("v2.pricing.title") || "De la détection au contrôle."}
          </h2>
        </div>

        {/* Rail cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0",
            border: `1px solid rgba(36,48,78,0.50)`,
          }}
        >
          {rails.map((rail, i) => (
            <div
              key={i}
              style={{
                padding: "36px 28px",
                borderRight: i < 2 ? `1px solid rgba(36,48,78,0.40)` : "none",
                background: rail.highlight ? C.obs3 : C.paper,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {rail.highlight && (
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "0",
                    height: "4px",
                    background: C.red,
                  }}
                />
              )}

              <div
                style={{
                  fontFamily: "var(--gt-font-mono)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: rail.highlight ? C.cyan : C.ink3,
                  marginBottom: "20px",
                }}
              >
                {rail.tag}
              </div>

              <div
                style={{
                  fontSize: "48px",
                  fontFamily: "var(--gt-font-mono)",
                  fontWeight: 700,
                  color: C.ink,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginBottom: "8px",
                }}
              >
                {rail.price}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: rail.highlight ? "rgba(228,233,244,0.5)" : C.ink3,
                  marginBottom: "28px",
                }}
              >
                {rail.sub}
              </div>

              <div
                style={{
                  borderTop: `1px solid ${rail.highlight ? "rgba(255,255,255,0.1)" : C.rule}`,
                  paddingTop: "20px",
                  marginBottom: "28px",
                  flex: 1,
                }}
              >
                {rail.features.map((f, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: "14px",
                      color: rail.highlight ? "rgba(228,233,244,0.8)" : C.ink2,
                      padding: "7px 0",
                      borderBottom: `1px solid ${rail.highlight ? "rgba(255,255,255,0.05)" : C.rule}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--gt-font-mono)",
                        fontSize: "12px",
                        color: rail.highlight ? C.green : C.red,
                        fontWeight: 700,
                      }}
                    >
                      →
                    </span>
                    {f}
                  </div>
                ))}
              </div>

              {rail.ctaAction ? (
                <button
                  onClick={rail.ctaAction}
                  disabled={isLoading}
                  style={{
                    padding: "13px 0",
                    background: C.parchment,
                    color: C.ink,
                    border: "none",
                    fontFamily: "var(--gt-font-mono)",
                    fontWeight: 700,
                    fontSize: "12px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? "..." : rail.cta}
                </button>
              ) : (
                <Link
                  href={rail.ctaHref || "#"}
                  style={{
                    display: "block",
                    padding: "13px 0",
                    background: "transparent",
                    color: C.ink,
                    border: `1px solid ${C.ink}`,
                    fontFamily: "var(--gt-font-mono)",
                    fontWeight: 700,
                    fontSize: "12px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  {rail.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "24px",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "12px",
            color: C.ink3,
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          {t("v2.pricing.note") ||
            "Paiement unique Rail A — pas d'abonnement caché. Livraison sous 48h."}
        </div>
      </div>
    </section>
  );
};

// ─── Final CTA ────────────────────────────────────────────────────────────────
const FinalCTA: React.FC = () => {
  const { t } = useI18n();
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCTA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), rail: "A" }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      style={{
        background: C.obsidian,
        padding: "96px 0",
        borderTop: `4px solid ${C.red}`,
      }}
    >
      <div
        className="gt-container"
        style={{
          padding: "0 24px",
          textAlign: "center",
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontFamily: "var(--gt-font-mono)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: C.cyan,
            marginBottom: "20px",
          }}
        >
          {t("v2.cta.label") || "DERNIÈRE CHANCE"}
        </div>

        <h2
          style={{
            fontSize: "clamp(48px, 6vw, 80px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
            color: C.ink,
            marginBottom: "24px",
          }}
        >
          {t("v2.cta.h2_line1") || "VOTRE EXPOSITION"}
          <br />
          <span style={{ color: C.red }}>
            {t("v2.cta.h2_line2") || "CROÎT CHAQUE JOUR."}
          </span>
        </h2>

        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.6,
            color: "rgba(228,233,244,0.65)",
            marginBottom: "40px",
            maxWidth: "520px",
            margin: "0 auto 40px",
          }}
        >
          {t("v2.cta.body") ||
            "€890 perdus en moyenne par jour sans correction. 48h pour avoir la preuve et le protocole."}
        </p>

        <form
          onSubmit={handleCTA}
          style={{
            display: "flex",
            gap: "0",
            maxWidth: "520px",
            margin: "0 auto",
            border: `1px solid rgba(255,255,255,0.2)`,
          }}
        >
          <input
            type="text"
            placeholder="votre-entreprise.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            style={{
              flex: 1,
              padding: "16px 20px",
              border: "none",
              background: "rgba(255,255,255,0.05)",
              color: C.parchment,
              fontSize: "15px",
              fontFamily: "var(--gt-font-mono)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "16px 28px",
              background: C.red,
              color: C.parchment,
              border: "none",
              fontFamily: "var(--gt-font-mono)",
              fontWeight: 700,
              fontSize: "13px",
              letterSpacing: "0.1em",
              cursor: isLoading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "..." : t("v2.cta.btn") || "DÉTECTER MAINTENANT"}
          </button>
        </form>

        <div
          style={{
            marginTop: "32px",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "11px",
            color: "rgba(141,155,181,0.45)",
            letterSpacing: "0.1em",
          }}
        >
          ghost-tax.com · DECISION INTELLIGENCE · 2026
        </div>
      </div>
    </section>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export function HomePageClient() {
  return (
    <main
      style={{
        background: C.parchment,
        fontFamily: "var(--gt-font-sans)",
      }}
    >
      {/* Global @graph JSON-LD — Organization, WebSite, WebApplication, Product, Service */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageGraph) }}
      />
      <HeroSection />
      <StatsStrip />
      <ProblemSection />
      <PipelineSection />
      <ProofSection />
      <PricingSection />
      <FinalCTA />
    </main>
  );
}
