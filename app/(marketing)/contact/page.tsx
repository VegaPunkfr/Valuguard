"use client";

import { useState } from "react";
import { c, f } from "@/lib/tokens";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", size: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  // Capture upsell context from URL params (domain, rail, ref)
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

    // Store lead locally and send via API if available
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
      // Fallback: open mailto
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
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 14 }}>Message received</h1>
            <p style={{ fontSize: 17, color: c.text2, lineHeight: 1.65, marginBottom: 28 }}>
              We'll get back to you within 24 hours. For urgent matters, email us directly at audits@ghost-tax.com.
            </p>
            <a href="/" className="gt-btn gt-btn-ghost">
              Back to home
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
                  CONTINUOUS DRIFT MONITORING — 2,000 EUR/month
                </p>
                <p style={{ fontSize: 13, color: c.text2, margin: "6px 0 0", lineHeight: 1.5 }}>
                  {upsellContext.domain ? `We detected exposure on ${upsellContext.domain}. ` : ""}Activate monthly monitoring to protect your margins. We'll scope the engagement below.
                </p>
              </div>
            )}
            {upsellContext?.rail === "B_SETUP" && (
              <div style={{
                background: c.amberBg, border: "1px solid " + c.amberBd,
                borderRadius: 10, padding: "14px 18px", marginBottom: 20,
              }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, color: c.amber, fontWeight: 600, margin: 0 }}>
                  STABILIZATION PLAN 30/60/90 — 2,500 EUR
                </p>
                <p style={{ fontSize: 13, color: c.text2, margin: "6px 0 0", lineHeight: 1.5 }}>
                  {upsellContext.domain ? `Based on your ${upsellContext.domain} report. ` : ""}Get a structured corrective roadmap with vendor-specific negotiation playbooks.
                </p>
              </div>
            )}

            <p className="gt-section-label">CONTACT</p>

            <h1 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, marginBottom: 10, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              {upsellContext ? "Activate your protection" : "Questions about your report?"}
            </h1>

            <p style={{ fontSize: 17, color: c.text2, lineHeight: 1.65, marginBottom: 32 }}>
              {upsellContext
                ? "Tell us what you need. All plans are available for instant self-serve activation on our pricing page."
                : "Technical support and report clarifications. No sales calls, no demos — our platform speaks for itself."}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="gt-contact-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="gt-label">NAME *</label>
                  <input type="text" value={form.name} onChange={update("name")} required placeholder="Jane Doe" className="gt-input" />
                </div>
                <div>
                  <label className="gt-label">WORK EMAIL *</label>
                  <input type="email" value={form.email} onChange={update("email")} required placeholder="jane@company.com" className="gt-input" />
                </div>
              </div>

              <div className="gt-contact-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label className="gt-label">COMPANY</label>
                  <input type="text" value={form.company} onChange={update("company")} placeholder="Acme Corp" className="gt-input" />
                </div>
                <div>
                  <label className="gt-label">COMPANY SIZE</label>
                  <select value={form.size} onChange={update("size")} className="gt-input" style={{ color: form.size ? c.text1 : c.text3 }}>
                    <option value="">Select...</option>
                    <option value="1-50">1-50 employees</option>
                    <option value="50-200">50-200 employees</option>
                    <option value="200-1000">200-1,000 employees</option>
                    <option value="1000-5000">1,000-5,000 employees</option>
                    <option value="5000+">5,000+ employees</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="gt-label">MESSAGE</label>
                <textarea value={form.message} onChange={update("message")} rows={4} placeholder="Tell us about your needs — stabilization plan, institutional mission, or just a question..." className="gt-input" style={{ resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <button type="submit" disabled={sending || !form.name || !form.email} className="gt-btn gt-btn-primary" style={{ width: "100%", opacity: sending ? 0.7 : 1, cursor: sending ? "wait" : "pointer" }}>
                {sending ? "Sending..." : "Send message"}
              </button>
            </form>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid " + c.border }}>
              <p style={{ fontSize: 12, color: c.text3, lineHeight: 1.6, textAlign: "center" }}>
                Or email directly: <a href="mailto:audits@ghost-tax.com" style={{ color: c.accentHi, textDecoration: "none" }}>audits@ghost-tax.com</a>
              </p>
              <p style={{ fontSize: 11, color: c.text3, textAlign: "center", marginTop: 8 }}>
                Typical ROI for stabilization missions: 5-15x within 12 months
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
