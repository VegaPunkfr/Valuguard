"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f, inset, sectionLabel } from "@/lib/tokens";
import Footer from "@/components/ui/footer";

/* ── Referral code generator (client-side, deterministic from session) ── */
function deriveRefCode(sessionId: string): string {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) {
    h = ((h << 5) - h + sessionId.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 8).toUpperCase();
}

const SITE_URL = typeof window !== "undefined"
  ? window.location.origin
  : "https://ghost-tax.com";

/* ── Viral CTA Card ───────────────────────────────────────── */
function ViralCard({
  icon,
  title,
  desc,
  href,
  accentColor,
  borderColor,
}: {
  icon: string;
  title: string;
  desc: string;
  href: string;
  accentColor: string;
  borderColor: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        ...inset,
        padding: "20px 22px",
        textDecoration: "none",
        transition: "border-color 200ms, transform 200ms, box-shadow 200ms",
        borderColor: hovered ? borderColor : undefined,
        transform: hovered ? "translateY(-2px)" : undefined,
        boxShadow: hovered ? `0 8px 32px ${borderColor}20` : undefined,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${borderColor}10`,
            border: `1px solid ${borderColor}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: accentColor,
              marginBottom: 4,
              lineHeight: 1.3,
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontSize: 12,
              color: c.text3,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {desc}
          </p>
        </div>
        <span
          style={{
            fontSize: 16,
            color: c.text4,
            flexShrink: 0,
            marginTop: 2,
            transition: "transform 200ms, color 200ms",
            transform: hovered ? "translateX(3px)" : undefined,
          }}
        >
          &#x2192;
        </span>
      </div>
    </a>
  );
}

/* ── Stat Box ─────────────────────────────────────────────── */
function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        ...inset,
        padding: "16px 12px",
        textAlign: "center",
        flex: "1 1 120px",
        minWidth: 100,
      }}
    >
      <p
        style={{
          fontSize: 22,
          fontWeight: 800,
          fontFamily: f.mono,
          color: c.text1,
          letterSpacing: "-0.02em",
          marginBottom: 4,
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: 10, color: c.text3, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.3 }}>
        {label}
      </p>
    </div>
  );
}

/* ── Progress dots for referral ───────────────────────────── */
function ReferralProgress({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: i < count ? c.greenBg : "rgba(0,0,0,0.25)",
            border: `2px solid ${i < count ? c.green : c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontFamily: f.mono,
            fontWeight: 700,
            color: i < count ? c.green : c.text4,
            transition: "all 300ms",
          }}
        >
          {i < count ? "\u2713" : i + 1}
        </div>
      ))}
    </div>
  );
}

/* ── Main Content ─────────────────────────────────────────── */
function SuccessContent() {
  const { t } = useI18n();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [copied, setCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<"processing" | "ready" | "error">("processing");
  const [runId, setRunId] = useState<string | null>(null);
  const [referralCount] = useState(0); // Will be fetched from API in future

  const refCode = useMemo(
    () => (sessionId ? deriveRefCode(sessionId) : "GHOST"),
    [sessionId]
  );

  const referralLink = `${SITE_URL}/intel?ref=${refCode}`;

  // Poll for delivery completion
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const res = await fetch(`/api/report/status?session_id=${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "delivered" || data.status === "report_persisted" || data.status === "followup_scheduled") {
            if (active) {
              setDeliveryStatus("ready");
              setRunId(data.runId || null);
            }
            return;
          }
        }
      } catch { /* ignore */ }

      attempts++;
      if (active && attempts < maxAttempts) {
        setTimeout(poll, 5000);
      }
    };

    const timer = setTimeout(poll, 3000);
    return () => { active = false; clearTimeout(timer); };
  }, [sessionId]);

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div className="gt-container-sm" style={{ margin: "0 auto", padding: "80px 24px 60px" }}>

        {/* ═══════════════════════════════════════════════════
            SECTION 1: Payment Confirmation + Status
            ═══════════════════════════════════════════════════ */}
        <div className="gt-panel" style={{ padding: "48px 40px", textAlign: "center", marginBottom: 24 }}>
          {/* Check icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: c.greenBg,
              border: `1px solid ${c.greenBd}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 24,
              color: c.green,
            }}
          >
            &#x2713;
          </div>

          <p className="gt-section-label" style={{ color: c.green }}>
            {t("success.badge")}
          </p>

          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 32px)",
              fontWeight: 800,
              marginBottom: 14,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {t("success.title")}
          </h1>

          <p
            style={{
              fontSize: 17,
              color: c.text2,
              lineHeight: 1.65,
              maxWidth: 480,
              margin: "0 auto 28px",
            }}
          >
            {t("success.desc")}
          </p>

          {sessionId && (
            <div className="gt-badge gt-badge--green" style={{ display: "inline-block", marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontFamily: f.mono, color: c.text3 }}>REF: </span>
              <span style={{ fontSize: 10, fontFamily: f.mono, color: c.green, fontWeight: 700 }}>
                {sessionId.slice(0, 16).toUpperCase()}
              </span>
            </div>
          )}

          {/* Report delivery status */}
          {deliveryStatus === "processing" && (
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.3)", borderTopColor: c.accent, animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 13, color: c.accent, fontWeight: 600 }}>
                  {t("success.processing")}
                </span>
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {deliveryStatus === "ready" && (
            <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 10, padding: "20px 24px", marginBottom: 24, textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: c.green, marginBottom: 12 }}>
                {t("success.ready")}
              </p>
              {runId ? (
                <a
                  href={`/report/${runId}`}
                  style={{ display: "inline-block", background: c.green, color: c.bg, padding: "12px 32px", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                >
                  {t("success.viewReport")}
                </a>
              ) : (
                <p style={{ fontSize: 12, color: c.text2 }}>
                  {t("success.checkEmail")}
                </p>
              )}
            </div>
          )}

          {/* Timeline: What Happens Next */}
          <div style={{ ...inset, padding: "20px 24px", textAlign: "left", margin: "0 auto 28px", maxWidth: 420 }}>
            <p style={{ ...sectionLabel, fontSize: 10, color: c.accent, marginBottom: 14 }}>
              {t("success.next")}
            </p>
            {[
              { time: t("success.step1.time"), action: t("success.step1.action"), active: true },
              { time: t("success.step2.time"), action: t("success.step2.action"), active: false },
              { time: t("success.step3.time"), action: t("success.step3.action"), active: false },
              { time: t("success.step4.time"), action: t("success.step4.action"), active: false },
            ].map((step, i) => (
              <div key={step.time} style={{ display: "flex", gap: 12, marginBottom: i < 3 ? 10 : 0, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 14 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: step.active ? c.green : c.text4,
                      border: step.active ? `2px solid ${c.greenBd}` : "none",
                      boxShadow: step.active ? `0 0 8px ${c.greenBg}` : "none",
                      marginTop: 3,
                    }}
                  />
                  {i < 3 && (
                    <div style={{ width: 1, height: 18, background: c.border }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: f.mono,
                      fontWeight: 700,
                      color: step.active ? c.green : c.text3,
                    }}
                  >
                    {step.time}
                  </span>
                  <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.45, margin: "2px 0 0" }}>
                    {step.action}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {[
              { icon: "\uD83D\uDD10", text: "AES-256" },
              { icon: "\uD83C\uDDEA\uD83C\uDDFA", text: t("success.trust.eu") },
              { icon: "\u23F1", text: t("success.trust.purge") },
            ].map((b) => (
              <div
                key={b.text}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: c.text3 }}
              >
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <span style={{ fontWeight: 500 }}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            SECTION 2: Viral CTAs — "While You Wait"
            ═══════════════════════════════════════════════════ */}
        <div className="gt-panel" style={{ padding: "36px 32px", marginBottom: 24 }}>
          <p style={{ ...sectionLabel, fontSize: 10, color: c.accent, marginBottom: 6, textAlign: "center" }}>
            {t("success.viral.title")}
          </p>
          <p style={{ fontSize: 14, color: c.text2, textAlign: "center", marginBottom: 24, lineHeight: 1.5 }}>
            {t("success.viral.subtitle")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ViralCard
              icon={"\uD83D\uDC65"}
              title={t("success.viral.colleagueScan")}
              desc={t("success.viral.colleagueScanDesc")}
              href={`${SITE_URL}/intel?ref=${refCode}&utm_source=success&utm_medium=viral&utm_campaign=colleague`}
              accentColor={c.accent}
              borderColor="hsl(216, 91%, 65%)"
            />
            <ViralCard
              icon={"\uD83C\uDFAF"}
              title={t("success.viral.competitorScan")}
              desc={t("success.viral.competitorScanDesc")}
              href={`${SITE_URL}/intel?ref=${refCode}&utm_source=success&utm_medium=viral&utm_campaign=competitor`}
              accentColor={c.amber}
              borderColor="hsl(35, 86%, 56%)"
            />
            <ViralCard
              icon={"\uD83D\uDCCA"}
              title={t("success.viral.boardShare")}
              desc={t("success.viral.boardShareDesc")}
              href={runId ? `${SITE_URL}/report/${runId}/share?type=board` : `${SITE_URL}/intel?ref=${refCode}&utm_source=success&utm_medium=viral&utm_campaign=board`}
              accentColor={c.cyan}
              borderColor="hsl(190, 86%, 58%)"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            SECTION 3: Referral Program
            ═══════════════════════════════════════════════════ */}
        <div className="gt-panel" style={{ padding: "36px 32px", marginBottom: 24 }}>
          <p style={{ ...sectionLabel, fontSize: 10, color: c.green, marginBottom: 6, textAlign: "center" }}>
            {t("success.referral.title")}
          </p>
          <h2 style={{
            fontSize: 22,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>
            {t("success.referral.headline")}
          </h2>
          <p style={{ fontSize: 14, color: c.text2, textAlign: "center", marginBottom: 24, lineHeight: 1.5, maxWidth: 400, margin: "0 auto 24px" }}>
            {t("success.referral.desc")}
          </p>

          {/* Progress tracker */}
          <ReferralProgress count={referralCount} />
          <p style={{ fontSize: 11, color: c.text3, textAlign: "center", marginBottom: 24, fontFamily: f.mono }}>
            {referralCount}/3 {t("success.referral.progress")}
          </p>

          {/* Referral code display */}
          <div style={{
            ...inset,
            padding: "16px 20px",
            textAlign: "center",
            maxWidth: 380,
            margin: "0 auto 16px",
          }}>
            <p style={{
              fontSize: 9,
              fontFamily: f.mono,
              color: c.text4,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 8,
              fontWeight: 700,
            }}>
              {t("success.referral.codeLabel")}
            </p>
            <p style={{
              fontSize: 28,
              fontFamily: f.mono,
              fontWeight: 800,
              color: c.green,
              letterSpacing: "0.12em",
              marginBottom: 0,
            }}>
              {refCode}
            </p>
          </div>

          {/* Referral link copy */}
          <div style={{
            ...inset,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 380,
            margin: "0 auto 16px",
          }}>
            <span style={{
              fontSize: 11,
              fontFamily: f.mono,
              color: c.text3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}>
              {referralLink}
            </span>
            <button
              onClick={() => copyToClipboard(referralLink, setRefCopied)}
              style={{
                background: refCopied ? c.greenBg : c.accentBg,
                border: `1px solid ${refCopied ? c.greenBd : c.accentBd}`,
                color: refCopied ? c.green : c.accent,
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: f.mono,
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 200ms",
              }}
            >
              {refCopied ? t("success.referral.linkCopied") : t("success.referral.copyLink")}
            </button>
          </div>

          {/* Share buttons row */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {/* LinkedIn Share */}
            <button
              onClick={() => {
                window.open(
                  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
                  "_blank"
                );
              }}
              className="gt-btn"
              style={{
                background: c.linkedin,
                color: "#fff",
                padding: "10px 20px",
                fontSize: 12,
              }}
            >
              {t("success.share")}
            </button>

            {/* Email Share */}
            <button
              onClick={() => {
                const subject = encodeURIComponent("Ghost Tax - IT Cost Audit");
                const body = encodeURIComponent(`${t("success.referral.shareText")}\n\n${referralLink}`);
                window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
              }}
              className="gt-btn gt-btn-accent-ghost"
              style={{ padding: "10px 20px", fontSize: 12 }}
            >
              {t("success.shareEmail")}
            </button>

            {/* Copy Link */}
            <button
              onClick={() => copyToClipboard(referralLink, setCopied)}
              className={copied ? "gt-btn gt-btn-green" : "gt-btn gt-btn-ghost"}
              style={{ padding: "10px 20px", fontSize: 12, fontFamily: f.mono }}
            >
              {copied ? t("success.referral.linkCopied") : t("success.referral.copyLink")}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            SECTION 4: Social Proof
            ═══════════════════════════════════════════════════ */}
        <div className="gt-panel" style={{ padding: "36px 32px", marginBottom: 24 }}>
          <p style={{ ...sectionLabel, fontSize: 10, color: c.text3, marginBottom: 20, textAlign: "center" }}>
            {t("success.proof.title")}
          </p>

          {/* Stats grid */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, justifyContent: "center" }}>
            <StatBox value={t("success.proof.stat1")} label={t("success.proof.stat1Label")} />
            <StatBox value={t("success.proof.stat2")} label={t("success.proof.stat2Label")} />
            <StatBox value={t("success.proof.stat3")} label={t("success.proof.stat3Label")} />
            <StatBox value={t("success.proof.stat4")} label={t("success.proof.stat4Label")} />
          </div>

          {/* Testimonial quote */}
          <div style={{
            ...inset,
            padding: "20px 24px",
            maxWidth: 440,
            margin: "0 auto",
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              top: 12,
              left: 18,
              fontSize: 32,
              color: c.text4,
              fontFamily: "Georgia, serif",
              lineHeight: 1,
              opacity: 0.5,
            }}>
              &#x201C;
            </div>
            <p style={{
              fontSize: 14,
              color: c.text2,
              lineHeight: 1.65,
              fontStyle: "italic",
              paddingLeft: 20,
              marginBottom: 12,
            }}>
              {t("success.proof.quote")}
            </p>
            <p style={{
              fontSize: 11,
              color: c.text3,
              fontWeight: 600,
              paddingLeft: 20,
              margin: 0,
            }}>
              -- {t("success.proof.quoteRole")}
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            SECTION 5: Role Qualification
            ═══════════════════════════════════════════════════ */}
        <div className="gt-panel" style={{ padding: "28px 32px", textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: c.text2, marginBottom: 14 }}>
            {t("success.roleQuestion")}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {["CFO", "CIO/CTO", "VP Ops", "Procurement", "Other"].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  localStorage.setItem("vg_buyer_role", role);
                }}
                className="gt-btn"
                style={{
                  padding: "7px 18px",
                  borderRadius: 20,
                  background: selectedRole === role ? c.accentBg : "rgba(0,0,0,0.22)",
                  border: selectedRole === role ? `1.5px solid ${c.accent}` : `1px solid ${c.border}`,
                  color: selectedRole === role ? c.text1 : c.text3,
                  fontSize: 12,
                  transition: "all 200ms",
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Back to home */}
        <div style={{ textAlign: "center" }}>
          <a href="/" className="gt-btn gt-btn-ghost">
            {t("success.back")}
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
