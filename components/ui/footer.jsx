"use client";

import { useI18n } from "@/lib/i18n";

var V = "#060912";
var A = "#3b82f6";
var T1 = "#e0e6f2";
var T2 = "#8d9bb5";
var T3 = "#55637d";
var TL = "#34d399";
var BD = "rgba(36,48,78,0.32)";
var MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
var SA = "system-ui,-apple-system,sans-serif";

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
  var { t } = useI18n();

  var PRODUCT_LINKS = [
    { label: t("footer.link.audit"), href: "/estimator" },
    { label: t("footer.link.methodology"), href: "/methodology" },
    { label: t("footer.link.sample"), href: "/sample-report" },
    { label: t("footer.link.pricing"), href: "/#pricing" },
  ];

  var TRUST_LINKS = [
    { label: t("footer.link.vault"), href: "/security-vault" },
    { label: t("footer.link.soc2"), href: "/security-vault" },
    { label: t("footer.link.privacy"), href: "/security-vault" },
    { label: t("footer.link.terms"), href: "/security-vault" },
  ];

  var RESOURCE_LINKS = [
    { label: t("footer.link.peergap"), href: "/peer-gap" },
    { label: t("footer.link.roi"), href: "/roi-report" },
    { label: t("footer.link.estimator"), href: "/estimator" },
  ];

  var BADGES = [
    { icon: "\u{1F6E1}", text: t("footer.badge1") },
    { icon: "\u{1F510}", text: t("footer.badge2") },
    { icon: "\u{1F1FA}\u{1F1F8}", text: t("footer.badge3") },
    { icon: "\u23F1", text: t("footer.badge4") },
    { icon: "\u{1F512}", text: "AES-256" },
  ];

  return (
    <footer style={{
      borderTop: "1px solid " + BD,
      padding: "36px 0 24px",
      fontFamily: SA,
      color: T1,
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
        gap: 32,
        marginBottom: 28,
      }}>
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
            {t("footer.desc")}
          </p>
          <p style={{
            fontSize: 10, color: T3, marginTop: 10,
            fontFamily: MO,
          }}>
            security@valuguard.com
          </p>
        </div>

        <FooterColumn title={t("footer.product")} links={PRODUCT_LINKS} />
        <FooterColumn title={t("footer.trust")} links={TRUST_LINKS} />
        <FooterColumn title={t("footer.resources")} links={RESOURCE_LINKS} />
      </div>

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
          {t("footer.copyright")}
        </p>
      </div>
    </footer>
  );
}
