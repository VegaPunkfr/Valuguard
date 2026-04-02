"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const SURFACE_KEYS = [
  { href: "/intel-benchmarks/saas-ai-cost-exposure", prefix: "ib.surface1" },
  { href: "/intel-benchmarks/shadow-ai-governance", prefix: "ib.surface2" },
  { href: "/intel-benchmarks/cfo-technology-spend-guide", prefix: "ib.surface3" },
] as const;

export default function IntelBenchmarksContent() {
  const { t } = useI18n();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060912",
        color: "#1a1a1a",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 20px" }}>
        <Link
          href="/"
          style={{
            fontSize: 11,
            color: "#64748B",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 24,
          }}
        >
          &larr; ghost-tax.com
        </Link>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          {t("ib.title")}
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#64748B",
            lineHeight: 1.6,
            marginBottom: 8,
            maxWidth: 600,
          }}
        >
          {t("ib.subtitle")}
        </p>

        <p
          style={{
            fontSize: 13,
            color: "#94A3B8",
            lineHeight: 1.5,
            marginBottom: 40,
            maxWidth: 600,
          }}
        >
          {t("ib.linkIntro")}{" "}
          <Link
            href="/intel"
            style={{ color: "#3b82f6", textDecoration: "underline" }}
          >
            {t("ib.decisionRoom")}
          </Link>
          {t("ib.methodologyIntro")}{" "}
          <Link
            href="/methodology"
            style={{ color: "#3b82f6", textDecoration: "underline" }}
          >
            {t("ib.transparently")}
          </Link>
          .
        </p>

        {/* Surface cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 48,
          }}
        >
          {SURFACE_KEYS.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              style={{
                display: "block",
                padding: "20px 22px",
                borderRadius: 10,
                background: "#121828",
                border: "1px solid #E2E8F0",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.2s, transform 0.15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    lineHeight: 1.3,
                  }}
                >
                  {t(`${surface.prefix}.title`)}
                </h2>
                <span
                  style={{
                    fontSize: 14,
                    color: "#94A3B8",
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  &rarr;
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#64748B",
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              >
                {t(`${surface.prefix}.desc`)}
              </p>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "#94A3B8",
                  letterSpacing: "0.04em",
                }}
              >
                {t(`${surface.prefix}.audience`)}
              </span>
            </Link>
          ))}
        </div>

        {/* Trust surface cross-links */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 8,
            background: "#121828",
            border: "1px solid #E2E8F0",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "#94A3B8",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {t("ib.related")}
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link
              href="/methodology"
              style={{
                fontSize: 12,
                color: "#3b82f6",
                textDecoration: "none",
              }}
            >
              {t("ib.relatedMethodology")} &rarr;
            </Link>
            <Link
              href="/security-vault"
              style={{
                fontSize: 12,
                color: "#3b82f6",
                textDecoration: "none",
              }}
            >
              {t("ib.relatedSecurity")} &rarr;
            </Link>
            <Link
              href="/procurement"
              style={{
                fontSize: 12,
                color: "#3b82f6",
                textDecoration: "none",
              }}
            >
              {t("ib.relatedProcurement")} &rarr;
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <p
            style={{
              fontSize: 13,
              color: "#94A3B8",
              marginBottom: 12,
            }}
          >
            {t("ib.ctaQuestion")}
          </p>
          <Link
            href="/intel"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              borderRadius: 6,
              background: "#3b82f6",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            {t("ib.ctaButton")}
          </Link>
        </div>
      </div>
    </div>
  );
}
