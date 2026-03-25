"use client";

import { useI18n } from "@/lib/i18n";
import { f } from "@/lib/tokens";

export default function Footer() {
  const { t } = useI18n();

  const columns = [
    {
      title: t("footer.col.product") || "PRODUCT",
      links: [
        { label: t("footer.link.intel") || "Decision Room", href: "/intel" },
        { label: t("footer.link.ghosttax") || "Ghost Tax Calculator", href: "/ghost-tax" },
        { label: t("footer.link.platform") || "Platform", href: "/platform" },
        { label: t("footer.link.pricing") || "Pricing", href: "/pricing" },
      ],
    },
    {
      title: t("footer.col.resources") || "RESOURCES",
      links: [
        { label: t("footer.link.methodology") || "Methodology", href: "/methodology" },
        { label: t("footer.link.faq") || "FAQ", href: "/faq" },
        { label: t("footer.link.caseStudies") || "Case Studies", href: "/case-studies" },
      ],
    },
    {
      title: t("footer.col.company") || "COMPANY",
      links: [
        { label: t("footer.link.about") || "About", href: "/about" },
        { label: t("footer.link.contact") || "Contact", href: "/contact" },
        { label: t("footer.link.vault") || "Security Vault", href: "/security-vault" },
      ],
    },
    {
      title: t("footer.col.legal") || "LEGAL",
      links: [
        { label: t("footer.link.privacy") || "Privacy Policy", href: "/legal/privacy" },
        { label: t("footer.link.terms") || "Terms of Service", href: "/legal/terms" },
      ],
    },
  ];

  return (
    <footer style={{ background: "#0F172A", color: "#94A3B8", marginTop: 0 }}>

      {/* CTA Band */}
      <div style={{
        background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
        padding: "64px 24px", textAlign: "center",
      }}>
        <h3 style={{ fontSize: 24, fontWeight: 700, color: "#F8FAFC", marginBottom: 16, letterSpacing: "-0.02em" }}>
          {t("footer.cta.headline") || "See what your IT spend is really costing you."}
        </h3>
        <a
          href="/intel"
          style={{
            display: "inline-block", padding: "14px 32px", fontSize: 15, fontWeight: 600,
            background: "#3b82f6", color: "#FFFFFF", borderRadius: 8, textDecoration: "none",
            transition: "all 200ms",
          }}
        >
          {t("hero.cta.main") || "See my exposure"}
        </a>
      </div>

      {/* Stats row */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "20px 24px",
        display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center", justifyContent: "center",
      }}>
        {[
          { val: "200+", label: t("footer.stat.analyses") || "analyses delivered" },
          { val: "340k\u20ac", label: t("footer.stat.avgExposure") || "avg exposure found" },
          { val: "48h", label: t("footer.stat.delivery") || "avg delivery" },
          { val: "94%", label: t("footer.stat.actionRate") || "client action rate" },
        ].map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: f.mono, fontSize: 14, fontWeight: 700, color: "#F8FAFC" }}>{s.val}</span>
            <span style={{ fontSize: 11, color: "#64748B", fontFamily: f.mono }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div className="gt-container" style={{ padding: "48px 24px 32px" }}>
        <div className="gt-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: 32, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <img src="/favicon.svg" alt="Ghost Tax" width={28} height={28} style={{ borderRadius: 7 }} />
              <span style={{ fontSize: 15, fontFamily: f.mono, fontWeight: 700, letterSpacing: ".04em", color: "#F8FAFC" }}>
                Ghost Tax
              </span>
            </div>
            <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, maxWidth: 280, marginBottom: 20 }}>
              {t("footer.desc") || "Decision Intelligence for hidden IT financial exposure."}
            </p>
            <a href="mailto:audits@ghost-tax.com" style={{ fontSize: 13, fontFamily: f.mono, color: "#94A3B8", textDecoration: "none" }}>
              audits@ghost-tax.com
            </a>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <p style={{ fontFamily: f.mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F8FAFC", marginBottom: 16 }}>{col.title}</p>
              {col.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="gt-footer-link-dark"
                  style={{
                    display: "block", fontSize: 14, color: "#94A3B8",
                    marginBottom: 10, textDecoration: "none", transition: "color 150ms",
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingTop: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["SOC 2", "Zero-Knowledge", "GDPR", "AES-256"].map((b) => (
              <span key={b} style={{
                fontFamily: f.mono, fontSize: 10, fontWeight: 600,
                letterSpacing: "0.06em", padding: "4px 10px", borderRadius: 4,
                background: "rgba(255,255,255,0.04)", color: "#64748B",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>{b}</span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#475569", fontFamily: f.mono }}>
            {t("footer.copyright") || "\u00a9 2026 Ghost Tax SAS. All rights reserved."}
          </p>
        </div>
      </div>

      <style>{`
        .gt-footer-link-dark:hover { color: #F8FAFC !important; }
        @media (max-width: 768px) {
          .gt-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .gt-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
