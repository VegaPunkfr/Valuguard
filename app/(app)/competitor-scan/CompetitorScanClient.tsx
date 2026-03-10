"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────

interface ScanSource {
  domain: string;
  toolCount: number;
}

interface ScanCompetitor {
  domain: string;
  toolCount: number;
  summary: string;
  hiringSignals: string[];
}

interface CategoryComparison {
  category: string;
  sourceCount: number;
  competitorCount: number;
  delta: number;
}

interface ScanComparison {
  competitorUniqueTools: string[];
  sourceUniqueTools: string[];
  sharedTools: string[];
  competitorUniqueCount: number;
  sourceUniqueCount: number;
  sharedCount: number;
  categoryComparison: CategoryComparison[];
  headline: string;
  insight: string;
}

interface ScanCTA {
  fullScan: { label: string; url: string; priceEur: number };
  shareWithCompetitor: { label: string; url: string };
}

interface ScanResult {
  source: ScanSource;
  competitor: ScanCompetitor;
  comparison: ScanComparison;
  cta: ScanCTA;
  meta: { generatedAt: string; isPreview: boolean; note: string };
}

interface ScanError {
  error: string;
  message?: string;
  cta?: { label: string; url: string };
}

// ── Domain Validation ────────────────────────────────────

const DOMAIN_RE =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

function cleanDomain(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}

function isValidDomain(d: string): boolean {
  const c = cleanDomain(d);
  return c.length > 0 && c.length <= 253 && DOMAIN_RE.test(c);
}

// ── Component ────────────────────────────────────────────

export default function CompetitorScanClient() {
  const searchParams = useSearchParams();

  const [source, setSource] = useState(searchParams.get("source") ?? "");
  const [target, setTarget] = useState(searchParams.get("target") ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<ScanError | null>(null);
  const [formError, setFormError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  // Auto-submit if both params provided
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (
      !autoSubmitted.current &&
      searchParams.get("source") &&
      searchParams.get("target")
    ) {
      autoSubmitted.current = true;
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setFormError("");
      setError(null);
      setResult(null);

      const s = cleanDomain(source);
      const t = cleanDomain(target);

      if (!s) {
        setFormError("Enter your company domain.");
        return;
      }
      if (!isValidDomain(s)) {
        setFormError("Invalid source domain format.");
        return;
      }
      if (!t) {
        setFormError("Enter a competitor domain.");
        return;
      }
      if (!isValidDomain(t)) {
        setFormError("Invalid competitor domain format.");
        return;
      }
      if (s === t) {
        setFormError("Source and competitor domains must be different.");
        return;
      }

      setLoading(true);

      try {
        const url = `/api/scan/competitor?source=${encodeURIComponent(s)}&target=${encodeURIComponent(t)}`;
        const res = await fetch(url, { redirect: "follow" });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Request failed" }));
          setError(body as ScanError);
          return;
        }

        const data: ScanResult = await res.json();
        setResult(data);

        // Scroll to results after render
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } catch {
        setError({ error: "Network error. Please try again." });
      } finally {
        setLoading(false);
      }
    },
    [source, target]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--gt-bg)",
        paddingTop: 80,
        paddingBottom: 120,
      }}
    >
      <div className="gt-container" style={{ maxWidth: 960 }}>
        {/* ── Header ──────────────────────────── */}
        <header style={{ textAlign: "center", marginBottom: 56 }}>
          <p className="gt-section-label" style={{ marginBottom: 14 }}>
            Competitor Intelligence
          </p>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--gt-text-1)",
              marginBottom: 16,
            }}
          >
            Scan Your Competitor
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--gt-text-2)",
              maxWidth: 540,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Compare your tech stack with a competitor. Discover tools they use
            that you don't — and uncover hidden exposure gaps.
          </p>
        </header>

        {/* ── Form ────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="gt-card"
          style={{ padding: "32px 28px", marginBottom: 48 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
            className="scan-form-grid"
          >
            <div>
              <label className="gt-label" htmlFor="source-domain">
                Your Company Domain
              </label>
              <input
                id="source-domain"
                className="gt-input gt-input-mono"
                type="text"
                placeholder="acme.com"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="gt-label" htmlFor="target-domain">
                Competitor Domain
              </label>
              <input
                id="target-domain"
                className="gt-input gt-input-mono"
                type="text"
                placeholder="competitor.com"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>

          {formError && (
            <p
              style={{
                color: "var(--gt-red)",
                fontSize: 13,
                fontFamily: "var(--gt-font-mono)",
                marginTop: 12,
              }}
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="gt-btn gt-btn-primary"
            disabled={loading}
            style={{ width: "100%", marginTop: 24, position: "relative" }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <Spinner />
                Scanning competitor stack...
              </span>
            ) : (
              "Run Competitor Scan"
            )}
          </button>
        </form>

        {/* ── API Error ───────────────────────── */}
        {error && (
          <div
            className="gt-card"
            style={{
              padding: "28px 24px",
              borderColor: "var(--gt-red-bd)",
              marginBottom: 48,
            }}
          >
            <p style={{ color: "var(--gt-red)", fontWeight: 600, marginBottom: 8 }}>
              {error.error}
            </p>
            {error.message && (
              <p style={{ color: "var(--gt-text-2)", fontSize: 14, marginBottom: 16 }}>
                {error.message}
              </p>
            )}
            {error.cta && (
              <a
                href={error.cta.url}
                className="gt-btn gt-btn-accent-ghost"
                style={{ textDecoration: "none" }}
              >
                {error.cta.label}
              </a>
            )}
          </div>
        )}

        {/* ── Results ─────────────────────────── */}
        {result && (
          <div ref={resultRef} className="scan-results-appear">
            <ResultsView data={result} />
          </div>
        )}
      </div>

      {/* ── Scoped styles ─────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .scan-form-grid {
            grid-template-columns: 1fr !important;
          }
          .scan-columns {
            grid-template-columns: 1fr !important;
          }
          .category-row-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
        }
        .scan-results-appear {
          animation: scanReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes scanReveal {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />
    </div>
  );
}

// ── Results View ─────────────────────────────────────────

function ResultsView({ data }: { data: ScanResult }) {
  const { source, competitor, comparison, cta } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Headline + Insight ─────────────── */}
      <div className="gt-card" style={{ padding: "32px 28px", textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(22px, 3vw, 32px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--gt-text-1)",
            marginBottom: 12,
          }}
        >
          {comparison.headline}
        </h2>
        <p style={{ color: "var(--gt-text-2)", fontSize: 15, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
          {comparison.insight}
        </p>
      </div>

      {/* ── Side-by-Side Comparison ────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}
        className="scan-columns"
      >
        {/* Your Company */}
        <StackColumn
          title="Your Company"
          domain={source.domain}
          toolCount={source.toolCount}
          uniqueTools={comparison.sourceUniqueTools}
          uniqueCount={comparison.sourceUniqueCount}
          accent="var(--gt-accent)"
          accentBg="var(--gt-accent-bg)"
          accentBd="var(--gt-accent-bd)"
        />

        {/* Shared */}
        <div className="gt-card" style={{ padding: "24px 20px" }}>
          <p className="gt-section-label" style={{ marginBottom: 16, textAlign: "center" }}>
            Shared Tools
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                fontFamily: "var(--gt-font-mono)",
                color: "var(--gt-text-1)",
              }}
            >
              {comparison.sharedCount}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {comparison.sharedTools.map((t) => (
              <span key={t} className="gt-badge gt-badge--muted">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Competitor */}
        <StackColumn
          title="Competitor"
          domain={competitor.domain}
          toolCount={competitor.toolCount}
          uniqueTools={comparison.competitorUniqueTools}
          uniqueCount={comparison.competitorUniqueCount}
          accent="var(--gt-red)"
          accentBg="var(--gt-red-bg)"
          accentBd="var(--gt-red-bd)"
          hiringSignals={competitor.hiringSignals}
        />
      </div>

      {/* ── Category Comparison ────────────── */}
      {comparison.categoryComparison.length > 0 && (
        <div className="gt-card" style={{ padding: "28px 24px" }}>
          <p className="gt-section-label" style={{ marginBottom: 20 }}>
            Category Breakdown
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {comparison.categoryComparison.map((cat) => (
              <CategoryRow
                key={cat.category}
                category={cat.category}
                sourceCount={cat.sourceCount}
                competitorCount={cat.competitorCount}
                delta={cat.delta}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Competitor Summary ─────────────── */}
      {competitor.summary && (
        <div className="gt-card" style={{ padding: "24px 20px" }}>
          <p className="gt-section-label" style={{ marginBottom: 12 }}>
            Competitor Profile
          </p>
          <p style={{ color: "var(--gt-text-2)", fontSize: 14, lineHeight: 1.65 }}>
            {competitor.summary}
          </p>
        </div>
      )}

      {/* ── CTAs ──────────────────────────── */}
      <div
        className="gt-card"
        style={{
          padding: "32px 28px",
          textAlign: "center",
          borderColor: "var(--gt-accent-bd)",
        }}
      >
        <p
          style={{
            color: "var(--gt-text-2)",
            fontSize: 13,
            fontFamily: "var(--gt-font-mono)",
            letterSpacing: "0.06em",
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Preview only
        </p>
        <p
          style={{
            color: "var(--gt-text-1)",
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          Get the full exposure analysis with financial quantification.
        </p>
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href={cta.fullScan.url}
            className="gt-btn gt-btn-primary"
            style={{ textDecoration: "none" }}
          >
            {cta.fullScan.label}
            <span
              style={{
                fontSize: 12,
                opacity: 0.7,
                fontFamily: "var(--gt-font-mono)",
                marginLeft: 4,
              }}
            >
              {cta.fullScan.priceEur} EUR
            </span>
          </a>
          <a
            href={cta.shareWithCompetitor.url}
            className="gt-btn gt-btn-ghost"
            style={{ textDecoration: "none" }}
          >
            {cta.shareWithCompetitor.label}
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Stack Column ─────────────────────────────────────────

function StackColumn({
  title,
  domain,
  toolCount,
  uniqueTools,
  uniqueCount,
  accent,
  accentBg,
  accentBd,
  hiringSignals,
}: {
  title: string;
  domain: string;
  toolCount: number;
  uniqueTools: string[];
  uniqueCount: number;
  accent: string;
  accentBg: string;
  accentBd: string;
  hiringSignals?: string[];
}) {
  return (
    <div className="gt-card" style={{ padding: "24px 20px" }}>
      <p className="gt-section-label" style={{ marginBottom: 6, textAlign: "center" }}>
        {title}
      </p>
      <p
        style={{
          textAlign: "center",
          fontFamily: "var(--gt-font-mono)",
          fontSize: 13,
          color: "var(--gt-text-3)",
          marginBottom: 16,
        }}
      >
        {domain}
      </p>

      {/* Tool count */}
      <div
        className="gt-inset"
        style={{
          padding: "16px 12px",
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            fontFamily: "var(--gt-font-mono)",
            color: "var(--gt-text-1)",
          }}
        >
          {toolCount}
        </span>
        <p style={{ fontSize: 11, color: "var(--gt-text-3)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Total Tools
        </p>
      </div>

      {/* Unique tools */}
      <p
        style={{
          fontSize: 12,
          fontFamily: "var(--gt-font-mono)",
          color: accent,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: "0.04em",
        }}
      >
        {uniqueCount} unique tool{uniqueCount !== 1 ? "s" : ""}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {uniqueTools.map((t) => (
          <span
            key={t}
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 10,
              fontFamily: "var(--gt-font-mono)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: "var(--gt-r-full)",
              color: accent,
              background: accentBg,
              border: `1px solid ${accentBd}`,
            }}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Hiring signals (competitor only) */}
      {hiringSignals && hiringSignals.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p
            style={{
              fontSize: 11,
              fontFamily: "var(--gt-font-mono)",
              color: "var(--gt-text-3)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Hiring Signals
          </p>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {hiringSignals.map((sig, i) => (
              <li
                key={i}
                style={{
                  fontSize: 12,
                  color: "var(--gt-text-2)",
                  lineHeight: 1.5,
                  paddingLeft: 12,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 6,
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--gt-amber)",
                  }}
                />
                {sig}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Category Row ─────────────────────────────────────────

function CategoryRow({
  category,
  sourceCount,
  competitorCount,
  delta,
}: CategoryComparison) {
  const max = Math.max(sourceCount, competitorCount, 1);
  const sourcePct = (sourceCount / max) * 100;
  const compPct = (competitorCount / max) * 100;

  const deltaColor =
    delta > 0
      ? "var(--gt-red)"
      : delta < 0
        ? "var(--gt-green)"
        : "var(--gt-text-3)";

  const deltaLabel =
    delta > 0
      ? `+${delta} competitor`
      : delta < 0
        ? `${delta} competitor`
        : "equal";

  return (
    <div
      className="gt-inset category-row-grid"
      style={{
        padding: "14px 16px",
        display: "grid",
        gridTemplateColumns: "140px 1fr 80px",
        alignItems: "center",
        gap: 16,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontFamily: "var(--gt-font-mono)",
          color: "var(--gt-text-2)",
          fontWeight: 600,
          textTransform: "capitalize",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {category}
      </span>

      {/* Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "var(--gt-accent)",
              width: `${sourcePct}%`,
              minWidth: sourceCount > 0 ? 8 : 0,
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          <span style={{ fontSize: 10, fontFamily: "var(--gt-font-mono)", color: "var(--gt-text-3)", minWidth: 14 }}>
            {sourceCount}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: "var(--gt-red)",
              width: `${compPct}%`,
              minWidth: competitorCount > 0 ? 8 : 0,
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          <span style={{ fontSize: 10, fontFamily: "var(--gt-font-mono)", color: "var(--gt-text-3)", minWidth: 14 }}>
            {competitorCount}
          </span>
        </div>
      </div>

      {/* Delta */}
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--gt-font-mono)",
          fontWeight: 700,
          color: deltaColor,
          textAlign: "right",
        }}
      >
        {deltaLabel}
      </span>
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="2.5"
      />
      <path
        d="M14.5 8a6.5 6.5 0 00-6.5-6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
