"use client";

import { useI18n } from "@/lib/i18n";
import { c } from "@/lib/tokens";

export default function BackButton({ href = "/" }: { href?: string }) {
  const { t } = useI18n();
  return (
    <div style={{ paddingTop: 20, paddingBottom: 8 }}>
      <a href={href} className="gt-btn gt-btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>
        {t("back")}
      </a>
    </div>
  );
}
