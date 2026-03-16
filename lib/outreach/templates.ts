/**
 * GHOST TAX — SNIPER EMAIL TEMPLATES (SERVER-ONLY)
 *
 * Sprint 4 : Copywriting chirurgical plain-text.
 *
 * Plain text ONLY — pas d'HTML lourd.
 * Raison : délivrabilité 100%, anti-spam, crédibilité CFO.
 *
 * Usage:
 *   import { buildSniperEmail } from "@/lib/outreach/templates";
 *   const { subject, body } = buildSniperEmail(data);
 */

import type { AuditReportPayload } from "@/types/audit";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface SniperEmailData {
  /** Prénom du décideur */
  firstName: string;
  /** Domaine de l'entreprise */
  domain: string;
  /** TVAR mensuel (EUR) */
  totalValueAtRisk: number;
  /** Première redondance détectée (ex: "CRM : Salesforce + HubSpot") */
  topRedundancy: string;
  /** Lien magique vers le rapport */
  magicLink: string;
}

export interface SniperEmail {
  subject: string;
  body: string;
}

// ══════════════════════════════════════════════════════
//  MAIN: buildSniperEmail()
// ══════════════════════════════════════════════════════

/**
 * Génère l'email sniper plain-text.
 *
 * Court. Factuel. Pas de fluff. Le lien fait le travail.
 */
export function buildSniperEmail(data: SniperEmailData): SniperEmail {
  const tvarFormatted = new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(data.totalValueAtRisk);

  const subject = `Audit confidentiel de l'infrastructure ${data.domain}`;

  const body = [
    `Bonjour ${data.firstName},`,
    ``,
    `Mon système a détecté une fuite budgétaire estimée à ${tvarFormatted} €/mois sur votre stack actuelle, notamment à cause d'une redondance sur ${data.topRedundancy}.`,
    ``,
    `J'ai compilé les preuves et le protocole de récupération dans ce rapport sécurisé :`,
    `${data.magicLink}`,
    ``,
    `Le lien expire dans 14 jours.`,
    ``,
    `— Ghost Tax`,
    `Decision Intelligence for IT Financial Exposure`,
  ].join("\n");

  return { subject, body };
}

// ══════════════════════════════════════════════════════
//  EXTRACT DATA FROM PAYLOAD
// ══════════════════════════════════════════════════════

/**
 * Extrait les données nécessaires au template depuis un AuditReportPayload.
 * Fournit des fallbacks robustes si des données manquent.
 */
export function extractSniperData(
  payload: AuditReportPayload,
  magicLink: string,
): SniperEmailData {
  // Prénom du décideur (fallback: "Responsable")
  const firstName = payload.decisionMaker?.firstName
    ?? payload.decisionMaker?.fullName?.split(" ")[0]
    ?? "Responsable";

  // Top redondance (la première détectée, ou le top waste driver)
  let topRedundancy = "outils redondants";

  const redundancies = payload.shadowBill.tvar.detectedRedundancies;
  if (redundancies.length > 0) {
    topRedundancy = redundancies[0];
  } else if (payload.shadowBill.topWasteDrivers.length > 0) {
    topRedundancy = payload.shadowBill.topWasteDrivers[0].label;
  }

  return {
    firstName,
    domain: payload.domain,
    totalValueAtRisk: payload.shadowBill.tvar.totalValueAtRisk,
    topRedundancy,
    magicLink,
  };
}
