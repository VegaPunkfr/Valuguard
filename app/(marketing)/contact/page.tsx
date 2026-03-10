"use client";

import { useState } from "react";
import { c, f } from "@/lib/tokens";
import { useI18n } from "@/lib/i18n";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";

export default function ContactPage() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", company: "", size: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const [upsellContext] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const rail = params.get("rail");
    const domain = params.get("domain");
    const ref = params.get("ref");
    if (!rail) return null;
    return { rail, domain, ref };
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.name) return;
    setSending(true);

    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(upsellContext && { rail: upsellContext.rail, domain: upsellContext.domain, ref: upsellContext.ref }),
        }),
      });
    } catch {
      window.location.href = `mailto:audits@ghost-tax.com?subject=Contact%20from%20${encodeURIComponent(form.company || form.name)}&body=${encodeURIComponent(form.message)}`;
    }

    setSubmitted(true);
    setSending(false);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "120px 24px" }}>
          <div className="gt-panel" style={{ padding: "48px 40px", textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: c.greenBg, border: "1px solid " + c.greenBd,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 24, color: c.green,
            }}>
              &#x2713;
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 14 }}>{t("contact.success.title")}</h1>
            <p style={{ fontSize: 17, color: c.text2, lineHeight: 1.65, marginBottom: 28 }}>
              {t("contact.success.desc")}
            </p>
            <a href="/" className="gt-btn gt-btn-ghost">
              {t("contact.success.back")}
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "100px 24px" }}>
        <Section>
          <div className="gt-panel" style={{ padding: "48px 40px" }}>
            {upsellContext?.rail === "B_MONITOR" && (
              <div style={{
                background: c.accentBg, border: "1px solid " + c.accentBd,
                borderRadius: 10, padding: "14px 18px", marginBottom: 20,
              }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, color: c.accentHi, fontWeight: 600, margin: 0 }}>
                  {t("contact.monitorBadge")}
                </p>
                <p style={{ fontSize: 13, color: c.text2, margin: "6px 0 0", lineHeight: 1.5 }}>
                  {upsellContext.domain
                    ? t("contact.subMonitor").replace("{domain}", upsellContext.domain)
                    : t("contact.sub")}
                </p>
              </div>
            )}
            {upsellContext?.rail === "B_SETUP" && (
              <div style={{
                background: c.amberBg, border: "1px solid " + c.amberBd,
                borderRadius: 10, padding: "14px 18px", marginBottom: 20,
              }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, color: c.amber, fontWeight: 600, margin: 0 }}>
                  {t("contact.stabilizeBadge")}
                </p>
                <p style={{ fontSize: 13, color: c.text2, margin: "6px 0 0", lineHeight: 1.5 }}>
                  {upsellContext.domain
                    ? t("contact.subStabilize").replace("{domain}", upsellContext.domain)
                    : t("contact.sub")}
                </p>
              </div>
            )}

            <p className="gt-section-label">{t("contact.label")}</p>

            <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, marginBottom: 10, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              {upsellContext ? t("contact.title") : t("contact.titleAlt")}
            </h1>

            <p style={{ fontSize: 17, color: c.text2, lineHeight: 1.65, marginBottom: 32 }}>
              {t("contact.sub")}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="gt-contact-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="gt-label">{t("contact.field.name")}</label>
                  <input type="text" value={form.name} onChange={update("name")} required placeholder="Jane Doe" className="gt-input" />
                </div>
                <div>
                  <label className="gt-label">{t("contact.field.email")}</label>
                  <input type="email" value={form.email} onChange={update("email")} required placeholder="jane@company.com" className="gt-input" />
                </div>
              </div>

              <div className="gt-contact-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="gt-label">{t("contact.field.company")}</label>
                  <input type="text" value={form.company} onChange={update("company")} placeholder="Acme Corp" className="gt-input" />
                </div>
                <div>
                  <label className="gt-label">{t("contact.field.size")}</label>
                  <select value={form.size} onChange={update("size")} className="gt-input" style={{ color: form.size ? c.text1 : c.text3 }}>
                    <option value="">{t("contact.field.sizeSelect")}</option>
                    <option value="1-50">{t("contact.field.size1")}</option>
                    <option value="50-200">{t("contact.field.size2")}</option>
                    <option value="200-1000">{t("contact.field.size3")}</option>
                    <option value="1000-5000">{t("contact.field.size4")}</option>
                    <option value="5000+">{t("contact.field.size5")}</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="gt-label">{t("contact.field.message")}</label>
                <textarea value={form.message} onChange={update("message")} rows={4} className="gt-input" style={{ resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <button type="submit" disabled={sending || !form.name || !form.email} className="gt-btn gt-btn-primary" style={{ width: "100%", opacity: sending ? 0.7 : 1, cursor: sending ? "wait" : "pointer" }}>
                {sending ? t("contact.btn.sending") : t("contact.btn.send")}
              </button>
            </form>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid " + c.border }}>
              <p style={{ fontSize: 12, color: c.text3, lineHeight: 1.6, textAlign: "center" }}>
                {t("contact.emailDirect")} <a href="mailto:audits@ghost-tax.com" style={{ color: c.accentHi, textDecoration: "none" }}>audits@ghost-tax.com</a>
              </p>
              <p style={{ fontSize: 11, color: c.text3, textAlign: "center", marginTop: 8 }}>
                {t("contact.roi")}
              </p>
            </div>
          </div>
        </Section>
      </div>

      <Footer />

      <style>{`
        @media (max-width: 640px) {
          .gt-contact-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
