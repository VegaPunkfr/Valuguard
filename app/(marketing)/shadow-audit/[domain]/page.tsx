/**
 * GHOST TAX — TROJAN VAULT (SSR Dynamic Page)
 *
 * /shadow-audit/[domain]
 *
 * Server-rendered audit page for any domain.
 * Shows 3 vendors in clear, rest under blur-lock.
 * Prospect must enter professional email to unlock.
 *
 * This is the outbound acquisition weapon:
 *   1. OSINT scans prospect's domain (CT logs)
 *   2. Generates a terrifying Shadow Bill
 *   3. Sends link: "We found your software footprint"
 *   4. CFO sees 3 vendors → wants the rest → gives email → pipeline
 */

import { Metadata } from "next";
import { calculateShadowBill, type ShadowBill } from "@/lib/shadow-bill";
import TrojanVaultClient from "./TrojanVaultClient";

interface Props {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  const clean = decodeURIComponent(domain).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return {
    title: `Shadow Audit — ${clean} | Ghost Tax`,
    description: `Public software footprint analysis for ${clean}. ${clean}'s SaaS exposure detected via Certificate Transparency logs.`,
    robots: { index: false, follow: false }, // No indexing of prospect pages
  };
}

export default async function ShadowAuditPage({ params }: Props) {
  const { domain } = await params;
  const cleanDomain = decodeURIComponent(domain)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  // Validate
  if (!cleanDomain.includes(".") || cleanDomain.length < 3) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
        <p style={{ color: "#64748B" }}>Invalid domain.</p>
      </div>
    );
  }

  // Server-side: run the Shadow Bill pipeline
  let bill: ShadowBill | null = null;
  let error: string | null = null;

  try {
    bill = await calculateShadowBill(cleanDomain, 100);
  } catch (err) {
    error = err instanceof Error ? err.message : "Analysis failed";
    console.error("[Trojan Vault] Error for", cleanDomain, error);
  }

  return <TrojanVaultClient domain={cleanDomain} bill={bill} error={error} />;
}
