"use client";

import { c } from "@/lib/tokens";

export default function ConfirmationBox({
  icon = "\u2713",
  iconColor = c.green,
  children,
}: {
  icon?: string;
  iconColor?: string;
  children: React.ReactNode;
}) {
  const isGreen = iconColor === c.green;

  return (
    <>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: isGreen ? c.greenBg : c.amberBg,
        border: "1px solid " + (isGreen ? c.greenBd : c.amberBd),
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", fontSize: 24, color: iconColor,
      }}>
        {icon}
      </div>
      {children}
    </>
  );
}
