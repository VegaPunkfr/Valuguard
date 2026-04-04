"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";
import LanguageSelector from "@/components/ui/language-selector";

export default function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide navbar on command center & cockpit — they have their own navigation
  if (pathname?.startsWith("/command") || pathname?.startsWith("/cockpit")) return null;

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
    { href: "/intel", label: t("nav.decisionroom") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/platform", label: t("nav.platform") },
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
          minHeight: 56,
          padding: scrolled ? "10px 0" : "14px 0",
          background: scrolled ? "rgba(6,9,18,0.98)" : "rgba(6,9,18,0.75)",
          backdropFilter: "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: "blur(20px) saturate(1.2)",
          borderBottom: scrolled ? "1px solid rgba(36,48,78,0.40)" : "1px solid transparent",
          transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="gt-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo + optional back button */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {pathname !== "/" && (
              <button
                onClick={() => window.history.back()}
                aria-label={t("nav.back") || "Retour"}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "none", border: "none", cursor: "pointer",
                  color: c.text3, fontSize: 13, fontFamily: f.mono,
                  padding: "4px 8px", borderRadius: 6, transition: "color 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = c.text1)}
                onMouseLeave={(e) => (e.currentTarget.style.color = c.text3)}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
                <span>{t("nav.back") || "Retour"}</span>
              </button>
            )}
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <img src="/favicon.svg" alt="Ghost Tax" width={30} height={30} style={{ borderRadius: 8 }} />
              <span style={{ fontSize: 15, fontFamily: f.mono, fontWeight: 700, letterSpacing: ".04em", color: "#e4e9f4" }}>
                Ghost Tax
              </span>
            </a>
          </div>

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
            aria-label={t("nav.menu") || "Menu"}
            aria-expanded={mobileOpen}
            style={{
              display: "none", background: "none", border: "1px solid " + c.borderS,
              borderRadius: 8, padding: "12px 14px", cursor: "pointer",
              color: c.text2, fontSize: 24, lineHeight: 1,
            }}
          >
            {mobileOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
      </nav>

      {/* Mobile drawer — CSS transition instead of framer-motion */}
      <div
        className="gt-mobile gt-mobile-drawer"
        style={{
          position: "fixed", top: 56, left: 0, right: 0, zIndex: 99,
          background: "rgba(6,9,18,0.98)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid " + c.border,
          padding: "16px 20px 24px",
          display: "none",
          flexDirection: "column",
          gap: 4,
          opacity: mobileOpen ? 1 : 0,
          transform: mobileOpen ? "translateY(0)" : "translateY(-10px)",
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)",
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
      </div>

      <style>{`
        .gt-nav-link:hover { color: ${c.text1} !important; }
      `}</style>
    </>
  );
}