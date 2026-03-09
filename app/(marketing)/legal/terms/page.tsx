"use client";

import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

export default function TermsPage() {
  const { t } = useI18n();

  const sections = [
    { title: t("terms.s1.title"), content: t("terms.s1.content") },
    { title: t("terms.s2.title"), content: t("terms.s2.content") },
    { title: t("terms.s3.title"), content: t("terms.s3.content") },
    { title: t("terms.s4.title"), content: t("terms.s4.content") },
    { title: t("terms.s5.title"), content: t("terms.s5.content") },
    { title: t("terms.s6.title"), content: t("terms.s6.content") },
    { title: t("terms.s7.title"), content: t("terms.s7.content") },
    { title: t("terms.s8.title"), content: t("terms.s8.content") },
    { title: t("terms.s9.title"), content: t("terms.s9.content") },
    { title: t("terms.s10.title"), content: t("terms.s10.content") },
  ];

  return (
    <div style={{ minHeight: "100vh", color: c.text1 }}>
      <div className="gt-container-md" style={{ padding: "80px 24px 0" }}>
        <p className="gt-section-label">{t("terms.label")}</p>

        <h1
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: 12,
          }}
        >
          {t("terms.title")}
        </h1>

        <p
          style={{
            fontSize: 14,
            color: c.text3,
            fontFamily: f.mono,
            marginBottom: 40,
          }}
        >
          {t("terms.updated")}
        </p>

        {sections.map(function (s, idx) {
          return (
            <div key={idx} style={{ marginBottom: 36 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 12,
                  letterSpacing: "-0.02em",
                }}
              >
                {idx + 1}. {s.title}
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: c.text2,
                  lineHeight: 1.8,
                  whiteSpace: "pre-line",
                }}
              >
                {s.content}
              </p>
            </div>
          );
        })}

        <div
          style={{
            borderTop: `1px solid ${c.border}`,
            paddingTop: 24,
            marginTop: 20,
          }}
        >
          <p style={{ fontSize: 14, color: c.text3, lineHeight: 1.7 }}>
            {t("terms.contact")}
          </p>
        </div>
      </div>
    </div>
  );
}
