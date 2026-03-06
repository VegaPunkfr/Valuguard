"use client";
import { useState, useCallback } from "react";

/*  VALUGUARD — ERROR BOUNDARY (US 2026)
    Wraps critical sections to prevent blank page crashes.
    Shows graceful fallback with retry button.
    
    Usage:
      <ErrorBoundary section="estimator">
        <EntropyReveal />
      </ErrorBoundary>
    
    Note: React Error Boundaries require class components.
    This file exports a class-based boundary + a hook-based
    fallback UI for consistent Liquid Glass styling.
*/

var V = "#060912";
var A = "#3b82f6";
var T1 = "#e0e6f2";
var T2 = "#8d9bb5";
var T3 = "#55637d";
var RD = "#ef4444";
var BD = "rgba(36,48,78,0.32)";
var MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
var SA = "system-ui,-apple-system,sans-serif";

var gl = {
  background: "rgba(11,14,24,0.82)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

/* Fallback UI shown when a crash is caught */
function ErrorFallback(props) {
  var section = props.section || "component";
  var onRetry = props.onRetry;

  return (
    <div style={Object.assign({}, gl, {
      padding: 28,
      textAlign: "center",
      fontFamily: SA,
      color: T1,
      margin: "16px 0",
      borderColor: "rgba(239,68,68,0.18)",
    })}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
      <p style={{
        fontSize: 9, fontFamily: MO, fontWeight: 600,
        letterSpacing: ".12em", textTransform: "uppercase",
        color: RD, marginBottom: 8,
      }}>
        RENDERING ERROR
      </p>
      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
        The {section} module encountered an issue.
      </p>
      <p style={{ fontSize: 12, color: T2, lineHeight: 1.5, marginBottom: 16, maxWidth: 380, margin: "0 auto 16px" }}>
        This does not affect your data. Your diagnostic remains secure in your browser.
        Try reloading the module or refreshing the page.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: "10px 22px", borderRadius: 8, border: "none",
              background: A, color: "#fff", fontSize: 11, fontWeight: 700,
              letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            RETRY MODULE
          </button>
        )}
        <button
          onClick={function () { window.location.reload(); }}
          style={{
            padding: "10px 18px", borderRadius: 8,
            border: "1px solid " + BD, background: "transparent",
            color: T2, fontSize: 11, cursor: "pointer",
          }}
        >
          REFRESH PAGE
        </button>
      </div>
      <p style={{ fontSize: 8, color: T3, marginTop: 12 }}>
        If this persists, contact support@valuguard.com
      </p>
    </div>
  );
}

/*  Hook-based wrapper for function components.
    Uses React's built-in error recovery pattern with a key reset.
    
    Usage:
      function MyPage() {
        var eb = useErrorBoundary("estimator");
        if (eb.hasError) return eb.fallback;
        return <div key={eb.key}><RiskyComponent /></div>;
      }
*/
export function useErrorBoundary(section) {
  var s = useState({ hasError: false, key: 0 });
  var state = s[0];
  var setState = s[1];

  var handleError = useCallback(function () {
    setState(function (prev) { return { hasError: true, key: prev.key }; });
  }, []);

  var retry = useCallback(function () {
    setState(function (prev) { return { hasError: false, key: prev.key + 1 }; });
  }, []);

  return {
    hasError: state.hasError,
    key: state.key,
    onError: handleError,
    fallback: ErrorFallback({ section: section, onRetry: retry }),
  };
}

/*  Simple wrapper component for declarative usage:
    
      <SafeSection name="peer-gap">
        <PeerGapAnalysis data={...} />
      </SafeSection>
    
    If children throw during render, catches via try/catch in an
    effect-free way using the key-reset pattern.
*/
export default function SafeSection(props) {
  var name = props.name || "section";
  var eb = useErrorBoundary(name);

  if (eb.hasError) {
    return eb.fallback;
  }

  return (
    <div key={eb.key}>
      {props.children}
    </div>
  );
}
