"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";
import Footer from "@/components/ui/footer";

export default function CancelPage() {
  const { t } = useI18n();
  const [dailyLoss, setDailyLoss] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vg_daily_loss");
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed > 0) setDailyLoss(parsed);
    }
  }, []);

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
                <span style={{ color: c.red, fontFamily: f.mono, fontWeight: 700 }}>$990</span>{" "}
                {t("cancel.lessThan")}{" "}
                <span style={{ fontFamily: f.mono, fontWeight: 700 }}>
                  {Math.ceil(990 / dailyLoss)}
                </span>{" "}
                {t("cancel.daysOfLeakage")}
              </p>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: c.text2, marginBottom: 12 }}>
              {t("cancel.reminderTitle")}
            </p>
            {emailSent ? (
              <p style={{ fontSize: 14, color: c.accentHi, fontWeight: 600 }}>
                {t("cancel.reminderSent")}
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) {
                    localStorage.setItem("vg_cancel_email", email.trim());
                    setEmailSent(true);
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

          <p style={{ fontSize: 13, color: c.text3, marginBottom: 28 }}>
            {t("cancel.socialProof")}
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <a href="/#pricing" className="gt-btn gt-btn-primary" style={{ textDecoration: "none" }}>
              {t("cancel.back")}
            </a>
            <a href="/contact" className="gt-btn gt-btn-ghost" style={{ textDecoration: "none" }}>
              {t("cancel.contact")}
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
