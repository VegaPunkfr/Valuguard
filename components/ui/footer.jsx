"use client";
import { useState } from "react";

/*  VALUGUARD — TRUST FOOTER (US 2026)
    Mandatory legal links + trust signals for US CFO audience.
    SOC2 Readiness, Privacy Policy, Terms of Service.
    Drop-in at bottom of every page.
    100% US English. Zero French. */

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
  { label: "Ghost Tax Audit", href: "/en-us/estimator" },
  { label: "Methodology", href: "/en-us/methodology" },
  { label: "Sample Report", href: "/en-us/sample-report" },
  { label: "Pricing", href: "/en-us/pricing" },
];

var TRUST_LINKS = [
  { label: "Security Vault", href: "/en-us/security-vault" },
  { label: "SOC2 Readiness", href: "/en-us/security-vault#soc2" },
  { label: "Privacy Policy", href: "/en-us/privacy" },
  { label: "Terms of Service", href: "/en-us/terms" },
];

var RESOURCE_LINKS = [
  { label: "FinOps Glossary", href: "/en-us/glossary" },
  { label: "Leak Patterns Library", href: "/en-us/leak-patterns" },
  { label: "ROI Calculator", href: "/en-us/roi-report" },
  { label: "Blog", href: "/en-us/blog" },
];

var BADGES = [
  { icon: "🛡", text: "SOC2 Type II Ready" },
  { icon: "🔐", text: "Zero-Knowledge Audit" },
  { icon: "🇺🇸", text: "US Data Residency" },
  { icon: "⏱", text: "30-Day Auto-Delete" },
  { icon: "🔒", text: "AES-256 Encryption" },
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
            AI Spend Leak Monitor. We reveal where money leaks,
            how much it costs, and what to fix first.
          </p>
          <p style={{
            fontSize: 10, color: T3, marginTop: 10,
            fontFamily: MO,
          }}>
            security@valuguard.com
          </p>
        </div>

        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Trust & Legal" links={TRUST_LINKS} />
        <FooterColumn title="Resources" links={RESOURCE_LINKS} />
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
          © {YEAR} Valuguard Inc. All rights reserved. Delaware, USA.
        </p>
      </div>
    </footer>
  );
}
