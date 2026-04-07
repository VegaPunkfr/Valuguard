/**
 * GHOST TAX — TIMEZONE-AWARE SEND WINDOW ENGINE
 *
 * Ensures emails land in the CFO's inbox at the OPTIMAL moment:
 *   - Tuesday, Wednesday, Thursday ONLY (no Mon/Fri/weekend)
 *   - 9:30–11:30 local time of the recipient
 *   - Timezone-aware per geo_market / locale / TLD
 *
 * Data-backed (2026 studies):
 *   - Tue-Thu 9:30-11:30 local = peak engagement for B2B CFOs
 *   - Monday = bulk-delete day (backlog), avoid
 *   - Friday = brain off, 17% reply rate, avoid
 *   - Signal-based timing (24-48h after trigger) = 3-5x reply rate
 *   - 8:30 UTC = sweet spot for UK (9:30 BST) + DE/NL (10:30 CEST)
 *
 * April 2026 offsets (DST active):
 *   UK = BST = UTC+1
 *   DE/NL/AT/CH = CEST = UTC+2
 *   US East = EDT = UTC-4
 *   US West = PDT = UTC-7
 */

// ── Timezone offset map (hours from UTC, DST-aware) ────────

interface TzConfig {
  offsetHours: number; // current UTC offset (DST-aware)
  label: string;
}

/**
 * Returns UTC offset in hours for a given market.
 * Uses DST rules: checks if date falls in summer time.
 */
function isDST(date: Date, region: "eu" | "us"): boolean {
  if (region === "eu") {
    // EU DST: last Sunday of March → last Sunday of October
    const year = date.getUTCFullYear();
    const marchLast = new Date(Date.UTC(year, 2, 31));
    const dstStart = new Date(marchLast);
    dstStart.setUTCDate(31 - marchLast.getUTCDay()); // last Sunday of March
    dstStart.setUTCHours(1, 0, 0, 0); // 01:00 UTC

    const octLast = new Date(Date.UTC(year, 9, 31));
    const dstEnd = new Date(octLast);
    dstEnd.setUTCDate(31 - octLast.getUTCDay()); // last Sunday of October
    dstEnd.setUTCHours(1, 0, 0, 0); // 01:00 UTC

    return date >= dstStart && date < dstEnd;
  }

  if (region === "us") {
    // US DST: 2nd Sunday of March → 1st Sunday of November
    const year = date.getUTCFullYear();
    const march1 = new Date(Date.UTC(year, 2, 1));
    const dstStart = new Date(march1);
    dstStart.setUTCDate(14 - march1.getUTCDay()); // 2nd Sunday
    dstStart.setUTCHours(7, 0, 0, 0); // 2AM EST = 7AM UTC

    const nov1 = new Date(Date.UTC(year, 10, 1));
    const dstEnd = new Date(nov1);
    dstEnd.setUTCDate(7 - nov1.getUTCDay()); // 1st Sunday
    dstEnd.setUTCHours(6, 0, 0, 0); // 2AM EDT = 6AM UTC

    return date >= dstStart && date < dstEnd;
  }

  return false;
}

export function getTimezoneConfig(
  geoMarket?: string | null,
  locale?: string | null,
  domain?: string | null,
): TzConfig {
  const now = new Date();
  const tld = domain?.split(".").pop()?.toLowerCase();
  const market = geoMarket?.toLowerCase();
  const loc = locale?.toLowerCase();

  // Germany / Austria / Switzerland / Netherlands
  if (
    market === "dach" || market === "de" || market === "nl" ||
    loc === "de" ||
    tld === "de" || tld === "at" || tld === "ch" || tld === "nl"
  ) {
    const dst = isDST(now, "eu");
    return { offsetHours: dst ? 2 : 1, label: dst ? "CEST" : "CET" };
  }

  // UK
  if (
    market === "uk" || market === "gb" ||
    tld === "uk" || tld === "co"  // .co.uk
  ) {
    const dst = isDST(now, "eu");
    return { offsetHours: dst ? 1 : 0, label: dst ? "BST" : "GMT" };
  }

  // US East (default for US)
  if (
    market === "us" || market === "usa" ||
    loc === "en" && (tld === "com" || tld === "io" || tld === "co")
  ) {
    const dst = isDST(now, "us");
    return { offsetHours: dst ? -4 : -5, label: dst ? "EDT" : "EST" };
  }

  // France / Belgium
  if (
    market === "fr" || loc === "fr" ||
    tld === "fr" || tld === "be"
  ) {
    const dst = isDST(now, "eu");
    return { offsetHours: dst ? 2 : 1, label: dst ? "CEST" : "CET" };
  }

  // Default: CET (most of our targets are EU)
  const dst = isDST(now, "eu");
  return { offsetHours: dst ? 2 : 1, label: dst ? "CEST" : "CET" };
}

// ── Send window constants ──────────────────────────────

/** Valid send days: Tuesday(2), Wednesday(3), Thursday(4) */
const VALID_SEND_DAYS = new Set([2, 3, 4]);

/** Send window: 9:30-11:30 local time */
const WINDOW_START_HOUR = 9;
const WINDOW_START_MIN = 30;
const WINDOW_END_HOUR = 11;
const WINDOW_END_MIN = 30;

// ── Core: check if NOW is a valid send moment for this lead ─

export function isInSendWindow(
  geoMarket?: string | null,
  locale?: string | null,
  domain?: string | null,
): boolean {
  const now = new Date();
  const tz = getTimezoneConfig(geoMarket, locale, domain);

  // Local time for the recipient
  const localHour = (now.getUTCHours() + tz.offsetHours + 24) % 24;
  const localMin = now.getUTCMinutes();
  const localDay = getLocalDayOfWeek(now, tz.offsetHours);

  // Check day
  if (!VALID_SEND_DAYS.has(localDay)) return false;

  // Check time window: 9:30-11:30
  const localTimeMin = localHour * 60 + localMin;
  const windowStart = WINDOW_START_HOUR * 60 + WINDOW_START_MIN; // 570
  const windowEnd = WINDOW_END_HOUR * 60 + WINDOW_END_MIN; // 690

  return localTimeMin >= windowStart && localTimeMin <= windowEnd;
}

function getLocalDayOfWeek(utcDate: Date, offsetHours: number): number {
  const localMs = utcDate.getTime() + offsetHours * 60 * 60 * 1000;
  return new Date(localMs).getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat
}

// ── Snap a date to the next valid send window ───────────

/**
 * Given a raw target date (e.g. "created_at + 3 days"),
 * returns the next valid send datetime (Tue/Wed/Thu, 9:30 local).
 *
 * This ensures no email ever lands on Monday, Friday, or outside 9:30-11:30.
 */
export function snapToNextSendWindow(
  rawDate: Date,
  geoMarket?: string | null,
  locale?: string | null,
  domain?: string | null,
): Date {
  const tz = getTimezoneConfig(geoMarket, locale, domain);

  // Target: 10:00 local (middle of 9:30-11:30 window)
  const targetLocalHour = 10;
  const targetLocalMin = 0;

  // Convert target local time to UTC hour
  const targetUtcHour = (targetLocalHour - tz.offsetHours + 24) % 24;

  // Start from rawDate, set to target UTC hour
  const candidate = new Date(rawDate);
  candidate.setUTCHours(targetUtcHour, targetLocalMin, 0, 0);

  // If the candidate is in the past, move to tomorrow
  if (candidate.getTime() <= Date.now()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }

  // Snap to next Tue/Wed/Thu
  let safety = 0;
  while (safety < 7) {
    const localDay = getLocalDayOfWeek(candidate, tz.offsetHours);
    if (VALID_SEND_DAYS.has(localDay)) break;
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    safety++;
  }

  return candidate;
}

// ── Export for debugging / logging ──────────────────────

export function describeSendWindow(
  geoMarket?: string | null,
  locale?: string | null,
  domain?: string | null,
): string {
  const tz = getTimezoneConfig(geoMarket, locale, domain);
  const now = new Date();
  const localHour = (now.getUTCHours() + tz.offsetHours + 24) % 24;
  const localMin = now.getUTCMinutes();
  const localDay = getLocalDayOfWeek(now, tz.offsetHours);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const inWindow = isInSendWindow(geoMarket, locale, domain);

  return `${tz.label} (UTC${tz.offsetHours >= 0 ? "+" : ""}${tz.offsetHours}) | Local: ${dayNames[localDay]} ${localHour}:${String(localMin).padStart(2, "0")} | Window: ${inWindow ? "OPEN" : "CLOSED"}`;
}
