"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";
import LanguageSelector from "@/components/ui/language-selector";

export default function Navbar() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const links = [
    { href: "/platform", label: t("nav.platform") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/intel", label: t("nav.decisionroom") },
    { href: "/methodology", label: t("nav.methodology") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <>
      <nav
        className={scrolled ? "gt-nav-scrolled" : ""}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          padding: scrolled ? "10px 0" : "14px 0",
          background: scrolled ? "rgba(5,8,16,0.92)" : "rgba(5,8,16,0.50)",
          backdropFilter: "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: "blur(20px) saturate(1.2)",
          borderBottom: scrolled ? "1px solid " + c.border : "1px solid transparent",
          transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="gt-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: c.accentBg, border: "1px solid " + c.accentBd,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, fontFamily: f.mono, color: c.accent,
            }}>
              GT
            </div>
            <span style={{ fontSize: 15, fontFamily: f.mono, fontWeight: 700, letterSpacing: ".04em", color: c.accent }}>
              Ghost Tax
            </span>
          </a>

          {/* Desktop nav */}
          <div className="gt-desktop" style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="gt-nav-link"
                style={{
                  fontSize: 14, color: c.text2, textDecoration: "none",
                  fontWeight: 500, transition: "color 150ms",
                }}
              >
                {link.label}
              </a>
            ))}
            <LanguageSelector />
            <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "9px 20px", fontSize: 13, fontWeight: 600 }}>
              {t("nav.runcta")}
            </a>
          </div>

          {/* Hamburger */}
          <button
            className="gt-mobile"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            style={{
              display: "none", background: "none", border: "1px solid " + c.borderS,
              borderRadius: 8, padding: "8px 10px", cursor: "pointer",
              color: c.text2, fontSize: 20, lineHeight: 1,
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
            className="gt-mobile"
            style={{
              position: "fixed", top: 56, left: 0, right: 0, zIndex: 99,
              background: "rgba(5,8,16,0.97)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderBottom: "1px solid " + c.border,
              padding: "16px 20px 24px",
              display: "none",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "block", fontSize: 16, color: c.text2, textDecoration: "none",
                  fontWeight: 500, padding: "12px 14px", borderRadius: 8,
                  transition: "background 150ms",
                }}
              >
                {link.label}
              </a>
            ))}
            <div style={{ padding: "12px 14px" }}>
              <LanguageSelector />
            </div>
            <a
              href="/intel"
              onClick={() => setMobileOpen(false)}
              className="gt-btn gt-btn-primary"
              style={{ textAlign: "center", marginTop: 4 }}
            >
              {t("nav.runcta")}
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .gt-nav-link:hover { color: ${c.text1} !important; }
      `}</style>
    </>
  );
}
