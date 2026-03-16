"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { trackEvent, EVENTS } from "@/lib/events";
import { c, f, inset } from "@/lib/tokens";

/* ── GHOST TAX — PROCUREMENT & DECISION SCOPE ────────────────────────
   Buyer-enablement surface for procurement, finance, and security reviewers.
   Combines vendor review material with decision scope clarity.
   Designed to be forwarded internally or printed. */

function Lab({ children }: { children: React.ReactNode }) {
  return <span className="gt-section-label">{children}</span>;
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 19,
        fontWeight: 700,
        color: c.text1,
        lineHeight: 1.2,
        letterSpacing: "-.01em",
        marginBottom: 10,
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.65, marginBottom: 12 }}>{children}</p>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="gt-panel" style={{ padding: 22, ...style }}>
      {children}
    </div>
  );
}

function StageRow({
  stage,
  name,
  price,
  scope,
  data,
  delivery,
}: {
  stage: string;
  name: string;
  price: string;
  scope: string;
  data: string;
  delivery: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 1.2fr 0.8fr 1.4fr 1.2fr 1fr",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 8,
        background: "#F8FAFC",
        border: `1px solid ${c.border}`,
        alignItems: "start",
        fontSize: 11,
      }}
    >
      <span style={{ fontFamily: f.mono, fontWeight: 700, color: c.accentHi, fontSize: 10 }}>
        {stage}
      </span>
      <div>
        <span style={{ color: c.text1, fontWeight: 600, display: "block" }}>{name}</span>
      </div>
      <span style={{ color: c.green, fontWeight: 600, fontFamily: f.mono, fontSize: 10 }}>
        {price}
      </span>
      <span style={{ color: c.text2, fontSize: 10, lineHeight: 1.5 }}>{scope}</span>
      <span style={{ color: c.text3, fontSize: 10, lineHeight: 1.5 }}>{data}</span>
      <span style={{ color: c.text2, fontSize: 10 }}>{delivery}</span>
    </div>
  );
}

export default function ProcurementPage() {
  const { t } = useI18n();
  useEffect(() => {
    trackEvent(EVENTS.PROCUREMENT_VIEWED);
  }, []);

  const buyers = [
    { role: t("procurement.buyers.cfo.role"), reason: t("procurement.buyers.cfo.reason") },
    { role: t("procurement.buyers.cio.role"), reason: t("procurement.buyers.cio.reason") },
    { role: t("procurement.buyers.procurement.role"), reason: t("procurement.buyers.procurement.reason") },
    { role: t("procurement.buyers.ciso.role"), reason: t("procurement.buyers.ciso.reason") },
  ];

  const productFacts = [
    { label: t("procurement.product.category.label"), value: t("procurement.product.category.value") },
    { label: t("procurement.product.deployment.label"), value: t("procurement.product.deployment.value") },
    { label: t("procurement.product.data.label"), value: t("procurement.product.data.value") },
  ];

  const securityFacts = [
    { label: t("procurement.security.internalAccess.label"), value: t("procurement.security.internalAccess.value") },
    { label: t("procurement.security.agent.label"), value: t("procurement.security.agent.value") },
    { label: t("procurement.security.sso.label"), value: t("procurement.security.sso.value") },
    { label: t("procurement.security.residency.label"), value: t("procurement.security.residency.value") },
  ];

  const beforeItems = Array.from({ length: 7 }, (_, i) => t(`procurement.before.item${i + 1}`));
  const afterItems = Array.from({ length: 7 }, (_, i) => t(`procurement.after.item${i + 1}`));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: c.bg,
        fontFamily: f.sans,
        color: c.text1,
        padding: "0 14px 64px",
      }}
    >
      <div style={{ maxWidth: 1020, margin: "0 auto" }}>
        {/* Back */}
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>
            {t("back")}
          </a>
        </div>

        {/* Hero */}
        <header style={{ textAlign: "center", padding: "36px 0 40px" }}>
          <p className="gt-section-label" style={{ marginBottom: 14 }}>
            {t("procurement.label")}
          </p>
          <h1
            style={{
              fontSize: "clamp(24px, 3.5vw, 36px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-.025em",
              marginBottom: 14,
            }}
          >
            {t("procurement.title")}
          </h1>
          <P>{t("procurement.subtitle")}</P>
        </header>

        {/* 1. PRODUCT SUMMARY */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <Lab>{t("procurement.product.label")}</Lab>
            <H2>{t("procurement.product.title")}</H2>
            <P>{t("procurement.product.desc")}</P>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {productFacts.map(function (item) {
                return (
                  <div
                    key={item.label}
                    style={{
                      ...inset,
                      padding: "10px 14px",
                    }}
                  >
                    <p className="gt-label" style={{ marginBottom: 4 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 12, color: c.text1, fontWeight: 500, lineHeight: 1.4 }}>
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* 2. COMMERCIAL STAGES */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <Lab>{t("procurement.stages.label")}</Lab>
            <H2>{t("procurement.stages.title")}</H2>
            <P>{t("procurement.stages.desc")}</P>
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1.2fr 0.8fr 1.4fr 1.2fr 1fr",
                gap: 10,
                padding: "8px 14px",
                fontSize: 8,
                fontFamily: f.mono,
                color: c.text3,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 4,
              }}
            >
              <span>{t("procurement.stages.col.stage")}</span>
              <span>{t("procurement.stages.col.name")}</span>
              <span>{t("procurement.stages.col.price")}</span>
              <span>{t("procurement.stages.col.scope")}</span>
              <span>{t("procurement.stages.col.data")}</span>
              <span>{t("procurement.stages.col.delivery")}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <StageRow
                stage="PUBLIC"
                name={t("procurement.stages.public.name")}
                price={t("procurement.stages.public.price")}
                scope={t("procurement.stages.public.scope")}
                data={t("procurement.stages.public.data")}
                delivery={t("procurement.stages.public.delivery")}
              />
              <StageRow
                stage="RAIL A"
                name={t("procurement.stages.railA.name")}
                price={t("procurement.stages.railA.price")}
                scope={t("procurement.stages.railA.scope")}
                data={t("procurement.stages.railA.data")}
                delivery={t("procurement.stages.railA.delivery")}
              />
              <StageRow
                stage="RAIL B"
                name={t("procurement.stages.railB.name")}
                price={t("procurement.stages.railB.price")}
                scope={t("procurement.stages.railB.scope")}
                data={t("procurement.stages.railB.data")}
                delivery={t("procurement.stages.railB.delivery")}
              />
              <StageRow
                stage="RAIL C"
                name={t("procurement.stages.railC.name")}
                price={t("procurement.stages.railC.price")}
                scope={t("procurement.stages.railC.scope")}
                data={t("procurement.stages.railC.data")}
                delivery={t("procurement.stages.railC.delivery")}
              />
            </div>
          </Card>
        </section>

        {/* 3. TYPICAL BUYERS */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <Lab>{t("procurement.buyers.label")}</Lab>
            <H2>{t("procurement.buyers.title")}</H2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {buyers.map(function (item) {
                return (
                  <div
                    key={item.role}
                    style={{
                      ...inset,
                      padding: "14px 16px",
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 700, color: c.text1, marginBottom: 4 }}>
                      {item.role}
                    </p>
                    <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{item.reason}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* 4. WHAT YOU GET BEFORE / AFTER PURCHASE */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card>
              <Lab>{t("procurement.before.label")}</Lab>
              <H2>{t("procurement.before.title")}</H2>
              <P>{t("procurement.before.desc")}</P>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {beforeItems.map(function (item) {
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "6px 0",
                      }}
                    >
                      <span
                        style={{
                          color: c.green,
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        +
                      </span>
                      <span style={{ fontSize: 11, color: c.text2, lineHeight: 1.4 }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <Lab>{t("procurement.after.label")}</Lab>
              <H2>{t("procurement.after.title")}</H2>
              <P>{t("procurement.after.desc")}</P>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {afterItems.map(function (item) {
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "6px 0",
                      }}
                    >
                      <span
                        style={{
                          color: c.accentHi,
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        +
                      </span>
                      <span style={{ fontSize: 11, color: c.text2, lineHeight: 1.4 }}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </section>

        {/* 5. SECURITY HANDOFF */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <Lab>{t("procurement.security.label")}</Lab>
            <H2>{t("procurement.security.title")}</H2>
            <P>{t("procurement.security.desc")}</P>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="/security-vault"
                className="gt-btn gt-btn-accent-ghost"
                style={{ textDecoration: "none", fontSize: 12 }}
              >
                {t("procurement.security.btn")} &rarr;
              </a>
              <a
                href="/methodology"
                className="gt-btn gt-btn-ghost"
                style={{ textDecoration: "none", fontSize: 12 }}
              >
                {t("procurement.security.methodology")} &rarr;
              </a>
            </div>
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: 10,
              }}
            >
              {securityFacts.map(function (item) {
                return (
                  <div
                    key={item.label}
                    style={{
                      ...inset,
                      padding: "10px 12px",
                    }}
                  >
                    <p className="gt-label" style={{ marginBottom: 3 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 11, color: c.text1, fontWeight: 500 }}>{item.value}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Related research */}
        <section style={{ marginBottom: 32 }}>
          <Card>
            <p className="gt-label" style={{ marginBottom: 10 }}>
              {t("procurement.research.label")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <a
                href="/intel-benchmarks/saas-ai-cost-exposure"
                style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
              >
                {t("procurement.research.saas")} &rarr;
              </a>
              <a
                href="/intel-benchmarks/shadow-ai-governance"
                style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
              >
                {t("procurement.research.shadowAi")} &rarr;
              </a>
              <a
                href="/intel-benchmarks/cfo-technology-spend-guide"
                style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
              >
                {t("procurement.research.cfo")} &rarr;
              </a>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                marginTop: 12,
                paddingTop: 10,
                borderTop: `1px solid ${c.border}`,
              }}
            >
              <a
                href="/methodology"
                style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
              >
                {t("procurement.research.methodology")} &rarr;
              </a>
              <a
                href="/security-vault"
                style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
              >
                {t("procurement.research.security")} &rarr;
              </a>
              <a
                href="/intel-benchmarks"
                style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
              >
                {t("procurement.research.benchmarks")} &rarr;
              </a>
            </div>
          </Card>
        </section>

        {/* 6. CONTACT / CTA */}
        <section>
          <Card style={{ textAlign: "center" as const, padding: "28px 22px" }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: c.text1, marginBottom: 6 }}>
              {t("procurement.cta.title")}
            </p>
            <P>{t("procurement.cta.desc")}</P>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
              <a
                href="/intel"
                className="gt-btn gt-btn-primary"
                style={{ textDecoration: "none", fontSize: 11 }}
              >
                {t("procurement.cta.run")}
              </a>
              <a
                href="mailto:audits@ghost-tax.com"
                className="gt-btn gt-btn-ghost"
                style={{ textDecoration: "none", fontSize: 11 }}
              >
                {t("procurement.cta.contact")} &rarr;
              </a>
            </div>
          </Card>
        </section>

        {/* Print styles */}
        <style>{`
          @media print {
            body { background: #fff !important; color: #111 !important; }
            div { box-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
