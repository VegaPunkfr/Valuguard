/**
 * GHOST TAX — ORPHAN LICENSE DETECTION ENGINE (SERVER-ONLY)
 *
 * Architecture Event-Driven:
 *   IAM Source (Okta/Entra) ──┐
 *                             ├──▶ Cross-Reference ──▶ OrphanReport
 *   SaaS Source (SF/Notion) ──┘
 *
 * Détecte les licences orphelines: employés partis mais toujours facturés.
 * C'est le signal le plus tangible et le plus choquant pour un CFO.
 *
 * Rate Limiting: Token bucket avec retry exponentiel + respect des headers
 * Retry-After. Chaque connecteur déclare ses limites dans son manifest.
 */

import type { ConnectorCredentials } from "@/lib/plugins/types";
import type { ProofSignal } from "@/lib/analysis";

// ── Types ───────────────────────────────────────────

export interface IAMUser {
  id: string;
  email: string;
  displayName: string;
  status: "active" | "deprovisioned" | "suspended" | "staged";
  lastLogin: Date | null;
  department?: string;
  deactivatedAt?: Date | null;
}

export interface SaaSLicense {
  userId: string;
  email: string;
  displayName: string;
  licenseType: string;
  monthlyCostEur: number;
  lastActivity: Date | null;
  provisionedAt: Date;
  vendor: string;
}

export interface OrphanLicense {
  email: string;
  displayName: string;
  iamStatus: IAMUser["status"];
  deactivatedAt: Date | null;
  vendor: string;
  licenseType: string;
  monthlyCostEur: number;
  daysSinceDeactivation: number;
  annualWasteEur: number;
  lastSaaSActivity: Date | null;
  confidence: number; // 0-100
}

export interface OrphanReport {
  runId: string;
  executedAt: Date;
  executionMs: number;
  iamSource: string;
  saasSource: string;
  totalIAMUsers: number;
  totalSaaSLicenses: number;
  deactivatedUsers: number;
  orphanLicenses: OrphanLicense[];
  totalAnnualWasteEur: [number, number]; // [low, high]
  signals: ProofSignal[];
  rateLimitStatus: RateLimitStatus;
}

interface RateLimitStatus {
  iamRequestsMade: number;
  iamRequestsRemaining: number;
  saasRequestsMade: number;
  saasRequestsRemaining: number;
  throttled: boolean;
  retryAfterMs: number | null;
}

// ── Rate Limiter — Token Bucket ─────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRatePerMs: number;

  constructor(rpm: number) {
    this.maxTokens = rpm;
    this.tokens = rpm;
    this.lastRefill = Date.now();
    this.refillRatePerMs = rpm / 60_000; // tokens per ms
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitMs = Math.ceil((1 - this.tokens) / this.refillRatePerMs);
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 5000)));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;
  }

  get remaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

// ── Fetch with Rate Limit + Exponential Backoff ─────

async function fetchWithRateLimit(
  url: string,
  headers: Record<string, string>,
  bucket: TokenBucket,
  maxRetries = 3,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await bucket.acquire();

    const res = await fetch(url, { headers });

    // Respect Retry-After header (RFC 7231)
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? (parseInt(retryAfter, 10) || 1) * 1000
        : Math.min(1000 * Math.pow(2, attempt), 30_000);

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
    }

    if (!res.ok && res.status >= 500 && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }

    return res;
  }

  throw new Error(`Failed after ${maxRetries + 1} attempts`);
}

// ── Paginated Fetch (Okta uses Link header pagination) ──

async function fetchAllPages<T>(
  baseUrl: string,
  headers: Record<string, string>,
  bucket: TokenBucket,
  parseItems: (body: unknown) => T[],
  maxPages = 50,
): Promise<T[]> {
  const allItems: T[] = [];
  let url: string | null = baseUrl;
  let page = 0;

  while (url && page < maxPages) {
    const res = await fetchWithRateLimit(url, headers, bucket);
    if (!res.ok) break;

    const body = await res.json();
    allItems.push(...parseItems(body));

    // Okta-style Link header pagination
    const linkHeader = res.headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
    page++;
  }

  return allItems;
}

// ── IAM Fetchers ────────────────────────────────────

async function fetchOktaUsers(
  creds: ConnectorCredentials,
  bucket: TokenBucket,
): Promise<{ users: IAMUser[]; requestsMade: number }> {
  const domain = creds.metadata?.domain;
  if (!domain || !creds.apiKey) throw new Error("Missing Okta domain or API key");

  const headers = { Authorization: `SSWS ${creds.apiKey}`, Accept: "application/json" };
  let requestsMade = 0;

  // Fetch active users
  const activeUsers = await fetchAllPages<IAMUser>(
    `https://${domain}/api/v1/users?limit=200&filter=status eq "ACTIVE"`,
    headers,
    bucket,
    (body) => {
      requestsMade++;
      return (body as any[]).map((u) => ({
        id: u.id,
        email: u.profile?.email || u.profile?.login || "",
        displayName: `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim(),
        status: "active" as const,
        lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
        department: u.profile?.department || undefined,
        deactivatedAt: null,
      }));
    },
  );

  // Fetch deprovisioned users (the key source for orphan detection)
  const deprovisionedUsers = await fetchAllPages<IAMUser>(
    `https://${domain}/api/v1/users?limit=200&filter=status eq "DEPROVISIONED"`,
    headers,
    bucket,
    (body) => {
      requestsMade++;
      return (body as any[]).map((u) => ({
        id: u.id,
        email: u.profile?.email || u.profile?.login || "",
        displayName: `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim(),
        status: "deprovisioned" as const,
        lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
        department: u.profile?.department || undefined,
        deactivatedAt: u.statusChanged ? new Date(u.statusChanged) : null,
      }));
    },
  );

  // Fetch suspended users
  const suspendedUsers = await fetchAllPages<IAMUser>(
    `https://${domain}/api/v1/users?limit=200&filter=status eq "SUSPENDED"`,
    headers,
    bucket,
    (body) => {
      requestsMade++;
      return (body as any[]).map((u) => ({
        id: u.id,
        email: u.profile?.email || u.profile?.login || "",
        displayName: `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim(),
        status: "suspended" as const,
        lastLogin: u.lastLogin ? new Date(u.lastLogin) : null,
        department: u.profile?.department || undefined,
        deactivatedAt: u.statusChanged ? new Date(u.statusChanged) : null,
      }));
    },
  );

  return {
    users: [...activeUsers, ...deprovisionedUsers, ...suspendedUsers],
    requestsMade,
  };
}

async function fetchEntraUsers(
  creds: ConnectorCredentials,
  bucket: TokenBucket,
): Promise<{ users: IAMUser[]; requestsMade: number }> {
  if (!creds.accessToken) throw new Error("Missing Microsoft Entra access token");

  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" };
  let requestsMade = 0;

  // Microsoft Graph: fetch all users including disabled
  const allUsers = await fetchAllPages<IAMUser>(
    "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,signInActivity&$top=999",
    headers,
    bucket,
    (body: any) => {
      requestsMade++;
      return (body.value || []).map((u: any) => ({
        id: u.id,
        email: u.mail || u.userPrincipalName || "",
        displayName: u.displayName || "",
        status: u.accountEnabled ? "active" as const : "deprovisioned" as const,
        lastLogin: u.signInActivity?.lastSignInDateTime
          ? new Date(u.signInActivity.lastSignInDateTime)
          : null,
        department: u.department || undefined,
        deactivatedAt: u.accountEnabled ? null : new Date(), // Entra doesn't expose exact date
      }));
    },
  );

  return { users: allUsers, requestsMade };
}

// ── SaaS License Fetchers ───────────────────────────

async function fetchSalesforceLicenses(
  creds: ConnectorCredentials,
  bucket: TokenBucket,
): Promise<{ licenses: SaaSLicense[]; requestsMade: number }> {
  if (!creds.accessToken) throw new Error("Missing Salesforce OAuth token");

  const instanceUrl = creds.metadata?.instanceUrl || "";
  const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" };
  let requestsMade = 0;

  const query = encodeURIComponent(
    "SELECT Id, Name, Email, IsActive, LastLoginDate, Profile.Name, UserType, CreatedDate FROM User WHERE IsActive = true"
  );

  const res = await fetchWithRateLimit(
    `${instanceUrl}/services/data/v59.0/query?q=${query}`,
    headers,
    bucket,
  );
  requestsMade++;

  if (!res.ok) throw new Error(`Salesforce API error: ${res.status}`);
  const data = await res.json();

  // Salesforce license cost mapping (avg monthly per license type)
  const licenseCosts: Record<string, number> = {
    "System Administrator": 200,
    "Standard User": 150,
    "Chatter Free User": 0,
    "Analytics Cloud Security User": 75,
    "Marketing User": 125,
    "Force.com - Free": 0,
    "default": 150,
  };

  const licenses: SaaSLicense[] = (data.records || []).map((u: any) => {
    const profileName = u.Profile?.Name || u.UserType || "Standard User";
    return {
      userId: u.Id,
      email: u.Email || "",
      displayName: u.Name || "",
      licenseType: profileName,
      monthlyCostEur: licenseCosts[profileName] || licenseCosts["default"],
      lastActivity: u.LastLoginDate ? new Date(u.LastLoginDate) : null,
      provisionedAt: new Date(u.CreatedDate),
      vendor: "Salesforce",
    };
  });

  return { licenses, requestsMade };
}

// ── Cross-Reference Engine ──────────────────────────

function crossReference(
  iamUsers: IAMUser[],
  saasLicenses: SaaSLicense[],
): OrphanLicense[] {
  // Build email index from IAM (deprovisioned + suspended)
  const inactiveUsers = new Map<string, IAMUser>();
  for (const user of iamUsers) {
    if (user.status === "deprovisioned" || user.status === "suspended") {
      const email = user.email.toLowerCase().trim();
      if (email) inactiveUsers.set(email, user);
    }
  }

  // Also find users inactive >90 days (still "active" in IAM but ghost)
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  for (const user of iamUsers) {
    if (user.status === "active" && user.lastLogin && user.lastLogin < ninetyDaysAgo) {
      const email = user.email.toLowerCase().trim();
      if (email && !inactiveUsers.has(email)) {
        inactiveUsers.set(email, { ...user, status: "suspended" }); // Treat as ghost
      }
    }
  }

  // Cross-reference: find SaaS licenses assigned to inactive IAM users
  const orphans: OrphanLicense[] = [];

  for (const license of saasLicenses) {
    const email = license.email.toLowerCase().trim();
    const iamUser = inactiveUsers.get(email);

    if (iamUser) {
      const deactivatedAt = iamUser.deactivatedAt || iamUser.lastLogin || now;
      const daysSince = Math.floor(
        (now.getTime() - deactivatedAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Confidence: higher if user is truly deprovisioned vs just inactive
      const confidence =
        iamUser.status === "deprovisioned" ? 92 :
        iamUser.status === "suspended" ? 78 :
        55; // ghost (active in IAM but no login 90d+)

      orphans.push({
        email,
        displayName: iamUser.displayName || license.displayName,
        iamStatus: iamUser.status,
        deactivatedAt: iamUser.deactivatedAt ?? null,
        vendor: license.vendor,
        licenseType: license.licenseType,
        monthlyCostEur: license.monthlyCostEur,
        daysSinceDeactivation: daysSince,
        annualWasteEur: license.monthlyCostEur * 12,
        lastSaaSActivity: license.lastActivity,
        confidence,
      });
    }
  }

  // Sort by annual waste descending (CFO wants biggest leaks first)
  orphans.sort((a, b) => b.annualWasteEur - a.annualWasteEur);

  return orphans;
}

// ── Generate ProofSignals from Orphans ──────────────

function orphansToSignals(orphans: OrphanLicense[]): ProofSignal[] {
  if (orphans.length === 0) return [];

  const totalAnnual = orphans.reduce((s, o) => s + o.annualWasteEur, 0);
  const vendors = [...new Set(orphans.map((o) => o.vendor))];
  const avgConfidence = Math.round(orphans.reduce((s, o) => s + o.confidence, 0) / orphans.length);

  const signals: ProofSignal[] = [
    {
      type: "orphan_licenses_aggregate",
      label: `${orphans.length} licences orphelines détectées — ${totalAnnual.toLocaleString()} EUR/an`,
      description:
        `Croisement IAM × SaaS: ${orphans.length} employés inactifs/partis avec des licences encore facturées ` +
        `chez ${vendors.join(", ")}. Coût annuel: ${totalAnnual.toLocaleString()} EUR. ` +
        `Moyenne ${Math.round(totalAnnual / orphans.length).toLocaleString()} EUR/licence orpheline.`,
      impactEurRange: [Math.round(totalAnnual * 0.85), totalAnnual],
      severity: totalAnnual > 50_000 ? "critical" : totalAnnual > 20_000 ? "high" : "medium",
      evidence: ["iam_cross_reference", "saas_license_audit", `confidence_${avgConfidence}`],
    },
  ];

  // Top 3 individual orphans as separate signals
  for (const orphan of orphans.slice(0, 3)) {
    signals.push({
      type: "orphan_license_individual",
      label: `${orphan.displayName}: ${orphan.vendor} ${orphan.licenseType} — ${orphan.annualWasteEur.toLocaleString()} EUR/an`,
      description:
        `Statut IAM: ${orphan.iamStatus}. ` +
        `${orphan.daysSinceDeactivation} jours depuis désactivation. ` +
        `Licence ${orphan.licenseType} à ${orphan.monthlyCostEur} EUR/mois toujours active.`,
      impactEurRange: [orphan.annualWasteEur, orphan.annualWasteEur],
      severity: orphan.annualWasteEur > 3000 ? "high" : "medium",
      evidence: ["iam_cross_reference", `confidence_${orphan.confidence}`],
    });
  }

  return signals;
}

// ── Main Orchestrator ───────────────────────────────

export async function detectOrphanLicenses(config: {
  iamProvider: "okta" | "entra";
  iamCreds: ConnectorCredentials;
  saasProvider: "salesforce";
  saasCreds: ConnectorCredentials;
  runId: string;
}): Promise<OrphanReport> {
  const start = Date.now();

  // Initialize rate limiters from connector manifests
  const iamBucket = new TokenBucket(config.iamProvider === "okta" ? 600 : 200);
  const saasBucket = new TokenBucket(100); // Salesforce default

  // Phase 1: Fetch IAM users (parallel-ready)
  const iamResult = config.iamProvider === "okta"
    ? await fetchOktaUsers(config.iamCreds, iamBucket)
    : await fetchEntraUsers(config.iamCreds, iamBucket);

  // Phase 2: Fetch SaaS licenses
  const saasResult = await fetchSalesforceLicenses(config.saasCreds, saasBucket);

  // Phase 3: Cross-reference
  const orphans = crossReference(iamResult.users, saasResult.licenses);

  // Phase 4: Generate intelligence signals
  const signals = orphansToSignals(orphans);

  const totalWaste = orphans.reduce((s, o) => s + o.annualWasteEur, 0);
  const deactivatedCount = iamResult.users.filter(
    (u) => u.status === "deprovisioned" || u.status === "suspended"
  ).length;

  return {
    runId: config.runId,
    executedAt: new Date(),
    executionMs: Date.now() - start,
    iamSource: config.iamProvider,
    saasSource: config.saasProvider,
    totalIAMUsers: iamResult.users.length,
    totalSaaSLicenses: saasResult.licenses.length,
    deactivatedUsers: deactivatedCount,
    orphanLicenses: orphans,
    totalAnnualWasteEur: [Math.round(totalWaste * 0.85), totalWaste],
    signals,
    rateLimitStatus: {
      iamRequestsMade: iamResult.requestsMade,
      iamRequestsRemaining: iamBucket.remaining,
      saasRequestsMade: saasResult.requestsMade,
      saasRequestsRemaining: saasBucket.remaining,
      throttled: false,
      retryAfterMs: null,
    },
  };
}
