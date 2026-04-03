/**
 * GHOST TAX — SENDING WINDOW INTELLIGENCE
 *
 * Determines the optimal time to send outreach messages
 * based on the prospect's country and channel.
 *
 * All times in CET (Edith's timezone).
 */

export interface SendingWindow {
  start: string;  // "08:30"
  end: string;    // "09:30"
  quality: "primary" | "secondary" | "avoid";
  reason: string;
}

export interface DayPlan {
  markets: string[];           // ["DE"] or ["NL", "UK"]
  linkedinPostPillar: string;  // "leak_of_week" | "contrarian" | etc.
  windows: SendingWindow[];
  isFollowUpDay: boolean;
}

// ── Optimal windows by country (CET) ──────────────
const WINDOWS: Record<string, SendingWindow[]> = {
  DE: [
    { start: "08:30", end: "09:30", quality: "primary", reason: "CFO morning email triage" },
    { start: "14:00", end: "15:00", quality: "secondary", reason: "Post-lunch second check" },
  ],
  AT: [
    { start: "08:30", end: "09:30", quality: "primary", reason: "Same as DE" },
    { start: "14:00", end: "15:00", quality: "secondary", reason: "Post-lunch" },
  ],
  CH: [
    { start: "08:30", end: "09:30", quality: "primary", reason: "Same as DE" },
    { start: "14:00", end: "15:00", quality: "secondary", reason: "Post-lunch" },
  ],
  NL: [
    { start: "09:00", end: "10:00", quality: "primary", reason: "Dutch start slightly later" },
    { start: "13:30", end: "14:30", quality: "secondary", reason: "Post-lunch" },
  ],
  UK: [
    { start: "09:30", end: "10:30", quality: "primary", reason: "8:30-9:30 GMT = 9:30-10:30 CET" },
    { start: "15:00", end: "16:00", quality: "secondary", reason: "14:00-15:00 GMT" },
  ],
  US: [
    { start: "15:00", end: "16:00", quality: "primary", reason: "9:00-10:00 EST = 15:00-16:00 CET" },
    { start: "18:00", end: "19:00", quality: "secondary", reason: "12:00-13:00 EST" },
  ],
};

// ── Weekly rhythm ──────────────────────────────────
const WEEKLY_PLAN: Record<number, DayPlan> = {
  1: { // Monday
    markets: ["DE"],
    linkedinPostPillar: "leak_of_week",
    windows: WINDOWS.DE,
    isFollowUpDay: false,
  },
  2: { // Tuesday
    markets: ["DE"],
    linkedinPostPillar: "contrarian",
    windows: WINDOWS.DE,
    isFollowUpDay: false,
  },
  3: { // Wednesday
    markets: ["DE"],
    linkedinPostPillar: "benchmark",
    windows: WINDOWS.DE,
    isFollowUpDay: true,
  },
  4: { // Thursday
    markets: ["NL", "UK"],
    linkedinPostPillar: "behind_scenes",
    windows: [...WINDOWS.NL, ...WINDOWS.UK],
    isFollowUpDay: false,
  },
  5: { // Friday
    markets: [],  // No new outreach
    linkedinPostPillar: "founder_pov",
    windows: [],
    isFollowUpDay: true,  // Follow-up only
  },
};

// ── Public API ─────────────────────────────────────

export function getTodayPlan(): DayPlan {
  const dow = new Date().getDay(); // 0=Sun, 1=Mon...
  if (dow === 0 || dow === 6) {
    return { markets: [], linkedinPostPillar: "", windows: [], isFollowUpDay: false };
  }
  return WEEKLY_PLAN[dow] || WEEKLY_PLAN[1];
}

export function getWindowsForCountry(country: string): SendingWindow[] {
  return WINDOWS[country.toUpperCase()] || WINDOWS.DE;
}

export function isInSendingWindow(country: string): { inWindow: boolean; quality: string; minutesLeft: number } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const windows = getWindowsForCountry(country);
  for (const w of windows) {
    const [startH, startM] = w.start.split(":").map(Number);
    const [endH, endM] = w.end.split(":").map(Number);
    const windowStart = startH * 60 + startM;
    const windowEnd = endH * 60 + endM;

    if (currentMinutes >= windowStart && currentMinutes <= windowEnd) {
      return { inWindow: true, quality: w.quality, minutesLeft: windowEnd - currentMinutes };
    }
  }

  return { inWindow: false, quality: "avoid", minutesLeft: 0 };
}

export function getNextWindow(country: string): { start: string; minutesUntil: number } | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const windows = getWindowsForCountry(country);
  for (const w of windows) {
    const [startH, startM] = w.start.split(":").map(Number);
    const windowStart = startH * 60 + startM;
    if (windowStart > currentMinutes) {
      return { start: w.start, minutesUntil: windowStart - currentMinutes };
    }
  }

  return null; // No more windows today
}

/**
 * Edith notification time: 5 minutes before the first primary window of the day.
 * For DE days: 8:25 CET. For NL/UK days: 8:55 CET.
 */
export function getNotificationTime(): string {
  const plan = getTodayPlan();
  if (plan.markets.length === 0) return ""; // Weekend or no-send day

  const primaryWindow = plan.windows.find(w => w.quality === "primary");
  if (!primaryWindow) return "08:25";

  const [h, m] = primaryWindow.start.split(":").map(Number);
  const notifMinutes = h * 60 + m - 5;
  const notifH = Math.floor(notifMinutes / 60);
  const notifM = notifMinutes % 60;
  return `${String(notifH).padStart(2, "0")}:${String(notifM).padStart(2, "0")}`;
}
