"use client";

import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

export default function Footer() {
  const { t } = useI18n();

  const columns = [
    {
      title: t("footer.col.product"),
      links: [
        { label: t("footer.link.intel"), href: "/intel" },
        { label: t("footer.link.ghosttax"), href: "/ghost-tax" },
        { label: t("footer.link.platform"), href: "/platform" },
        { label: t("footer.link.pricing"), href: "/pricing" },
      ],
    },
    {
      title: t("footer.col.resources"),
      links: [
        { label: t("footer.link.methodology"), href: "/methodology" },
        { label: t("footer.link.benchmarks"), href: "/intel-benchmarks" },
        { label: t("footer.link.faq"), href: "/faq" },
        { label: t("footer.link.sample"), href: "/sample-report" },
      ],
    },
    {
      title: t("footer.col.company"),
      links: [
        { label: t("footer.link.about"), href: "/about" },
        { label: t("footer.link.contact"), href: "/contact" },
        { label: t("footer.link.vault"), href: "/security-vault" },
      ],
    },
    {
      title: t("footer.col.legal"),
      links: [
        { label: t("footer.link.privacy"), href: "/legal/privacy" },
        { label: t("footer.link.terms"), href: "/legal/terms" },
      ],
    },
  ];

  return (
    <footer style={{ borderTop: "1px solid " + c.border, marginTop: 80, background: "rgba(0,0,0,0.15)" }}>
      <div className="gt-container" style={{ padding: "48px 24px 32px" }}>
        <div className="gt-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: 32, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: c.accentBg, border: "1px solid " + c.accentBd,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, fontFamily: f.mono, color: c.accent,
              }}>
                GT
              </div>
              <span style={{ fontSize: 15, fontFamily: f.mono, fontWeight: 700, letterSpacing: ".04em", color: c.accent }}>
                Ghost Tax
              </span>
            </div>
            <p style={{ fontSize: 14, color: c.text3, lineHeight: 1.7, maxWidth: 280, marginBottom: 20 }}>
              {t("footer.desc")}
            </p>
            <a href="mailto:audits@ghost-tax.com" style={{ fontSize: 13, fontFamily: f.mono, color: c.text2, textDecoration: "none" }}>
              audits@ghost-tax.com
            </a>
          </div>

          {/* Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <p className="gt-label" style={{ marginBottom: 14 }}>{col.title}</p>
              {col.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="gt-footer-link"
                  style={{
                    display: "block", fontSize: 14, color: c.text2,
                    marginBottom: 10, textDecoration: "none", transition: "color 150ms",
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: "1px solid " + c.border,
          paddingTop: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[t("footer.badge1"), t("footer.badge2"), t("footer.badge3"), t("footer.badge4")].map((b) => (
              <span key={b} className="gt-badge gt-badge--muted">{b}</span>
            ))}
          </div>
          <p style={{ fontSize: 11, color: c.text3, fontFamily: f.mono }}>
            {t("footer.copyright")}
          </p>
        </div>
      </div>

      <style>{`
        .gt-footer-link:hover { color: ${c.text1} !important; }
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
