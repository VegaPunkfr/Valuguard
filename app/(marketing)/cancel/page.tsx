"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f, inset, sectionLabel } from "@/lib/tokens";

/* Average exposure: 340k EUR/yr = ~930 EUR/day = ~0.0108 EUR/sec */
const EUR_PER_DAY = 930;
const EUR_PER_SEC = EUR_PER_DAY / 86400; // ~0.01076

export default function CancelPage() {
  const { t } = useI18n();
  const [dailyLoss, setDailyLoss] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [elapsedEur, setElapsedEur] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const stored = localStorage.getItem("vg_daily_loss");
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed > 0) setDailyLoss(parsed);
    }
  }, []);

  /* Live cost counter — ticks every second */
  useEffect(() => {
    startRef.current = Date.now();
    const rate = dailyLoss ? dailyLoss / 86400 : EUR_PER_SEC;
    const id = setInterval(() => {
      const secs = (Date.now() - startRef.current) / 1000;
      setElapsedEur(secs * rate);
    }, 1000);
    return () => clearInterval(id);
  }, [dailyLoss]);

  const displayRate = dailyLoss
    ? `${dailyLoss.toLocaleString()} EUR`
    : `${EUR_PER_DAY.toLocaleString()} EUR`;

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "100px 24px" }}>
        <div className="gt-panel" style={{ padding: "48px 40px", textAlign: "center" }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: c.amberBg, border: `1px solid ${c.amberBd}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 24, color: c.amber,
            }}
          >
            &#x21A9;
          </div>

          <p className="gt-section-label" style={{ color: c.amber }}>
            {t("cancel.badge")}
          </p>

          <h1 style={{ fontSize: "clamp(24px, 4vw, 28px)", fontWeight: 800, marginBottom: 14, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            {t("cancel.title")}
          </h1>

          <p style={{ fontSize: 17, color: c.text2, lineHeight: 1.65, maxWidth: 420, margin: "0 auto 32px" }}>
            {t("cancel.sub")}
          </p>

          {/* ── Live Cost Counter ── */}
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: `1px solid rgba(239,68,68,0.22)`,
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 13, color: c.text3, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
              {t("cancel.counter.label")}
            </p>
            <p
              style={{
                fontSize: 32,
                fontFamily: f.mono,
                fontWeight: 800,
                color: c.red,
                margin: "0 0 6px",
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              +{elapsedEur.toFixed(2)} EUR
            </p>
            <p style={{ fontSize: 13, color: c.text2, margin: 0, lineHeight: 1.5 }}>
              {t("cancel.counter.rate").replace("{amount}", displayRate)}
            </p>
          </div>

          {dailyLoss !== null && (
            <div style={{ background: c.redBg, border: `1px solid ${c.redBd}`, borderRadius: 12, padding: 20, marginBottom: 24, textAlign: "center" }}>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, margin: 0 }}>
                {t("cancel.dailyCost")}{" "}
                <span style={{ color: c.red, fontFamily: f.mono, fontWeight: 700 }}>
                  {dailyLoss.toLocaleString()} EUR
                </span>
              </p>
              <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.6, margin: "10px 0 0" }}>
                {t("cancel.reportCost")}{" "}
                <span style={{ color: c.red, fontFamily: f.mono, fontWeight: 700 }}>490 EUR</span>{" "}
                {t("cancel.lessThan")}{" "}
                <span style={{ fontFamily: f.mono, fontWeight: 700 }}>
                  {Math.ceil(490 / dailyLoss)}
                </span>{" "}
                {t("cancel.daysOfLeakage")}
              </p>
            </div>
          )}

          {/* ── Peer Pressure ── */}
          <div
            style={{
              background: "rgba(59,130,246,0.06)",
              border: `1px solid rgba(59,130,246,0.18)`,
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            <p style={{ ...sectionLabel, fontSize: 10, color: c.amber, marginBottom: 8 }}>
              {t("cancel.peer.label")}
            </p>
            <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
              {t("cancel.peer.line1")}
            </p>
            <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.6, margin: "8px 0 0" }}>
              {t("cancel.peer.line2")}
            </p>
          </div>

          {/* What you're missing */}
          <div style={{ ...inset, padding: "20px 24px", textAlign: "left", marginBottom: 24 }}>
            <p style={{ ...sectionLabel, fontSize: 10, color: c.amber, marginBottom: 14 }}>
              {t("cancel.missing.title")}
            </p>
            {[
              t("cancel.missing.item1"),
              t("cancel.missing.item2"),
              t("cancel.missing.item3"),
              t("cancel.missing.item4"),
              t("cancel.missing.item5"),
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <span style={{ color: c.amber, fontSize: 12, flexShrink: 0, marginTop: 2 }}>&#x2717;</span>
                <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.45, margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>

          {/* Cost of delay */}
          <div style={{ background: "rgba(59,130,246,0.06)", border: `1px solid rgba(59,130,246,0.18)`, borderRadius: 10, padding: "16px 20px", marginBottom: 24, textAlign: "center" }}>
            <p style={{ ...sectionLabel, fontSize: 10, color: c.amber, marginBottom: 8 }}>
              {t("cancel.costOfDelay.title")}
            </p>
            <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, margin: 0 }}>
              {t("cancel.costOfDelay.desc")}
            </p>
          </div>

          {/* ── Risk-Free Guarantee ── */}
          <div
            style={{
              background: "rgba(52,211,153,0.06)",
              border: `1px solid rgba(52,211,153,0.18)`,
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            <p style={{ ...sectionLabel, fontSize: 10, color: c.green, marginBottom: 8 }}>
              {t("cancel.guarantee.label")}
            </p>
            <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
              {t("cancel.guarantee.line1")}
            </p>
            <p style={{ fontSize: 12, color: c.text3, lineHeight: 1.5, margin: "6px 0 0" }}>
              {t("cancel.guarantee.line2")}
            </p>
          </div>

          <p style={{ fontSize: 13, color: c.text3, marginBottom: 20 }}>
            {t("cancel.socialProof")}
          </p>

          {/* ── Dual CTAs ── */}
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            <a href="/intel" className="gt-btn gt-btn-primary" style={{ textDecoration: "none", fontWeight: 700, fontSize: 15, padding: "12px 28px" }}>
              {t("cancel.cta.resume")}
            </a>
            <a
              href="https://cal.com/ghost-tax/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="gt-btn gt-btn-ghost"
              style={{ textDecoration: "none", fontSize: 14, padding: "12px 24px" }}
            >
              {t("cancel.cta.talk")}
            </a>
          </div>

          {/* Reminder form */}
          <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 14, color: c.text2, marginBottom: 12 }}>
              {t("cancel.reminderTitle")}
            </p>
            {emailSent ? (
              <p style={{ fontSize: 14, color: c.accentHi, fontWeight: 600 }}>
                {t("cancel.reminderSent")}
              </p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (email.trim()) {
                    localStorage.setItem("vg_cancel_email", email.trim());
                    setEmailSent(true);
                    try {
                      await fetch("/api/leads/capture", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: email.trim(),
                          domain: email.trim().split("@")[1] || undefined,
                          source: "cancel_remind",
                          meta: { intent: "remind", dailyLoss },
                        }),
                      });
                    } catch {
                      // Non-blocking — localStorage already saved
                    }
                  }
                }}
                style={{ display: "flex", gap: 10, justifyContent: "center" }}
              >
                <input
                  type="email" required placeholder="you@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="gt-input" style={{ flex: 1, maxWidth: 280 }}
                />
                <button type="submit" className="gt-btn gt-btn-primary">
                  {t("cancel.reminderBtn")}
                </button>
              </form>
            )}
          </div>

          {/* Free preview fallback */}
          <div style={{ textAlign: "center" }}>
            <a href="/intel" style={{ fontSize: 12, color: c.text3, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("cancel.freePreview")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
