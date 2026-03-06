"use client";
import { useState } from "react";

/*  VALUGUARD — FOOTER DE CONFIANCE (FR 2026) */

var V = "#060912";
var A = "#3b82f6";
var AH = "#60a5fa";
var T1 = "#e0e6f2";
var T2 = "#8d9bb5";
var T3 = "#55637d";
var TL = "#34d399";
var BD = "rgba(36,48,78,0.32)";
var MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
var SA = "system-ui,-apple-system,sans-serif";

var YEAR = new Date().getFullYear();

var PRODUCT_LINKS = [
  { label: "Audit Ghost Tax", href: "/estimator" },
  { label: "M\u00e9thodologie", href: "/methodology" },
  { label: "Exemple de rapport", href: "/sample-report" },
  { label: "Tarifs", href: "/#pricing" },
];

var TRUST_LINKS = [
  { label: "Coffre-fort S\u00e9curit\u00e9", href: "/security-vault" },
  { label: "Architecture SOC2", href: "/security-vault" },
  { label: "Politique de confidentialit\u00e9", href: "/security-vault" },
  { label: "Conditions d'utilisation", href: "/security-vault" },
];

var RESOURCE_LINKS = [
  { label: "Analyse Peer-Gap", href: "/peer-gap" },
  { label: "Rapport ROI", href: "/roi-report" },
  { label: "Estimateur", href: "/estimator" },
];

var BADGES = [
  { icon: "\u{1F6E1}", text: "SOC2 Type II Ready" },
  { icon: "\u{1F510}", text: "Audit Zero-Knowledge" },
  { icon: "\u{1F1EA}\u{1F1FA}", text: "H\u00e9bergement EU" },
  { icon: "\u23F1", text: "Purge auto 30 jours" },
  { icon: "\u{1F512}", text: "Chiffrement AES-256" },
];

function FooterColumn(props) {
  return (
    <div>
      <p style={{
        fontSize: 8, fontFamily: MO, color: T3,
        letterSpacing: ".08em", textTransform: "uppercase",
        marginBottom: 10, fontWeight: 600,
      }}>
        {props.title}
      </p>
      {props.links.map(function (link) {
        return (
          <a
            key={link.label}
            href={link.href}
            style={{
              display: "block", fontSize: 11, color: T2,
              textDecoration: "none", marginBottom: 7,
              transition: "color 0.12s",
            }}
            onMouseEnter={function (e) { e.currentTarget.style.color = T1; }}
            onMouseLeave={function (e) { e.currentTarget.style.color = T2; }}
          >
            {link.label}
          </a>
        );
      })}
    </div>
  );
}

export default function TrustFooter() {
  return (
    <footer style={{
      borderTop: "1px solid " + BD,
      padding: "36px 0 24px",
      fontFamily: SA,
      color: T1,
    }}>
      {/* ── Main grid ────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
        gap: 32,
        marginBottom: 28,
      }}>
        {/* Brand column */}
        <div>
          <span style={{
            fontSize: 13, fontFamily: MO, fontWeight: 700,
            letterSpacing: ".06em", color: A,
          }}>
            VALUGUARD
          </span>
          <p style={{
            fontSize: 11, color: T3, marginTop: 8,
            maxWidth: 220, lineHeight: 1.55,
          }}>
            Moniteur de fuites IT & IA. Nous r&eacute;v&eacute;lons o&ugrave; l'argent fuit,
            combien cela co&ucirc;te, et quoi corriger en priorit&eacute;.
          </p>
          <p style={{
            fontSize: 10, color: T3, marginTop: 10,
            fontFamily: MO,
          }}>
            security@valuguard.com
          </p>
        </div>

        <FooterColumn title="Produit" links={PRODUCT_LINKS} />
        <FooterColumn title="Confiance" links={TRUST_LINKS} />
        <FooterColumn title="Ressources" links={RESOURCE_LINKS} />
      </div>

      {/* ── Trust shield bar ─────────────────── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 18,
        borderTop: "1px solid " + BD,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {BADGES.map(function (b) {
            return (
              <span
                key={b.text}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 8, color: T3, fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 11 }}>{b.icon}</span>
                {b.text}
              </span>
            );
          })}
        </div>

        <p style={{ fontSize: 8, color: T3, fontFamily: MO }}>
          &copy; {YEAR} Valuguard SAS. Tous droits r&eacute;serv&eacute;s.
        </p>
      </div>
    </footer>
  );
}
