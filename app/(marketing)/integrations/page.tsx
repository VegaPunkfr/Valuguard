"use client";

import { useI18n } from "@/lib/i18n";
import { c, f, inset } from "@/lib/tokens";
import Section from "@/components/ui/section";

/* ── GHOST TAX — INTEGRATIONS & API ───────────────────────────────
   CTO-facing surface showcasing the Plugin SDK (10 plugins) and
   Connector ecosystem (11 connectors). Enterprise API teaser. */

type IntegrationStatus = "live" | "roadmap";

interface PluginDef {
  key: string;
  color: string;
  status: IntegrationStatus;
  scope: string; // data scope / what it detects
}

interface ConnectorDef {
  key: string;
  color: string;
  status: IntegrationStatus;
  accessScope: string; // OAuth scopes / read permissions
  detects: string;     // what financial signal it surfaces
}

const plugins: PluginDef[] = [
  { key: "vendorRisk",       color: c.red,      status: "roadmap", scope: "Per-vendor: lock-in score, switching cost estimate, data portability grade" },
  { key: "contractAnalyzer", color: c.amber,    status: "roadmap", scope: "Auto-renewal detection, price escalation clauses, termination penalty quantification" },
  { key: "spendAnomaly",     color: c.red,      status: "roadmap", scope: "Zombie subscriptions, per-seat cost creep, YoY variance flagging" },
  { key: "renewalSniper",    color: c.green,    status: "roadmap", scope: "60-90 day renewal window targeting, negotiation timing, discount range benchmarks" },
  { key: "licenseWaste",     color: c.amber,    status: "roadmap", scope: "Unused licenses across 12 SaaS categories, recoverable EUR/seat calculation" },
  { key: "benchmark",        color: c.accent,   status: "roadmap", scope: "Industry/size percentile scoring per category, peer spend comparison" },
  { key: "compliance",       color: c.cyan,     status: "roadmap", scope: "GDPR, EU AI Act, SOC 2, DORA — non-compliance costed in EUR" },
  { key: "consolidation",    color: c.green,    status: "roadmap", scope: "Tool overlap detection across departments, consolidation roadmap with projected savings" },
  { key: "negotiation",      color: c.accent,   status: "roadmap", scope: "10+ vendor playbooks: Salesforce, Microsoft, AWS, Slack, Jira, Zoom, HubSpot, Datadog, GitHub, Okta" },
  { key: "boardReport",      color: c.accentHi, status: "roadmap", scope: "Board slide, CFO memo, CIO brief, procurement brief — generated from detection data" },
];

const connectors: ConnectorDef[] = [
  { key: "stripe",      color: c.accent,   status: "roadmap", accessScope: "read:subscriptions, read:invoices",          detects: "Subscription drift, invoice anomalies, MRR vs contracted ARR gaps" },
  { key: "quickbooks",  color: c.green,    status: "roadmap", accessScope: "read:accounts, read:purchases, read:vendors",  detects: "Vendor payment duplication, shadow spend in expense lines, category overspend" },
  { key: "google",      color: c.amber,    status: "roadmap", accessScope: "admin.directory.readonly, reports.readonly",   detects: "Inactive user licenses, Drive storage waste, Workspace seat utilization" },
  { key: "microsoft",   color: c.accent,   status: "roadmap", accessScope: "Reports.Read.All, Directory.Read.All",         detects: "E5/E3 license optimization, inactive users, M365 seat-to-usage ratio" },
  { key: "aws",         color: c.amber,    status: "roadmap", accessScope: "ce:GetCostAndUsage, ce:GetReservationCoverage", detects: "Reserved instance gaps, savings plan efficiency, idle compute exposure" },
  { key: "azure",       color: c.cyan,     status: "roadmap", accessScope: "Cost Management Reader",                       detects: "Advisor recommendations, untagged resources, underutilized reservations" },
  { key: "slack",       color: c.accentHi, status: "roadmap", accessScope: "admin.teams:read, analytics:read",             detects: "Inactive workspaces, seat-to-DAU ratio, paid tier justification" },
  { key: "salesforce",  color: c.accent,   status: "roadmap", accessScope: "reports:read, users:read",                     detects: "License waste vs active CRM users, inactive seats, user activity scoring" },
  { key: "okta",        color: c.green,    status: "roadmap", accessScope: "okta.apps.read, okta.users.read",               detects: "Shadow IT in SSO app catalog, unmanaged app assignments, inactive provisioned users" },
  { key: "jira",        color: c.accent,   status: "roadmap", accessScope: "read:jira-user, read:jira-work",                detects: "Atlassian license utilization, inactive project contributors, seat-to-commit ratio" },
  { key: "concur",      color: c.amber,    status: "roadmap", accessScope: "receipts.read, expenses.read",                  detects: "Shadow IT in expense reports, unapproved SaaS on corporate cards, duplicate tool reimbursements" },
];

function StatusBadge({ status, t }: { status: IntegrationStatus; t: (k: string) => string }) {
  const isLive = status === "live";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontFamily: f.mono,
        fontWeight: 600,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: isLive ? c.green : c.text3,
        background: isLive ? "hsla(162, 68%, 51%, 0.08)" : "hsla(222, 12%, 41%, 0.08)",
        border: `1px solid ${isLive ? "hsla(162, 68%, 51%, 0.20)" : "hsla(222, 12%, 41%, 0.15)"}`,
        borderRadius: 100,
        padding: "2px 8px",
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: isLive ? c.green : c.text3,
        }}
      />
      {t(isLive ? "integrations.liveBadge" : "integrations.roadmapBadge")}
    </span>
  );
}

function PluginCard({ plugin, t }: { plugin: PluginDef; t: (k: string) => string }) {
  return (
    <div
      className="gt-card"
      style={{
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: plugin.color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: c.text1,
            lineHeight: 1.2,
            flex: 1,
          }}
        >
          {t(`integrations.plugin.${plugin.key}.title`)}
        </span>
        <StatusBadge status={plugin.status} t={t} />
      </div>
      <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, margin: 0 }}>
        {t(`integrations.plugin.${plugin.key}.desc`)}
      </p>
      <div style={{
        marginTop: 2,
        padding: "7px 10px",
        borderRadius: 6,
        background: "#121828",
        border: "1px solid " + c.border,
      }}>
        <p style={{ fontFamily: f.mono, fontSize: 9, color: c.text4, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 3 }}>
          DETECTS
        </p>
        <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.5 }}>{plugin.scope}</p>
      </div>
    </div>
  );
}

function ConnectorCard({ connector, t }: { connector: ConnectorDef; t: (k: string) => string }) {
  return (
    <div
      className="gt-card"
      style={{
        padding: "18px 18px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: connector.color,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, margin: 0, lineHeight: 1.2 }}>
              {t(`integrations.connector.${connector.key}.title`)}
            </p>
            <StatusBadge status={connector.status} t={t} />
          </div>
          <p style={{ fontSize: 12, color: c.text3, margin: "3px 0 0", lineHeight: 1.5 }}>
            {t(`integrations.connector.${connector.key}.desc`)}
          </p>
        </div>
      </div>
      {/* Technical detail row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 5,
        paddingTop: 6,
        borderTop: "1px solid " + c.border,
      }}>
        <div>
          <p style={{ fontFamily: f.mono, fontSize: 9, color: c.text4, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 2 }}>
            ACCESS SCOPE
          </p>
          <p style={{ fontFamily: f.mono, fontSize: 10, color: c.text3, lineHeight: 1.4 }}>{connector.accessScope}</p>
        </div>
        <div>
          <p style={{ fontFamily: f.mono, fontSize: 9, color: c.text4, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 2 }}>
            DETECTS
          </p>
          <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.4 }}>{connector.detects}</p>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { t } = useI18n();

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div className="gt-container">

        {/* ── Hero ────────────────────────────────────── */}
        <Section style={{ textAlign: "center", paddingTop: 80, paddingBottom: 20 }}>
          <p className="gt-section-label">{t("integrations.hero.label")}</p>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 52px)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
              marginBottom: 16,
              maxWidth: 720,
              margin: "0 auto 16px",
            }}
          >
            {t("integrations.hero.title")}
          </h1>
          <p
            style={{
              fontSize: 18,
              color: c.text2,
              maxWidth: 620,
              margin: "0 auto 40px",
              lineHeight: 1.6,
            }}
          >
            {t("integrations.hero.sub")}
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 100,
              background: "hsla(38, 92%, 50%, 0.06)",
              border: "1px solid hsla(38, 92%, 50%, 0.15)",
              fontSize: 13,
              fontFamily: f.mono,
              color: c.amber,
              letterSpacing: ".01em",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: c.amber,
              }}
            />
            {t("integrations.roadmapNote")}
          </div>
        </Section>

        {/* ── Security posture note ────────────────────── */}
        <Section style={{ paddingTop: 20, paddingBottom: 0 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
          className="vg-security-note-grid">
            {[
              { label: "READ-ONLY", detail: "Zero write access to any connected system. Every OAuth scope is read-only. No data is modified, created, or deleted." },
              { label: "LEAST-PRIVILEGE", detail: "Each connector requests only the minimum scopes required for its specific detection use case. Scopes listed on every card." },
              { label: "NO PERSISTENCE", detail: "Connector data is used for analysis only. Raw system data is not stored. Detection runs in-memory and outputs exposure ranges." },
            ].map(function (item) {
              return (
                <div key={item.label} style={{ ...inset, padding: "14px 16px" }}>
                  <p style={{ fontFamily: f.mono, fontSize: 10, fontWeight: 700, color: c.green, letterSpacing: ".1em", marginBottom: 5 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 12, color: c.text3, lineHeight: 1.5 }}>{item.detail}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Plugins (10) ────────────────────────────── */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">{t("integrations.plugins.label")}</p>
            <h2
              style={{
                fontSize: "clamp(24px, 3.5vw, 36px)",
                fontWeight: 700,
                marginBottom: 10,
                letterSpacing: "-0.02em",
              }}
            >
              {t("integrations.plugins.title")}
            </h2>
            <p
              style={{
                fontSize: 15,
                color: c.text2,
                maxWidth: 600,
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              {t("integrations.plugins.sub")}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {plugins.map((p) => (
                <PluginCard key={p.key} plugin={p} t={t} />
              ))}
            </div>
          </div>
        </Section>

        {/* ── Connectors (11) ─────────────────────────── */}
        <Section delay={80} style={{ paddingTop: 60, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">{t("integrations.connectors.label")}</p>
            <h2
              style={{
                fontSize: "clamp(24px, 3.5vw, 36px)",
                fontWeight: 700,
                marginBottom: 10,
                letterSpacing: "-0.02em",
              }}
            >
              {t("integrations.connectors.title")}
            </h2>
            <p
              style={{
                fontSize: 15,
                color: c.text2,
                maxWidth: 600,
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              {t("integrations.connectors.sub")}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              {connectors.map((conn) => (
                <ConnectorCard key={conn.key} connector={conn} t={t} />
              ))}
            </div>
          </div>
        </Section>

        {/* ── API Access ──────────────────────────────── */}
        <Section delay={120} style={{ paddingTop: 60, paddingBottom: 0 }}>
          <div
            className="gt-panel"
            style={{
              padding: "36px 36px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <p className="gt-section-label">{t("integrations.api.label")}</p>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                marginBottom: 4,
              }}
            >
              {t("integrations.api.title")}
            </h2>
            <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.65, maxWidth: 640 }}>
              {t("integrations.api.desc")}
            </p>
            <div
              style={{
                ...inset,
                padding: "14px 18px",
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                alignSelf: "flex-start",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontFamily: f.mono,
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: c.cyan,
                }}
              >
                {t("integrations.api.badge")}
              </span>
              <span style={{ fontSize: 13, color: c.text2 }}>
                {t("integrations.api.badgeDesc")}
              </span>
            </div>
          </div>
        </Section>

        {/* ── CTA ─────────────────────────────────────── */}
        <Section delay={160} style={{ paddingTop: 80, paddingBottom: 100, textAlign: "center" }}>
          <h2
            style={{
              fontSize: "clamp(24px, 3.5vw, 38px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 14,
            }}
          >
            {t("integrations.cta.title")}
          </h2>
          <p
            style={{
              fontSize: 16,
              color: c.text2,
              maxWidth: 520,
              margin: "0 auto 28px",
              lineHeight: 1.6,
            }}
          >
            {t("integrations.cta.sub")}
          </p>
          <a
            href="/contact"
            className="gt-btn-primary"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              fontSize: 14,
              fontFamily: f.mono,
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              textDecoration: "none",
              borderRadius: 10,
              background: c.accent,
              color: "#fff",
              transition: "background 200ms",
            }}
          >
            {t("integrations.cta.btn")}
          </a>
        </Section>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .vg-security-note-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
