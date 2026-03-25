"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function CrispChat() {
  const crispId = process.env.NEXT_PUBLIC_CRISP_ID;

  useEffect(() => {
    if (!crispId) return;

    const loadCrisp = () => {
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = crispId;

      const s = document.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = true;
      document.head.appendChild(s);
    };

    // Defer Crisp loading to avoid blocking LCP and INP
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(loadCrisp, { timeout: 5000 });
    } else {
      setTimeout(loadCrisp, 3000);
    }
  }, [crispId]);

  if (!crispId) return null;

  return null;
}
