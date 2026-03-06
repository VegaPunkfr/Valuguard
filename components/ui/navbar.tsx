"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import LanguageSelector from "@/components/ui/language-selector";

const A = "#3b82f6";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const BD = "rgba(36,48,78,0.32)";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";

function VGLogo() {
  return (
    <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="7" fill="rgba(59,130,246,0.10)" stroke={A} strokeWidth="1.2" />
        <text x="16" y="21" textAnchor="middle" fill={A} style={{ fontSize: 14, fontWeight: 800, fontFamily: MO }}>VG</text>
      </svg>
      <span style={{ fontSize: 13, fontFamily: MO, fontWeight: 700, letterSpacing: ".05em", color: A }}>
        Valuguard
      </span>
    </a>
  );
}

export default function Navbar() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(function () {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return function () { window.removeEventListener("scroll", onScroll); };
  }, []);

  // Close mobile menu on route change / resize
  useEffect(function () {
    function onResize() { if (window.innerWidth > 768) setMobileOpen(false); }
    window.addEventListener("resize", onResize);
    return function () { window.removeEventListener("resize", onResize); };
  }, []);

  const navLinks = [
    { href: "/#methodology", label: t("nav.methodology") },
    { href: "/#technology", label: t("nav.technology") },
    { href: "/#pricing", label: t("nav.pricing") },
    { href: "/security-vault", label: t("nav.security") },
    { href: "/sample-report", label: t("nav.example") },
  ];

  return (
    <>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          padding: scrolled ? "10px 0" : "14px 0",
          background: scrolled ? "rgba(6,9,18,0.92)" : "rgba(6,9,18,0.60)",
          backdropFilter: "blur(16px) saturate(1.2)",
          WebkitBackdropFilter: "blur(16px) saturate(1.2)",
          borderBottom: "1px solid " + (scrolled ? BD : "transparent"),
          transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <VGLogo />

          {/* Desktop nav */}
          <div className="vg-desktop-nav" style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {navLinks.map(function (link) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  style={{ fontSize: 14, color: T2, textDecoration: "none", fontWeight: 500, transition: "color 0.15s" }}
                  onMouseEnter={function (e) { (e.target as HTMLElement).style.color = T1; }}
                  onMouseLeave={function (e) { (e.target as HTMLElement).style.color = T2; }}
                >
                  {link.label}
                </a>
              );
            })}
            <LanguageSelector />
            <a
              href="/estimator"
              style={{
                fontSize: 13, fontWeight: 700, color: "#fff", background: A,
                padding: "10px 20px", borderRadius: 7, textDecoration: "none",
                letterSpacing: ".03em", transition: "opacity 0.15s",
              }}
              onMouseEnter={function (e) { (e.target as HTMLElement).style.opacity = "0.85"; }}
              onMouseLeave={function (e) { (e.target as HTMLElement).style.opacity = "1"; }}
            >
              {t("nav.cta")}
            </a>
          </div>

          {/* Hamburger */}
          <button
            className="vg-hamburger"
            onClick={function () { setMobileOpen(!mobileOpen); }}
            aria-label="Menu"
            style={{
              display: "none", background: "none", border: "1px solid " + BD,
              borderRadius: 6, padding: "6px 8px", cursor: "pointer",
              color: T2, fontSize: 18, lineHeight: 1,
            }}
          >
            {mobileOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="vg-mobile-drawer"
            style={{
              position: "fixed", top: 54, left: 0, right: 0, zIndex: 99,
              background: "rgba(6,9,18,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid " + BD,
              padding: "20px 16px 24px",
              display: "none",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {navLinks.map(function (link) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={function () { setMobileOpen(false); }}
                  style={{
                    display: "block", fontSize: 14, color: T2, textDecoration: "none",
                    fontWeight: 500, padding: "10px 12px", borderRadius: 8,
                    transition: "background 0.15s",
                  }}
                >
                  {link.label}
                </a>
              );
            })}
            <div style={{ padding: "10px 12px" }}>
              <LanguageSelector />
            </div>
            <a
              href="/estimator"
              onClick={function () { setMobileOpen(false); }}
              style={{
                display: "block", fontSize: 12, fontWeight: 700, color: "#fff",
                background: A, padding: "12px 18px", borderRadius: 8,
                textDecoration: "none", textAlign: "center",
                letterSpacing: ".04em", marginTop: 4,
              }}
            >
              {t("nav.cta")}
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .vg-desktop-nav { display: none !important; }
          .vg-hamburger { display: block !important; }
          .vg-mobile-drawer { display: flex !important; }
        }
      `}</style>
    </>
  );
}
